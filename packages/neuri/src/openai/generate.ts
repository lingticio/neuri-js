import type { GenerateTextOptions } from '@xsai/generate-text'
import type { ChatCompletionsResponse } from './types'

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
  return chatCmplFromResp(await reqRes.json() as ChatCompletionsResponse)
}
