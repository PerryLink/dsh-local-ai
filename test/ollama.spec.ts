/**
 * Ollama HTTP client over a scripted `fetch`: endpoint construction, method
 * mapping, NDJSON pull decoding, and non-2xx failure normalization (status
 * code + sanitized endpoint).
 * @module dsh-local-ai/test/ollama.spec
 */

import { describe, expect, it, vi } from 'vitest'
import { apiVersion, listModels, listRunning, pullModel, removeModel, showModel } from '../src/ollama.ts'
import type { FetchLike } from '../src/ollama.ts'

function fetchMock(handler: (url: string, init?: RequestInit) => Response): { fetch: FetchLike; calls: Array<{ url: string; init: RequestInit | undefined }> } {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetch: FetchLike = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    return handler(url, init)
  })
  return { fetch, calls }
}

const BASE = 'http://127.0.0.1:11434'

describe('listModels and listRunning', () => {
  it('hits /api/tags and /api/ps', async () => {
    const { fetch } = fetchMock((url) => {
      if (url.endsWith('/api/tags')) return new Response(JSON.stringify({ models: [{ name: 'llama3.2', model: 'llama3.2', size: 1024, digest: 'd' }] }), { status: 200 })
      return new Response(JSON.stringify({ models: [] }), { status: 200 })
    })
    const models = await listModels(BASE, fetch)
    expect(models).toHaveLength(1)
    expect(models[0]?.name).toBe('llama3.2')
    const running = await listRunning(BASE, fetch)
    expect(running).toEqual([])
  })

  it('includes the attribution user-agent header', async () => {
    const { fetch, calls } = fetchMock(() => new Response(JSON.stringify({ models: [] }), { status: 200 }))
    await listModels(BASE, fetch)
    const headers = (calls[0]?.init?.headers ?? {}) as Record<string, string>
    expect(headers['user-agent']).toContain('deepseek-harness/')
  })
})

describe('management operations', () => {
  it('shows, removes, and versions through the right endpoints', async () => {
    const { fetch, calls } = fetchMock((_url, init) => {
      if (init?.method === 'POST' && _url.endsWith('/api/show')) {
        return new Response(JSON.stringify({ details: { parameter_size: '7B', quantization_level: 'Q4_K_M' }, model_info: { 'llama.context_length': 8192 } }), { status: 200 })
      }
      if (init?.method === 'DELETE') return new Response(JSON.stringify({ status: 'success' }), { status: 200 })
      return new Response(JSON.stringify({ version: '0.9.0' }), { status: 200 })
    })
    const show = await showModel(BASE, 'llama3.2', fetch)
    expect(show.details?.parameter_size).toBe('7B')
    await removeModel(BASE, 'llama3.2', fetch)
    expect(calls.some(call => call.init?.method === 'DELETE' && call.url.endsWith('/api/delete'))).toBe(true)
    const version = await apiVersion(BASE, fetch)
    expect(version).toBe('0.9.0')
  })

  it('consumes the pull NDJSON stream to the final status', async () => {
    const { fetch } = fetchMock(() => new Response('{"status":"pulling"}\n{"status":"success"}\n', { status: 200 }))
    const result = await pullModel(BASE, 'llama3.2', fetch)
    expect(result.status).toBe('success')
  })
})

describe('failure normalization', () => {
  it('maps a 404 with a provider error body to HTTP_404', async () => {
    const { fetch } = fetchMock(() => new Response(JSON.stringify({ error: "model 'x' not found" }), { status: 404 }))
    await expect(listModels(BASE, fetch)).rejects.toMatchObject({ code: 'HTTP_404', failure: { status: 404 } })
  })

  it('sanitizes the endpoint in a status-only error message', async () => {
    const { fetch } = fetchMock(() => new Response('{}', { status: 500 }))
    let message = ''
    try {
      await listModels('http://user:secret@host:11434', fetch)
    } catch (caught) {
      message = caught instanceof Error ? caught.message : String(caught)
    }
    expect(message).not.toContain('user')
    expect(message).not.toContain('secret')
    expect(message).toContain('host:11434')
  })
})
