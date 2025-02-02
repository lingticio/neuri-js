import type { ChunkResult } from './stream'
import { env } from 'node:process'
import { describe, expect, it } from 'vitest'
import { messages, system, user } from './messages'
import { stream } from './stream'

describe('stream', async () => {
  it('it works', async () => {
    const res = await stream({
      apiKey: env.OPENAI_API_KEY!,
      baseURL: env.OPENAI_API_BASEURL!,
      model: 'openai/gpt-3.5-turbo',
      messages: messages(
        system('You are a helpful assistant.'),
        user('What is the meaning of life?'),
      ),
    })

    const readText = async () => {
      const readTextParts: string[] = []
      for await (const text of res.textStream()) {
        readTextParts.push(text)
      }

      return readTextParts
    }

    const readChunk = async () => {
      const readChunkParts: ChunkResult[] = []
      for await (const chunk of res.chunkStream()) {
        readChunkParts.push(chunk)
      }

      return readChunkParts
    }

    const [readTextParts, readChunks] = await Promise.all([readText(), readChunk()])
    const textCompletions = readTextParts.join('')
    const textCompletionsFromChunks = readChunks.map(i => i.textPart()).join('')

    expect(readTextParts.length).toBeGreaterThan(0)
    expect(readChunks.length).toBeGreaterThan(0)
    expect(textCompletions).toBe(textCompletionsFromChunks)
    expect(await res.text()).toBe(textCompletions)
    expect((await res.chunks()).length).toBe(readChunks.length)
  })
})
