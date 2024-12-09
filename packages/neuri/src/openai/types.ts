import type OpenAI from 'openai'

export interface ChatCompletion extends OpenAI.Chat.Completions.ChatCompletion {
  firstContent: () => Promise<string>
  firstChoice: () => OpenAI.ChatCompletion.Choice | undefined
}

export interface ToolCallFunctionResult<P = any, R = any> {
  result: R | undefined
  chatCompletionToolCall?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
  resolvedToolCall: ResolvedToolCall<P, R> | undefined
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

export interface PreInvokeContext<P, R> extends InvokeContext<P, R> {}

export interface PostInvokeContext<P, R> extends InvokeContext<P, R> {
  result: R
}

export interface ResolvedToolCall<P, R> extends Tool<P, R> {
  arguments: P
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall
  hooks: ToolHooks<P, R>
}
