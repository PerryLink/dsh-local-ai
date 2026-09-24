/**
 * Read-only access to the content shape the harness retired in `0.1.7`.
 *
 * `0.1.7` removed `tool-result` from the message-content block union: a tool
 * result is now a first-class `role: 'tool'` message carrying `toolCallId`
 * (and optional `isError`) at the top level, and the V4 session format refuses
 * to persist the old wrapper. `ContentBlock` therefore has no member for it,
 * which makes `block.type === 'tool-result'` an impossible comparison that
 * TypeScript rejects outright (`TS2367`) and narrows to `never`.
 *
 * This module discriminates that retired shape on a WIDE view of the block -
 * runtime checks against `unknown`, never an assertion that the block union
 * still contains it - and hands back a small validated view. It exists so a
 * session log or fixture written BEFORE `0.1.7` stays scannable after an
 * upgrade; under V4 it is unreachable, and this plugin never writes such a
 * block at all (tool results are produced by the harness and only consumed
 * here). Delete this module once the supported floor is `>= 0.1.7` and no
 * pre-`0.1.7` log can be replayed.
 * @module dsh-local-ai/legacy-blocks
 */

import type { ContentBlock } from '@deepseek-ai/dsh-llm'

/** The retired `tool-result` wrapper, as read back from a pre-`0.1.7` log. */
export interface RetiredToolResultBlock {
  /** Provider-issued id of the tool call this wrapper answered; `''` when absent. */
  readonly toolCallId: string
  /** The wrapper's nested model content, read through the current block type. */
  readonly content: readonly ContentBlock[]
}

/**
 * Read one block as the retired `tool-result` wrapper.
 *
 * The block is inspected only as `unknown`: the guard tests the two fields the
 * wrapper is identified by at runtime (`type` and an array `content`), so no
 * type is claimed on the strength of the block union alone. A block that does
 * not carry both is not a wrapper and yields `undefined`.
 * @param block - one content block from a possibly pre-`0.1.7` session log.
 * @returns the validated view, or `undefined` for every other block.
 */
export function readRetiredToolResult(block: unknown): RetiredToolResultBlock | undefined {
  if (block === null || typeof block !== 'object') return undefined
  const record = block as { type?: unknown; toolCallId?: unknown; content?: unknown }
  if (record.type !== 'tool-result' || !Array.isArray(record.content)) return undefined
  // `Array.isArray` has already narrowed `content` to an array; its elements are
  // whatever the old log held and every consumer reads them structurally.
  const content: readonly ContentBlock[] = record.content
  return { toolCallId: String(record.toolCallId ?? ''), content }
}
