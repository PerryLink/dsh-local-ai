/**
 * Ollama NDJSON → StreamChunk translation: incremental text/reasoning deltas,
 * cumulative tool-call arguments diffed into deltas, usage and finish deferred
 * to the `done` chunk, and failure mapping (malformed JSON, provider error,
 * empty response, truncated stream).
 * @module dsh-local-ai/test/translate.spec
 */

import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { argumentsDelta, mapFinishReason, translate } from '../src/translate.ts'

async function collect(lines: string[]): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  async function* source(): AsyncGenerator<string> {
    for (const line of lines) yield line
  }
  for await (const chunk of translate(source())) chunks.push(chunk)
  return chunks
}

describe('argumentsDelta', () => {
  it('diffs cumulative JSON strings by longest common prefix', () => {
    expect(argumentsDelta('', '{"name":"foo"}')).toBe('{"name":"foo"}')
    expect(argumentsDelta('{"name":"foo"}', '{"name":"foo","age":3}')).toBe(',"age":3}')
    expect(argumentsDelta('{"name":"fo', '{"name":"foo"}')).toBe('o"}')
  })
})

describe('mapFinishReason', () => {
  it('maps the Ollama done_reason vocabulary', () => {
    expect(mapFinishReason('stop')).toEqual({ kind: 'stop' })
    expect(mapFinishReason('tool_calls')).toEqual({ kind: 'tool-calls' })
    expect(mapFinishReason('length')).toEqual({ kind: 'max-tokens' })
    expect(mapFinishReason('weird')).toEqual({ kind: 'error', failure: expect.objectContaining({ code: 'WEIRD' }) })
  })
})

describe('translate', () => {
  it('streams text deltas and defers usage + finish to the done chunk', async () => {
    const chunks = await collect([
      '{"message":{"role":"assistant","content":"Hello"},"done":false}',
      '{"message":{"role":"assistant","content":" world"},"done":false}',
      '{"message":{"role":"assistant","content":""},"done":true,"done_reason":"stop","prompt_eval_count":5,"eval_count":2}',
    ])
    const kinds = chunks.map(chunk => chunk.type)
    expect(kinds).toEqual(['block-start', 'text-delta', 'text-delta', 'block-end', 'usage', 'finish'])
    expect(chunks[1]).toEqual({ type: 'text-delta', index: 0, text: 'Hello' })
    expect(chunks[3]).toEqual({ type: 'block-end', index: 0, block: { type: 'text', text: 'Hello world' } })
    expect(chunks[4]).toEqual({ type: 'usage', usage: { inputTokens: 5, outputTokens: 2 } })
    expect(chunks[5]).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('streams reasoning before text', async () => {
    const chunks = await collect([
      '{"message":{"thinking":"hmm"},"done":false}',
      '{"message":{"content":"answer"},"done":false}',
      '{"message":{},"done":true,"done_reason":"stop"}',
    ])
    const blockTypes = chunks.filter(chunk => chunk.type === 'block-start').map(chunk => chunk.type === 'block-start' ? chunk.blockType : '')
    expect(blockTypes).toEqual(['reasoning', 'text'])
  })

  it('diffs cumulative tool-call arguments into deltas', async () => {
    const chunks = await collect([
      '{"message":{"tool_calls":[{"function":{"name":"read","arguments":{"path":"/x"}}}]},"done":false}',
      '{"message":{"tool_calls":[{"function":{"name":"read","arguments":{"path":"/x","line":1}}}]},"done":false}',
      '{"message":{},"done":true,"done_reason":"tool_calls"}',
    ])
    const deltas = chunks.filter(chunk => chunk.type === 'tool-call-delta')
    expect(deltas).toHaveLength(2)
    expect((deltas[1] as { argumentsDelta: string }).argumentsDelta).toBe(',"line":1}')
    const finish = chunks[chunks.length - 1]
    expect(finish).toEqual({ type: 'finish', reason: { kind: 'tool-calls' } })
  })

  it('mints a non-empty call id and reuses it for every chunk of the block', async () => {
    const chunks = await collect([
      '{"message":{"tool_calls":[{"function":{"name":"read","arguments":{"path":"/x"}}}]},"done":false}',
      '{"message":{"tool_calls":[{"function":{"name":"read","arguments":{"path":"/x","line":1}}}]},"done":false}',
      '{"message":{},"done":true,"done_reason":"tool_calls"}',
    ])
    const deltas = chunks.filter(chunk => chunk.type === 'tool-call-delta')
    const ends = chunks.filter(chunk => chunk.type === 'block-end')
    const ids = deltas.map(chunk => chunk.type === 'tool-call-delta' ? chunk.id : '')
    const closed = ends[0]?.type === 'block-end' && ends[0].block.type === 'tool-call' ? ends[0].block.id : ''

    // Ollama sends no id of its own: an empty one would reach the session log
    // and break resume, so the block has to carry a minted one.
    expect(ids.every(id => id.length > 0)).toBe(true)
    expect(closed.length).toBeGreaterThan(0)
    // Same block, same id: the call and its paired result must line up.
    expect(new Set(ids).size).toBe(1)
    expect(closed).toBe(ids[0])
  })

  it('gives parallel tool calls distinct ids', async () => {
    const chunks = await collect([
      '{"message":{"tool_calls":[{"function":{"name":"read","arguments":{"path":"/a"}}},{"function":{"name":"write","arguments":{"path":"/b"}}}]},"done":false}',
      '{"message":{},"done":true,"done_reason":"tool_calls"}',
    ])
    const byIndex = new Map<number, string>()
    for (const chunk of chunks) {
      if (chunk.type === 'tool-call-delta') byIndex.set(chunk.index, chunk.id)
    }
    const ids = [...byIndex.values()]
    expect(ids).toHaveLength(2)
    expect(ids.every(id => id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(2)
  })

  it('maps a stop finish with no content to an empty-response error', async () => {
    const chunks = await collect(['{"message":{},"done":true,"done_reason":"stop"}'])
    const finish = chunks[chunks.length - 1]
    expect(finish).toMatchObject({ type: 'finish', reason: { kind: 'error', failure: { code: 'EMPTY_RESPONSE' } } })
  })

  it('throws on a malformed line', async () => {
    await expect(collect(['not json'])).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
  })

  it('throws on an Ollama error chunk', async () => {
    await expect(collect(['{"error":"model not found"}'])).rejects.toThrow(/model not found/u)
  })

  it('throws when the stream ends without a done chunk', async () => {
    await expect(collect(['{"message":{"content":"x"},"done":false}'])).rejects.toMatchObject({ code: 'STREAM_CLOSED' })
  })
})
