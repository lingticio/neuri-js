import type { Infer, Schema } from '@typeschema/main'
import type OpenAI from 'openai'

import { toJSONSchema } from '@typeschema/main'

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

export interface ChatCompletion extends OpenAI.Chat.Completions.ChatCompletion {
  firstContent: () => Promise<string>
}

export function chatCompletionFromOpenAIChatCompletion(completions: OpenAI.Chat.Completions.ChatCompletion): ChatCompletion {
  return {
    ...completions,
    firstContent: async () => {
      const message = resolveFirstTextMessageFromCompletion(completions)
      return message
    },
  }
}

export function resolveFirstTextMessageFromCompletion(chatCompletion?: OpenAI.Chat.Completions.ChatCompletion): string {
  if (!chatCompletion)
    return ''
  if (chatCompletion.choices.length === 0)
    return ''

  const message = chatCompletion.choices[0].message
  return message.content ?? ''
}

export function resolveToolCallsFromCompletion(chatCompletion?: OpenAI.Chat.Completions.ChatCompletion): OpenAI.Chat.ChatCompletionMessageToolCall[][] {
  if (!chatCompletion)
    return []
  if (!('choices' in chatCompletion))
    return []
  if (chatCompletion.choices.length === 0)
    return []

  return chatCompletion.choices.filter(choice => choice.message.tool_calls != null).map(choice => choice.message.tool_calls!)
}

export function resolveFirstToolCallFromCompletion(chatCompletion?: OpenAI.Chat.Completions.ChatCompletion): OpenAI.Chat.ChatCompletionMessageToolCall | undefined {
  const choices = resolveToolCallsFromCompletion(chatCompletion)
  if (choices.length === 0)
    return undefined

  return choices[0][0]
}

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

export async function invokeFunctionWithResolvedToolCall<P = any, R = any | undefined>(completions: ChatCompletion, toolCall: ResolvedToolCall<P, R> | undefined, messages: OpenAI.ChatCompletionMessageParam[]): Promise<R | undefined> {
  if (toolCall == null)
    return undefined
  if (toolCall.toolCall == null)
    return undefined
  if (toolCall.toolCall.function == null)
    return undefined

  const ctx: InvokeContext<P, R> = {
    messages,
    chatCompletion: completions,
    parameters: toolCall.arguments,
    toolCall,
  }

  await toolCall.hooks.preInvoke(ctx)
  const res = await toolCall.func(ctx)
  await toolCall.hooks.postInvoke({ ...ctx, result: res })

  return res
}

export async function invokeFunctionWithTools<P, R>(chatCompletion: ChatCompletion, tools: Tool<P, R>[], messages: OpenAI.ChatCompletionMessageParam[]): Promise<{
  result: R | undefined
  chatCompletion: OpenAI.Chat.Completions.ChatCompletion
  chatCompletionToolCall?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  toolCall: ResolvedToolCall<P, R> | undefined
}> {
  const chatCompletionToolCall = resolveFirstToolCallFromCompletion(chatCompletion)
  const toolCall = resolvedToolCall<P, R>(chatCompletionToolCall, tools)

  return {
    result: await invokeFunctionWithResolvedToolCall<P, R>(chatCompletion, toolCall, messages),
    chatCompletion,
    chatCompletionToolCall,
    toolCall,
  }
}

type JSONSchema = Awaited<ReturnType<typeof toJSONSchema>> & Record<string, any>

// @ts-expect-error - P is helper
// eslint-disable-next-line unused-imports/no-unused-vars
interface ToolFunction<P> extends OpenAI.Chat.ChatCompletionTool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: JSONSchema
  }
}

export async function toolFunction<S extends Schema, P extends Infer<S>>(name: string, description: string, parameters: S): Promise<ToolFunction<P>> {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: await toJSONSchema(parameters as any),
    },
  }
}

export interface Tool<P, R> {
  openAI?: OpenAI
  tool: OpenAI.Chat.ChatCompletionTool
  func: (ctx: InvokeContext<P, R>) => Promise<R>
  hooks: ToolHooks<P, R>
}

export interface ToolHooks<P, R> {
  configureOpenAI: (openAI: OpenAI) => Promise<OpenAI>
  preInvoke: (ctx: PreInvokeContext<P, R>) => Promise<void>
  postInvoke: (ctx: PostInvokeContext<P, R>) => Promise<void>
}

export interface InvokeContext<P, R> {
  messages: OpenAI.ChatCompletionMessageParam[]
  chatCompletion: ChatCompletion
  parameters: P
  toolCall: ResolvedToolCall<P, R>
}

export function newTestInvokeContext<P, R>(parameters?: P): InvokeContext<P, R> {
  return { parameters } as InvokeContext<P, R>
}

export interface PreInvokeContext<P, R> extends InvokeContext<P, R> {

}

export interface PostInvokeContext<P, R> extends InvokeContext<P, R> {
  result: R
}

export interface ResolvedToolCall<P, R> extends Tool<P, R> {
  arguments: P
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall
  hooks: ToolHooks<P, R>
}

export function defineToolFunction<P, R>(
  tool: ToolFunction<P>,
  func: (ctx: InvokeContext<P, R>) => Promise<R>,
  options?: {
    openAI?: OpenAI
    hooks?: Partial<ToolHooks<P, R>>
  },
): Tool<P, R> {
  const hooks: ToolHooks<P, R> = {
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
    openAI: options?.openAI,
    tool,
    func,
    hooks,
  }
}

export function tools(tools: Tool<any, any>[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map(tool => tool.tool)
}

export function composeAgent(options: {
  openAI: OpenAI
  tools: Tool<any, any>[]
}) {
  async function call(messages: OpenAI.ChatCompletionMessageParam[], callOptions: { model: string }): Promise<ChatCompletion | undefined> {
    let max = 5
    while (max >= 0) {
      max--

      const res = await options.openAI.chat.completions.create({
        model: callOptions.model,
        messages,
        tools: tools(options.tools),
      })

      const chatCompletionToolCall = resolveFirstToolCallFromCompletion(res)
      messages.push(assistant(chatCompletionToolCall))

      const chatCompletion = chatCompletionFromOpenAIChatCompletion(res)

      const { result, toolCall } = await invokeFunctionWithTools<any, any>(chatCompletion, options.tools, messages)
      if (!toolCall)
        return chatCompletion
      if (result == null)
        return chatCompletion

      let strRes = ''
      if (typeof result === 'string')
        strRes = result
      else
        strRes = JSON.stringify(result)

      messages.push(tool(strRes, toolCall))
    }
  }

  return {
    call,
  }
}
