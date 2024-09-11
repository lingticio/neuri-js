import { describe, expect, it } from 'vitest'

import { createStreamableCodesFromMarkdownExtractor, extractCodesFromMarkdown } from './markdown'

describe('extractCodesFromMarkdown', () => {
  it('should extract vue tokens from textmate grammar', async () => {
    const vueCode = `<script setup lang="ts">\nimport ProductCard from '~/components/ProductCard.vue'\n</script>\n\n<template>\n  <div>\n    <ProductCard :prop-a="1" />\n  </div>\n</template>\n\n<style scoped>\n.product-card {\n  background-color: red;\n}\n</style>`
    const jsCode = `function hello() {\n  console.log('Hello, World!')\n}`
    const str = `Sure, this is the code

\`\`\`vue
${vueCode}
\`\`\`

\`\`\`js
${jsCode}
\`\`\`

\`\`\`
${jsCode}
\`\`\`

whatever ends here`

    const code = extractCodesFromMarkdown(str)
    expect(code).toEqual([
      {
        content: vueCode,
        lang: 'vue',
      },
      {
        content: jsCode,
        lang: 'js',
      },
      {
        content: jsCode,
        lang: '',
      },
    ])
  })
})

function generateExpectedUpdates(code: string, lang: string): { content: string, lang: string }[] {
  const updates: { content: string, lang: string }[] = []
  let currentStr = ''

  for (const char of code) {
    currentStr += char

    updates.push({ content: currentStr, lang })
  }

  return updates
}

describe('', () => {
  it('', async () => {
    const vueCode = `<script setup lang="ts">import ProductCard from '~/components/ProductCard.vue' </script>  <template>  <div>    <ProductCard :prop-a="1" />  </div></template><style scoped>.product-card {  background-color: red;}</style>`
    const jsCode = `function hello() {  console.log('Hello, World!')\n}`
    const str = `Sure, this is the code

\`\`\`vue
${vueCode}
\`\`\`

\`\`\`
${jsCode}
\`\`\`

whatever ends here`
    const updates: any[] = []

    let index = 0
    const parser = createStreamableCodesFromMarkdownExtractor((update) => {
      if (index < 40)

        updates.push(update)
      index++
    })

    for (const char of str)
      await parser.feed(char)

    const finalized = await parser.end()
    const expectedUpdates = [
      ...generateExpectedUpdates(vueCode, 'vue'),
      ...generateExpectedUpdates(jsCode, ''),
    ]

    for (let i = 0; i < updates.length; i++)
      // console.log(updates[i].content, expectedUpdates[i].content)
      expect(updates[i].content).toEqual(expectedUpdates[i].content)

    expect(finalized).toEqual([
      {
        content: vueCode,
        lang: 'vue',
      },
      {
        content: jsCode,
        lang: '',
      },
    ])
  })
})
