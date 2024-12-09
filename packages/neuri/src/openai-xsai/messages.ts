import type { AssistantMessage, AudioPart, ImagePart, Message, SystemMessage, TextPart, UserMessage } from '@xsai/shared-chat-completion'

export function system(message: string): SystemMessage {
  return { role: 'system', content: message }
}

export function user(message: string | TextPart[] | ImagePart[] | AudioPart[]): UserMessage {
  if (typeof message === 'string')
    return { role: 'user', content: message }
  if (Array.isArray(message))
    return { role: 'user', content: message }

  return { role: 'user', content: message }
}

export function textPart(content: string): TextPart {
  return { type: 'text', text: content }
}

export function imagePart(imageUrl: string): ImagePart {
  return { type: 'image_url', image_url: { url: imageUrl } }
}

export function messages(...messages: Message[]): Message[] {
  return messages
}

export function assistant(message: string): AssistantMessage {
  return { role: 'assistant', content: message }
}
