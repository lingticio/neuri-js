/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    projects: [
      'packages/*',
      'examples/neuri/*',
    ],
  },
})
