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

export async function extractByTextMateGrammar(lang: BundledLanguage, extractFrom: string): Promise<ITokenizeLineResult> {
  await ensureLoadWASM()
  await ensureShikiInternal()

  const res = shiki.getLanguage(lang).tokenizeLine(extractFrom, null, 0)
  return res
}
