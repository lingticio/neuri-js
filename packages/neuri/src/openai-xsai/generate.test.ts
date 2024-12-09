import { env } from 'node:process'
import { describe, expect, it } from 'vitest'
import { generate } from './generate'
import { messages, system, user } from './messages'
import { createOpenAIProvider } from './provider'

describe('generate', () => {
  it('should generate text', async () => {
    const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY
    const baseURL = env.OPENAI_API_BASEURL || env.VITE_OPENAI_API_BASEURL
    expect(apiKey).toBeDefined()
    expect(baseURL).toBeDefined()

    const openAI = createOpenAIProvider({
      apiKey: apiKey!,
      baseURL: baseURL!,
    })

    const res = await generate({
      options: {
        model: 'openai/gpt-4o-mini',
        messages: messages(
          system('You are a helpful assistant.'),
          user('What is the meaning of life?'),
        ),
      },
      openAI,
    })

    expect(res).toBeDefined()
    expect(res.text).toBeDefined()
  })
}, 10000)
