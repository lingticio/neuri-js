import { newTestInvokeContext } from 'neuri/test'
import { describe, expect, it } from 'vitest'
import { object, string } from 'zod'
import { defineToolFunction, toolFunction } from './tools'

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
