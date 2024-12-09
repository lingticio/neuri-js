import { env } from 'node:process'
import { describe, expect, it } from 'vitest'
import { messages, system, user } from './messages'
import { createOpenAIProvider } from './provider'
import { stream } from './stream'

describe('stream', () => {
  it('should stream textStream', async () => {
    const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY
    const baseURL = env.OPENAI_API_BASEURL || env.VITE_OPENAI_API_BASEURL
    expect(apiKey).toBeDefined()
    expect(baseURL).toBeDefined()

    const openAI = createOpenAIProvider({
      apiKey: apiKey!,
      baseURL: baseURL!,
    })

    try {
      const { textStream } = await stream({
        options: {
          model: 'openai/gpt-4o-mini',
          messages: messages(
            system('You are a helpful assistant.'),
            user('What is the meaning of life?'),
          ),
        },
        openAI,
      })

      const text: string[] = []
      for await (const textPart of textStream) {
        text.push(textPart)
      }

      expect(textStream).toBeDefined()
      expect(text).toBeDefined()
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  })

  // TODO: auto tee?
  it('should stream chunkStream', async () => {
    const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY
    const baseURL = env.OPENAI_API_BASEURL || env.VITE_OPENAI_API_BASEURL
    expect(apiKey).toBeDefined()
    expect(baseURL).toBeDefined()

    const openAI = createOpenAIProvider({
      apiKey: apiKey!,
      baseURL: baseURL!,
    })

    try {
      const { chunkStream } = await stream({
        options: {
          model: 'openai/gpt-4o-mini',
          messages: messages(
            system('You are a helpful assistant.'),
            user('What is the meaning of life?'),
          ),
        },
        openAI,
      })

      expect(chunkStream).toBeDefined()
      for await (const textPart of chunkStream) {
        expect(textPart).toBeDefined()
      }
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  })
}, 10000)
