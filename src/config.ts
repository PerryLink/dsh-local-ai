/**
 * Config schema and resolution for `dsh-local-ai`. Every tunable is a
 * validated {@link Config} field changeable from cordis.yml; the resolution
 * step validates URLs, numeric bounds, and route/model entries so
 * misconfiguration fails loud at mount — never silently skips a rule or
 * half-configures the adapter. The plugin is inert until at least one route
 * rule exists or a caller selects the `ollama` provider explicitly: routing
 * every request to a local model requires an explicit opt-in (privacy and
 * cost default: no automatic re-routing).
 * @module dsh-local-ai/config
 */

import z from '@deepseek-ai/schemastery'

/** One harness-visible model mapping onto an Ollama model id. */
export interface ModelMapping {
  /** Harness-visible model name (what `GenerateOptions.model` uses). */
  name: string
  /** Ollama model id; defaults to {@link name}. */
  model?: string
  /** Combined request/response context capacity in tokens. */
  contextWindow?: number
  /** Per-request output cap in tokens. */
  maxTokens?: number
  /** Default sampling temperature for this model (0..2). */
  temperature?: number
}

/** One local-model routing rule, matched in list order (first match wins). */
export interface RouteRule {
  /** Target harness-visible model name, resolved through the model mapping. */
  model: string
  /** Target provider id; defaults to `ollama`. `openai:<name>` targets a configured backend. */
  provider?: string
  /** Route when the request purpose matches this task type. */
  purpose?: 'compaction' | 'session-title'
  /** Route when any keyword appears (case-insensitive) in the request text. */
  keywords?: string[]
  /** Route every eligible request to this local model (offline-first). */
  always?: boolean
}

/** One OpenAI-compatible local backend (LM Studio / vLLM / llama.cpp server). */
export interface OpenAICompatibleBackend {
  /** Backend name, used in the provider id `openai:<name>` and logs. */
  name: string
  /** Base URL including the `/v1` prefix, e.g. `http://127.0.0.1:1234/v1`. */
  baseURL: string
  /** Optional bearer API key (most local servers leave it empty). */
  apiKey?: string
  /** Harness-visible → backend model mappings. */
  models?: ModelMapping[]
  /** Per-request output cap used when a model has no exact value. */
  maxTokens?: number
  /** Default sampling temperature; omitted leaves the backend default. */
  temperature?: number
}

/** Raw plugin config — every field optional; {@link resolveConfig} supplies the defaults. */
export interface Config {
  /** Ollama HTTP API base URL; `/api/*` paths are appended. */
  baseURL?: string
  /** Per-request HTTP timeout in milliseconds. */
  requestTimeoutMs?: number
  /** Subprocess terminate grace in milliseconds (health-check CLI). */
  graceMs?: number
  /** Context capacity used when a model has no exact value. */
  defaultContextWindow?: number
  /** Per-request output cap used when a model has no exact value. */
  maxTokens?: number
  /** Default sampling temperature; omitted leaves the provider default. */
  temperature?: number
  /** Declare and serialize image support when the model reports vision; `false` keeps the route text-only. */
  vision?: boolean
  /** Harness-visible → Ollama model mappings. */
  models?: ModelMapping[]
  /** OpenAI-compatible local backends (LM Studio / vLLM / llama.cpp). */
  backends?: OpenAICompatibleBackend[]
  /** Local-model routing rules (offline-first / long-text / privacy tasks). */
  route?: RouteRule[]
}

/** Fully resolved model mapping. */
export interface ResolvedModelMapping {
  readonly name: string
  readonly model: string
  readonly contextWindow?: number
  readonly maxTokens?: number
  readonly temperature?: number
}

/** Fully resolved routing rule. */
export interface ResolvedRouteRule {
  readonly model: string
  readonly provider: string
  readonly purpose?: 'compaction' | 'session-title'
  readonly keywords: readonly string[]
  readonly always: boolean
}

/** Fully resolved OpenAI-compatible backend. */
export interface ResolvedOpenAIBackend {
  readonly name: string
  /** The harness provider id this backend registers under (`openai:<name>`). */
  readonly providerId: string
  readonly baseURL: string
  readonly apiKey: string
  readonly defaultContextWindow: number
  readonly maxTokens: number
  readonly temperature?: number
  readonly requestTimeoutMs: number
  readonly models: readonly ResolvedModelMapping[]
}

/** The complete resolved config handed to the runtime. */
export interface ResolvedConfig {
  readonly baseURL: string
  readonly requestTimeoutMs: number
  readonly graceMs: number
  readonly defaultContextWindow: number
  readonly maxTokens: number
  readonly temperature?: number
  readonly vision: boolean
  readonly models: readonly ResolvedModelMapping[]
  readonly backends: readonly ResolvedOpenAIBackend[]
  readonly route: readonly ResolvedRouteRule[]
}

/** Schemastery schema: the loader validates and fills defaults before `apply`. */
export const Config: z<Config> = z.object({
  baseURL: z.string().default('http://127.0.0.1:11434'),
  requestTimeoutMs: z.number().default(30_000),
  graceMs: z.number().default(15_000),
  defaultContextWindow: z.number().default(8192),
  maxTokens: z.number().default(4096),
  temperature: z.number(),
  vision: z.boolean().default(true),
  models: z.array(z.object({
    name: z.string().required(),
    model: z.string(),
    contextWindow: z.number(),
    maxTokens: z.number(),
    temperature: z.number(),
  })).default([]),
  backends: z.array(z.object({
    name: z.string().required(),
    baseURL: z.string().required(),
    apiKey: z.string(),
    models: z.array(z.object({
      name: z.string().required(),
      model: z.string(),
      contextWindow: z.number(),
      maxTokens: z.number(),
      temperature: z.number(),
    })).default([]),
    maxTokens: z.number(),
    temperature: z.number(),
  })).default([]),
  route: z.array(z.object({
    model: z.string().required(),
    provider: z.string(),
    purpose: z.union(['compaction', 'session-title'] as const),
    keywords: z.array(z.string()).default([]),
    always: z.boolean().default(false),
  })).default([]),
})

/** Throw unless `value` is a positive safe integer. */
function assertPositiveInt(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer, got ${String(value)}`)
  }
}

/** Throw unless `value` is a finite number in `[min, max]`. */
function assertFiniteRange(name: string, value: number, min: number, max: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new TypeError(`${name} must be a finite number in [${min}, ${max}], got ${String(value)}`)
  }
}

/**
 * Validate an http(s) URL string and normalize it to a clean base (no query,
 * no fragment, no trailing slash).
 * @param name - config key, for the error message.
 * @param value - raw URL value.
 * @returns the normalized base URL.
 */
export function normalizeBaseUrl(name: string, value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch (error) {
    throw new TypeError(`${name} must be a valid URL, got ${JSON.stringify(value)} (${error instanceof Error ? error.message : 'invalid URL'})`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new TypeError(`${name} must use http(s), got ${JSON.stringify(parsed.protocol)}`)
  }
  parsed.search = ''
  parsed.hash = ''
  return parsed.href.replace(/\/+$/u, '')
}

/**
 * Validate raw values and fill explicit defaults. Invalid URLs, numeric
 * bounds, duplicate model names, or empty route/model names throw here —
 * misconfiguration fails loud at mount even when the plugin is mounted
 * without the Schemastery loader.
 * @param config - raw (possibly partial) plugin config.
 * @returns the fully resolved config.
 */
export function resolveConfig(config: Config = {}): ResolvedConfig {
  const baseURL = normalizeBaseUrl('baseURL', config.baseURL ?? 'http://127.0.0.1:11434')

  const requestTimeoutMs = config.requestTimeoutMs ?? 30_000
  assertPositiveInt('requestTimeoutMs', requestTimeoutMs)

  const graceMs = config.graceMs ?? 15_000
  assertPositiveInt('graceMs', graceMs)

  const defaultContextWindow = config.defaultContextWindow ?? 8192
  assertPositiveInt('defaultContextWindow', defaultContextWindow)

  const maxTokens = config.maxTokens ?? 4096
  assertPositiveInt('maxTokens', maxTokens)

  const temperature = config.temperature
  if (temperature !== undefined) assertFiniteRange('temperature', temperature, 0, 2)

  const vision = config.vision ?? true

  const models = resolveMappings(config.models, 'models')

  const backends = (config.backends ?? []).map((backend, index) => {
    if (typeof backend.name !== 'string' || backend.name.trim().length === 0) {
      throw new TypeError(`backends[${index}].name must be a non-empty string`)
    }
    const name = backend.name.trim()
    if (name === DEFAULT_PROVIDER) {
      throw new TypeError(`backends[${index}].name must not be the reserved provider id ${JSON.stringify(DEFAULT_PROVIDER)}`)
    }
    if (typeof backend.baseURL !== 'string' || backend.baseURL.trim().length === 0) {
      throw new TypeError(`backends[${index}].baseURL must be a non-empty string`)
    }
    const backendBaseURL = normalizeBaseUrl(`backends[${index}].baseURL`, backend.baseURL)
    const backendMaxTokens = backend.maxTokens ?? maxTokens
    assertPositiveInt(`backends[${index}].maxTokens`, backendMaxTokens)
    const backendTemperature = backend.temperature
    if (backendTemperature !== undefined) assertFiniteRange(`backends[${index}].temperature`, backendTemperature, 0, 2)
    return {
      name,
      providerId: openaiProviderId(name),
      baseURL: backendBaseURL,
      apiKey: backend.apiKey ?? '',
      defaultContextWindow,
      maxTokens: backendMaxTokens,
      ...backendTemperature === undefined ? {} : { temperature: backendTemperature },
      requestTimeoutMs,
      models: resolveMappings(backend.models, `backends[${index}].models`),
    }
  })

  const route = (config.route ?? []).map((rule, index) => {
    if (typeof rule.model !== 'string' || rule.model.trim().length === 0) {
      throw new TypeError(`route[${index}].model must be a non-empty string`)
    }
    const provider = (rule.provider ?? DEFAULT_PROVIDER).trim()
    if (provider.length === 0) {
      throw new TypeError(`route[${index}].provider must be a non-empty string`)
    }
    const keywords = (rule.keywords ?? []).map((keyword, keywordIndex) => {
      if (typeof keyword !== 'string' || keyword.trim().length === 0) {
        throw new TypeError(`route[${index}].keywords[${keywordIndex}] must be a non-empty string`)
      }
      return keyword
    })
    if (rule.always !== true && rule.purpose === undefined && keywords.length === 0) {
      throw new TypeError(`route[${index}] must declare a purpose, at least one keyword, or always: true`)
    }
    return {
      model: rule.model.trim(),
      provider,
      ...rule.purpose === undefined ? {} : { purpose: rule.purpose },
      keywords,
      always: rule.always ?? false,
    }
  })

  return {
    baseURL,
    requestTimeoutMs,
    graceMs,
    defaultContextWindow,
    maxTokens,
    ...temperature === undefined ? {} : { temperature },
    vision,
    models,
    backends,
    route,
  }
}

/** The provider id routing rules target when `provider` is omitted. */
export const DEFAULT_PROVIDER = 'ollama'

/** Prefix for OpenAI-compatible backend provider ids. */
export const OPENAI_PROVIDER_PREFIX = 'openai:'

/** Build the harness provider id for one OpenAI-compatible backend. */
export function openaiProviderId(name: string): string {
  return `${OPENAI_PROVIDER_PREFIX}${name}`
}

/**
 * Validate and normalize one model-mapping list (top-level or per-backend).
 * Duplicate harness-visible names throw; the wire id defaults to the name.
 * @param mappings - the raw mappings.
 * @param label - the config path prefix for error messages.
 * @returns the resolved mappings.
 */
function resolveMappings(mappings: ModelMapping[] | undefined, label: string): ResolvedModelMapping[] {
  const seenNames = new Set<string>()
  return (mappings ?? []).map((mapping, index) => {
    if (typeof mapping.name !== 'string' || mapping.name.trim().length === 0) {
      throw new TypeError(`${label}[${index}].name must be a non-empty string`)
    }
    const name = mapping.name.trim()
    if (seenNames.has(name)) throw new TypeError(`${label}[${index}]: duplicate model name ${JSON.stringify(name)}`)
    seenNames.add(name)
    const model = (mapping.model ?? name).trim()
    if (model.length === 0) throw new TypeError(`${label}[${index}].model must be a non-empty string`)
    const contextWindow = mapping.contextWindow
    if (contextWindow !== undefined) assertPositiveInt(`${label}[${index}].contextWindow`, contextWindow)
    const modelMaxTokens = mapping.maxTokens
    if (modelMaxTokens !== undefined) assertPositiveInt(`${label}[${index}].maxTokens`, modelMaxTokens)
    const modelTemperature = mapping.temperature
    if (modelTemperature !== undefined) assertFiniteRange(`${label}[${index}].temperature`, modelTemperature, 0, 2)
    return {
      name,
      model,
      ...contextWindow === undefined ? {} : { contextWindow },
      ...modelMaxTokens === undefined ? {} : { maxTokens: modelMaxTokens },
      ...modelTemperature === undefined ? {} : { temperature: modelTemperature },
    }
  })
}

/**
 * Resolve one harness-visible model name to its Ollama model id, or return
 * `undefined` when no mapping matches (the identity mapping applies).
 * @param resolved - resolved config.
 * @param name - harness-visible model name.
 * @returns the mapped Ollama model id, or `undefined` when unmapped.
 */
export function ollamaModelOf(resolved: ResolvedConfig, name: string): string | undefined {
  const mapping = resolved.models.find(entry => entry.name === name)
  return mapping?.model
}
