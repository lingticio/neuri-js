import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': './src/index.ts',
    'serpapi/index': './src/serpapi/index.ts',
  },
  sourcemap: true,
  unused: true,
  fixedExtension: true,
})
