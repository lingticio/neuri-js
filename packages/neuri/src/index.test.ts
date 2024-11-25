import { describe, it } from 'vitest'
import { object, string } from 'zod'

import { agent, neuri } from '.'

describe('neuri', async () => {
  it('should work', async () => {
    await neuri()
      .agent(
        agent()
          .tool('name', object({ name: string() }), async () => { })
          .build(),
      )
      .build()
  })
})
