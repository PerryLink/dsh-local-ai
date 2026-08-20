/**
 * Translate Ollama NDJSON chat chunks into the harness `StreamChunk` protocol.
 * Ollama streams one JSON object per line: `message.content` and
 * `message.thinking` are incremental deltas, while `message.tool_calls`
 * carries the CUMULATIVE arguments object, so tool-call deltas are computed by
 * longest-common-prefix diffing. Usage and the finish reason are deferred to
 * the `done: true` chunk, guaranteeing no chunk follows `finish`.
 * @module dsh-local-ai/translate
 */

import { CallId, EMPTY_RESPONSE_CODE, LlmError } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, FinishReason, StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'

/** One Ollama streaming chat chunk on the wire. */
export interface OllamaWireChunk {
  model?: string
  message?: {
    role?: string
    content?: string
    thinking?: string
    tool_calls?: Array<{ function?: { name?: string; arguments?: Record<string, unknown> } }>
  }
  done?: boolean
  done_reason?: string
  prompt_eval_count?: number
  eval_count?: number
  error?: string
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
 * Map the Ollama `done_reason` vocabulary to the harness FinishReason.
 * @param reason - the wire `done_reason` string.
 * @returns the mapped reason; unrecognized values become `{kind: 'error'}`.
 */
export function mapFinishReason(reason: string): FinishReason {
  switch (reason) {
    case 'stop': return { kind: 'stop' }
    case 'tool_calls': return { kind: 'tool-calls' }
    case 'length': return { kind: 'max-tokens' }
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
 * Mint a session-unique tool-call id for a freshly opened block. Ollama's
 * wire format carries no tool-call id, so one must be synthesized: without it
 * the emitted chunks and the persisted tool result all carry an empty CallId,
 * and the session fails validation on resume. The block index keeps
 * same-millisecond parallel calls apart.
 * @param block - the freshly opened tool-call block.
 * @returns the minted id.
 */
function mintCallId(block: OpenBlock): string {
  return `ollama-${Date.now().toString(36)}-${block.index}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Compute the append delta from a cumulative JSON string, so the harness's
 * delta-concatenating assembler reconstructs the full arguments. Ollama grows
 * the arguments object monotonically, so the delta is everything past the
 * longest common prefix with the previously seen string.
 * @param previous - the previously seen cumulative JSON (or `''`).
 * @param next - the new cumulative JSON.
 * @returns the fragment to append.
 */
export function argumentsDelta(previous: string, next: string): string {
  if (next.startsWith(previous)) return next.slice(previous.length)
  let index = 0
  while (index < previous.length && index < next.length && previous[index] === next[index]) index += 1
  return next.slice(index)
}

/**
 * Whether the previous cumulative arguments object is a key/value subset of
 * the next one, i.e. one call grew monotonically. While one call streams,
 * Ollama only adds keys; when it reuses a slot for a new call, existing keys
 * reappear with different values, so the subset check fails and the slot must
 * open a fresh block. Non-object arguments (or either side failing to parse,
 * which cannot happen for JSON.stringify output but keeps the guard total)
 * fall back to treating the chunk as a continuation.
 * @param previous - the previously seen cumulative JSON (or `''`).
 * @param next - the new cumulative JSON.
 * @returns `true` when `next` extends `previous` monotonically.
 */
export function isMonotonicExtension(previous: string, next: string): boolean {
  if (previous === '') return true
  let prevObj: unknown
  let nextObj: unknown
  try {
    prevObj = JSON.parse(previous)
    nextObj = JSON.parse(next)
  } catch {
    return true
  }
  if (typeof prevObj !== 'object' || prevObj === null || Array.isArray(prevObj)) return true
  if (typeof nextObj !== 'object' || nextObj === null || Array.isArray(nextObj)) return true
  for (const [key, value] of Object.entries(prevObj)) {
    if (!(key in nextObj)) return false
    if (JSON.stringify((nextObj as Record<string, unknown>)[key]) !== JSON.stringify(value)) return false
  }
  return true
}

/**
 * Consume Ollama NDJSON lines and yield StreamChunks. Text and reasoning deltas
 * stream as they arrive; tool-call deltas are diffed from the cumulative wire
 * arguments; `block-end`, `usage`, and `finish` are deferred to the `done`
 * chunk. A `stop` finish with no opened blocks maps to an `EMPTY_RESPONSE`
 * error finish.
 * @param lines - newline-delimited Ollama chat payloads.
 * @returns deltas as they arrive; `block-end`s, `usage`, and `finish` deferred to `done`.
 */
export async function* translate(lines: AsyncIterable<string>): AsyncGenerator<StreamChunk> {
  let nextIndex = 0
  let textBlock: OpenBlock | undefined
  let reasoningBlock: OpenBlock | undefined
  const toolBlocks = new Map<number, OpenBlock>()
  const toolArguments = new Map<number, string>()
  const order: OpenBlock[] = []

  function open(kind: OpenBlock['kind']): OpenBlock {
    const block: OpenBlock = { index: nextIndex++, kind, text: '' }
    order.push(block)
    return block
  }

  for await (const line of lines) {
    if (line.length === 0) continue

    let chunk: OllamaWireChunk
    try {
      chunk = JSON.parse(line) as OllamaWireChunk
    } catch {
      throw new LlmError(`malformed Ollama NDJSON payload: ${line.slice(0, 120)}`, 'MALFORMED_RESPONSE')
    }

    if (typeof chunk.error === 'string' && chunk.error.length > 0) {
      throw new LlmError(chunk.error, 'PROVIDER')
    }

    const message = chunk.message
    if (message !== undefined) {
      const reasoning = message.thinking
      if (typeof reasoning === 'string' && reasoning.length > 0) {
        if (!reasoningBlock) {
          reasoningBlock = open('reasoning')
          yield { type: 'block-start', index: reasoningBlock.index, blockType: 'reasoning' }
        }
        reasoningBlock.text += reasoning
        yield { type: 'reasoning-delta', index: reasoningBlock.index, text: reasoning }
      }

      const content = message.content
      if (typeof content === 'string' && content.length > 0) {
        if (!textBlock) {
          textBlock = open('text')
          yield { type: 'block-start', index: textBlock.index, blockType: 'text' }
        }
        textBlock.text += content
        yield { type: 'text-delta', index: textBlock.index, text: content }
      }

      const toolCalls = message.tool_calls ?? []
      for (let callIndex = 0; callIndex < toolCalls.length; callIndex++) {
        const call = toolCalls[callIndex]
        let block = toolBlocks.get(callIndex)
        if (!block) {
          block = open('tool-call')
          block.callId = mintCallId(block)
          toolBlocks.set(callIndex, block)
          toolArguments.set(callIndex, '')
          yield { type: 'block-start', index: block.index, blockType: 'tool-call' }
        }
        if (call?.function?.name !== undefined && block.name === undefined) {
          block.name = call.function.name
        }
        const cumulative = JSON.stringify(call?.function?.arguments ?? {})
        const previous = toolArguments.get(callIndex) ?? ''
        if (cumulative !== previous) {
          if (!isMonotonicExtension(previous, cumulative)) {
            // The cumulative arguments no longer extend the ones this slot has
            // seen: Ollama reused the array slot for a second, unrelated call.
            // Diffing against the old call would emit a fragment that
            // reconstructs into invalid JSON and collapse the two calls into
            // one block, so open a fresh block for the new call instead.
            block = open('tool-call')
            block.callId = mintCallId(block)
            if (call?.function?.name !== undefined) block.name = call.function.name
            toolBlocks.set(callIndex, block)
            toolArguments.set(callIndex, '')
            yield { type: 'block-start', index: block.index, blockType: 'tool-call' }
          }
          const fragment = argumentsDelta(toolArguments.get(callIndex) ?? '', cumulative)
          toolArguments.set(callIndex, cumulative)
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
    }

    if (chunk.done === true) {
      for (const block of order) {
        yield { type: 'block-end', index: block.index, block: closeBlock(block) }
      }
      const promptCount = chunk.prompt_eval_count
      const evalCount = chunk.eval_count
      if (promptCount !== undefined || evalCount !== undefined) {
        const usage: TokenUsage = {
          inputTokens: promptCount ?? 0,
          outputTokens: evalCount ?? 0,
        }
        yield { type: 'usage', usage }
      }
      const reason = mapFinishReason(chunk.done_reason ?? 'stop')
      yield {
        type: 'finish',
        reason: reason.kind === 'stop' && order.length === 0
          ? {
            kind: 'error',
            failure: { message: 'model returned a completed response with no content', code: EMPTY_RESPONSE_CODE },
          }
          : reason,
      }
      return
    }
  }

  throw new LlmError('Ollama NDJSON stream ended without a done chunk', 'STREAM_CLOSED')
}
