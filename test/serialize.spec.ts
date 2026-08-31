/**
 * Message/request serialization: harness messages map to Ollama's `/api/chat`
 * vocabulary (tool results become `tool` messages with a resolved tool name,
 * tool-call arguments parse to objects), and `serializeRequest` translates
 * temperature/maxTokens/stop and the model mapping.
 * @module dsh-local-ai/test/serialize.spec
 */

import type { createAssistantMessage, createToolResultMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { CallId } from '../src/call-id.ts'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { parseToolArguments, serializeMessages, serializeRequest } from '../src/serialize.ts'

describe('parseToolArguments', () => {
  it('parses a JSON object and degrades malformed input to a value field', () => {
    expect(parseToolArguments('{"path":"/x"}')).toEqual({ path: '/x' })
    expect(parseToolArguments('not json')).toEqual({ value: 'not json' })
    expect(parseToolArguments('["a"]')).toEqual({ value: '["a"]' })
  })
})

describe('serializeMessages', () => {
  it('serializes system, user, assistant, and tool-result roles in order', () => {
    const assistant = createAssistantMessage({
      content: [{ type: 'tool-call', id: CallId('c1'), name: 'read', arguments: '{"path":"/x"}' }],
      source: { provider: 'deepseek', model: 'm' },
    })
    const result = createToolResultMessage({
      callId: CallId('c1'),
      content: [{ type: 'text', text: 'file content' }],
      isError: false,
    })
    const wire = serializeMessages([
      { id: assistant.id, role: 'system', content: [{ type: 'text', text: 'you are' }], source: { kind: 'user' } },
      createUserMessage({ content: [{ type: 'text', text: 'read it' }], source: { kind: 'user' } }),
      assistant,
      result,
    ])

    expect(wire).toEqual([
      { role: 'system', content: 'you are' },
      { role: 'user', content: 'read it' },
      { role: 'assistant', content: '', tool_calls: [{ function: { name: 'read', arguments: { path: '/x' } } }] },
      { role: 'tool', content: 'file content', tool_name: 'read' },
    ])
  })

  it('emits (no output) for an empty tool result', () => {
    const assistant = createAssistantMessage({
      content: [{ type: 'tool-call', id: CallId('c1'), name: 'run', arguments: '{}' }],
      source: { provider: 'deepseek', model: 'm' },
    })
    const result = createToolResultMessage({ callId: CallId('c1'), content: [], isError: false })
    const wire = serializeMessages([assistant, result])
    expect(wire[1]).toEqual({ role: 'tool', content: '(no output)', tool_name: 'run' })
  })

  it('rejects image content', () => {
    const image = createUserMessage({
      content: [{ type: 'image', attachment: {} as never }],
      source: { kind: 'user' },
    })
    expect(() => serializeMessages([image])).toThrow(/image/u)
  })

  it('maps user-message image blocks onto base64 images payloads', () => {
    const message = createUserMessage({
      content: [
        { type: 'text', text: 'look at this' },
        { type: 'image', attachment: { attachmentId: 'a1' } as never },
        { type: 'image', attachment: { attachmentId: 'a2' } as never },
      ],
      source: { kind: 'user' },
    })
    const wire = serializeMessages([message], new Map([['a1', 'QUJD'], ['a2', 'RUZH']]))
    expect(wire).toEqual([{ role: 'user', content: 'look at this', images: ['QUJD', 'RUZH'] }])
  })

  it('rejects an unresolved image payload loudly', () => {
    const message = createUserMessage({
      content: [{ type: 'image', attachment: { attachmentId: 'missing' } as never }],
      source: { kind: 'user' },
    })
    expect(() => serializeMessages([message], new Map())).toThrow(/resolve an image payload/u)
  })

  it('rejects tool-result image content even with payloads', () => {
    const message = createUserMessage({
      content: [{ type: 'tool-result', toolCallId: CallId('c1'), content: [{ type: 'image', attachment: { attachmentId: 'a1' } as never }] }],
      source: { kind: 'user' },
    })
    expect(() => serializeMessages([message], new Map([['a1', 'QUJD']]))).toThrow(/tool-result image/u)
  })
})

describe('serializeRequest', () => {
  const resolved = resolveConfig({ temperature: 0.7, maxTokens: 2048 })

  it('translates the model mapping and sampling params into Ollama options', () => {
    const options: GenerateOptions = {
      provider: 'ollama',
      model: 'local',
      messages: [createUserMessage({ content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })],
      temperature: 0.3,
      maxTokens: 100,
      stop: ['END'],
    }
    const body = serializeRequest(options, resolveConfig({
      models: [{ name: 'local', model: 'llama3.2' }],
    }))
    expect(body.model).toBe('llama3.2')
    expect(body.stream).toBe(true)
    expect(body.options).toEqual({ temperature: 0.3, num_predict: 100, stop: ['END'] })
  })

  it('falls back to the plugin temperature default when the request omits one', () => {
    const options: GenerateOptions = {
      provider: 'ollama',
      model: 'local',
      messages: [],
    }
    const body = serializeRequest(options, resolved)
    expect(body.options?.temperature).toBe(0.7)
  })

  it('maps tools to the Ollama function form', () => {
    const options: GenerateOptions = {
      provider: 'ollama',
      model: 'local',
      messages: [],
      tools: [{ name: 'read', description: 'read a file', parameters: { type: 'object' } }],
    }
    const body = serializeRequest(options, resolved)
    expect(body.tools).toEqual([{ type: 'function', function: { name: 'read', description: 'read a file', parameters: { type: 'object' } } }])
  })
})
