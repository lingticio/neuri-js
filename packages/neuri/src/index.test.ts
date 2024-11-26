import { env } from 'node:process'
import OpenAI from 'openai'
import { describe, expect, it } from 'vitest'

import { object, string } from 'zod'
import { agent, neuri } from '.'
import { messages, system, user } from './openai'

describe('neuri', async () => {
  it('should work', { timeout: 100000 }, async () => {
    const n = await neuri()
      .agent(
        agent('consciousness')
          .tool('getMyName', object({ name: string() }), async () => 'Neuri')
          .build(),
      )
      .agent(
        agent('weather')
          .tool('getCurrentLocation', object({}), async () => 'Shanghai')
          .tool('getCurrentWeather', object({ location: string() }), async ({ parameters: { location } }) => {
            return `${location}, China: 22 degree Celsius`
          })
          .build(),
      )
      .build({
        openAI: new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENAI_API_BASEURL,
        }),
      })

    const name = await n.handle(messages(
      system('You are a helpful assistant.'),
      user('What is your name?'),
    ), async (c) => {
      const completion = await c.reroute('consciousness', c.messages, { model: 'gpt-3.5-turbo' })
      return await completion?.firstContent()
    })

    expect(name).contains('Neuri')
  })
})
