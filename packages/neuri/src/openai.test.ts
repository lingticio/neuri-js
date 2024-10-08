import { env } from 'node:process'
import OpenAI from 'openai'
import { describe, expect, it } from 'vitest'

import {
  composeAgent,
  firstTextMessageChoiceFromCompletion,
  system,
  toolFunction,
  toolFunctionWithCallback,
  user,
} from './openai'

describe.skip('agent', async () => {
  it('works', async () => {
    const o = new OpenAI({
      baseURL: import.meta.env.VITE_OPENAI_API_BASEURL,
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    })

    const { call } = await composeAgent({
      openAI: o,
      tools: [
        toolFunctionWithCallback(
          o,
          toolFunction('getCity', 'Get the user\'s city', {}),
          async () => {
            return 'New York City'
          },
          {
            hooks: {
              preInvoke: async () => {
                // eslint-disable-next-line no-console
                console.log('getCity called')
              },
            },
          },
        ),
        toolFunctionWithCallback<{ location: string }, string>(
          o,
          toolFunction('getCityCode', 'Get the user\'s city code with search', {
            type: 'object',
            properties: {
              city: {
                type: 'string',
              },
            },
            required: ['city'],
          }),
          async () => {
            return 'NYC'
          },
          {
            hooks: {
              preInvoke: async () => {
                // eslint-disable-next-line no-console
                console.log('getCityCode called')
              },
            },
          },
        ),
        toolFunctionWithCallback<{ cityCode: string }, { city: string, cityCode: string, weather: string, degreesCelsius: number }>(
          o,
          toolFunction('getWeather', 'Get the current weather', {
            type: 'object',
            properties: {
              cityCode: {
                type: 'string',
                description: 'The city code to get the weather for.',
              },
            },
            required: ['cityCode'],
          }),
          async ({ arguments: { cityCode } }) => {
            return {
              city: `New York city`,
              cityCode,
              weather: 'sunny',
              degreesCelsius: 26,
            }
          },
          {
            hooks: {
              preInvoke: async () => {
                // eslint-disable-next-line no-console
                console.log('getWeather called')
              },
            },
          },
        ),
      ],
    })

    const res = await call([
      system('I am a helpful assistant here to provide information of user, user may ask you anything. Please identify the user\'s need, and pick up the right tool to obtain the necessary information.'),
      user('What is the weather like today?'),
    ], {
      model: 'openai/gpt-3.5-turbo',
    })

    const message = firstTextMessageChoiceFromCompletion(res)
    expect(message).toContain('sunny')
    expect(message).toContain('26')
  }, 20000)
})
