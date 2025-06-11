import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': './src/index.ts',
    'github/index': './src/github/index.ts',
    'node/index': './src/node/index.ts',
  },
  sourcemap: true,
  unused: true,
  fixedExtension: true,
})
