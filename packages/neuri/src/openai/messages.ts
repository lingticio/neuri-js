import type { AssistantMessage, AssistantMessagePart, Message, SystemMessage, SystemMessagePart, ToolCall, ToolMessage, UserMessage, UserMessagePart } from '@xsai/shared-chat'
import type { ResolvedToolCall } from './types'
import { message } from '@xsai/utils-chat'

export function tool<P = any, R = any>(message: string, toolCall: ResolvedToolCall<P, R>): ToolMessage {
  return {
    role: 'tool',
    content: message,
    tool_call_id: toolCall.toolCall.id,
  }
}

export const assistant: <C extends AssistantMessagePart[] | string | ToolCall | ToolCall[]>(content: C) => AssistantMessage = message.assistant
export const messages: (...messages: Message[]) => Message[] = message.messages
export const system: <C extends string | SystemMessagePart[]>(content: C) => SystemMessage = message.system
export const user: <C extends Array<UserMessagePart> | string>(content: C) => UserMessage = message.user
export { message }
export type { Message } from '@xsai/shared-chat'
