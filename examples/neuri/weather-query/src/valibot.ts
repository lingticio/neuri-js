import { env } from 'node:process'
import {
  composeAgent,
  defineToolFunction,
  resolveFirstTextContentFromChatCmpl,
  system,
  toolFunction,
  user,
} from 'neuri/openai'

import * as v from 'valibot'

async function main() {
  const { call } = composeAgent({
    provider: {
      baseURL: env.OPENAI_API_BASEURL,
      apiKey: env.OPENAI_API_KEY,
    },
    tools: [
      defineToolFunction(
        await toolFunction('getCity', 'Get the user\'s city', v.object({})),
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
      defineToolFunction(
        await toolFunction('getCityCode', 'Get the user\'s city code with search', v.object({
          location: v.pipe(v.string(), v.minLength(1), v.description('Get the user\'s city code with search')),
        })),
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
      defineToolFunction(
        await toolFunction('getWeather', 'Get the current weather', v.object({
          cityCode: v.pipe(v.string(), v.minLength(1), v.description('Get the user\'s city code with search')),
        })),
        async ({ parameters: { cityCode } }) => {
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

  return resolveFirstTextContentFromChatCmpl(res)
}

// eslint-disable-next-line no-console
main().then(console.log).catch(console.error)
