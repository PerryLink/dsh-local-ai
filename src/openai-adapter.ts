/**
 * `OpenAICompatibleAdapter`: the harness `LlmAdapter` over an OpenAI-compatible
 * `/v1/chat/completions` streaming endpoint — the common protocol spoken by
 * LM Studio, vLLM, and llama.cpp `--server`. One instance serves one backend;
 * the provider id and wire base URL are resolved per operation through a
 * `() => ResolvedOpenAIBackend` thunk, so a changed URL/model mapping reaches
 * the next request without re-registration. Text-only route: image content
 * fails loud with `UNSUPPORTED_CONTENT` (multimodal backends are out of scope).
 * @module dsh-local-ai/openai-adapter
 */

import { LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import { idleWatchdog, timeoutOf } from '@deepseek-ai/dsh-timeout'
import { sanitizeEndpoint } from './sanitize.ts'
import { listModels, postChatCompletions, readSseLines } from './openai.ts'
import type { FetchLike } from './ollama.ts'
import { serializeRequest } from './openai-serialize.ts'
import { translateOpenAIStream } from './openai-translate.ts'
import type { ResolvedOpenAIBackend } from './config.ts'

/** Idle-timeout abort code stamped onto a stalled stream's timeout reason. */
const STREAM_IDLE_TIMEOUT_CODE = 'LLM_STREAM_IDLE_TIMEOUT'

/** Constructor options for {@link OpenAICompatibleAdapter}. */
export interface OpenAICompatibleAdapterOptions {
  /** Current validated backend config; called once per operation. */
  config: () => ResolvedOpenAIBackend
  /** Fetch implementation, injectable for tests; defaults to `globalThis.fetch`. */
  fetchImpl?: FetchLike
}

/**
 * The OpenAI-compatible provider adapter. One instance serves one backend
 * (LM Studio / vLLM / llama.cpp); the harness model name maps to the wire model
 * id through the backend's model mapping (identity when unmapped).
 */
export class OpenAICompatibleAdapter extends LlmAdapter {
  constructor(private readonly options: OpenAICompatibleAdapterOptions) {
    super()
  }

  private fetchImpl(): FetchLike {
    return this.options.fetchImpl ?? ((input: string, init?: RequestInit) => globalThis.fetch(input, init))
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: `OpenAI-compatible (${this.options.config().name})` }
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const backend = this.options.config()
    const models = await listModels(backend.baseURL, backend.apiKey, this.fetchImpl()).catch(() => [])
    const ids = models.length > 0 ? models.map(model => model.id) : backend.models.map(entry => entry.model)
    return ids.map(id => {
      const mapping = backend.models.find(entry => entry.model === id)
      const name = mapping?.name ?? id
      return { provider, id: name, name, inputModalities: ['text'] as const }
    })
  }

  override async resolveModel(
    provider: string,
    model: string,
    _signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    const backend = this.options.config()
    const mapping = backend.models.find(entry => entry.name === model)
    return {
      provider,
      id: model,
      name: model,
      inputModalities: ['text'],
      context: { contextWindow: mapping?.contextWindow ?? backend.defaultContextWindow },
      defaultMaxTokens: mapping?.maxTokens ?? backend.maxTokens,
    }
  }

  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const backend = this.options.config()
    const consumer = new AbortController()
    const upstream = options.signal === undefined
      ? consumer.signal
      : AbortSignal.any([options.signal, consumer.signal])
    using watchdog = idleWatchdog(upstream, backend.requestTimeoutMs, STREAM_IDLE_TIMEOUT_CODE)
    const iterator = this.request(options, backend, watchdog.signal)[Symbol.asyncIterator]()
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
          `OpenAI-compatible stream idle timeout after ${backend.requestTimeoutMs}ms`,
          'TIMEOUT',
          { cause: error },
        )
      }
      if (options.signal?.aborted) {
        throw new LlmError('OpenAI-compatible request aborted by caller', 'ABORTED', { cause: error })
      }
      if (error instanceof LlmError) throw error
      throw new LlmError(`OpenAI-compatible API stream from ${sanitizeEndpoint(backend.baseURL)} failed`, 'TRANSPORT', { cause: error })
    } finally {
      consumer.abort('OpenAI-compatible stream consumer stopped')
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
    backend: ResolvedOpenAIBackend,
    signal: AbortSignal,
  ): AsyncIterable<StreamChunk> {
    const body = serializeRequest(options, backend)
    let response: Response
    try {
      response = await postChatCompletions(backend.baseURL, backend.apiKey, body, this.fetchImpl(), signal)
    } catch (error: unknown) {
      if (signal.aborted) throw error
      if (error instanceof LlmError) throw error
      throw new LlmError(
        `OpenAI-compatible API request to ${sanitizeEndpoint(backend.baseURL)} failed`,
        'TRANSPORT',
        { cause: error },
      )
    }
    if (!response.body) {
      throw new LlmError('OpenAI-compatible API returned no response body', 'EMPTY_RESPONSE')
    }
    yield* translateOpenAIStream(readSseLines(response.body))
  }
}
