/**
 * The plugin assembly over the REAL host seams (LlmRuntime, SystemPrompt +
 * ToolRuntime, CommandRuntime, local subprocess) with a scripted network edge:
 * fail-loud config, adapter/tool registration, real tool dispatch, and the
 * `llm/stream` routing waterfall with cloud fallback.
 * @module dsh-local-ai/test/index.spec
 */

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { CallId } from '../src/call-id.ts'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountServices } from './harness.ts'

async function loadPlugin() {
  const module = await import('../src/index.ts')
  return module as unknown as { apply: (ctx: never, config?: never) => void }
}

function installFetch() {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    if (url.endsWith('/api/chat')) {
      return new Response(
        '{"message":{"role":"assistant","content":"local reply"},"done":false}\n'
        + '{"message":{},"done":true,"done_reason":"stop"}\n',
        { status: 200 },
      )
    }
    if (url.endsWith('/api/tags')) {
      return new Response(JSON.stringify({ models: [{ name: 'llama3.2', model: 'llama3.2', size: 100, digest: 'd', details: { parameter_size: '3B' } }] }), { status: 200 })
    }
    if (url.endsWith('/api/ps')) {
      return new Response(JSON.stringify({ models: [] }), { status: 200 })
    }
    return new Response('{}', { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apply', () => {
  it('fails loud on an invalid config', async () => {
    const ctx = await mountServices()
    const plugin = await loadPlugin()
    await expect(ctx.plugin(plugin as never, { baseURL: 'not a url' } as never)).rejects.toThrow(/valid URL/u)
  })

  it('registers the ollama adapter and the management tools', async () => {
    const ctx = await mountServices()
    const plugin = await loadPlugin()
    const fiber = await ctx.plugin(plugin as never, {} as never)

    const providers = ctx.llm.listProviders()
    expect(providers.some(provider => provider.id === 'ollama')).toBe(true)

    const toolNames = ctx.tools.schemas().map(schema => schema.name)
    expect(toolNames).toEqual(expect.arrayContaining(['ollama_list', 'ollama_show', 'ollama_pull', 'ollama_remove', 'ollama_health']))

    await fiber.dispose()
  })

  it('dispatches ollama_list through the real tool runtime', async () => {
    const ctx = await mountServices()
    const plugin = await loadPlugin()
    installFetch()
    await ctx.plugin(plugin as never, {} as never)

    const result = await ctx.tools.execute({
      callId: CallId('c1'),
      name: 'ollama_list',
      arguments: {},
      signal: new AbortController().signal,
    })
    expect(result.isError).toBe(false)
    if (result.isError === false) {
      expect(result.value).toMatchObject({ count: 1, totalBytes: 100 })
    }
  })

  it('routes a keyword-matched request to the local model', async () => {
    const ctx = await mountServices()
    const plugin = await loadPlugin()
    const { calls } = installFetch()
    await ctx.plugin(plugin as never, { route: [{ model: 'local', keywords: ['confidential'] }] } as never)

    const chunks: StreamChunk[] = []
    for await (const chunk of ctx.llm.stream({
      provider: 'deepseek',
      model: 'deepseek-v4',
      messages: [createUserMessage({ content: [{ type: 'text', text: 'handle this confidential note' }], source: { kind: 'user' } })],
    })) chunks.push(chunk)

    expect(chunks.some(chunk => chunk.type === 'text-delta')).toBe(true)
    const chatCall = calls.find(call => call.url.endsWith('/api/chat'))
    expect(chatCall).toBeDefined()
    const body = JSON.parse(String(chatCall?.init?.body)) as { model: string }
    expect(body.model).toBe('local')
  })

  it('falls back to the cloud when the local route fails before content', async () => {
    const ctx = await mountServices()
    const plugin = await loadPlugin()
    // Local /api/chat fails with a server error; there is no cloud adapter, so
    // the fallback surfaces the cloud's NO_ADAPTER failure rather than local chunks.
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/api/chat')) return new Response(JSON.stringify({ error: 'down' }), { status: 500 })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await ctx.plugin(plugin as never, { route: [{ model: 'local', always: true }] } as never)

    const chunks: StreamChunk[] = []
    for await (const chunk of ctx.llm.stream({
      provider: 'deepseek',
      model: 'deepseek-v4',
      messages: [createUserMessage({ content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } })],
    })) chunks.push(chunk)

    // The cloud route has no adapter, so the terminal chunk is the cloud's
    // NO_ADAPTER failure — proving the local failure did NOT short-circuit.
    const finish = chunks.find(chunk => chunk.type === 'finish')
    expect(finish).toBeDefined()
    expect(finish?.type === 'finish' && finish.reason.kind === 'error').toBe(true)
  })
})
