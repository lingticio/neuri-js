import type { BundledLanguage } from 'shiki'
import {
  extractByTextMateGrammar,
  extractGolangCode,
  extractJavaScriptCode,
  extractRustCode,
  extractTsxCode,
  extractTypeScriptCode,
  extractVueCode,
} from './textmate'

/**
 * Callback function for updating the parsed code.
 * @param update - Object containing the parsed code text.
 */
type UpdateCallback = (update: { text: string }) => void

/**
 * Interface for a streamable parser.
 */
interface StreamableParser {
  /**
   * Feed a chunk of code to the parser.
   * @param chunk - The code chunk to parse.
   */
  feed: (chunk: string) => Promise<void>
  /**
   * End the parsing process and return the final parsed code.
   * @returns A promise that resolves to the final parsed code.
   */
  end: () => Promise<string>
}

/**
 * Create a streamable parser for a specific language.
 * @param lang - The language to parse.
 * @param extractCode - Function to extract the parsed code from the TextMate grammar result.
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object.
 */
function createStreamableParser(lang: BundledLanguage, extractCode: (result: any, buffer: string) => string, callback: UpdateCallback): StreamableParser {
  let buffer = ''

  async function feed(chunk: string) {
    buffer += chunk
    const result = await extractByTextMateGrammar(lang, buffer)

    // console.log(JSON.stringify(result.tokens, null, 2))

    const code = extractCode(result, buffer)
    callback({ text: code })
  }

  async function end() {
    const result = await extractByTextMateGrammar(lang, buffer)
    const code = extractCode(result, buffer)
    return code
  }

  return { feed, end }
}

/**
 * Create a streamable parser for Vue code.
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object for Vue code.
 */
export function createStreamableVueParser(callback: UpdateCallback): StreamableParser {
  return createStreamableParser('vue', extractVueCode, callback)
}

/**
 * Create a streamable parser for TSX code.
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object for TSX code.
 */
export function createStreamableTsxParser(callback: UpdateCallback): StreamableParser {
  return createStreamableParser('tsx', extractTsxCode, callback)
}

/**
 * Create a streamable parser for Golang code.
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object for Golang code.
 */
export function createStreamableGolangParser(callback: UpdateCallback): StreamableParser {
  return createStreamableParser('go', extractGolangCode, callback)
}

/**
 * Create a streamable parser for JavaScript code.
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object for JavaScript code.
 */
export function createStreamableJavaScriptParser(callback: UpdateCallback): StreamableParser {
  return createStreamableParser('js', extractJavaScriptCode, callback)
}

/**
 * Create a streamable parser for TypeScript code.
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object for TypeScript code.
 */
export function createStreamableTypeScriptParser(callback: UpdateCallback): StreamableParser {
  return createStreamableParser('ts', extractTypeScriptCode, callback)
}

/**
 * Create a streamable parser for Rust code.
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object for Rust code.
 */
export function createStreamableRustParser(callback: UpdateCallback): StreamableParser {
  return createStreamableParser('rust', extractRustCode, callback)
}
