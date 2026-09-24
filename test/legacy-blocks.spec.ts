/**
 * Reading the retired pre-`0.1.7` `tool-result` content wrapper. Every input is
 * judged on a wide runtime view: a block that is not the wrapper is rejected
 * without the union having to still contain it, and a missing call id degrades
 * to an empty string rather than the literal `"undefined"`.
 * @module dsh-local-ai/test/legacy-blocks.spec
 */

import { describe, expect, it } from 'vitest'
import { readRetiredToolResult } from '../src/legacy-blocks.ts'

describe('readRetiredToolResult', () => {
  it('rejects every non-object block', () => {
    expect(readRetiredToolResult(null)).toBeUndefined()
    expect(readRetiredToolResult(undefined)).toBeUndefined()
    expect(readRetiredToolResult('tool-result')).toBeUndefined()
  })

  it('rejects a block that is not the retired wrapper', () => {
    expect(readRetiredToolResult({ type: 'text', text: 'hi' })).toBeUndefined()
    expect(readRetiredToolResult({ type: 'tool-result' })).toBeUndefined()
    expect(readRetiredToolResult({ type: 'tool-result', content: 'not an array' })).toBeUndefined()
  })

  it('reads a wrapper together with its call id and nested content', () => {
    expect(readRetiredToolResult({
      type: 'tool-result',
      toolCallId: 'c1',
      content: [{ type: 'text', text: 'file content' }],
    })).toEqual({ toolCallId: 'c1', content: [{ type: 'text', text: 'file content' }] })
  })

  it('degrades a missing or non-string call id to a string', () => {
    expect(readRetiredToolResult({ type: 'tool-result', content: [] })).toEqual({ toolCallId: '', content: [] })
    expect(readRetiredToolResult({ type: 'tool-result', toolCallId: 7, content: [] })).toEqual({ toolCallId: '7', content: [] })
  })
})
