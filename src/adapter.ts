/**
 * `OllamaAdapter`: the harness `LlmAdapter` over Ollama's native `/api/chat`
 * streaming endpoint. Transport-only: the registering plugin owns config
 * resolution (one `() => ResolvedConfig` thunk re-read per operation), so a
 * changed base URL, model mapping, or timeout reaches the next request without
 * re-registration, while an in-flight stream keeps the facts it started with.
 * The adapter is text-only (`inputModalities: ['text']`); tool calls and tool
 * results are translated by {@link serializeRequest}.
 * @module dsh-local-ai/adapter
 */

import { LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import { idleWatchdog, timeoutOf } from '@deepseek-ai/dsh-timeout'
import { sanitizeEndpoint } from './sanitize.ts'
import { listModels as listOllamaModels, postStream, readNdjsonLines } from './ollama.ts'
import type { FetchLike } from './ollama.ts'
import { serializeRequest } from './serialize.ts'
import { translate } from './translate.ts'
import type { ResolvedConfig } from './config.ts'

/** Idle-timeout abort code stamped onto a stalled stream's timeout reason. */
const STREAM_IDLE_TIMEOUT_CODE = 'LLM_STREAM_IDLE_TIMEOUT'

/** Constructor options for {@link OllamaAdapter}. */
export interface OllamaAdapterOptions {
  /** Current validated config; called once per operation. */
  config: () => ResolvedConfig
  /** Fetch implementation, injectable for tests; defaults to `globalThis.fetch`. */
  fetchImpl?: FetchLike
}

/** The single provider route this adapter owns. */
export const OLLAMA_PROVIDER = 'ollama'

/** Reverse a model mapping: Ollama model id → harness-visible name. */
function harnessNameOf(resolved: ResolvedConfig, ollamaName: string): string {
  const mapping = resolved.models.find(entry => entry.model === ollamaName)
  return mapping?.name ?? ollamaName
}

/** Advertise one configured or discovered local model as text-only. */
function modelInfo(provider: string, id: string, name: string): LlmModelInfo {
  return { provider, id, name, inputModalities: ['text'] }
}

/**
 * The Ollama provider adapter. One instance serves every harness-visible local
 * model name; the harness model name maps to the wire model id through the
 * configured model mapping (identity when unmapped).
 */
export class OllamaAdapter extends LlmAdapter {
  constructor(private readonly options: OllamaAdapterOptions) {
    super()
  }

  private fetchImpl(): FetchLike {
    return this.options.fetchImpl ?? ((input: string, init?: RequestInit) => globalThis.fetch(input, init))
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: 'Ollama (local)' }
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const resolved = this.options.config()
    return listOllamaModels(resolved.baseURL, this.fetchImpl())
      .then(models => models.map(model => modelInfo(provider, harnessNameOf(resolved, model.name), harnessNameOf(resolved, model.name))))
      .catch(() => resolved.models.map(entry => modelInfo(provider, entry.name, entry.name)))
  }

  override resolveModel(
    provider: string,
    model: string,
    _signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    const resolved = this.options.config()
    const mapping = resolved.models.find(entry => entry.name === model)
    return Promise.resolve({
      provider,
      id: model,
      name: model,
      inputModalities: ['text'],
      context: { contextWindow: mapping?.contextWindow ?? resolved.defaultContextWindow },
      defaultMaxTokens: mapping?.maxTokens ?? resolved.maxTokens,
    })
  }

  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    // One resolution per stream call: connection facts freeze here and hold for
    // this whole request, so an in-flight stream never observes a config change
    // and the next call re-resolves.
    const resolved = this.options.config()
    const consumer = new AbortController()
    const upstream = options.signal === undefined
      ? consumer.signal
      : AbortSignal.any([options.signal, consumer.signal])
    using watchdog = idleWatchdog(upstream, resolved.requestTimeoutMs, STREAM_IDLE_TIMEOUT_CODE)
    const iterator = this.request(options, resolved, watchdog.signal)[Symbol.asyncIterator]()
    let exhausted = false
    try {
      while (true) {
        const result = await watchdog.next(iterator)
        if (result.done) {
          exhausted = true
          return
        }
        yield result.value
      }
    } catch (error: unknown) {
      if (timeoutOf(watchdog.signal, STREAM_IDLE_TIMEOUT_CODE) !== undefined) {
        throw new LlmError(
          `Ollama stream idle timeout after ${resolved.requestTimeoutMs}ms`,
          'TIMEOUT',
          { cause: error },
        )
      }
      if (options.signal?.aborted) {
        throw new LlmError('Ollama request aborted by caller', 'ABORTED', { cause: error })
      }
      if (error instanceof LlmError) throw error
      throw new LlmError(`Ollama API stream from ${sanitizeEndpoint(resolved.baseURL)} failed`, 'TRANSPORT', { cause: error })
    } finally {
      consumer.abort('Ollama stream consumer stopped')
      if (!exhausted && iterator.return !== undefined) {
        try {
          await iterator.return()
        } catch (_abortedTransportTeardown) {
          // The consumer controller already owns termination; a return-time abort cannot add a second outcome.
        }
      }
    }
  }

  private async * request(
    options: GenerateOptions,
    resolved: ResolvedConfig,
    signal: AbortSignal,
  ): AsyncIterable<StreamChunk> {
    const body = serializeRequest(options, resolved)
    let response: Response
    try {
      response = await postStream(resolved.baseURL, '/api/chat', body, this.fetchImpl(), signal)
    } catch (error: unknown) {
      // The outer stream distinguishes caller cancellation and watchdog expiry.
      if (signal.aborted) throw error
      // Preserve the client's meaningful HTTP error (e.g. HTTP_401, NOT_FOUND):
      // a non-2xx response is already a normalized LlmError from `postStream`.
      if (error instanceof LlmError) throw error
      throw new LlmError(
        `Ollama API request to ${sanitizeEndpoint(resolved.baseURL)} failed`,
        'TRANSPORT',
        { cause: error },
      )
    }
    if (!response.body) {
      throw new LlmError('Ollama API returned no response body', 'EMPTY_RESPONSE')
    }
    yield* translate(readNdjsonLines(response.body))
  }
}
