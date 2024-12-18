import type { GenerateTextOptions } from '@xsai/generate-text'
import type { ChatCompletion } from './types'
import { chatCompletion } from '@xsai/shared-chat'

/**
 * Generate text
 *
 * @param params - The parameters to generate text.
 * @returns ChatCompletion
 */
export async function generate(params: GenerateTextOptions) {
  const reqRes = await chatCompletion(params)
  return await reqRes.json() as ChatCompletion
}
