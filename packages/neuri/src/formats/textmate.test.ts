import { rm, writeFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import { extractByTextMateGrammar } from './textmate'

const vueCode = `<script setup lang=ts>import ProductCard from '~/components/ProductCard.vue'</script><template> <div> <ProductCard :prop-a="1" />  </div> </template><style scoped> .product-card {  background-color: red;  } </style>`

describe('extractByTextMateGrammar', () => {
  it('should extract tokens from textmate grammar', async () => {
    const res = await extractByTextMateGrammar('vue', `你好\n你好，这个是一个测试 \`\`\`vue${vueCode}\`\`\``)
    await writeFile('test.json', JSON.stringify(res, null, 2))
  })
})
