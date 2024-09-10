import { describe, expect, it } from 'vitest'

import { extractByTextMateGrammar, extractGolangCode, extractJavaScriptCode, extractRustCode, extractTsxCode, extractTypeScriptCode, extractVueCode } from './textmate'

describe('extractByTextMateGrammar', () => {
  it('should extract vue tokens from textmate grammar', async () => {
    const vueCode = `<script setup lang=ts>import ProductCard from '~/components/ProductCard.vue'</script><template> <div> <ProductCard :prop-a="1" />  </div> </template><style scoped> .product-card {  background-color: red;  } </style>`
    const fullStr = `Sure, this is the code \`\`\`vue${vueCode}\`\`\` whatever ends here`

    const res = await extractByTextMateGrammar('vue', fullStr)
    const code = extractVueCode(res, fullStr)
    expect(code).toBe(vueCode)
  })

  it('should extract tsx tokens from textmate grammar', async () => {
    const tsxCode = `import React from 'react';import { ProductCard } from './ProductCard';export const App = () => {  return <ProductCard propA={1} />;};`

    const res = await extractByTextMateGrammar('tsx', `Sure, this is the code \`\`\`tsx${tsxCode}\`\`\` whatever ends here`)
    const code = extractTsxCode(res, tsxCode)
    expect(code).toBe(tsxCode)
  })

  it('should extract golang tokens from textmate grammar', async () => {
    const golangCode = `package mainimport "fmt"func main() {  fmt.Println("Hello, World!")}`

    const res = await extractByTextMateGrammar('go', `Sure, this is the code \`\`\`go${golangCode}\`\`\` whatever ends here`)
    const code = extractGolangCode(res, golangCode)
    expect(code).toBe(golangCode)
  })

  it('should extract js tokens from textmate grammar', async () => {
    const jsCode = `console.log('Hello, World!')`

    const res = await extractByTextMateGrammar('js', `Sure, this is the code \`\`\`js${jsCode}\`\`\` whatever ends here`)
    const code = extractJavaScriptCode(res, jsCode)
    expect(code).toBe(jsCode)
  })

  it('should extract ts tokens from textmate grammar', async () => {
    const tsCode = `type Product = {  name: string;  price: number;};const product: Product = {  name: 'Product',  price: 100};`

    const res = await extractByTextMateGrammar('ts', `Sure, this is the code \`\`\`js${tsCode}\`\`\` whatever ends here`)
    const code = extractTypeScriptCode(res, tsCode)
    expect(code).toBe(tsCode)
  })

  it('should extract rust tokens from textmate grammar', async () => {
    const rustCode = `fn main() {  println!("Hello, World!");}`

    const res = await extractByTextMateGrammar('rust', `Sure, this is the code \`\`\`rust${rustCode}\`\`\` whatever ends here`)
    const code = extractRustCode(res, rustCode)
    expect(code).toBe(rustCode)
  })
})
