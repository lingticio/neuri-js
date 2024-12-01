import { env } from 'node:process'
import OpenAI from 'openai'

import { describe, expect, it } from 'vitest'
import { object, string } from 'zod'
import { defineToolFunction, messages, stream, type StreamChunk, system, toolFunction, user } from './openai'
import { newTestInvokeContext } from './test'

describe('neuri/openai', async () => {
  it('it works', async () => {
    const tf = await defineToolFunction(
      await toolFunction('name', 'description', object({ name: string() })),
      async ({ parameters: { name } }) => {
        expect(name).toBe('name')

        return name
      },
    )

    expect(tf).toBeDefined()

    const name = await tf.func(newTestInvokeContext({ name: 'name' }))
    expect(name).toBe('name')
  })
})

describe('stream', async () => {
  it('it works', async () => {
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_API_BASEURL,
    })

    const res = await stream({
      openAI: openai,
      options: {
        model: 'openai/gpt-3.5-turbo',
        messages: messages(
          system('You are a helpful assistant.'),
          user('What is the meaning of life?'),
        ),
      },
    })

    const readText = async () => {
      const readTextParts: string[] = []
      for await (const text of res.textStream()) {
        readTextParts.push(text)
      }

      return readTextParts
    }

    const readChunk = async () => {
      const readChunkParts: StreamChunk[] = []
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
