import { env } from 'node:process'
import { description, object, pipe, string } from 'valibot'
import { describe, expect, it } from 'vitest'
import { composeAgent } from './agent'
import { messages, system, user } from './messages'
import { createOpenAIProvider } from './provider'
import { defineToolFunction } from './tools'

describe('openai-xsai/agent', () => {
  it('should execute call', async () => {
    const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY
    const baseURL = env.OPENAI_API_BASEURL || env.VITE_OPENAI_API_BASEURL
    expect(apiKey).toBeDefined()
    expect(baseURL).toBeDefined()

    const openAI = createOpenAIProvider({
      apiKey: apiKey!,
      baseURL: baseURL!,
    })

    const weather = await defineToolFunction({
      description: 'Get the weather in a location',
      execute: ({ location }) => JSON.stringify({
        location,
        temperature: 42,
      }),
      name: 'weather',
      parameters: object({
        location: pipe(string(), description('The location to get the weather for')),
      }),
    })

    const { call } = composeAgent({
      openAI,
      tools: [weather],
    })

    const res = await call(
      messages(
        system('You are a helpful assistant.'),
        user('What is the weather in San Francisco?'),
      ),
      { model: 'openai/gpt-4o' },
    )

    expect(res).toBeDefined()
    expect(res!.text).toBeDefined()
    expect(res!.text).toContain('42')
  })
}, 10000)
