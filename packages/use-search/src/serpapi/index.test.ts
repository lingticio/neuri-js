import { env } from 'node:process'
import { invoke } from 'neuri/test'
import { describe, expect, it } from 'vitest'

import { SerpApi } from '.'

describe('neuri/use-search/serpapi', () => {
  it('should search', async () => {
    expect(env.SERPAPI_API_KEY).toBeDefined()
    expect(env.SERPAPI_API_KEY).not.toBe('')

    const { searchGoogle } = await SerpApi({ apiKey: env.SERPAPI_API_KEY! })

    const res = await invoke(searchGoogle, { q: 'Neuri.js' })
    expect(res).toBeDefined()
    expect(res.length).toBeGreaterThan(0)
    expect(res).toContain('Search results for "Neuri.js" on Google:')
  })
})
