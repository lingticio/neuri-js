import type { GenerateTextOptions } from '@xsai/generate-text'
import type { ChatCompletionsErrorResponse, ChatCompletionsResponse } from './types'

import { chat } from '@xsai/shared-chat'
import { chatCompletionFromResp as chatCmplFromResp } from './completion'

/**
 * Generate text
 *
 * @param params - The parameters to generate text.
 * @returns ChatCompletion
 */
export async function generate(params: GenerateTextOptions) {
  const reqRes = await chat(params)
  const json = await reqRes.json() as ChatCompletionsResponse | ChatCompletionsErrorResponse

  if ('error' in json) {
    throw new Error(json.error?.message || 'Unknown error')
  }

  return chatCmplFromResp(json as ChatCompletionsResponse)
}
