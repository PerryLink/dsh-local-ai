/**
 * OpenAI-compatible HTTP client (zero runtime dependencies — plain `fetch`).
 * Serves the OpenAI wire protocol spoken by LM Studio, vLLM, and llama.cpp
 * `--server`: model listing via `GET /v1/models` and streaming chat via
 * `POST /v1/chat/completions` (SSE). The base URL already carries the `/v1`
 * prefix (e.g. `http://127.0.0.1:1234/v1` for LM Studio). Every request
 * carries the harness attribution headers, an optional bearer key, and honors
 * the caller's abort signal; non-2xx responses fail with a normalized
 * `LlmError`. The fetch implementation is injectable for tests.
 * @module dsh-local-ai/openai
 */

import { attributionHeaders, LlmError } from '@deepseek-ai/dsh-llm'
import { sanitizeEndpoint } from './sanitize.ts'
import type { FetchLike } from './ollama.ts'

/** One installed model id reported by `/v1/models`. */
export interface OpenAIModel {
  id: string
}

/** Build the request headers, adding a bearer key only when one is configured. */
function requestHeaders(apiKey: string, accept: string): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept,
    ...attributionHeaders(),
  }
  if (apiKey.length > 0) headers.authorization = `Bearer ${apiKey}`
  return headers
}

/** Throw a normalized LlmError from a non-2xx response, reading the OpenAI error body. */
async function throwHttpError(response: Response, baseURL: string): Promise<never> {
  let message = `OpenAI-compatible API error (HTTP ${response.status}) from ${sanitizeEndpoint(baseURL)}`
  try {
    const body = await response.json() as { error?: unknown }
    if (typeof body.error === 'string' && body.error.length > 0) {
      message = body.error
    } else if (body.error !== null && typeof body.error === 'object') {
      const detail = (body.error as { message?: unknown }).message
      if (typeof detail === 'string' && detail.length > 0) message = detail
    }
  } catch {
    // Only swallow error-body parsing: the HTTP status still identifies the failure.
  }
  const code = response.status === 404 ? 'NOT_FOUND'
    : response.status === 400 ? 'INVALID_REQUEST'
      : response.status === 401 || response.status === 403 ? `HTTP_${response.status}`
        : response.status >= 500 ? 'SERVER'
          : `HTTP_${response.status}`
  throw new LlmError(message, code, { status: response.status })
}

/** List installed models from `GET /v1/models`. */
export async function listModels(
  baseURL: string,
  apiKey: string,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<OpenAIModel[]> {
  const response = await fetchImpl(`${baseURL}/models`, {
    method: 'GET',
    headers: requestHeaders(apiKey, 'application/json'),
    ...signal === undefined ? {} : { signal },
  })
  if (!response.ok) await throwHttpError(response, baseURL)
  const body = await response.json() as { data?: OpenAIModel[] }
  return body.data ?? []
}

/** Send a streaming `POST /v1/chat/completions` and return the raw 2xx response. */
export async function postChatCompletions(
  baseURL: string,
  apiKey: string,
  body: unknown,
  fetchImpl: FetchLike,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetchImpl(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: requestHeaders(apiKey, 'text/event-stream'),
    body: JSON.stringify(body),
    ...signal === undefined ? {} : { signal },
  })
  if (!response.ok) await throwHttpError(response, baseURL)
  return response
}

/**
 * Decode a `ReadableStream<Uint8Array>` into SSE `data:` payload lines. Blank
 * lines and non-`data:` comments are skipped; the `data:` prefix is stripped;
 * the final line is yielded even without a trailing newline. The `[DONE]`
 * sentinel is yielded verbatim so the translator can close the stream.
 * @param body - the response body stream.
 * @returns `data:` payload strings in delivery order (including `[DONE]`).
 */
export async function* readSseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
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
        if (!line.startsWith('data:')) continue
        yield line.slice(5).trimStart()
      }
    }
  } finally {
    reader.releaseLock()
  }
  buffer += decoder.decode()
  if (buffer.startsWith('data:')) yield buffer.slice(5).trimStart()
}
