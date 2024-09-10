import type { LanguageRegistration, ShikiInternal } from '@shikijs/core'
import { createShikiInternal, loadWasm } from '@shikijs/core'
import type { BundledLanguage } from 'shiki'
import { bundledLanguages } from 'shiki'

let wasmLoaded = false
let shiki: ShikiInternal

async function ensureLoadWASM() {
  if (wasmLoaded)
    return

  await loadWasm(import('shiki/wasm'))
  wasmLoaded = true
}

async function ensureShikiInternal() {
  if (shiki != null)
    return

  const languages: LanguageRegistration[] = []
  for (const lang of Object.values(bundledLanguages)) {
    const importedLang = await lang()
    languages.push(...importedLang.default)
  }

  shiki = await createShikiInternal({
    langs: languages,
  })
}

export interface IToken {
  startIndex: number
  readonly endIndex: number
  readonly scopes: string[]
}

/**
 * **IMPORTANT** - Immutable!
 */
export interface StateStack {
  _stackElementBrand: void
  readonly depth: number
  clone: () => StateStack
  equals: (other: StateStack) => boolean
}

export interface ITokenizeLineResult {
  readonly tokens: IToken[]
  /**
   * The `prevState` to be passed on to the next line tokenization.
   */
  readonly ruleStack: StateStack
  /**
   * Did tokenization stop early due to reaching the time limit.
   */
  readonly stoppedEarly: boolean
}

/**
 * Extract code from a text using TextMate grammar.
 *
 * @param lang The language to extract code from.
 * @param extractFrom The text to extract code from.
 * @returns The extracted code.
 */
export async function extractByTextMateGrammar(lang: BundledLanguage, extractFrom: string): Promise<ITokenizeLineResult> {
  await ensureLoadWASM()
  await ensureShikiInternal()

  const res = shiki.getLanguage(lang).tokenizeLine(extractFrom, null, 0)
  return res
}

function extractCode(result: ITokenizeLineResult, text: string, scopes: string[]): string {
  let code = ''
  let lastEndIndex = 0

  result.tokens.forEach((token) => {
    const isTargetScope = token.scopes.some(scope =>
      scopes.some(targetScope =>
        scope === targetScope || scope.startsWith(`${targetScope} `),
      ),
    )

    if (isTargetScope) {
      code += text.slice(lastEndIndex, token.endIndex)
      lastEndIndex = token.endIndex
    }
  })

  return code.trim()
}

/**
 * Extract Vue code from a text using TextMate grammar.
 *
 * @param result The result of tokenization.
 * @param text The text to extract Vue code from.
 * @returns The extracted Vue code.
 */
export function extractVueCode(result: ITokenizeLineResult, text: string): string {
  let vueCode = ''
  let isVueBlock = false
  let lastEndIndex = 0

  result.tokens.forEach((token) => {
    const isVueScope = token.scopes.some(scope =>
      scope === 'source.vue'
      || scope.startsWith('source.vue ')
      || scope.startsWith('text.html.vue'),
    )

    if (isVueScope && !isVueBlock) {
      isVueBlock = true
      lastEndIndex = token.startIndex
    }
    else if (!isVueScope && isVueBlock) {
      vueCode += text.slice(lastEndIndex, token.startIndex)
      isVueBlock = false
    }

    if (isVueBlock) {
      vueCode += text.slice(lastEndIndex, token.endIndex)
      lastEndIndex = token.endIndex
    }
  })

  return vueCode.trim()
}

/**
 * Extract TSX code from a text using TextMate grammar.
 *
 * @param result The result of tokenization.
 * @param text The text to extract TypeScript code from.
 * @returns The extracted TypeScript code.
 */
export function extractTsxCode(result: ITokenizeLineResult, text: string): string {
  return extractCode(result, text, ['source.tsx', 'source.tsx ', 'source.js', 'source.js '])
}

/**
 * Extract JSX code from a text using TextMate grammar.
 *
 * @param result The result of tokenization.
 * @param text The text to extract JavaScript code from.
 * @returns The extracted JavaScript code.
 */
export function extractGolangCode(result: ITokenizeLineResult, text: string): string {
  return extractCode(result, text, ['source.go', 'source.go '])
}

/**
 * Extract JavaScript code from a text using TextMate grammar.
 *
 * @param result The result of tokenization.
 * @param text The text to extract JavaScript code from.
 * @returns The extracted JavaScript code.
 */
export function extractJavaScriptCode(result: ITokenizeLineResult, text: string): string {
  return extractCode(result, text, ['source.js', 'source.js '])
}

/**
 * Extract TypeScript code from a text using TextMate grammar.
 *
 * @param result The result of tokenization.
 * @param text The text to extract TypeScript code from.
 * @returns The extracted TypeScript code.
 */
export function extractTypeScriptCode(result: ITokenizeLineResult, text: string): string {
  return extractCode(result, text, ['source.ts', 'source.ts '])
}

/**
 * Extract Rust code from a text using TextMate grammar.
 *
 * @param result The result of tokenization.
 * @param text The text to extract Rust code from.
 * @returns The extracted Rust code.
 */
export function extractRustCode(result: ITokenizeLineResult, text: string): string {
  return extractCode(result, text, ['source.rust', 'source.rust '])
}

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
