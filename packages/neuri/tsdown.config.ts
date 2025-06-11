import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': './src/index.ts',
    'openai/index': './src/openai/index.ts',
    'test': './src/test.ts',
  },
  sourcemap: true,
  unused: true,
  fixedExtension: true,
})
