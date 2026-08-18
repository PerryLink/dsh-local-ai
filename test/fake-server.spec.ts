/**
 * Adversarial fixture: a real local HTTP server (node:http, sealed loopback)
 * drives the Ollama adapter through an auth failure (401), a malformed NDJSON
 * stream, and an idle-timeout stream. No external network is touched: the
 * adapter's default `globalThis.fetch` talks only to `127.0.0.1`.
 * @module dsh-local-ai/test/fake-server.spec
 */

import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { afterEach, describe, expect, it } from 'vitest'
import { OllamaAdapter } from '../src/adapter.ts'
import { resolveConfig } from '../src/config.ts'

async function collect(stream: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

function options(): GenerateOptions {
  return {
    provider: 'ollama',
    model: 'local',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })],
  }
}

/** Bind one server to an ephemeral loopback port and return its base URL. */
async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? address.port : 0
  return `http://127.0.0.1:${port}`
}

/** Close a server, tearing down any still-open sockets (e.g. the hung timeout case). */
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

describe('OllamaAdapter against a real local server', () => {
  it('normalizes a 401 auth failure to HTTP_401', async () => {
    const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
    })
    servers.push(server)
    const baseURL = await listen(server)
    const adapter = new OllamaAdapter({ config: () => resolveConfig({ baseURL }) })
    await expect(collect(adapter.stream(options()))).rejects.toMatchObject({ code: 'HTTP_401' })
  })

  it('fails a malformed NDJSON stream with MALFORMED_RESPONSE', async () => {
    const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'content-type': 'application/x-ndjson' })
      res.end('this is not json\n')
    })
    servers.push(server)
    const baseURL = await listen(server)
    const adapter = new OllamaAdapter({ config: () => resolveConfig({ baseURL }) })
    await expect(collect(adapter.stream(options()))).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
  })

  it('times out a stalled stream with TIMEOUT', async () => {
    const server = createServer(() => {
      // Accept the request but never write a response body.
    })
    servers.push(server)
    const baseURL = await listen(server)
    const adapter = new OllamaAdapter({ config: () => resolveConfig({ baseURL, requestTimeoutMs: 200 }) })
    await expect(collect(adapter.stream(options()))).rejects.toMatchObject({ code: 'TIMEOUT' })
  })
})
