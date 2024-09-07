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
