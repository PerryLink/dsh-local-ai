/**
 * `OllamaAdapter`: provider metadata, live model listing with a configured
 * fallback, exact-model resolution (mapping + context + max tokens), and the
 * NDJSON streaming path over a scripted `fetch`.
 * @module dsh-local-ai/test/adapter.spec
 */

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { OllamaAdapter } from '../src/adapter.ts'
import { resolveConfig } from '../src/config.ts'
import type { FetchLike } from '../src/ollama.ts'

async function collect(stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

function options(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
  return {
    provider: 'ollama',
    model: 'local',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })],
    ...overrides,
  }
}

describe('OllamaAdapter metadata', () => {
  const adapter = new OllamaAdapter({ config: () => resolveConfig() })

  it('describes the provider route', () => {
    expect(adapter.providerInfo('ollama')).toEqual({ id: 'ollama', name: 'Ollama (local)' })
  })

  it('resolves an unmapped model to its identity with defaults', async () => {
    const info = await adapter.resolveModel('ollama', 'llama3.2')
    expect(info).toMatchObject({ provider: 'ollama', id: 'llama3.2', name: 'llama3.2', inputModalities: ['text'] })
    expect(info.context).toEqual({ contextWindow: 8192 })
    expect(info.defaultMaxTokens).toBe(4096)
  })

  it('resolves a mapped model to its configured context and max tokens', async () => {
    const mapped = new OllamaAdapter({
      config: () => resolveConfig({ models: [{ name: 'local', model: 'llama3.2', contextWindow: 4096, maxTokens: 256 }] }),
    })
    const info = await mapped.resolveModel('ollama', 'local')
    expect(info.context).toEqual({ contextWindow: 4096 })
    expect(info.defaultMaxTokens).toBe(256)
  })

  it('declares image support when the model reports vision capabilities', async () => {
    const fetch: FetchLike = async () => new Response(JSON.stringify({ capabilities: ['completion', 'vision', 'tools'] }), { status: 200 })
    const vision = new OllamaAdapter({ config: () => resolveConfig(), fetchImpl: fetch })
    const info = await vision.resolveModel('ollama', 'qwen3.8-local')
    expect(info.inputModalities).toEqual(['text', 'image'])
  })

  it('keeps text-only when the vision config opts out', async () => {
    const fetch: FetchLike = async () => new Response(JSON.stringify({ capabilities: ['vision'] }), { status: 200 })
    const adapter = new OllamaAdapter({ config: () => resolveConfig({ vision: false }), fetchImpl: fetch })
    const info = await adapter.resolveModel('ollama', 'qwen3.8-local')
    expect(info.inputModalities).toEqual(['text'])
  })
})

describe('OllamaAdapter listModels', () => {
  it('advertises live models under their harness names', async () => {
    const fetch: FetchLike = async () => new Response(JSON.stringify({ models: [{ name: 'llama3.2', model: 'llama3.2', size: 1, digest: 'd' }] }), { status: 200 })
    const adapter = new OllamaAdapter({ config: () => resolveConfig({ models: [{ name: 'local', model: 'llama3.2' }] }), fetchImpl: fetch })
    const models = await adapter.listModels('ollama')
    expect(models.map(model => model.id)).toEqual(['local'])
  })

  it('falls back to configured models when the live query fails', async () => {
    const fetch: FetchLike = async () => { throw new Error('down') }
    const adapter = new OllamaAdapter({ config: () => resolveConfig({ models: [{ name: 'local' }] }), fetchImpl: fetch })
    const models = await adapter.listModels('ollama')
    expect(models.map(model => model.id)).toEqual(['local'])
  })
})

describe('OllamaAdapter stream', () => {
  it('streams NDJSON chat chunks through to the harness protocol', async () => {
    const fetch: FetchLike = async () => new Response(
      '{"message":{"role":"assistant","content":"Hi"},"done":false}\n'
      + '{"message":{},"done":true,"done_reason":"stop","prompt_eval_count":2,"eval_count":1}\n',
      { status: 200 },
    )
    const adapter = new OllamaAdapter({ config: () => resolveConfig(), fetchImpl: fetch })
    const chunks = await collect(adapter.stream(options()))
    expect(chunks.some(chunk => chunk.type === 'text-delta')).toBe(true)
    expect(chunks.some(chunk => chunk.type === 'usage')).toBe(true)
    expect(chunks[chunks.length - 1]).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('normalizes a transport failure to a LlmError', async () => {
    const fetch: FetchLike = async () => { throw new Error('ECONNREFUSED') }
    const adapter = new OllamaAdapter({ config: () => resolveConfig(), fetchImpl: fetch })
    await expect(collect(adapter.stream(options()))).rejects.toMatchObject({ code: 'TRANSPORT' })
  })

  it('resolves attachments and posts base64 images for an image-bearing request', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetch: FetchLike = async (url, init) => {
      calls.push({ url, init: init ?? {} })
      return new Response('{"message":{},"done":true,"done_reason":"stop"}\n', { status: 200 })
    }
    const readImageRequest = async (_ref: never, _policy: never): Promise<{ data: Uint8Array }> => ({ data: new TextEncoder().encode('PNGDATA') })
    const adapter = new OllamaAdapter({
      config: () => resolveConfig(),
      fetchImpl: fetch,
      resolveAttachments: () => ({ readImageRequest }) as never,
    })
    await collect(adapter.stream(options({
      messages: [createUserMessage({
        content: [
          { type: 'text', text: 'look' },
          { type: 'image', attachment: { attachmentId: 'a1' } as never },
        ],
        source: { kind: 'user' },
      })],
    })))
    const body = JSON.parse(String(calls[0]?.init.body)) as { messages: Array<{ images?: string[] }> }
    expect(body.messages[0]?.images).toEqual([Buffer.from('PNGDATA').toString('base64')])
  })

  it('fails loud on image content when the attachment service is missing', async () => {
    const fetch: FetchLike = async () => new Response('{"message":{},"done":true}\n', { status: 200 })
    const adapter = new OllamaAdapter({ config: () => resolveConfig(), fetchImpl: fetch })
    const imageOptions = options({
      messages: [createUserMessage({ content: [{ type: 'image', attachment: { attachmentId: 'a1' } as never }], source: { kind: 'user' } })],
    })
    await expect(collect(adapter.stream(imageOptions))).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT' })
  })

  it('fails loud on image content when the vision config opts out', async () => {
    const fetch: FetchLike = async () => new Response('{"message":{},"done":true}\n', { status: 200 })
    const adapter = new OllamaAdapter({
      config: () => resolveConfig({ vision: false }),
      fetchImpl: fetch,
      resolveAttachments: () => ({ readImageRequest: async () => ({ data: new Uint8Array() }) }) as never,
    })
    const imageOptions = options({
      messages: [createUserMessage({ content: [{ type: 'image', attachment: { attachmentId: 'a1' } as never }], source: { kind: 'user' } })],
    })
    await expect(collect(adapter.stream(imageOptions))).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT' })
  })
})
