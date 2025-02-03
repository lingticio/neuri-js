import type { ChatCompletionsResponse } from './types'
import { env } from 'node:process'
import fetchMock, { manageFetchMockGlobally } from '@fetch-mock/vitest'
import { nanoid } from 'nanoid'
import { describe, expect, it } from 'vitest'
import * as z from 'zod'

import { composeAgent } from './agent'
import { messages, user } from './messages'
import { defineToolFunction, toolFunction } from './tools'

manageFetchMockGlobally()

describe('composeAgent', async () => {
  // multiple function calling in a single response will only add the first result to chat context · Issue #43 · lingticio/neuri-js
  // https://github.com/lingticio/neuri-js/issues/43
  it('should not throw Invalid parameter error (#43)', { timeout: 30000 }, async () => {
    let fetchRouteCount = 0

    fetchMock
      .mockGlobal()
      .post(
        `${env.OPENAI_API_BASEURL!}chat/completions`,
        () => {
          fetchRouteCount += 1
          const now = Math.ceil(Date.now() / 1000)

          if (fetchRouteCount === 1) {
            return {
              id: `gen_${now}_${nanoid()}`,
              // provider: 'OpenAI',
              model: 'openai/gpt-4o',
              object: 'chat.completion',
              created: now,
              choices: [
                {
                  // logprobs: null,
                  finish_reason: 'tool_calls',
                  // native_finish_reason: 'tool_calls',
                  index: 0,
                  message: {
                    role: 'assistant',
                    content: '',
                    refusal: null,
                    tool_calls: [
                      {
                        // index: 0,
                        id: `call_${nanoid()}`,
                        type: 'function',
                        function: {
                          name: 'getWeather',
                          arguments: '{}',
                        },
                      },
                      {
                        // index: 1,
                        id: `call_${nanoid()}`,
                        type: 'function',
                        function: {
                          name: 'getTemperature',
                          arguments: '{}',
                        },
                      },
                    ],
                  },
                },
              ],
              system_fingerprint: `fp_${nanoid()}`,
              usage: {
                prompt_tokens: 54,
                completion_tokens: 40,
                total_tokens: 94,
              },
            } satisfies ChatCompletionsResponse
          }

          return {
            id: `gen_${now}_${nanoid()}`,
            // provider: 'OpenAI',
            model: 'openai/gpt-4o',
            object: 'chat.completion',
            created: now,
            choices: [
              {
                // logprobs: null,
                finish_reason: 'tool_calls',
                // native_finish_reason: 'tool_calls',
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'The weather is sunny and the temperature is 20.',
                  refusal: null,
                },
              },
            ],
            system_fingerprint: `fp_${nanoid()}`,
            usage: {
              prompt_tokens: 54,
              completion_tokens: 40,
              total_tokens: 94,
            },
          } satisfies ChatCompletionsResponse
        },
      )

    const { call } = composeAgent({
      provider: {
        model: 'openai/gpt-4o',
        apiKey: env.OPENAI_API_KEY!,
        baseURL: env.OPENAI_API_BASEURL!,
      },
      tools: [
        defineToolFunction(
          await toolFunction('getWeather', 'Get the weather', z.object({})),
          () => 'sunny',
        ),
        defineToolFunction(
          await toolFunction('getTemperature', 'Get the temperature', z.object({})),
          () => '20',
        ),
      ],
    })

    const result = await call(
      messages(user('What is the weather and temperature?')),
      { model: 'gpt-4o' },
    )

    expect(result).toBeDefined()
    fetchMock.unmockGlobal()
  })
})
