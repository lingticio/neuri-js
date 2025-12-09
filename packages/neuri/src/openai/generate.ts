import type { GenerateTextOptions } from '@xsai/generate-text'
import type { WithUnknown } from '@xsai/shared'
import type { ChatOptions } from '@xsai/shared-chat'
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
  const reqRes = await chat(params as WithUnknown<ChatOptions>)
  return chatCmplFromResp(await reqRes.json() as ChatCompletionsResponse)
}
