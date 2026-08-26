/**
 * Serialize harness messages and requests into the OpenAI `/v1/chat/completions`
 * wire vocabulary (spoken by LM Studio, vLLM, and llama.cpp). User text is
 * joined; assistant text becomes `content` (or `null` when the message carries
 * tool calls) and tool calls become `tool_calls` with their raw JSON argument
 * string; tool results become separate `{role: 'tool'}` messages keyed by
 * `tool_call_id`. Image content is rejected loudly — the OpenAI-compatible
 * adapter is text-only (multimodal backends are out of scope for this route).
 * Unknown declaration-merged block types retain the documented extension
 * fallback (ignored for content, retained as text where text is expected).
 * @module dsh-local-ai/openai-serialize
 */

import { contentHasImage, LlmError } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, Message, ToolSchema } from '@deepseek-ai/dsh-llm'
import type { ResolvedOpenAIBackend } from './config.ts'

/** One OpenAI chat message on the wire. */
export interface OpenAIWireMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

/** The OpenAI `/v1/chat/completions` request body. */
export interface OpenAIWireRequest {
  model: string
  messages: OpenAIWireMessage[]
  stream: boolean
  temperature?: number
  max_tokens?: number
  stop?: readonly string[]
  tools?: Array<{ type: 'function'; function: ToolSchema }>
}

/** Join the text blocks of a message (used for user/tool-result content). */
function flattenText(blocks: readonly ContentBlock[]): string {
  return blocks
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}

/** Reject image content the OpenAI-compatible wire cannot carry. */
function assertImagesSupported(message: Message): void {
  for (const block of message.content) {
    if (block.type === 'image' || (block.type === 'tool-result' && contentHasImage(block.content))) {
      throw new LlmError(
        'The OpenAI-compatible adapter does not support image content for this backend.',
        'UNSUPPORTED_CONTENT',
      )
    }
  }
}

/** Serialize one assistant message (text + tool calls). */
function serializeAssistant(message: Message): OpenAIWireMessage {
  const text = flattenText(message.content)
  const toolCalls = message.content
    .filter(block => block.type === 'tool-call')
    .map(block => ({
      id: String(block.id),
      type: 'function' as const,
      function: { name: block.name, arguments: block.arguments },
    }))
  return {
    role: 'assistant',
    content: toolCalls.length > 0 ? (text.length > 0 ? text : null) : text,
    ...toolCalls.length > 0 ? { tool_calls: toolCalls } : {},
  }
}

/**
 * Serialize the conversation. `tool-result` blocks become standalone
 * `{role: 'tool'}` messages (the harness puts each tool result in its own
 * user-role message, so a mixed user message contributes its text first and
 * its tool results as separate wire messages after).
 * @param messages - the harness conversation, in order.
 * @returns the wire messages; order preserved, each tool result expanded into its own entry.
 */
export function serializeMessages(messages: Message[]): OpenAIWireMessage[] {
  const wire: OpenAIWireMessage[] = []
  for (const message of messages) {
    assertImagesSupported(message)
    if (message.role === 'system') {
      wire.push({ role: 'system', content: flattenText(message.content) })
      continue
    }
    if (message.role === 'assistant') {
      wire.push(serializeAssistant(message))
      continue
    }
    // user role: tool results ride in user messages in the harness vocabulary,
    // but OpenAI wants them as role:'tool' messages.
    const toolResults = message.content.filter(block => block.type === 'tool-result')
    const text = flattenText(message.content)
    if (text.length > 0 || toolResults.length === 0) {
      wire.push({ role: 'user', content: text })
    }
    for (const result of toolResults) {
      wire.push({
        role: 'tool',
        tool_call_id: String(result.toolCallId),
        // Empty tool output still needs SOME content on the wire.
        content: flattenText(result.content) || '(no output)',
      })
    }
  }
  return wire
}

/**
 * Build the full wire request. Always streaming (`stream: true`); optional
 * fields are omitted rather than sent as null, so the backend defaults apply.
 * `temperature` resolves request → model mapping → backend default; `max_tokens`
 * is the harness-materialized `maxTokens`.
 * @param options - the harness request (model, history, system, tools, sampling).
 * @param backend - the resolved OpenAI-compatible backend.
 * @returns the `/v1/chat/completions` request body.
 */
export function serializeRequest(options: GenerateOptions, backend: ResolvedOpenAIBackend): OpenAIWireRequest {
  const mapping = backend.models.find(entry => entry.name === options.model)
  const model = mapping?.model ?? options.model

  const messages: OpenAIWireMessage[] = []
  if (options.system !== undefined) {
    messages.push({ role: 'system', content: options.system })
  }
  messages.push(...serializeMessages(options.messages))

  const temperature = options.temperature ?? mapping?.temperature ?? backend.temperature
  const tools = options.tools?.map(tool => ({
    type: 'function' as const,
    function: tool,
  }))

  return {
    model,
    messages,
    stream: true,
    ...temperature === undefined ? {} : { temperature },
    ...options.maxTokens === undefined ? {} : { max_tokens: options.maxTokens },
    ...options.stop !== undefined && options.stop.length > 0 ? { stop: options.stop } : {},
    ...tools !== undefined && tools.length > 0 ? { tools } : {},
  }
}
