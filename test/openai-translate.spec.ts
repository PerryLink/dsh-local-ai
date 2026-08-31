/**
 * OpenAI SSE translation: incremental text/reasoning deltas and direct
 * tool-call argument fragments assemble into StreamChunks, with usage and
 * finish deferred to `[DONE]`. Error chunks fail loud.
 * @module dsh-local-ai/test/openai-translate.spec
 */

import { CallId } from '../src/call-id.ts'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { mapOpenAIFinishReason, translateOpenAIStream } from '../src/openai-translate.ts'

async function collect(dataLines: string[]): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  async function* lines(): AsyncGenerator<string> {
    for (const data of dataLines) yield data
  }
  for await (const chunk of translateOpenAIStream(lines())) chunks.push(chunk)
  return chunks
}

const text = (content: string, finishReason: string | null = null): string =>
  JSON.stringify({ choices: [{ delta: { content }, finish_reason: finishReason }] })

describe('mapOpenAIFinishReason', () => {
  it('maps the OpenAI finish vocabulary', () => {
    expect(mapOpenAIFinishReason('stop')).toEqual({ kind: 'stop' })
    expect(mapOpenAIFinishReason('tool_calls')).toEqual({ kind: 'tool-calls' })
    expect(mapOpenAIFinishReason('length')).toEqual({ kind: 'max-tokens' })
    expect(mapOpenAIFinishReason('content_filter').kind).toBe('error')
  })
})

describe('translateOpenAIStream', () => {
  it('streams text deltas, usage, and a stop finish', async () => {
    const chunks = await collect([
      text('Hello'),
      text(' world'),
      JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 4, completion_tokens: 2 } }),
      '[DONE]',
    ])
    expect(chunks.filter(chunk => chunk.type === 'text-delta').map(chunk => (chunk as { text: string }).text)).toEqual(['Hello', ' world'])
    expect(chunks.find(chunk => chunk.type === 'usage')).toEqual({ type: 'usage', usage: { inputTokens: 4, outputTokens: 2 } })
    expect(chunks[chunks.length - 1]).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('streams reasoning and assembles tool-call argument fragments', async () => {
    const chunks = await collect([
      JSON.stringify({
        choices: [{
          delta: {
            reasoning_content: 'think',
            content: 'ok',
            tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'read', arguments: '' } }],
          },
          finish_reason: null,
        }],
      }),
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"path"' } }] }, finish_reason: null }] }),
      JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':"/x"}' } }] }, finish_reason: null }] }),
      JSON.stringify({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
      '[DONE]',
    ])
    expect(chunks.some(chunk => chunk.type === 'reasoning-delta')).toBe(true)
    const toolBlockEnd = chunks.find(chunk => chunk.type === 'block-end' && chunk.block.type === 'tool-call')
    expect(toolBlockEnd).toBeDefined()
    if (toolBlockEnd?.type !== 'block-end') throw new Error('expected a tool-call block-end')
    expect(toolBlockEnd.block).toEqual({ type: 'tool-call', id: CallId('call_1'), name: 'read', arguments: '{"path":"/x"}' })
    expect(chunks[chunks.length - 1]).toEqual({ type: 'finish', reason: { kind: 'tool-calls' } })
  })

  it('throws a PROVIDER error on an error chunk', async () => {
    await expect(collect([JSON.stringify({ error: { message: 'boom' } }), '[DONE]'])).rejects.toMatchObject({ code: 'PROVIDER' })
  })

  it('throws MALFORMED_RESPONSE on a non-JSON payload', async () => {
    await expect(collect(['not-json', '[DONE]'])).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' })
  })
})
