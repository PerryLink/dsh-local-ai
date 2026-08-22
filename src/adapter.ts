/**
 * `OllamaAdapter`: the harness `LlmAdapter` over Ollama's native `/api/chat`
 * streaming endpoint. Transport-only: the registering plugin owns config
 * resolution (one `() => ResolvedConfig` thunk re-read per operation), so a
 * changed base URL, model mapping, or timeout reaches the next request without
 * re-registration, while an in-flight stream keeps the facts it started with.
 * Input modalities follow the model's reported `/api/show` capabilities
 * (`vision` → `['text', 'image']`) unless the `vision` config knob opts out;
 * image payloads resolve through the optional `attachments` service.
 * @module dsh-local-ai/adapter
 */

import { contentHasImage, LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import type { AttachmentStore, ImageRequestPolicy } from '@deepseek-ai/dsh-attachment'
import { idleWatchdog, timeoutOf } from '@deepseek-ai/dsh-timeout'
import { sanitizeEndpoint } from './sanitize.ts'
import { hasVision, listModels as listOllamaModels, postStream, readNdjsonLines, showModel } from './ollama.ts'
import type { FetchLike } from './ollama.ts'
import { serializeRequest } from './serialize.ts'
import { translate } from './translate.ts'
import type { ResolvedConfig } from './config.ts'

/** Idle-timeout abort code stamped onto a stalled stream's timeout reason. */
const STREAM_IDLE_TIMEOUT_CODE = 'LLM_STREAM_IDLE_TIMEOUT'

/**
 * Deterministic request-image policy: aspect-preserving projection at ≤ 4 MP
 * and a 10 MiB encoded-byte cap per image (a protocol default, not a tunable —
 * the attachment service owns admission limits).
 */
const REQUEST_IMAGE_POLICY: ImageRequestPolicy = { maxPixels: 4_194_304, maxBytes: 10 * 1024 * 1024 }

/** Constructor options for {@link OllamaAdapter}. */
export interface OllamaAdapterOptions {
  /** Current validated config; called once per operation. */
  config: () => ResolvedConfig
  /** Fetch implementation, injectable for tests; defaults to `globalThis.fetch`. */
  fetchImpl?: FetchLike
  /** Optional attachment service resolving durable image refs to request bytes. */
  resolveAttachments?: () => AttachmentStore | undefined
}

/** The single provider route this adapter owns. */
export const OLLAMA_PROVIDER = 'ollama'

/** Reverse a model mapping: Ollama model id → harness-visible name. */
function harnessNameOf(resolved: ResolvedConfig, ollamaName: string): string {
  const mapping = resolved.models.find(entry => entry.model === ollamaName)
  return mapping?.name ?? ollamaName
}

/** Advertise one configured or discovered local model with its input modalities. */
function modelInfo(provider: string, id: string, name: string, vision: boolean): LlmModelInfo {
  return { provider, id, name, inputModalities: vision ? ['text', 'image'] : ['text'] }
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

  /** Probe one model's `/api/show` capabilities; failures degrade to text-only. */
  private async visionOf(resolved: ResolvedConfig, name: string, signal?: AbortSignal): Promise<boolean> {
    if (!resolved.vision) return false
    try {
      const show = await showModel(resolved.baseURL, name, this.fetchImpl(), signal)
      return hasVision(show.capabilities)
    } catch {
      return false
    }
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: 'Ollama (local)' }
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const resolved = this.options.config()
    const models = await listOllamaModels(resolved.baseURL, this.fetchImpl()).catch(() => [])
    const list = models.length > 0 ? models : resolved.models.map(entry => ({ name: entry.model, model: entry.model, size: 0, digest: '' }))
    const probes = await Promise.all(list.map(model => this.visionOf(resolved, model.name)))
    return list.map((model, index) => modelInfo(
      provider,
      harnessNameOf(resolved, model.name),
      harnessNameOf(resolved, model.name),
      probes[index] === true,
    ))
  }

  override async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    const resolved = this.options.config()
    const mapping = resolved.models.find(entry => entry.name === model)
    const ollamaName = mapping?.model ?? model
    const vision = await this.visionOf(resolved, ollamaName, signal)
    return {
      provider,
      id: model,
      name: model,
      inputModalities: vision ? ['text', 'image'] : ['text'],
      context: { contextWindow: mapping?.contextWindow ?? resolved.defaultContextWindow },
      defaultMaxTokens: mapping?.maxTokens ?? resolved.maxTokens,
    }
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
    const imagesByRef = await this.prepareImages(options, resolved, signal)
    const body = serializeRequest(options, resolved, imagesByRef)
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

  /**
   * Resolve request-image payloads for one image-bearing request. A text-only
   * route (config opt-out), a missing attachment service, or an unresolvable
   * ref fails loud here — images are never silently dropped.
   * @returns a `attachmentId → base64` map, or `undefined` when the request has no images.
   */
  private async prepareImages(
    options: GenerateOptions,
    resolved: ResolvedConfig,
    signal: AbortSignal,
  ): Promise<ReadonlyMap<string, string> | undefined> {
    if (!options.messages.some(message => contentHasImage(message.content))) return undefined
    if (!resolved.vision) {
      throw new LlmError('The Ollama adapter does not support image content for this model (vision disabled).', 'UNSUPPORTED_CONTENT')
    }
    const attachments = this.options.resolveAttachments?.()
    if (attachments === undefined) {
      throw new LlmError('Image content requires the attachments service; mount a profile with @deepseek-ai/dsh-attachment.', 'UNSUPPORTED_CONTENT')
    }
    const map = new Map<string, string>()
    for (const message of options.messages) {
      for (const block of message.content) {
        if (block.type !== 'image') continue
        const ref = block.attachment
        const requestImage = await attachments.readImageRequest(ref, REQUEST_IMAGE_POLICY, signal)
        map.set(String(ref.attachmentId), Buffer.from(requestImage.data).toString('base64'))
      }
    }
    return map
  }
}
