import type OpenAI from 'openai'
import type { ChatCompletion, InvokeContext, ResolvedToolCall, Tool, ToolCallFunctionResult } from './types'

export function resolvedToolCall<P = any, R = any>(toolCall: OpenAI.Chat.ChatCompletionMessageToolCall | null | undefined, tools: Tool<P, R>[]): ResolvedToolCall<P, R> | undefined {
  if (toolCall == null)
    return undefined
  if (toolCall.function == null)
    return undefined

  const foundTool = tools.find(tool => toolCall.function.name === tool.tool.function.name)
  if (foundTool == null)
    return undefined

  return {
    tool: {
      function: toolCall.function,
      type: 'function',
    },
    toolCall,
    arguments: JSON.parse(toolCall.function.arguments),
    openAI: foundTool.openAI,
    func: foundTool.func,
    hooks: foundTool.hooks,
  }
}

export async function invokeFunctionWithResolvedToolCall<P = any, R = any | undefined>(completions: ChatCompletion, toolCall: ResolvedToolCall<P, R> | undefined, messages?: OpenAI.ChatCompletionMessageParam[]): Promise<R | undefined> {
  if (toolCall == null)
    return undefined
  if (toolCall.toolCall == null)
    return undefined
  if (toolCall.toolCall.function == null)
    return undefined

  const ctx: InvokeContext<P, R> = {
    messages: messages ?? [],
    chatCompletion: completions,
    parameters: toolCall.arguments,
    toolCall,
  }

  await toolCall.hooks.preInvoke(ctx)
  const res = await toolCall.func(ctx)
  await toolCall.hooks.postInvoke({ ...ctx, result: res })

  return res
}

export async function invokeFunctionWithTools(chatCompletion: ChatCompletion, tools: Tool<any, any>[], messages: OpenAI.ChatCompletionMessageParam[]): Promise<Array<ToolCallFunctionResult<any, any>>> {
  const results: Array<ToolCallFunctionResult<any, any>> = []

  for (const choice of chatCompletion.choices) {
    if (!choice.message.tool_calls) {
      continue
    }

    for (const toolCall of choice.message.tool_calls) {
      const tc = resolvedToolCall<any, any>(toolCall, tools)

      results.push({
        result: await invokeFunctionWithResolvedToolCall<any, any>(chatCompletion, tc, messages),
        chatCompletionToolCall: toolCall,
        resolvedToolCall: tc,
      })
    }
  }

  return results
}
