import type { LanguageRegistration, ShikiInternal } from '@shikijs/core'
import type { BundledLanguage } from 'shiki'

import { createShikiInternal } from '@shikijs/core'
import { loadWasm } from '@shikijs/engine-oniguruma'
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
    for (let lang of importedLang.default) {
      if (lang.embeddedLangsLazy?.length != null && lang.embeddedLangsLazy?.length > 0) {
        const langSerialized = JSON.stringify(lang)
        lang = JSON.parse(langSerialized)

        lang.embeddedLangs = lang.embeddedLangsLazy
        if (lang.name === 'markdown') {
          lang.embeddedLangs?.push('vue')
          lang.embeddedLangs?.push('vue-html')
        }
      }

      languages.push(lang)
    }
  }

  shiki = await createShikiInternal()
  await shiki.loadLanguage(languages)
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
 * Tokenizes `extractFrom` using the TextMate grammar for `lang`.
 *
 * @param lang The language to extract code from.
 * @param extractFrom The text to extract code from.
 * @returns The extracted code.
 */
export async function tokenizeByTextMateGrammar(lang: BundledLanguage, extractFrom: string): Promise<ITokenizeLineResult> {
  await ensureLoadWASM()
  await ensureShikiInternal()

  const langGrammar = shiki.getLanguage(lang)
  const res = langGrammar.tokenizeLine(extractFrom, null, 0)
  return res
}
