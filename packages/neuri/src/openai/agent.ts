import type { CommonProviderOptions } from '@xsai/providers'
import type { Message } from '@xsai/shared-chat'

import type { ChatCompletion, DefinedTool } from './types'
import { chatCompletionFromOpenAIChatCompletion, resolveFirstToolCallFromCompletion } from './completion'
import { generate } from './generate'
import { invokeFunctionWithTools } from './invoke'
import { assistant, tool } from './messages'
import { tools } from './tools'

export function composeAgent(options: {
  provider: CommonProviderOptions
  tools: DefinedTool<any, any>[]
}) {
  async function call(messages: Message[], callOptions: { model: string, maxRoundTrip?: number }): Promise<ChatCompletion | undefined> {
    let max = callOptions.maxRoundTrip ?? 10
    while (max >= 0) {
      max--

      const res = await generate({
        apiKey: options.provider.apiKey,
        baseURL: options.provider.baseURL,
        model: callOptions.model,
        messages,
        tools: tools(options.tools),
      })

      const resChatCompletionToolCall = resolveFirstToolCallFromCompletion(res)
      if (!resChatCompletionToolCall)
        return res

      messages.push(assistant(resChatCompletionToolCall))

      const resChatCompletion = chatCompletionFromOpenAIChatCompletion(res)
      const invokeResults = await invokeFunctionWithTools(resChatCompletion, options.tools, messages)
      if (!invokeResults.length)
        return resChatCompletion

      for (const invokeResult of invokeResults) {
        const { result, resolvedToolCall: toolCall } = invokeResult
        if (!toolCall)
          continue

        let strRes = ''
        if (typeof result === 'string')
          strRes = result
        else
          strRes = JSON.stringify(result)

        messages.push(tool(strRes, toolCall))
      }
    }
  }

  return {
    call,
  }
}
