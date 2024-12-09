import type { GenerateTextResult } from '@xsai/generate-text'
import type { Message } from '@xsai/shared-chat-completion'
import type { ToolResult } from '@xsai/tool'
import type { OpenAIProviderOptions } from './provider'
import { generate } from './generate'

/**
 * Compose an agent from a set of tools and an OpenAI provider.
 * @param options - The options for the agent.
 * @param options.tools - The tools to use in the agent.
 * @param options.openAI - The OpenAI provider to use in the agent.
 * @returns An agent that can be used to generate text.
 */
export function composeAgent(options: { tools: ToolResult<any>[], openAI: OpenAIProviderOptions }) {
  async function call(messages: Message[], callOptions: { model: string, maxRoundTrip?: number }): Promise<GenerateTextResult | undefined> {
    // TODO: hooks
    return generate({
      openAI: options.openAI,
      options: {
        model: callOptions.model,
        messages,
        toolChoice: 'auto',
        tools: options.tools,
        maxSteps: callOptions.maxRoundTrip ?? 10,
      },
    })
  }

  return {
    call,
  }
}
