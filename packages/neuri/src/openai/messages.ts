import type { ToolMessage } from '@xsai/shared-chat'
import type { ResolvedToolCall } from './types'

export function tool<P = any, R = any>(message: string, toolCall: ResolvedToolCall<P, R>): ToolMessage {
  return {
    role: 'tool',
    content: message,
    tool_call_id: toolCall.toolCall.id,
  }
}

export {
  assistant,
  messages,
  system,
  user,
} from '@xsai/shared-chat'
