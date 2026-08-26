/**
 * Translate OpenAI-compatible SSE chat chunks into the harness `StreamChunk`
 * protocol. Each `data:` payload carries `choices[].delta` (incremental
 * `content`, `reasoning_content`, and `tool_calls` whose `function.arguments`
 * fragments append directly) plus an eventual `finish_reason` and `usage`.
 * The `[DONE]` sentinel closes the stream; `block-end`, `usage`, and `finish`
 * are deferred until the end, guaranteeing no chunk follows `finish`.
 * @module dsh-local-ai/openai-translate
 */

import { CallId, EMPTY_RESPONSE_CODE, LlmError } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, FinishReason, StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'

/** One OpenAI SSE delta chunk on the wire. */
export interface OpenAISseChunk {
  choices?: Array<{
    delta?: {
      content?: string | null
      reasoning_content?: string | null
      tool_calls?: Array<{
        index?: number
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string | null
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string }
}

/** One open block under assembly. */
interface OpenBlock {
  index: number
  kind: 'text' | 'reasoning' | 'tool-call'
  text: string
  /** tool-call only */
  callId?: string
  name?: string
}

/**
 * Map the OpenAI `finish_reason` vocabulary to the harness FinishReason.
 * @param reason - the wire `finish_reason` string.
 * @returns the mapped reason; unrecognized values become `{kind: 'error'}`.
 */
export function mapOpenAIFinishReason(reason: string): FinishReason {
  switch (reason) {
    case 'stop': return { kind: 'stop' }
    case 'tool_calls':
    case 'function_call': return { kind: 'tool-calls' }
    case 'length': return { kind: 'max-tokens' }
    case 'content_filter': return {
      kind: 'error',
      failure: { message: 'model stopped: content filter', code: 'CONTENT_FILTER' },
    }
    default:
      return {
        kind: 'error',
        failure: { message: `model stopped: ${reason}`, code: reason.toUpperCase() },
      }
  }
}

/** Assemble the final ContentBlock for one open block. */
function closeBlock(block: OpenBlock): ContentBlock {
  switch (block.kind) {
    case 'text': return { type: 'text', text: block.text }
    case 'reasoning': return { type: 'reasoning', text: block.text }
    case 'tool-call': return {
      type: 'tool-call',
      id: CallId(block.callId ?? ''),
      name: block.name ?? '',
      arguments: block.text,
    }
  }
}

/**
 * Mint a session-unique tool-call id for a tool-call block that streamed no
 * wire id. Without it the emitted chunks and the persisted tool result carry an
 * empty CallId, and the session fails validation on resume.
 * @param block - the freshly opened tool-call block.
 * @returns the minted id.
 */
function mintCallId(block: OpenBlock): string {
  return `openai-${Date.now().toString(36)}-${block.index}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Consume OpenAI SSE `data:` payload lines and yield StreamChunks. Text and
 * reasoning deltas stream as they arrive; tool-call argument fragments append
 * directly; `block-end`, `usage`, and `finish` are deferred to the `[DONE]`
 * sentinel. A `stop` finish with no opened blocks maps to an `EMPTY_RESPONSE`
 * error finish.
 * @param lines - `data:` payload strings (already prefix-stripped, including `[DONE]`).
 * @returns deltas as they arrive; `block-end`s, `usage`, and `finish` deferred to the end.
 */
export async function* translateOpenAIStream(lines: AsyncIterable<string>): AsyncGenerator<StreamChunk> {
  let nextIndex = 0
  let textBlock: OpenBlock | undefined
  let reasoningBlock: OpenBlock | undefined
  const toolBlocks = new Map<number, OpenBlock>()
  const order: OpenBlock[] = []
  let finishReason: string | null = null
  let usage: TokenUsage | undefined

  function open(kind: OpenBlock['kind']): OpenBlock {
    const block: OpenBlock = { index: nextIndex++, kind, text: '' }
    order.push(block)
    return block
  }

  for await (const data of lines) {
    if (data === '[DONE]') break
    if (data.length === 0) continue

    let chunk: OpenAISseChunk
    try {
      chunk = JSON.parse(data) as OpenAISseChunk
    } catch {
      throw new LlmError(`malformed OpenAI SSE payload: ${data.slice(0, 120)}`, 'MALFORMED_RESPONSE')
    }

    const errorMessage = chunk.error?.message
    if (typeof errorMessage === 'string' && errorMessage.length > 0) {
      throw new LlmError(errorMessage, 'PROVIDER')
    }

    for (const choice of chunk.choices ?? []) {
      const delta = choice.delta ?? {}

      const reasoning = delta.reasoning_content
      if (typeof reasoning === 'string' && reasoning.length > 0) {
        if (!reasoningBlock) {
          reasoningBlock = open('reasoning')
          yield { type: 'block-start', index: reasoningBlock.index, blockType: 'reasoning' }
        }
        reasoningBlock.text += reasoning
        yield { type: 'reasoning-delta', index: reasoningBlock.index, text: reasoning }
      }

      const content = delta.content
      if (typeof content === 'string' && content.length > 0) {
        if (!textBlock) {
          textBlock = open('text')
          yield { type: 'block-start', index: textBlock.index, blockType: 'text' }
        }
        textBlock.text += content
        yield { type: 'text-delta', index: textBlock.index, text: content }
      }

      for (const call of delta.tool_calls ?? []) {
        const index = call.index ?? 0
        let block = toolBlocks.get(index)
        if (!block) {
          block = open('tool-call')
          block.callId = typeof call.id === 'string' && call.id.length > 0 ? call.id : mintCallId(block)
          toolBlocks.set(index, block)
          yield { type: 'block-start', index: block.index, blockType: 'tool-call' }
        } else if (block.callId === undefined && typeof call.id === 'string' && call.id.length > 0) {
          block.callId = call.id
        }
        if (block.name === undefined && typeof call.function?.name === 'string' && call.function.name.length > 0) {
          block.name = call.function.name
        }
        const fragment = typeof call.function?.arguments === 'string' ? call.function.arguments : ''
        if (fragment.length > 0) {
          block.text += fragment
          yield {
            type: 'tool-call-delta',
            index: block.index,
            id: CallId(block.callId ?? ''),
            ...block.name !== undefined ? { name: block.name } : {},
            argumentsDelta: fragment,
          }
        }
      }

      if (typeof choice.finish_reason === 'string' && choice.finish_reason.length > 0) {
        finishReason = choice.finish_reason
      }
    }

    if (chunk.usage !== undefined) {
      usage = {
        inputTokens: chunk.usage.prompt_tokens ?? 0,
        outputTokens: chunk.usage.completion_tokens ?? 0,
      }
    }
  }

  for (const block of order) {
    yield { type: 'block-end', index: block.index, block: closeBlock(block) }
  }
  if (usage !== undefined) yield { type: 'usage', usage }
  const reason = mapOpenAIFinishReason(finishReason ?? 'stop')
  yield {
    type: 'finish',
    reason: reason.kind === 'stop' && order.length === 0
      ? {
        kind: 'error',
        failure: { message: 'model returned a completed response with no content', code: EMPTY_RESPONSE_CODE },
      }
      : reason,
  }
}
