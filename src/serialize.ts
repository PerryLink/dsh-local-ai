/**
 * Serialize harness messages and requests into the Ollama `/api/chat` wire
 * vocabulary. User text is joined; assistant text becomes `content` and tool
 * calls become `tool_calls` (with arguments parsed from the raw JSON string to
 * the object Ollama expects); a session-format-V4 tool result is already its
 * own `role: 'tool'` message, so it maps one-to-one onto a wire `tool` entry.
 * Top-level user-message image blocks map onto `images` (base64, no data-URI
 * prefix) when the request carries resolved payloads; images anywhere else —
 * on a tool result or a text-only route — still fail loud with
 * `UNSUPPORTED_CONTENT`, and a developer (tool-change) message is refused
 * rather than relabeled, exactly as the host's own adapters refuse it.
 * Unknown declaration-merged block types retain the documented extension
 * fallback (ignored for content, retained as text where text is expected).
 * @module dsh-local-ai/serialize
 */

import { contentHasImage, LlmError } from '@deepseek-ai/dsh-llm'
import type { AssistantMessage, ContentBlock, GenerateOptions, RequestMessage, ToolSchema } from '@deepseek-ai/dsh-llm'
import type { ResolvedConfig } from './config.ts'

/** One Ollama chat message on the wire. */
export interface OllamaWireMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }>
  tool_name?: string
  /** Base64 image payloads (no data-URI prefix) attached to one user message. */
  images?: string[]
}

/** The Ollama `/api/chat` request body. */
export interface OllamaWireRequest {
  model: string
  messages: OllamaWireMessage[]
  stream: boolean
  options?: Record<string, unknown>
  tools?: Array<{ type: 'function'; function: ToolSchema }>
}

/** Join the text blocks of a message (used for user/tool-result content). */
function flattenText(blocks: readonly ContentBlock[]): string {
  return blocks
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}

/**
 * Reject image content the wire cannot carry. Top-level user-message images
 * map onto `images` when the request provides resolved payloads; every other
 * image (a tool result, an assistant message, or a text-only route without
 * payloads) still fails loud instead of silently dropping the image.
 */
function assertImagesSupported(message: RequestMessage, imagesByRef: ReadonlyMap<string, string> | undefined): void {
  if (!contentHasImage(message.content)) return
  if (message.role === 'tool') {
    throw new LlmError('The Ollama adapter does not support tool-result image content.', 'UNSUPPORTED_CONTENT')
  }
  if (message.role !== 'user') {
    throw new LlmError(`The Ollama adapter does not support image content on ${message.role} messages.`, 'UNSUPPORTED_CONTENT')
  }
  if (imagesByRef === undefined) {
    throw new LlmError('The Ollama adapter does not support image content for this model.', 'UNSUPPORTED_CONTENT')
  }
}

/** Collect the base64 payloads for one user message's top-level image blocks. */
function imagesOf(message: RequestMessage, imagesByRef: ReadonlyMap<string, string> | undefined): string[] {
  if (imagesByRef === undefined) return []
  const images: string[] = []
  for (const block of message.content) {
    if (block.type !== 'image') continue
    const data = imagesByRef.get(String(block.attachment.attachmentId))
    if (data === undefined) {
      throw new LlmError('The Ollama adapter could not resolve an image payload.', 'UNSUPPORTED_CONTENT')
    }
    images.push(data)
  }
  return images
}

/**
 * Parse a tool-call argument string into the object Ollama expects. The raw
 * string is guaranteed by the harness contract to be JSON; a malformed value
 * from a hand-built call degrades to a single `value` field rather than
 * bricking the whole session.
 * @param raw - the raw JSON string produced by the model.
 * @returns the parsed object, or a `{ value }` fallback.
 */
export function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return { value: raw }
  } catch {
    return { value: raw }
  }
}

/** Serialize one assistant message (text + tool calls). */
function serializeAssistant(message: AssistantMessage): OllamaWireMessage {
  const text = flattenText(message.content)
  const toolCalls = message.content
    .filter(block => block.type === 'tool-call')
    .map(block => ({
      function: { name: block.name, arguments: parseToolArguments(block.arguments) },
    }))

  return {
    role: 'assistant',
    content: text,
    ...toolCalls.length > 0 ? { tool_calls: toolCalls } : {},
  }
}

/** Resolve a tool-result block's name from the assistant tool calls that precede it. */
function toolNameOf(callId: string, namesByCallId: ReadonlyMap<string, string>): string | undefined {
  return namesByCallId.get(callId)
}

/**
 * Serialize the conversation. In the session-format-V4 vocabulary a tool
 * result is a first-class `role: 'tool'` message (`toolCallId` + `content`),
 * so each one becomes exactly one wire `tool` entry; assistant tool calls are
 * indexed first so their results can carry the tool name Ollama needs. A
 * developer message (tool-addition/tool-removal blocks) has no wire mapping
 * here and is refused loudly, never relabeled onto another role.
 * @param messages - the harness conversation, in order.
 * @returns the wire messages; order preserved, one entry per harness message.
 */
export function serializeMessages(
  messages: readonly RequestMessage[],
  imagesByRef?: ReadonlyMap<string, string>,
): OllamaWireMessage[] {
  const namesByCallId = new Map<string, string>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const block of message.content) {
      if (block.type === 'tool-call') namesByCallId.set(String(block.id), block.name)
    }
  }

  const wire: OllamaWireMessage[] = []
  for (const message of messages) {
    if (message.role === 'developer') {
      // The host reserves developer messages for tool-change blocks; its own
      // adapters refuse them, and mapping one onto `user` would misreport a
      // tool-vocabulary change as user input.
      throw new LlmError('The Ollama adapter does not support developer messages.', 'UNSUPPORTED_CONTENT')
    }
    assertImagesSupported(message, imagesByRef)
    if (message.role === 'tool') {
      const name = toolNameOf(String(message.toolCallId), namesByCallId)
      wire.push({
        role: 'tool',
        // Empty tool output still needs SOME content on the wire.
        content: flattenText(message.content) || '(no output)',
        ...name === undefined ? {} : { tool_name: name },
      })
      continue
    }
    if (message.role === 'system') {
      wire.push({ role: 'system', content: flattenText(message.content) })
      continue
    }
    if (message.role === 'assistant') {
      wire.push(serializeAssistant(message))
      continue
    }
    const images = imagesOf(message, imagesByRef)
    wire.push({
      role: 'user',
      content: flattenText(message.content),
      ...images.length > 0 ? { images } : {},
    })
  }
  return wire
}

/**
 * Build the full wire request. Always streaming (`stream: true`); optional
 * fields are omitted rather than sent as null, so Ollama defaults apply.
 * `temperature` resolves request → model mapping → plugin default; `num_predict`
 * is the harness-materialized `maxTokens`.
 * @param options - the harness request (model, history, system, tools, sampling).
 * @param resolved - the resolved plugin config.
 * @returns the `/api/chat` request body.
 */
export function serializeRequest(
  options: GenerateOptions,
  resolved: ResolvedConfig,
  imagesByRef?: ReadonlyMap<string, string>,
): OllamaWireRequest {
  const mapping = resolved.models.find(entry => entry.name === options.model)
  const model = mapping?.model ?? options.model

  const messages: OllamaWireMessage[] = []
  if (options.system !== undefined) {
    messages.push({ role: 'system', content: options.system })
  }
  messages.push(...serializeMessages(options.messages, imagesByRef))

  const temperature = options.temperature ?? mapping?.temperature ?? resolved.temperature
  const ollamaOptions: Record<string, unknown> = {}
  if (temperature !== undefined) ollamaOptions.temperature = temperature
  if (options.maxTokens !== undefined) ollamaOptions.num_predict = options.maxTokens
  if (options.stop !== undefined && options.stop.length > 0) ollamaOptions.stop = options.stop

  const tools = options.tools?.map(tool => ({
    type: 'function' as const,
    function: tool,
  }))

  return {
    model,
    messages,
    stream: true,
    ...Object.keys(ollamaOptions).length > 0 ? { options: ollamaOptions } : {},
    ...tools !== undefined && tools.length > 0 ? { tools } : {},
  }
}
