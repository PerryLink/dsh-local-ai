/**
 * Local-model routing decision and the streaming fallback. The pure decision
 * matches configured rules (task type via `purpose`, case-insensitive
 * keywords, or a blanket `always`) against a request, in list order — first
 * match wins. The streaming helper routes a matched request to the local
 * provider adapter (Ollama or an OpenAI-compatible backend) and, when the
 * local route fails BEFORE producing any visible content, falls back to the
 * cloud (`next()`) so a down local server never bricks a conversation. Once
 * local content has started, it is streamed through — a mid-stream failure
 * cannot be retracted.
 * @module dsh-local-ai/route
 */

import { isTokenDelta } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { OLLAMA_PROVIDER } from './adapter.ts'
import { DEFAULT_PROVIDER } from './config.ts'
import type { ResolvedConfig, ResolvedRouteRule } from './config.ts'

/** The chosen local provider + model for one matched request. */
export interface RouteDecision {
  /** The local provider id to route to (`ollama` or `openai:<name>`). */
  readonly provider: string
  /** Harness-visible local model name. */
  readonly model: string
}

/**
 * Concatenate the request's model-visible text (system prompt + every text
 * block) for keyword matching.
 * @param options - the request.
 * @returns the joined text.
 */
export function requestText(options: GenerateOptions): string {
  const parts: string[] = []
  if (options.system !== undefined) parts.push(options.system)
  for (const message of options.messages) {
    for (const block of message.content) {
      if (block.type === 'text') parts.push(block.text)
    }
  }
  return parts.join('\n')
}

/** Whether a keyword appears case-insensitively in the text. */
export function matchesKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase())
}

/** Whether one resolved rule matches a request. */
export function ruleMatches(rule: ResolvedRouteRule, options: GenerateOptions): boolean {
  if (rule.always) return true
  if (rule.purpose !== undefined && options.purpose === rule.purpose) return true
  if (rule.keywords.length > 0) {
    const text = requestText(options)
    return rule.keywords.some(keyword => matchesKeyword(text, keyword))
  }
  return false
}

/**
 * Whether a provider id is one of this plugin's local providers. Explicit
 * selection of a local provider (or a prior re-route) must never re-route.
 * @param provider - the request's provider id, or `undefined` for the cloud default.
 * @param resolved - the resolved config.
 * @returns true when the request is already addressed to a local provider.
 */
export function isLocalProvider(provider: string | undefined, resolved: ResolvedConfig): boolean {
  if (provider === undefined) return false
  if (provider === OLLAMA_PROVIDER) return true
  return resolved.backends.some(backend => backend.providerId === provider)
}

/**
 * Decide whether a request should route to a local model. A request already
 * addressed to a local provider (explicit selection or a prior re-route) never
 * re-routes.
 * @param options - the request.
 * @param resolved - the resolved config.
 * @returns the local provider + model to use, or `undefined` to stay on the cloud route.
 */
export function decideRoute(options: GenerateOptions, resolved: ResolvedConfig): RouteDecision | undefined {
  if (isLocalProvider(options.provider, resolved)) return undefined
  for (const rule of resolved.route) {
    if (ruleMatches(rule, options)) return { provider: rule.provider, model: rule.model }
  }
  return undefined
}

/**
 * Stream a locally-routed request with automatic cloud fallback. The local
 * stream is produced through `streamLocal` (the full harness stream, so the
 * local route keeps retry and failure normalization). If the local route
 * finishes with an error or aborts before any token delta, `next()` (the
 * cloud) is streamed instead; otherwise the local stream is forwarded.
 * @param streamLocal - produces the local stream for a re-routed request.
 * @param options - the original request.
 * @param decision - the local model to route to.
 * @param next - the cloud stream (the waterfall's `next()`).
 * @returns the effective chunk stream.
 */
export async function* routeLocal(
  streamLocal: (options: GenerateOptions) => AsyncIterable<StreamChunk>,
  options: GenerateOptions,
  decision: RouteDecision,
  next: () => AsyncIterable<StreamChunk>,
): AsyncGenerator<StreamChunk> {
  const localOptions: GenerateOptions = { ...options, provider: decision.provider ?? DEFAULT_PROVIDER, model: decision.model }
  const upstream = streamLocal(localOptions)
  let producedContent = false
  const pending: StreamChunk[] = []
  try {
    for await (const chunk of upstream) {
      if (producedContent) {
        yield chunk
        continue
      }
      if (chunk.type === 'finish') {
        if (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted') {
          // Local failed before producing content — fall back to the cloud.
          yield* next()
          return
        }
        yield chunk
        return
      }
      pending.push(chunk)
      if (isTokenDelta(chunk)) {
        producedContent = true
        for (const buffered of pending) yield buffered
        pending.length = 0
      }
    }
    // Stream ended without a finish chunk — flush whatever was buffered.
    for (const buffered of pending) yield buffered
  } catch (error) {
    if (!producedContent) {
      yield* next()
      return
    }
    for (const buffered of pending) yield buffered
    throw error
  }
}
