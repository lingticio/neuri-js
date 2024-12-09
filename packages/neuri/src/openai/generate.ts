import type OpenAI from 'openai'
import { chatCompletionFromOpenAIChatCompletion } from './completion'

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
