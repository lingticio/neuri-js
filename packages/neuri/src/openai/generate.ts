import type { GenerateTextOptions } from '@xsai/generate-text'
import type { ChatCompletionsResponse, Tool } from './types'

import { chat } from '@xsai/shared-chat'
import { chatCompletionFromResp as chatCmplFromResp } from './completion'

/**
 * Generate text
 *
 * @param params - The parameters to generate text.
 * @returns ChatCompletion
 */
export async function generate(params: Omit<GenerateTextOptions, 'tools'> & { tools?: Tool[] }) {
  const reqRes = await chat(params as GenerateTextOptions)
  return chatCmplFromResp(await reqRes.json() as ChatCompletionsResponse)
}
