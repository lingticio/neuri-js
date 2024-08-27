import type { LanguageRegistration, ShikiInternal } from '@shikijs/core'
import { createShikiInternal, loadWasm } from '@shikijs/core'
import type { BundledLanguage } from 'shiki'
import { bundledLanguages } from 'shiki'

let wasmLoaded = false
let shiki: ShikiInternal

export async function ensureLoadWASM() {
  if (wasmLoaded)
    return

  await loadWasm(import('shiki/wasm'))
  wasmLoaded = true
}

export async function ensureShikiInternal() {
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

export async function extractByTextMateGrammar(lang: BundledLanguage, extractFrom: string) {
  await ensureLoadWASM()
  await ensureShikiInternal()

  const res = shiki.getLanguage(lang).tokenizeLine(extractFrom, null, 0)
  return res
}
