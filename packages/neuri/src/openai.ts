import type { JSONSchema7, JSONSchema7Object } from 'json-schema'
import type OpenAI from 'openai'
import type { BaseIssue, BaseSchema } from 'valibot'
import { toJsonSchema } from '@valibot/to-json-schema'
import { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

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

export function resolvedToolCall<P = any, R = any>(toolCall: OpenAI.Chat.ChatCompletionMessageToolCall | null | undefined, tools: Tool[]): ResolvedToolCall<P, R> | undefined {
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

export async function invokeFunctionWithResolvedToolCall<P = any, R = any | undefined>(completions: OpenAI.Chat.ChatCompletion, toolCall: ResolvedToolCall<P, R> | undefined, messages: OpenAI.ChatCompletionMessageParam[]): Promise<R | undefined> {
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

export async function invokeFunctionWithTools<P, R>(chatCompletion: OpenAI.Chat.Completions.ChatCompletion, tools: Tool[], messages: OpenAI.ChatCompletionMessageParam[]): Promise<{
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

function isValibotObjectSchema(schema: any): schema is BaseSchema<unknown, unknown, BaseIssue<unknown>> {
  if (typeof schema !== 'object')
    return false

  return 'type' in schema && schema.type === 'string' && 'reference' in schema && 'expects' in schema && 'entries' in schema && 'message' in schema
}

export function toolFunction(name: string, description: string, parameters: JSONSchema7Object): OpenAI.Chat.ChatCompletionTool
export function toolFunction(name: string, description: string, parameters: ZodSchema): OpenAI.Chat.ChatCompletionTool
export function toolFunction(name: string, description: string, parameters: BaseSchema<unknown, unknown, BaseIssue<unknown>>): OpenAI.Chat.ChatCompletionTool
export function toolFunction(name: string, description: string, parameters: JSONSchema7 | ZodSchema | BaseSchema<unknown, unknown, BaseIssue<unknown>>): OpenAI.Chat.ChatCompletionTool {
  if (parameters instanceof ZodSchema)
    parameters = zodToJsonSchema(parameters) as JSONSchema7
  else if (isValibotObjectSchema(parameters))
    parameters = toJsonSchema(parameters) as JSONSchema7

  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: parameters as Record<string, any>,
    },
  }
}

export interface Tool<P = any, R = any> {
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
  chatCompletion: OpenAI.Chat.Completions.ChatCompletion
  parameters: P
  toolCall: ResolvedToolCall<P, R>
}

export interface PreInvokeContext<P, R> extends InvokeContext<P, R> {

}

export interface PostInvokeContext<P, R> extends InvokeContext<P, R> {
  result: R
}

export interface ResolvedToolCall<P, R> extends Tool {
  arguments: P
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall
  hooks: ToolHooks<P, R>
}

export function defineToolFunction<P, R>(
  tool: OpenAI.Chat.ChatCompletionTool,
  func: (ctx: InvokeContext<P, R>) => Promise<R>,
  options?: {
    openAI?: OpenAI
    hooks?: Partial<ToolHooks<P, R>>
  },
): Tool {
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

export function tools(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map(tool => tool.tool)
}

export function composeAgent(options: {
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

      const chatCompletionToolCall = resolveFirstToolCallFromCompletion(res)
      messages.push(assistant(chatCompletionToolCall))

      const { result, toolCall } = await invokeFunctionWithTools<any, any>(res, options.tools, messages)
      if (!toolCall)
        return res
      if (result == null)
        return res

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
