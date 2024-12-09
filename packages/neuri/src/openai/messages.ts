import type OpenAI from 'openai'
import type { ResolvedToolCall } from './types'

export function system(message: string): OpenAI.ChatCompletionSystemMessageParam {
  return { role: 'system', content: message }
}

export type Parts = PartText | PartImage

export interface PartImage {
  image_url: ImageURL

  /**
   * The type of the content part.
   */
  type: 'image_url'
}

export interface ImageURL {
  /**
   * Either a URL of the image or the base64 encoded image data.
   */
  url: string

  /**
   * Specifies the detail level of the image. Learn more in the
   * [Vision guide](https://platform.openai.com/docs/guides/vision/low-or-high-fidelity-image-understanding).
   */
  detail?: 'auto' | 'low' | 'high'
}

export interface PartText {
  /**
   * The text content.
   */
  text: string

  /**
   * The type of the content part.
   */
  type: 'text'
}

export function user(message: string): { role: 'user', content: string, name?: string }
export function user(message: Parts[]): { role: 'user', content: Parts[], name?: string }
export function user(message: string | Parts[]): OpenAI.ChatCompletionUserMessageParam {
  if (typeof message === 'string')
    return { role: 'user', content: message }
  if (Array.isArray(message))
    return { role: 'user', content: message }

  return { role: 'user', content: message }
}

export function textPart(content: string): PartText {
  return { type: 'text', text: content }
}

export function imagePart(imageUrl: string): PartImage {
  return { type: 'image_url', image_url: { url: imageUrl } }
}

export function assistant(toolCall: OpenAI.Chat.ChatCompletionMessageToolCall | undefined): { role: 'assistant', tool_calls: OpenAI.Chat.ChatCompletionMessageToolCall[], name?: string }
export function assistant(message: string): { role: 'assistant', content: string, name?: string }
export function assistant(body: string | OpenAI.Chat.ChatCompletionMessageToolCall | undefined): OpenAI.ChatCompletionAssistantMessageParam {
  if (body == null)
    return { role: 'assistant', content: '' }
  if (typeof body === 'string')
    return { role: 'assistant', content: body }

  return { role: 'assistant', tool_calls: [body] }
}

export function tool<P = any, R = any>(message: string, toolCall: ResolvedToolCall<P, R>): OpenAI.ChatCompletionToolMessageParam {
  return {
    role: 'tool',
    content: message,
    tool_call_id: toolCall.toolCall.id,
  }
}

export function messages(...messages: OpenAI.ChatCompletionMessageParam[]): OpenAI.ChatCompletionMessageParam[] {
  return messages
}
