/**
 * Adversarial fixture: a real local HTTP server (node:http, sealed loopback)
 * drives the OpenAI-compatible adapter through a successful SSE stream and an
 * auth failure (401). No external network is touched: the adapter's default
 * `globalThis.fetch` talks only to `127.0.0.1`.
 * @module dsh-local-ai/test/openai-fake-server.spec
 */

import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it } from 'vitest'
import { OpenAICompatibleAdapter } from '../src/openai-adapter.ts'
import { resolveConfig } from '../src/config.ts'

async function collect(stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

function options(): GenerateOptions {
  return {
    provider: 'openai:lmstudio',
    model: 'qwen',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })],
  }
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? address.port : 0
  return `http://127.0.0.1:${port}/v1`
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections?.()
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error === undefined ? resolve() : reject(error)))
  })
}

const servers: Server[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => closeServer(server)))
})

describe('OpenAICompatibleAdapter against a real local server', () => {
  it('streams an SSE chat completion into StreamChunks', async () => {
    const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.write('data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n')
      res.write('data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":2}}\n\n')
      res.write('data: [DONE]\n\n')
      res.end()
    })
    servers.push(server)
    const baseURL = await listen(server)
    const backend = resolveConfig({ backends: [{ name: 'lmstudio', baseURL }] }).backends[0]!
    const adapter = new OpenAICompatibleAdapter({ config: () => backend })
    const chunks = await collect(adapter.stream(options()))
    expect(chunks.some(chunk => chunk.type === 'text-delta' && (chunk as { text: string }).text === 'Hi')).toBe(true)
    expect(chunks[chunks.length - 1]).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('normalizes a 401 auth failure to HTTP_401', async () => {
    const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'unauthorized' } }))
    })
    servers.push(server)
    const baseURL = await listen(server)
    const backend = resolveConfig({ backends: [{ name: 'lmstudio', baseURL }] }).backends[0]!
    const adapter = new OpenAICompatibleAdapter({ config: () => backend })
    await expect(collect(adapter.stream(options()))).rejects.toMatchObject({ code: 'HTTP_401' })
  })

  it('lists models from /v1/models and resolves a model through the mapping', async () => {
    const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ data: [{ id: 'qwen2.5-7b' }] }))
    })
    servers.push(server)
    const baseURL = await listen(server)
    const backend = resolveConfig({
      backends: [{ name: 'lmstudio', baseURL, models: [{ name: 'qwen', model: 'qwen2.5-7b' }] }],
    }).backends[0]!
    const adapter = new OpenAICompatibleAdapter({ config: () => backend })
    expect(adapter.providerInfo('openai:lmstudio')).toEqual({ id: 'openai:lmstudio', name: 'OpenAI-compatible (lmstudio)' })
    expect(await adapter.listModels('openai:lmstudio')).toEqual([
      { provider: 'openai:lmstudio', id: 'qwen', name: 'qwen', inputModalities: ['text'] },
    ])
    expect(await adapter.resolveModel('openai:lmstudio', 'qwen')).toMatchObject({
      provider: 'openai:lmstudio',
      id: 'qwen',
      inputModalities: ['text'],
      context: { contextWindow: 8192 },
      defaultMaxTokens: 4096,
    })
  })
})
