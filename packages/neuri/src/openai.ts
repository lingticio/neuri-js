import type OpenAI from 'openai'
import type { JSONSchema7 } from 'json-schema'

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

export function tool<A = any, R = any>(message: string, toolCall: ToolCall<A, R>): OpenAI.ChatCompletionToolMessageParam {
  return {
    role: 'tool',
    content: message,
    tool_call_id: toolCall.toolCall.id,
  }
}

export function firstTextMessageChoiceFromCompletion(chatCompletion?: OpenAI.Chat.Completions.ChatCompletion): string {
  if (!chatCompletion)
    return ''
  if (chatCompletion.choices.length === 0)
    return ''

  const message = chatCompletion.choices[0].message
  return message.content ?? ''
}

export function toolCallsChoicesFromCompletion(chatCompletion?: OpenAI.Chat.Completions.ChatCompletion): OpenAI.Chat.ChatCompletionMessageToolCall[][] {
  if (!chatCompletion)
    return []
  if (!('choices' in chatCompletion))
    return []
  if (chatCompletion.choices.length === 0)
    return []

  return chatCompletion.choices.filter(choice => choice.message.tool_calls != null).map(choice => choice.message.tool_calls!)
}

export function firstToolCallFromCompletion(chatCompletion?: OpenAI.Chat.Completions.ChatCompletion): OpenAI.Chat.ChatCompletionMessageToolCall | undefined {
  const choices = toolCallsChoicesFromCompletion(chatCompletion)
  if (choices.length === 0)
    return undefined

  return choices[0][0]
}

export function toResolvedToolCall<A = any, R = any>(toolCall: OpenAI.Chat.ChatCompletionMessageToolCall | null | undefined, tools: Tool[]): ToolCall<A, R> | undefined {
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

export async function invokeFunction<A = any, R = any | undefined>(completions: OpenAI.Chat.ChatCompletion, toolCall: ToolCall<A, R> | undefined): Promise<R | undefined> {
  if (toolCall == null)
    return undefined
  if (toolCall.toolCall == null)
    return undefined
  if (toolCall.toolCall.function == null)
    return undefined

  toolCall.hooks.preInvoke({ toolCall, chatCompletion: completions, arguments: toolCall.arguments })
  const res = await toolCall.func({
    arguments: toolCall.arguments,
    chatCompletion: completions,
    toolCall,
  })
  toolCall.hooks.postInvoke({ toolCall, chatCompletion: completions, arguments: toolCall.arguments, result: res })
  return res
}

export async function invokeFunctionFromCompletion<A, R>(chatCompletion: OpenAI.Chat.Completions.ChatCompletion, tools: Tool[]): Promise<{
  result: R | undefined
  chatCompletion: OpenAI.Chat.Completions.ChatCompletion
  chatCompletionToolCall?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  toolCall: ToolCall<A, R> | undefined
}> {
  const chatCompletionToolCall = firstToolCallFromCompletion(chatCompletion)
  const toolCall = toResolvedToolCall<A, R>(chatCompletionToolCall, tools)
  return {
    result: await invokeFunction<A, R>(chatCompletion, toolCall),
    chatCompletion,
    chatCompletionToolCall,
    toolCall,
  }
}

export function toolFunction(name: string, description: string, parameters: JSONSchema7): OpenAI.Chat.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: parameters as Record<string, any>,
    },
  }
}

export interface Tool<A = any, R = any> {
  openAI: OpenAI
  tool: OpenAI.Chat.ChatCompletionTool
  func: (ctx: InvokeContext<A, R>) => Promise<R>
  hooks: ToolHooks<A, R>
}

export interface ToolHooks<A, R> {
  configureOpenAI: (openAI: OpenAI) => Promise<OpenAI>
  preInvoke: (ctx: PreInvokeContext<A, R>) => Promise<void>
  postInvoke: (ctx: PostInvokeContext<A, R>) => Promise<void>
}

export interface InvokeContext<A, R> {
  toolCall: ToolCall<A, R>
  chatCompletion: OpenAI.Chat.Completions.ChatCompletion
  arguments: A
}

export interface PreInvokeContext<A, R> extends InvokeContext<A, R> {

}

export interface PostInvokeContext<A, R> extends InvokeContext<A, R> {
  result: R
}

export interface ToolCall<A, R> extends Tool {
  arguments: A
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall
  hooks: ToolHooks<A, R>
}

export function toolFunctionWithCallback<A, R>(
  openAI: OpenAI,
  tool: OpenAI.Chat.ChatCompletionTool,
  func: (ctx: InvokeContext<A, R>) => Promise<R>,
  options?: {
    hooks?: Partial<ToolHooks<A, R>>
  },
): Tool {
  const hooks: ToolHooks<A, R> = {
    configureOpenAI: async o => o,
    preInvoke: async () => {},
    postInvoke: async () => {},
  }

  if (options?.hooks?.configureOpenAI != null)
    hooks.configureOpenAI = options.hooks.configureOpenAI
  if (options?.hooks?.preInvoke != null)
    hooks.preInvoke = options?.hooks?.preInvoke
  if (options?.hooks?.postInvoke != null)
    hooks.postInvoke = options?.hooks?.postInvoke

  return {
    openAI,
    tool,
    func,
    hooks,
  }
}

export function tools(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map(tool => tool.tool)
}

export async function composeAgent(options: {
  openAI: OpenAI
  tools: Tool[]
}) {
  async function call(messages: OpenAI.ChatCompletionMessageParam[], callOptions: { model: string }) {
    let max = 5
    while (max >= 0) {
      max--

      const res = await options.openAI.chat.completions.create({
        model: callOptions.model,
        messages,
        tools: tools(options.tools),
      })

      const { result, toolCall, chatCompletionToolCall } = await invokeFunctionFromCompletion<any, any>(res, options.tools)
      if (!toolCall)
        return res

      if (result == null)
        return res

      let strRes = ''
      if (typeof result === 'string')
        strRes = result
      else
        strRes = JSON.stringify(result)

      messages.push(assistant(chatCompletionToolCall))
      messages.push(tool(strRes, toolCall))
    }
  }

  return {
    call,
  }
}
