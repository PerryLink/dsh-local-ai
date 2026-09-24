/**
 * Serialize harness messages and requests into the OpenAI `/v1/chat/completions`
 * wire vocabulary (spoken by LM Studio, vLLM, and llama.cpp). User text is
 * joined; assistant text becomes `content` (or `null` when the message carries
 * tool calls) and tool calls become `tool_calls` with their raw JSON argument
 * string; tool results become separate `{role: 'tool'}` messages keyed by
 * `tool_call_id`, taken from the first-class `tool`-role message the harness
 * has produced since `0.1.7` and, for a log written before it, from the
 * retired `tool-result` content wrapper read through `legacy-blocks.ts`.
 * Image content is rejected loudly — the OpenAI-compatible
 * adapter is text-only (multimodal backends are out of scope for this route).
 * Unknown declaration-merged block types retain the documented extension
 * fallback (ignored for content, retained as text where text is expected).
 * @module dsh-local-ai/openai-serialize
 */

import { contentHasImage, LlmError } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, RequestMessage, ToolSchema } from '@deepseek-ai/dsh-llm'
import type { ResolvedOpenAIBackend } from './config.ts'
import { readRetiredToolResult } from './legacy-blocks.ts'
import type { RetiredToolResultBlock } from './legacy-blocks.ts'

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
function assertImagesSupported(message: RequestMessage): void {
  for (const block of message.content) {
    const retired = readRetiredToolResult(block)
    if (block.type === 'image' || (retired !== undefined && contentHasImage(retired.content))) {
      throw new LlmError(
        'The OpenAI-compatible adapter does not support image content for this backend.',
        'UNSUPPORTED_CONTENT',
      )
    }
  }
}

/** Serialize one assistant message (text + tool calls). */
function serializeAssistant(message: RequestMessage): OpenAIWireMessage {
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
 * Serialize the conversation. Every tool result becomes a standalone
 * `{role: 'tool'}` message: since `0.1.7` the harness delivers it as a
 * first-class `tool`-role message, and a pre-`0.1.7` log wrapped it in a
 * `tool-result` block inside the user message instead - that retired wrapper is
 * still read (read-only fallback) so an upgraded-from log keeps its tool turns.
 * @param messages - the request conversation, in order.
 * @returns the wire messages; order preserved, each tool result expanded into its own entry.
 */
export function serializeMessages(messages: readonly RequestMessage[]): OpenAIWireMessage[] {
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
    // V4: the tool result IS the message; OpenAI keys it by the call id.
    if (message.role === 'tool') {
      wire.push({
        role: 'tool',
        tool_call_id: String(message.toolCallId),
        content: flattenText(message.content) || '(no output)',
      })
      continue
    }
    // A developer message carries only dynamic tool activation/removal, which
    // the request's `tools` array already represents on this wire; it holds no
    // model-facing text, so it contributes no message rather than an empty one.
    if (message.role === 'developer') continue

    // user role (durable or request-only): a pre-0.1.7 log wraps its tool
    // results in `tool-result` content blocks, but OpenAI wants them as
    // role:'tool' messages.
    const toolResults: RetiredToolResultBlock[] = []
    for (const block of message.content) {
      const retired = readRetiredToolResult(block)
      if (retired !== undefined) toolResults.push(retired)
    }
    const text = flattenText(message.content)
    if (text.length > 0 || toolResults.length === 0) {
      wire.push({ role: 'user', content: text })
    }
    for (const result of toolResults) {
      wire.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
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
