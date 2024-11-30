import { env } from 'node:process'
import { describe, expect, it } from 'vitest'
import { searchGoogleByQuery } from './serpapi'

describe('neuri/use-search/serpapi', () => {
  it('should search', async () => {
    expect(env.SERPAPI_API_KEY).toBeDefined()
    expect(env.SERPAPI_API_KEY).not.toBe('')

    const result = await searchGoogleByQuery(env.SERPAPI_API_KEY!, 'Neuri.js')

    expect(result).toBeDefined()
    expect(result.formatOrganicResultsAsMarkdownSnippets().length).toBeGreaterThan(0)
    expect(result.response).toBeDefined()
    expect(result.response.search_information.query_displayed).toBe('Neuri.js')
    expect(result.response.organic_results.length).toBeGreaterThan(0)
  })
})
