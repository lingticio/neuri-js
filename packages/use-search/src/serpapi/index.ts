import { defineToolFunction, toolFunction } from 'neuri/openai'
import { number, object, string } from 'zod'

import { searchGoogleByQuery } from './serpapi'

export async function SerpApi(options: { apiKey: string }) {
  async function searchGoogle() {
    return defineToolFunction(
      await toolFunction('search', 'Search by keywords on Google', object({
        q: string().min(1).describe('Query to search on Google'),
        location: string().optional().describe('The location of the search you want to initiate from, e.g. Austin, Texas. It\'s ok to not to provide this parameter when you don\'t know'),
        start: number().default(0).optional().describe('The start index of the search results you want to retrieve. 10 means skip the first 10 results (skipped page 1), 20 means skipped page 1 and 2, and so on'),
      })),
      async ({ parameters: { q, location, start } }) => {
        const res = await searchGoogleByQuery(options.apiKey, q, { location, start })
        let formatted = `Search results for "${q}" on Google: \n\n${res.formatOrganicResultsAsMarkdownSnippets().join('\n\n')}`
        if (res.containsSpellingFix()) {
          formatted = `Input query "${q}" has been corrected to "${res.spellingFix()?.to}", showing the result of ${res.spellingFix()?.to}:\n\n${formatted}`
        }

        return formatted
      },
    )
  }

  return {
    searchGoogle: await searchGoogle(),
  }
}
