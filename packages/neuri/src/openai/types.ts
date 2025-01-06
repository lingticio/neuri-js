import type { GenerateTextResponseUsage } from '@xsai/generate-text'
import type { ProviderOptions } from '@xsai/providers'
import type { AssistantMessageResponse, FinishReason, Message, ToolCall, Tool as UpstreamTool } from '@xsai/shared-chat'

export interface Choice {
  finish_reason: FinishReason
  index: number
  message: AssistantMessageResponse
}

export interface ChatCompletionsResponse {
  choices: Choice[]
  created: number
  id: string
  model: string
  object: 'chat.completion'
  system_fingerprint: string
  usage: GenerateTextResponseUsage
}

export interface ChatCompletionsErrorResponse {
  error: {
    message: string
  }
}

export type Tool = Omit<UpstreamTool, 'execute'>

export interface ChatCompletion extends ChatCompletionsResponse {
  firstContent: () => Promise<string>
  firstChoice: () => Choice | undefined
}

export interface ToolCallFunctionResult<P = any, R = any> {
  result: R | undefined
  chatCompletionToolCall?: ToolCall
  resolvedToolCall: ResolvedToolCall<P, R> | undefined
}

export interface DefinedTool<P, R> {
  provider: ProviderOptions
  tool: Tool
  func: (ctx: InvokeContext<P, R>) => R
  hooks: DefinedToolHooks<P, R>
}

export interface DefinedToolHooks<P, R> {
  configureProvider: (provider?: ProviderOptions) => Promise<ProviderOptions | undefined>
  preInvoke: (ctx: PreInvokeContext<P, R>) => Promise<void>
  postInvoke: (ctx: PostInvokeContext<P, R>) => Promise<void>
}

export interface InvokeContext<P, R> {
  messages: Message[]
  chatCompletion: ChatCompletion
  parameters: P
  toolCall: ResolvedToolCall<P, R>
}

export interface PreInvokeContext<P, R> extends InvokeContext<P, R> {}

export interface PostInvokeContext<P, R> extends InvokeContext<P, R> {
  result: R
}

export interface ResolvedToolCall<P, R> extends DefinedTool<P, R> {
  arguments: P
  toolCall: ToolCall
  hooks: DefinedToolHooks<P, R>
}
