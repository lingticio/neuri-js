import { type BaseResponse, getJson } from 'serpapi'

export interface GoogleEngineResponse extends BaseResponse {
  search_metadata: SearchMetadata
  search_parameters: SearchParameters
  search_information: SearchInformation
  related_questions: RelatedQuestion[]
  organic_results: OrganicResult[]
  pagination: Pagination
  serpapi_pagination: SerpApiPagination
}

export interface SearchMetadata {
  id: string
  status: string
  json_endpoint: string
  created_at: string
  processed_at: string
  google_url: string
  raw_html_file: string
  total_time_taken: number
}

export interface SearchParameters {
  engine: string
  q: string
  google_domain: string
  device: string
}

export interface SearchInformation {
  query_displayed: string
  total_results: number
  time_taken_displayed: number
  organic_results_state: string
  showing_results_for: string
  spelling_fix?: string
}

export interface RelatedQuestion {
  question: string
  snippet?: string
  title: string
  link: string
  displayed_link: string
  thumbnail?: string
  source_logo: string
  next_page_token: string
  serpapi_link: string
  list?: string[]
  date?: string
}

export interface OrganicResult {
  position: number
  title: string
  link: string
  redirect_link: string
  displayed_link: string
  favicon: string
  snippet: string
  source: string
  snippet_highlighted_words?: string[]
  missing?: string[]
  must_include?: MustInclude
  date?: string
  author?: string
  cited_by?: string
  extracted_cited_by?: number
}

export interface MustInclude {
  word: string
  link: string
}

export interface Pagination {
  current: number
  next: string
  other_pages: GoogleOtherPages
}

export type GoogleOtherPages = Record<number, string>

export interface SerpApiPagination {
  current: number
  next_link: string
  next: string
  other_pages: SerpApiOtherPages
}

export type SerpApiOtherPages = Record<number, string>

export interface GoogleEngineResult {
  response: GoogleEngineResponse
  containsSpellingFix: () => boolean
  spellingFix: () => { from: string, to: string } | undefined
  formatOrganicResultsAsMarkdownSnippets: () => Array<string>
}

function queryDisplayedFromResponseOr(res: GoogleEngineResponse, or: string): string {
  return res?.search_information?.query_displayed || or
}

function containsSpellingFixFromResponse(res: GoogleEngineResponse): boolean {
  if (!('organic_results_state' in res.search_information)) {
    return false
  }
  if (res.search_information.organic_results_state === 'Including results for spelling fix') {
    return true
  }

  return !!spellingFixFromResponse(res)
}

function firstOr<T>(results: Array<T | undefined>, or: T): T {
  for (const result of results) {
    if (result) {
      return result
    }
  }

  return or
}

function spellingFixFromResponse(res: GoogleEngineResponse): string | undefined {
  if (!('spelling_fix' in res.search_information)) {
    return
  }

  return res?.search_information?.spelling_fix || ''
}

export async function searchGoogleByQuery(apiKey: string, q: string, options?: { location?: string, start?: number }): Promise<GoogleEngineResult> {
  const res = await getJson({
    engine: 'google',
    api_key: apiKey,
    q,
    location: options?.location,
    start: options?.start,
  }) as GoogleEngineResponse

  return {
    response: res,
    containsSpellingFix: () => containsSpellingFixFromResponse(res),
    spellingFix: () => {
      if (!containsSpellingFixFromResponse(res)) {
        return
      }

      return {
        from: queryDisplayedFromResponseOr(res, q),
        to: firstOr([spellingFixFromResponse(res)], ''),
      }
    },
    formatOrganicResultsAsMarkdownSnippets: () => res.organic_results.map((result) => {
      const parts: string[] = []
      if (result.title) {
        parts.push(`## [${result.title}](${result.link})\n`)
      }
      if (result.date) {
        parts.push(`Date: ${result.date}\n`)
      }
      if (result.author) {
        parts.push(`Author: ${result.author}\n`)
      }

      parts.push(`${result.snippet}`)

      return parts.join('\n')
    }),
  }
}
