/**
 * Ollama HTTP API client (zero runtime dependencies — plain `fetch`). The
 * harness `LlmAdapter` streams through `/api/chat`; discovery and management
 * tools call `/api/tags`, `/api/show`, `/api/pull`, `/api/delete`, and
 * `/api/version`. Every request carries the harness attribution headers and
 * honors the caller's abort signal; non-2xx responses fail with a normalized
 * `LlmError`. The fetch implementation is injectable for tests.
 * @module dsh-local-ai/ollama
 */

import { attributionHeaders, LlmError } from '@deepseek-ai/dsh-llm'
import { sanitizeEndpoint } from './sanitize.ts'

/** A `fetch`-compatible function, injectable for tests. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** One installed model as reported by `/api/tags`. */
export interface OllamaModel {
  name: string
  model: string
  size: number
  digest: string
  modified_at?: string
  details?: OllamaModelDetails
  capabilities?: string[]
}

/** Structured model details reported by `/api/show` and `/api/tags`. */
export interface OllamaModelDetails {
  family?: string
  parameter_size?: string
  quantization_level?: string
  format?: string
  parent_model?: string
}

/** The `/api/show` response body. */
export interface OllamaShowResult {
  license?: string
  modelfile?: string
  parameters?: string
  template?: string
  details?: OllamaModelDetails
  model_info?: Record<string, unknown>
  capabilities?: string[]
}

/** True when the reported model capabilities include vision. */
export function hasVision(capabilities: readonly string[] | undefined): boolean {
  return capabilities?.includes('vision') ?? false
}

/** The `/api/version` response body. */
export interface OllamaVersionResult {
  version: string
}

/** The `/api/pull` final success status. */
export interface OllamaPullResult {
  status: string
}

/** Build an absolute API URL from a normalized base URL. */
export function endpointUrl(baseURL: string, path: string): string {
  return `${baseURL}${path}`
}

/** Map an HTTP status to a stable LlmError code. */
export function httpErrorCode(status: number): string {
  if (status === 404) return 'NOT_FOUND'
  if (status === 400) return 'INVALID_REQUEST'
  if (status >= 500) return 'SERVER'
  return `HTTP_${status}`
}

/** Throw a normalized LlmError from a non-2xx response, using the body's `error`. */
async function throwHttpError(response: Response, context: string): Promise<never> {
  let message = `Ollama API error (HTTP ${response.status}) from ${sanitizeEndpoint(context)}`
  try {
    const body = await response.json() as { error?: unknown }
    if (typeof body.error === 'string' && body.error.length > 0) message = body.error
  } catch {
    // Only swallow error-body parsing: the HTTP status still identifies the failure.
  }
  throw new LlmError(message, httpErrorCode(response.status), { status: response.status })
}

/** Send a GET request and parse the JSON response. */
export async function requestJson<T>(
  baseURL: string,
  path: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetchImpl(endpointUrl(baseURL, path), {
    method: 'GET',
    headers: { accept: 'application/json', ...attributionHeaders() },
    ...signal === undefined ? {} : { signal },
  })
  if (!response.ok) await throwHttpError(response, endpointUrl(baseURL, path))
  return response.json() as Promise<T>
}

/** Send a POST request and parse the JSON response. */
export async function postJson<T>(
  baseURL: string,
  path: string,
  body: unknown,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetchImpl(endpointUrl(baseURL, path), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...attributionHeaders() },
    body: JSON.stringify(body),
    ...signal === undefined ? {} : { signal },
  })
  if (!response.ok) await throwHttpError(response, endpointUrl(baseURL, path))
  return response.json() as Promise<T>
}

/** Send a DELETE request and parse the JSON response. */
export async function deleteJson<T>(
  baseURL: string,
  path: string,
  body: unknown,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetchImpl(endpointUrl(baseURL, path), {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...attributionHeaders() },
    body: JSON.stringify(body),
    ...signal === undefined ? {} : { signal },
  })
  if (!response.ok) await throwHttpError(response, endpointUrl(baseURL, path))
  return response.json() as Promise<T>
}

/**
 * Send a POST and return the raw `Response` after validating 2xx. Used by the
 * streaming adapter, which owns body decoding and the idle watchdog.
 */
export async function postStream(
  baseURL: string,
  path: string,
  body: unknown,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetchImpl(endpointUrl(baseURL, path), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/x-ndjson', ...attributionHeaders() },
    body: JSON.stringify(body),
    ...signal === undefined ? {} : { signal },
  })
  if (!response.ok) await throwHttpError(response, endpointUrl(baseURL, path))
  return response
}

/** List installed models from `/api/tags`. */
export async function listModels(
  baseURL: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<OllamaModel[]> {
  const result = await requestJson<{ models?: OllamaModel[] }>(baseURL, '/api/tags', fetchImpl, signal)
  return result.models ?? []
}

/** List currently-loaded (running) models from `/api/ps`. */
export async function listRunning(
  baseURL: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<OllamaModel[]> {
  const result = await requestJson<{ models?: OllamaModel[] }>(baseURL, '/api/ps', fetchImpl, signal)
  return result.models ?? []
}

/** Inspect one model via `/api/show`. */
export async function showModel(
  baseURL: string,
  name: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<OllamaShowResult> {
  return postJson<OllamaShowResult>(baseURL, '/api/show', { name }, fetchImpl, signal)
}

/** Remove one model via `/api/delete`. */
export async function removeModel(
  baseURL: string,
  name: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<void> {
  await deleteJson<{ status?: string }>(baseURL, '/api/delete', { name }, fetchImpl, signal)
}

/** Query the Ollama server version via `/api/version`. */
export async function apiVersion(
  baseURL: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<string> {
  const result = await requestJson<OllamaVersionResult>(baseURL, '/api/version', fetchImpl, signal)
  return result.version
}

/**
 * Pull a model via `/api/pull`, consuming the progress stream and returning the
 * final status. An intermediate error status or a non-2xx response fails loud.
 */
export async function pullModel(
  baseURL: string,
  name: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<OllamaPullResult> {
  const response = await postStream(baseURL, '/api/pull', { name, stream: true }, fetchImpl, signal)
  if (!response.body) throw new LlmError('Ollama pull returned no response body', 'EMPTY_RESPONSE')
  let last: OllamaPullResult = { status: 'success' }
  for await (const line of readNdjsonLines(response.body)) {
    if (line.length === 0) continue
    const chunk = JSON.parse(line) as { status?: string; error?: string }
    if (typeof chunk.error === 'string' && chunk.error.length > 0) {
      throw new LlmError(chunk.error, 'PROVIDER')
    }
    if (typeof chunk.status === 'string') last = { status: chunk.status }
  }
  return last
}

/**
 * Decode a `ReadableStream<Uint8Array>` into newline-delimited text lines.
 * The final line is yielded even without a trailing newline; a missing body
 * yields nothing.
 * @param body - the response body stream.
 * @returns text lines in delivery order.
 */
export async function* readNdjsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newline = buffer.indexOf('\n')
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/u, '')
        buffer = buffer.slice(newline + 1)
        newline = buffer.indexOf('\n')
        yield line
      }
    }
  } finally {
    reader.releaseLock()
  }
  buffer += decoder.decode()
  if (buffer.length > 0) yield buffer
}

/**
 * Extract the context length from an `/api/show` result by scanning
 * `model_info` for a `*.context_length` or bare `context_length` entry.
 * @param show - the `/api/show` result.
 * @returns the context length, or `undefined` when not reported.
 */
export function contextLengthOf(show: OllamaShowResult): number | undefined {
  const info = show.model_info
  if (info === undefined) return undefined
  for (const [key, value] of Object.entries(info)) {
    if (key === 'context_length' || key.endsWith('.context_length')) {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
    }
  }
  return undefined
}
