import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'
import { object, string } from 'zod'

import { agent, neuri } from '.'
import { assistant, messages, system, user } from './openai'

describe('neuri', async () => {
  it('should work', { timeout: 100000 }, async () => {
    const n = await neuri()
      .agent(
        agent('consciousness')
          .tool('getMyName', object({ name: string() }), async () => 'Your name is Neuri.')
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
        provider: {
          apiKey: process.env.OPENAI_API_KEY!,
          baseURL: process.env.OPENAI_API_BASEURL!,
        },
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

  it('should work with handleStateless', { timeout: 100000 }, async () => {
    const n = await neuri()
      .agent(
        agent('consciousness')
          .tool('getMyName', object({ name: string() }), async () => 'Your name is Neuri.')
          .build(),
      )
      .build({
        provider: {
          apiKey: process.env.OPENAI_API_KEY!,
          baseURL: process.env.OPENAI_API_BASEURL!,
        },
      })

    const historyMessage: Message[] = []
    historyMessage.push(system('You are a helpful assistant.'))
    historyMessage.push(user('What is your name?'))

    await n.handleStateless(historyMessage, async (c) => {
      const completion = await c.reroute('consciousness', c.messages, { model: 'gpt-3.5-turbo' })

      const content = await completion?.firstContent()
      if (content) {
        historyMessage.push(assistant(content))
      }

      return content
    })

    expect(historyMessage.length).toBe(3)
  })
})
