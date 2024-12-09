import type { Message } from '@xsai/shared-chat-completion'
import type { OpenAIProviderOptions } from './provider'
import { streamText, type StreamTextResult } from '@xsai/stream-text'

export interface StreamOptions {
  [key: string]: any
  model: string
  messages: Message[]
}

/**
 * Stream the completion response from LLM API.
 *
 * @param params - The parameters to stream the completion response.
 * @param params.openAI - The OpenAI instance.
 * @param params.options - The options to create the completion.
 * @returns The completion response stream.
 */
export async function stream(
  params: {
    openAI: OpenAIProviderOptions
    options: StreamOptions
  },
): Promise<StreamTextResult> {
  return streamText({
    ...params.options,
    apiKey: params.openAI.apiKey,
    baseURL: params.openAI.baseURL ?? new URL('https://api.openai.com/v1'),
    model: params.options.model,
    messages: params.options.messages,
  })
}
