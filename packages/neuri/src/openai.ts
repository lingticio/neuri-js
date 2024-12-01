import type { Infer, Schema } from '@typeschema/main'

import type OpenAI from 'openai'
import { toJSONSchema } from '@typeschema/main'

/**
 * Generate the completion response from LLM API.
 *
 * @param params - The parameters to generate the completion response.
 * @param params.options - The options to create the completion.
 * @param params.openAI - The OpenAI instance.
 * @returns The completion response.
 */
export async function generate(params: { options: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, openAI: OpenAI }) {
  const res = await params.openAI.chat.completions.create(params.options)
  return chatCompletionFromOpenAIChatCompletion(res)
}

/**
 * Generate the completion response from LLM API.
 */
export interface StreamChunk {
  raw: () => Uint8Array
  textPart: () => string
  chunk: () => OpenAI.Chat.ChatCompletionChunk
}

function parseChunkFromBuffer(value: Uint8Array) {
  const str = new TextDecoder().decode(value)
  return JSON.parse(str) as unknown as OpenAI.Chat.ChatCompletionChunk
}

function newStreamChunk(raw: Uint8Array, resChunk: OpenAI.Chat.ChatCompletionChunk): StreamChunk {
  return {
    raw: () => raw,
    chunk: () => resChunk,
    textPart: () => resChunk.choices?.[0]?.delta.content ?? '',
  } satisfies StreamChunk
}

export interface StreamResponse {
  /**
   * Get the completion response.
   *
   * @returns The completion response.
   */
  response: () => Promise<any>
  /**
   * Get the entire completion response as a text.
   *
   * @returns The entire completion response as a text.
   */
  text: () => Promise<string>
  /**
   *
   * Get the completion response as a stream of text.
   *
   * @returns The completion response as a stream of text.
   */
  textStream: () => AsyncGenerator<string, void, unknown>
  /**
   * Get the completion response as a stream of chunks.
   *
   * @returns The completion response as a stream of chunks.
   */
  chunkStream: () => AsyncGenerator<StreamChunk, void, unknown>
  /**
   * Get the completion response as a stream of chunks.
   *
   * @returns The completion response as a stream of chunks.
   */
  chunks: () => Promise<StreamChunk[]>
  /**
   * Convert the completion response to a iterable readable stream.
   *
   * This function is 100% sure to be ok to use even if your browser or environments didn't implemented the `Symbol.asyncIterator` feature.
   *
   * @param options
   * @returns
   */
  toReadableStream: () => AsyncGenerator<Uint8Array, void, unknown>
}

interface PipeHook<F, T> {
  onValue?: (value: F) => void
  onChunk?: (chunk: T) => void
  onDone?: () => void
}

async function* asyncIteratorFromReadableStream<T, F = Uint8Array>(res: ReadableStream<F>, func: (value: F) => Promise<T>, hooks?: PipeHook<F, T>[]): AsyncGenerator<T, void, unknown> {
  // reactjs - TS2504: Type 'ReadableStream<Uint8Array>' must have a '[Symbol.asyncIterator]()' method that returns an async iterator - Stack Overflow
  // https://stackoverflow.com/questions/76700924/ts2504-type-readablestreamuint8array-must-have-a-symbol-asynciterator
  const reader = res.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        hooks?.forEach(i => i.onDone?.())
        return
      }

      const chunk = await func(value)
      hooks?.forEach(i => i.onChunk?.(chunk))
      yield chunk
    }
  }
  finally {
    reader.releaseLock()
  }
}

/**
 * Stream the completion response from LLM API.
 *
 * @param params - The parameters to stream the completion response.
 * @param params.options - The options to create the completion.
 * @param params.openAI - The OpenAI instance.
 * @returns The completion response stream.
 */
export async function stream(params: {
  options: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, 'stream'>
  openAI: OpenAI
}): Promise<StreamResponse> {
  const res = await params.openAI.chat.completions.create({ ...params.options, stream: true, stream_options: { include_usage: true } })

  const [fullStream, rawStream] = res.tee()
  const [textStream, chunkStream] = fullStream.tee()

  const textStreamHooks: PipeHook<Uint8Array, string>[] = []
  const accumulatedText = new Promise<string>((resolve) => {
    const chunks: string[] = []
    textStreamHooks.push({
      onChunk: (chunk) => { chunks.push(chunk) },
      onDone: () => { resolve(chunks.join('')) },
    })
  })

  const chunkStreamHooks: PipeHook<Uint8Array, StreamChunk>[] = []
  const accumulatedChunks = new Promise<StreamChunk[]>((resolve) => {
    const chunks: StreamChunk[] = []
    chunkStreamHooks.push({
      onChunk: (chunk) => { chunks.push(chunk) },
      onDone: () => { resolve(chunks) },
    })
  })

  return {
    response: async () => res,
    text: () => accumulatedText,
    chunks: () => accumulatedChunks,
    textStream: () => asyncIteratorFromReadableStream(
      textStream.toReadableStream(),
      async (value: Uint8Array) => newStreamChunk(value, parseChunkFromBuffer(value)).textPart(),
      textStreamHooks,
    ),
    chunkStream: () => asyncIteratorFromReadableStream(
      chunkStream.toReadableStream(),
      async (value: Uint8Array) => newStreamChunk(value, parseChunkFromBuffer(value)),
      chunkStreamHooks,
    ),
    toReadableStream: () => rawStream.toReadableStream() as unknown as AsyncGenerator<Uint8Array, void, unknown>,
  } satisfies StreamResponse
}

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
  firstChoice: () => OpenAI.ChatCompletion.Choice | undefined
}

export function chatCompletionFromOpenAIChatCompletion(completions: OpenAI.Chat.Completions.ChatCompletion): ChatCompletion {
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

export interface ToolCallFunctionResult<P = any, R = any> {
  result: R | undefined
  chatCompletionToolCall?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  resolvedToolCall: ResolvedToolCall<P, R> | undefined
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

type JSONSchema = Awaited<ReturnType<typeof toJSONSchema>> & Record<string, any>

// @ts-expect-error - P is helper, R is helper
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
  func: (ctx: InvokeContext<P, R>) => R
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

export function defineToolFunction<F extends (ctx: InvokeContext<P, R>) => R, P = Parameters<F>, R = ReturnType<F>>(
  tool: ToolFunction<P>,
  func: F,
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
