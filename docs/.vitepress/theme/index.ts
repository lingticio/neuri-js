import { h } from 'vue'

import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import 'virtual:uno.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp() {
  },
} satisfies Theme
