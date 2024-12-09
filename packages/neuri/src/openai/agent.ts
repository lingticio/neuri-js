import type OpenAI from 'openai'
import type { ChatCompletion, Tool } from './types'
import { chatCompletionFromOpenAIChatCompletion, resolveFirstToolCallFromCompletion } from './completion'
import { generate } from './generate'
import { invokeFunctionWithTools } from './invoke'
import { assistant, tool } from './messages'
import { tools } from './tools'

export function composeAgent(options: {
  openAI: OpenAI
  tools: Tool<any, any>[]
}) {
  async function call(messages: OpenAI.ChatCompletionMessageParam[], callOptions: { model: string, maxRoundTrip?: number }): Promise<ChatCompletion | undefined> {
    let max = callOptions.maxRoundTrip ?? 10
    while (max >= 0) {
      max--

      const res = await generate({
        openAI: options.openAI,
        options: {
          model: callOptions.model,
          messages,
          tools: tools(options.tools),
        },
      })

      const chatCompletionToolCall = resolveFirstToolCallFromCompletion(res)
      messages.push(assistant(chatCompletionToolCall))

      const chatCompletion = chatCompletionFromOpenAIChatCompletion(res)
      const invokeResults = await invokeFunctionWithTools(chatCompletion, options.tools, messages)
      if (!invokeResults.length)
        return chatCompletion

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
