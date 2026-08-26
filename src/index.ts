/**
 * `dsh-local-ai` — local-model integration for DeepSeek Harness. Registers the
 * `ollama` `LlmAdapter` route plus one `openai:<name>` route per configured
 * OpenAI-compatible backend (LM Studio / vLLM / llama.cpp), exposes
 * discovery/management tools (`ollama_list`, `ollama_show`, `ollama_pull`,
 * `ollama_remove`) plus a health check, routes requests to local models by
 * task type or keyword with automatic fallback to the cloud, and provides the
 * `/ollama` one-shot status command. Zero runtime dependencies beyond the
 * harness peers: everything talks HTTP (or, for Ollama process liveness, the
 * CLI).
 *
 * Function plugin — no default export (the Loader unwraps
 * `exports.default ?? exports`, and a stray default would discard
 * `name`/`inject`/`Config`/`apply`).
 * @module dsh-local-ai
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-tools'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { Config, resolveConfig } from './config.ts'
import { OllamaAdapter, OLLAMA_PROVIDER } from './adapter.ts'
import { OpenAICompatibleAdapter } from './openai-adapter.ts'
import { decideRoute, routeLocal } from './route.ts'
import { checkHealth } from './health.ts'
import { contextLengthOf, listModels, listRunning, pullModel, removeModel, showModel } from './ollama.ts'
import type { FetchLike } from './ollama.ts'

export const name = 'local-ai'
export const inject = ['llm', 'tools', 'subprocess', 'commands']

export { Config, resolveConfig, openaiProviderId, OPENAI_PROVIDER_PREFIX, DEFAULT_PROVIDER } from './config.ts'
export type { Config as LocalAiConfig, ModelMapping, OpenAICompatibleBackend, ResolvedConfig, ResolvedModelMapping, ResolvedOpenAIBackend, ResolvedRouteRule, RouteRule } from './config.ts'
export { OpenAICompatibleAdapter } from './openai-adapter.ts'
export { VERSION } from './version.ts'
export { REDACTED, redactSecrets, sanitizeEndpoint, sanitizePath, sanitizeText, truncate } from './sanitize.ts'

/** Format a byte count into a compact human-readable string. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 ? String(Math.round(value)) : value.toFixed(1)
  return `${rounded} ${units[unit]}`
}

/** One installed-model row reported by `ollama_list`. */
interface ListedModel {
  name: string
  size: number
  parameterSize?: string
  quantization?: string
  running: boolean
}

/** The `ollama_list` canonical value. */
interface ListValue {
  models: ListedModel[]
  running: string[]
  count: number
  totalBytes: number
}

/** The `ollama_show` canonical value. */
interface ShowValue {
  name: string
  parameterSize?: string
  quantization?: string
  contextLength?: number
  family?: string
  format?: string
}

/** Render the `ollama_list` canonical value as model-visible text. */
export function renderList(value: JsonValue): string {
  const list = value as unknown as ListValue
  const models = list.models ?? []
  const lines = [`${models.length} local model(s), ${formatBytes(list.totalBytes ?? 0)} on disk`]
  for (const model of models) {
    const detail = [model.parameterSize, model.quantization].filter(part => part !== undefined).join(' ')
    lines.push(`- ${model.name}${detail.length > 0 ? ` (${detail})` : ''} — ${formatBytes(model.size)}${model.running ? ' [running]' : ''}`)
  }
  if (list.running !== undefined && list.running.length > 0) {
    lines.push(`running: ${list.running.join(', ')}`)
  }
  return lines.join('\n')
}

/** Render the `ollama_show` canonical value as model-visible text. */
export function renderShow(value: JsonValue): string {
  const show = value as unknown as ShowValue
  const detail = [show.parameterSize, show.quantization].filter(part => part !== undefined).join(' ')
  const context = show.contextLength !== undefined ? `context ${show.contextLength}` : undefined
  const parts = [detail, context, show.family, show.format].filter(part => part !== undefined && part.length > 0)
  return `${show.name}${parts.length > 0 ? ` — ${parts.join(', ')}` : ''}`
}

/** Render a health canonical value as model-visible text. */
export function renderHealth(value: JsonValue): string {
  const health = value as unknown as {
    api: { ok: boolean; version?: string }
    process: { present: boolean; error?: string }
  }
  return [
    `API: ${health.api.ok ? `ok${health.api.version !== undefined ? ` (v${health.api.version})` : ''}` : 'down'}`,
    `process: ${health.process.present ? 'alive' : 'not detected'}`,
  ].join('\n')
}

/** Render a pull/remove canonical value as model-visible text. */
export function renderOperation(value: JsonValue): string {
  const op = value as unknown as { name: string; status?: string; removed?: boolean }
  if (op.removed === true) return `removed ${op.name}`
  return `${op.name}: ${op.status ?? 'done'}`
}

/**
 * Mount the plugin: resolve config (fail loud), register the Ollama adapter,
 * the `llm/stream` routing waterfall, the five management tools, and the
 * `/ollama` command. Every contribution goes through its registry's effect
 * (register/on), so stop and hot-reload withdraw all of it.
 * @param ctx - the plugin context (host).
 * @param config - raw plugin config.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const resolved = resolveConfig(config)
  const logger = ctx.logger('local-ai')
  // Lazily-bound so tests can stub `globalThis.fetch` before a call.
  const fetchImpl: FetchLike = (input, init) => globalThis.fetch(input, init)

  const adapter = new OllamaAdapter({
    config: () => resolved,
    fetchImpl,
    resolveAttachments: () => ctx.get('attachments'),
  })
  ctx.llm.registerAdapter([OLLAMA_PROVIDER], adapter)

  // OpenAI-compatible backends (LM Studio / vLLM / llama.cpp) each register as
  // their own provider id (`openai:<name>`), reusing the same adapter class.
  for (const backend of resolved.backends) {
    ctx.llm.registerAdapter([backend.providerId], new OpenAICompatibleAdapter({
      config: () => backend,
      fetchImpl,
    }))
  }

  // Routing waterfall: passthrough by default; a matched rule re-routes to the
  // local model and falls back to `next()` (the cloud) when local fails first.
  ctx.on('llm/stream', (options: GenerateOptions, next: () => AsyncIterable<StreamChunk>): AsyncIterable<StreamChunk> => {
    const decision = decideRoute(options, resolved)
    if (decision === undefined) return next()
    return routeLocal((reRouted: GenerateOptions) => ctx.llm.stream(reRouted), options, decision, next)
  })

  ctx.tools.register(defineTool({
    name: 'ollama_list',
    description: 'List local Ollama models with disk usage and which are currently loaded (running).',
    parameters: {},
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: renderList(value) }],
    },
    async execute(_args, exec): Promise<JsonValue> {
      const [models, running] = await Promise.all([
        listModels(resolved.baseURL, fetchImpl, exec.signal),
        listRunning(resolved.baseURL, fetchImpl, exec.signal).catch(() => []),
      ])
      const runningNames = new Set(running.map(model => model.name))
      const value: ListValue = {
        models: models.map(model => ({
          name: model.name,
          size: model.size,
          ...model.details?.parameter_size === undefined ? {} : { parameterSize: model.details.parameter_size },
          ...model.details?.quantization_level === undefined ? {} : { quantization: model.details.quantization_level },
          running: runningNames.has(model.name),
        })),
        running: running.map(model => model.name),
        count: models.length,
        totalBytes: models.reduce((sum, model) => sum + model.size, 0),
      }
      return value as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'ollama_show',
    description: 'Show details for one local Ollama model: parameter size, quantization, and context length.',
    parameters: {
      name: { type: 'string', required: true, description: 'The Ollama model name to inspect.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: renderShow(value) }],
    },
    async execute(args, exec): Promise<JsonValue> {
      const name = (args as { name: string }).name
      const show = await showModel(resolved.baseURL, name, fetchImpl, exec.signal)
      const value: ShowValue = {
        name,
        ...show.details?.parameter_size === undefined ? {} : { parameterSize: show.details.parameter_size },
        ...show.details?.quantization_level === undefined ? {} : { quantization: show.details.quantization_level },
        ...show.details?.family === undefined ? {} : { family: show.details.family },
        ...show.details?.format === undefined ? {} : { format: show.details.format },
        ...((): { contextLength?: number } => {
          const contextLength = contextLengthOf(show)
          return contextLength === undefined ? {} : { contextLength }
        })(),
      }
      return value as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'ollama_pull',
    description: 'Pull (download) a model into the local Ollama server.',
    parameters: {
      name: { type: 'string', required: true, description: 'The Ollama model name to pull (e.g. llama3.2).' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: renderOperation(value) }],
    },
    async execute(args, exec): Promise<JsonValue> {
      const name = (args as { name: string }).name
      const result = await pullModel(resolved.baseURL, name, fetchImpl, exec.signal)
      return { name, status: result.status } as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'ollama_remove',
    description: 'Remove (delete) a model from the local Ollama server.',
    parameters: {
      name: { type: 'string', required: true, description: 'The Ollama model name to remove.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: renderOperation(value) }],
    },
    async execute(args, exec): Promise<JsonValue> {
      const name = (args as { name: string }).name
      await removeModel(resolved.baseURL, name, fetchImpl, exec.signal)
      return { name, removed: true } as unknown as JsonValue
    },
  }))

  ctx.tools.register(defineTool({
    name: 'ollama_health',
    description: 'Check the local Ollama server: whether the process is alive and whether the API responds.',
    parameters: {},
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: renderHealth(value) }],
    },
    async execute(_args, exec): Promise<JsonValue> {
      const health = await checkHealth(resolved.baseURL, fetchImpl, ctx.subprocess, resolved.requestTimeoutMs, resolved.graceMs)
      void exec
      return health as unknown as JsonValue
    },
  }))

  ctx.commands.register({
    name: 'ollama',
    description: 'One-shot status overview: local models, disk usage, health, and routing suggestions.',
    async handler(): Promise<CommandResult> {
      const health = await checkHealth(resolved.baseURL, fetchImpl, ctx.subprocess, resolved.requestTimeoutMs, resolved.graceMs)
      const lines = ['Ollama status:']
      lines.push(`- API: ${health.api.ok ? `ok${health.api.version !== undefined ? ` (v${health.api.version})` : ''}` : 'down'}`)
      lines.push(`- process: ${health.process.present ? 'alive' : 'not detected'}`)
      let models = [] as Array<{ name: string; size: number }>
      try {
        models = await listModels(resolved.baseURL, fetchImpl)
      } catch {
        // Model listing is best-effort in the overview; health already reported the failure.
      }
      const totalBytes = models.reduce((sum, model) => sum + model.size, 0)
      lines.push(`- models: ${models.length} installed (${formatBytes(totalBytes)})`)
      for (const model of models) lines.push(`  - ${model.name} (${formatBytes(model.size)})`)
      if (!health.api.ok && !health.process.present) {
        lines.push('suggestion: start the Ollama server (e.g. `ollama serve`)')
      } else if (resolved.route.length === 0) {
        lines.push('suggestion: configure `route` rules to route requests to local models')
      }
      return { kind: 'success', text: lines.join('\n') }
    },
  })

  logger.info(`ollama adapter registered at ${resolved.baseURL} (${resolved.models.length} mapping(s), ${resolved.route.length} route rule(s)); ` +
    `${resolved.backends.length} OpenAI-compatible backend(s): ${resolved.backends.map(backend => backend.providerId).join(', ') || 'none'}`)
}
