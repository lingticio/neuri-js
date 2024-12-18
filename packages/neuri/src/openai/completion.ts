import type { ToolCall } from '@xsai/shared-chat'
import type { ChatCompletion, ChatCompletionsResponse } from './types'

export function chatCompletionFromOpenAIChatCompletion(completions: ChatCompletionsResponse): ChatCompletion {
  return {
    ...completions,
    firstContent: async () => {
      const message = resolveFirstTextMessageFromCompletion(completions)
      return message
    },
    firstChoice: () => {
      if (completions.choices.length === 0)
        return undefined

      return completions.choices[0]
    },
  }
}

export function resolveFirstTextMessageFromCompletion(chatCompletion?: ChatCompletionsResponse): string {
  if (!chatCompletion)
    return ''
  if (chatCompletion.choices.length === 0)
    return ''

  const message = chatCompletion.choices[0].message
  return message.content ?? ''
}

export function resolveToolCallsFromCompletion(chatCompletion?: ChatCompletionsResponse): ToolCall[][] {
  if (!chatCompletion)
    return []
  if (!('choices' in chatCompletion))
    return []
  if (chatCompletion.choices.length === 0)
    return []

  return chatCompletion.choices.filter(choice => choice.message.tool_calls != null).map(choice => choice.message.tool_calls!)
}

export function resolveFirstToolCallFromCompletion(chatCompletion?: ChatCompletionsResponse): ToolCall | undefined {
  const choices = resolveToolCallsFromCompletion(chatCompletion)
  if (choices.length === 0)
    return undefined

  return choices[0][0]
}
