import type { ToolMessage } from '@xsai/shared-chat'
import type { ResolvedToolCall } from './types'
import { message } from '@xsai/shared-chat'

export function tool<P = any, R = any>(message: string, toolCall: ResolvedToolCall<P, R>): ToolMessage {
  return {
    role: 'tool',
    content: message,
    tool_call_id: toolCall.toolCall.id,
  }
}

export const assistant = message.assistant
export const messages = message.messages
export const system = message.system
export const user = message.user
export { message }
export type { Message } from '@xsai/shared-chat'
