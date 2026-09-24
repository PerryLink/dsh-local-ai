/**
 * OpenAI-compatible message/request serialization: harness messages map to the
 * `/v1/chat/completions` vocabulary (tool results become `tool` messages keyed
 * by `tool_call_id`, tool-call arguments stay raw JSON strings), and
 * `serializeRequest` translates temperature/max_tokens/stop and the model
 * mapping. Image content fails loud (text-only route).
 * @module dsh-local-ai/test/openai-serialize.spec
 */

import { createAssistantMessage, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { CallId } from '../src/call-id.ts'
import type { ContentBlock, GenerateOptions } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { serializeMessages, serializeRequest } from '../src/openai-serialize.ts'

/** A resolved OpenAI-compatible backend for tests. */
function backend(overrides: { name?: string; baseURL?: string; models?: Array<{ name: string; model?: string }>; temperature?: number; maxTokens?: number } = {}): ReturnType<typeof resolveConfig>['backends'][number] {
  const resolved = resolveConfig({
    backends: [{
      name: overrides.name ?? 'lmstudio',
      baseURL: overrides.baseURL ?? 'http://127.0.0.1:1234/v1',
      ...overrides.models === undefined ? {} : { models: overrides.models },
      ...overrides.temperature === undefined ? {} : { temperature: overrides.temperature },
      ...overrides.maxTokens === undefined ? {} : { maxTokens: overrides.maxTokens },
    }],
  })
  return resolved.backends[0]!
}

describe('serializeMessages (OpenAI-compatible)', () => {
  it('serializes system/user/assistant/tool roles with tool_call_id in order', () => {
    const assistant = createAssistantMessage({
      content: [
        { type: 'text', text: 'calling' },
        { type: 'tool-call', id: CallId('c1'), name: 'read', arguments: '{"path":"/x"}' },
      ],
      source: { provider: 'deepseek', model: 'm' },
    })
    const result = createToolResultMessage({
      callId: CallId('c1'),
      content: [{ type: 'text', text: 'file content' }],
      isError: false,
    })
    const wire = serializeMessages([
      { id: assistant.id, role: 'system', content: [{ type: 'text', text: 'you are' }], source: { kind: 'system-prompt' } },
      createUserMessage({ content: [{ type: 'text', text: 'read it' }], source: { kind: 'user' } }),
      assistant,
      result,
    ])

    expect(wire).toEqual([
      { role: 'system', content: 'you are' },
      { role: 'user', content: 'read it' },
      { role: 'assistant', content: 'calling', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'read', arguments: '{"path":"/x"}' } }] },
      { role: 'tool', tool_call_id: 'c1', content: 'file content' },
    ])
  })

  it('uses null assistant content when the message carries only tool calls', () => {
    const assistant = createAssistantMessage({
      content: [{ type: 'tool-call', id: CallId('c1'), name: 'run', arguments: '{}' }],
      source: { provider: 'deepseek', model: 'm' },
    })
    const wire = serializeMessages([assistant])
    expect(wire[0]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'c1', type: 'function', function: { name: 'run', arguments: '{}' } }],
    })
  })

  it('rejects image content loudly', () => {
    const image = createUserMessage({
      content: [{ type: 'image', attachment: {} as never }],
      source: { kind: 'user' },
    })
    expect(() => serializeMessages([image])).toThrow(/image/u)
  })

  it('serializes an identity-free request user input', () => {
    // `RequestUserInput` has neither an id nor a source, which is why both
    // serializers accept `RequestMessage` rather than `Message`.
    const wire = serializeMessages([{ role: 'user', content: [{ type: 'text', text: 'one-shot' }] }])
    expect(wire).toEqual([{ role: 'user', content: 'one-shot' }])
  })

  it('still reads a pre-0.1.7 tool-result wrapper from an upgraded-from log', () => {
    // Read-only fallback: harness 0.1.7 removed `tool-result` from the content
    // block union, so this retired shape can only be built through a wide view.
    // A log written before 0.1.7 must keep its tool turns.
    const legacy = createUserMessage({
      content: [
        { type: 'text', text: 'the file says:' },
        { type: 'tool-result', toolCallId: CallId('c1'), content: [{ type: 'text', text: 'file content' }] },
      ] as unknown as ContentBlock[],
      source: { kind: 'user' },
    })
    expect(serializeMessages([legacy])).toEqual([
      { role: 'user', content: 'the file says:' },
      { role: 'tool', tool_call_id: 'c1', content: 'file content' },
    ])
  })
})

describe('serializeRequest (OpenAI-compatible)', () => {
  it('maps the model and translates temperature/max_tokens/stop', () => {
    const options: GenerateOptions = {
      provider: 'openai:lmstudio',
      model: 'qwen',
      messages: [createUserMessage({ content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })],
      temperature: 0.3,
      maxTokens: 100,
      stop: ['END'],
    }
    const body = serializeRequest(options, backend({ models: [{ name: 'qwen', model: 'qwen2.5-7b' }] }))
    expect(body.model).toBe('qwen2.5-7b')
    expect(body.stream).toBe(true)
    expect(body.temperature).toBe(0.3)
    expect(body.max_tokens).toBe(100)
    expect(body.stop).toEqual(['END'])
  })

  it('omits temperature when neither the request nor the backend sets one', () => {
    const options: GenerateOptions = {
      provider: 'openai:lmstudio',
      model: 'qwen',
      messages: [],
    }
    const body = serializeRequest(options, backend())
    expect(body.temperature).toBeUndefined()
  })

  it('maps tools to the OpenAI function form', () => {
    const options: GenerateOptions = {
      provider: 'openai:lmstudio',
      model: 'qwen',
      messages: [],
      tools: [{ name: 'read', description: 'read a file', parameters: { type: 'object' } }],
    }
    const body = serializeRequest(options, backend())
    expect(body.tools).toEqual([{ type: 'function', function: { name: 'read', description: 'read a file', parameters: { type: 'object' } } }])
  })
})
