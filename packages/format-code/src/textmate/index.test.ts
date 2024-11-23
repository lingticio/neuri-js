import { describe, expect, it } from 'vitest'

import { tokenizeByTextMateGrammar } from '.'

describe('tokenizeByTextMateGrammar', () => {
  it.todo('should tokenize vue code', async () => {
    const vueCode = `<script setup lang="ts">\nimport ProductCard from '~/components/ProductCard.vue'\n\x3C/script>\n\n<template>\n  <div>\n    <ProductCard :prop-a="1" />\n  </div>\n</template>\n\n<style scoped>\n.product-card {\n  background-color: red;\n}\n</style>`
    const res = await tokenizeByTextMateGrammar('vue', vueCode)
    expect(res.tokens).toBeDefined()
  })
})
