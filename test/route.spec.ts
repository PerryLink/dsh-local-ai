/**
 * Routing decision and streaming fallback: task-type/keyword rules match in
 * order, requests already on the `ollama` route never re-route, and a local
 * route that fails before producing content falls back to the cloud.
 * @module dsh-local-ai/test/route.spec
 */

import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { decideRoute, requestText, routeLocal, ruleMatches } from '../src/route.ts'

function options(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
  return {
    provider: 'deepseek',
    model: 'deepseek-v4',
    messages: [createUserMessage({ content: [{ type: 'text', text: 'handle this confidential document offline' }], source: { kind: 'user' } })],
    ...overrides,
  }
}

async function* collect(stream: AsyncIterable<StreamChunk>): AsyncGenerator<StreamChunk> {
  for await (const chunk of stream) yield chunk
}

describe('requestText and ruleMatches', () => {
  it('joins system and message text for keyword matching', () => {
    expect(requestText(options({ system: 'be terse' }))).toContain('be terse')
    expect(requestText(options())).toContain('confidential')
  })

  it('matches purpose, keywords (case-insensitive), and always', () => {
    const base = { model: 'local', provider: 'ollama', keywords: [] as string[], always: false }
    expect(ruleMatches({ ...base, always: true }, options())).toBe(true)
    expect(ruleMatches({ ...base, purpose: 'compaction' }, options({ purpose: 'compaction' }))).toBe(true)
    expect(ruleMatches({ ...base, keywords: ['CONFIDENTIAL'] }, options())).toBe(true)
    expect(ruleMatches({ ...base, keywords: ['nomatch'] }, options())).toBe(false)
  })
})

describe('decideRoute', () => {
  it('never re-routes a request already on the ollama provider', () => {
    const resolved = resolveConfig({ route: [{ model: 'local', always: true }] })
    expect(decideRoute(options({ provider: 'ollama' }), resolved)).toBeUndefined()
  })

  it('returns undefined when no rule matches', () => {
    const resolved = resolveConfig({ route: [{ model: 'local', keywords: ['nomatch'] }] })
    expect(decideRoute(options(), resolved)).toBeUndefined()
  })

  it('returns the first matching rule model', () => {
    const resolved = resolveConfig({
      route: [
        { model: 'first', keywords: ['confidential'] },
        { model: 'second', always: true },
      ],
    })
    expect(decideRoute(options(), resolved)).toEqual({ provider: 'ollama', model: 'first' })
  })

  it('routes to a configured OpenAI-compatible backend by provider', () => {
    const resolved = resolveConfig({
      backends: [{ name: 'lmstudio', baseURL: 'http://127.0.0.1:1234/v1' }],
      route: [{ model: 'qwen', provider: 'openai:lmstudio', always: true }],
    })
    expect(decideRoute(options(), resolved)).toEqual({ provider: 'openai:lmstudio', model: 'qwen' })
  })

  it('never re-routes a request already on a backend provider', () => {
    const resolved = resolveConfig({
      backends: [{ name: 'lmstudio', baseURL: 'http://127.0.0.1:1234/v1' }],
      route: [{ model: 'qwen', always: true }],
    })
    expect(decideRoute(options({ provider: 'openai:lmstudio' }), resolved)).toBeUndefined()
  })
})

describe('routeLocal', () => {
  it('falls back to the cloud when local fails before producing content', async () => {
    async function* failLocal(): AsyncGenerator<StreamChunk> {
      yield { type: 'finish', reason: { kind: 'error', failure: { message: 'down', code: 'SERVER' } } }
    }
    async function* cloud(): AsyncGenerator<StreamChunk> {
      yield { type: 'text-delta', index: 0, text: 'cloud' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
    const chunks: StreamChunk[] = []
    for await (const chunk of routeLocal(() => failLocal(), options(), { provider: 'ollama', model: 'local' }, () => cloud())) chunks.push(chunk)
    expect(chunks).toContainEqual({ type: 'text-delta', index: 0, text: 'cloud' })
  })

  it('forwards local content once it has started', async () => {
    async function* goodLocal(): AsyncGenerator<StreamChunk> {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'local' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
    async function* cloud(): AsyncGenerator<StreamChunk> {
      yield { type: 'text-delta', index: 0, text: 'cloud' }
    }
    const chunks: StreamChunk[] = []
    for await (const chunk of routeLocal(() => goodLocal(), options(), { provider: 'ollama', model: 'local' }, () => cloud())) chunks.push(chunk)
    expect(chunks).toContainEqual({ type: 'text-delta', index: 0, text: 'local' })
    expect(chunks).not.toContainEqual({ type: 'text-delta', index: 0, text: 'cloud' })
  })

  it('re-routes the request to the ollama provider with the chosen model', async () => {
    const seen: Array<{ provider: string; model: string }> = []
    async function* local(): AsyncGenerator<StreamChunk> {
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
    const streamLocal = (opts: GenerateOptions): AsyncIterable<StreamChunk> => {
      seen.push({ provider: opts.provider, model: opts.model })
      return collect(local())
    }
    for await (const _chunk of routeLocal(streamLocal, options(), { provider: 'ollama', model: 'local' }, () => collect(local()))) { /* drain */ }
    expect(seen).toEqual([{ provider: 'ollama', model: 'local' }])
  })

  it('re-routes to a backend provider when the decision names one', async () => {
    const seen: Array<{ provider: string; model: string }> = []
    async function* local(): AsyncGenerator<StreamChunk> {
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
    const streamLocal = (opts: GenerateOptions): AsyncIterable<StreamChunk> => {
      seen.push({ provider: opts.provider, model: opts.model })
      return collect(local())
    }
    for await (const _chunk of routeLocal(streamLocal, options(), { provider: 'openai:lmstudio', model: 'qwen' }, () => collect(local()))) { /* drain */ }
    expect(seen).toEqual([{ provider: 'openai:lmstudio', model: 'qwen' }])
  })
})
