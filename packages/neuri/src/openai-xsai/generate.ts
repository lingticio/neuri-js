import type { Message } from '@xsai/shared-chat-completion'
import type { ToolResult } from '@xsai/tool'
import type { OpenAIProviderOptions } from './provider'
import { generateText, type GenerateTextResult } from '@xsai/generate-text'

interface GenerateOptions {
  [key: string]: any
  model: string
  messages: Message[]

  toolChoice?: 'auto' | 'none'
  tools?: ToolResult<any>[]
  maxSteps?: number
}

/**
 * Generate the completion response from LLM API.
 *
 * @param params - The parameters to generate the completion response.
 * @param params.openAI - The OpenAI instance.
 * @param params.options - The options to create the completion.
 * @returns The completion response.
 */
export async function generate(
  params: {
    openAI: OpenAIProviderOptions
    options: GenerateOptions
  },
): Promise<GenerateTextResult> {
  return generateText({
    ...params.options,
    apiKey: params.openAI.apiKey,
    baseURL: params.openAI.baseURL ?? new URL('https://api.openai.com/v1'),
    model: params.options.model,
    messages: params.options.messages,
  })
}
