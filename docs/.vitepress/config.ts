import { defineConfig } from 'vitepress'

import packageJSON from '../../package.json'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lastUpdated: true,
  ignoreDeadLinks: [
    // Site Config | VitePress
    // https://vitepress.dev/reference/site-config#ignoredeadlinks
    //
    // ignore all localhost links
    /^https?:\/\/localhost/,
  ],
  themeConfig: {
    outline: 'deep',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/lingticio/neuri-js' },
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          'zh-CN': {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                },
              },
            },
          },
        },
      },
    },
  },
  locales: {
    'root': {
      label: 'English',
      lang: 'en',
      link: '/pages/en/',
      title: 'Neuri by Lingtic.io x Guii.AI Team',
      description: 'Simple and easy agent framework, include various of structured data manipulation, agent and function compositing, code editing, fs and more!',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/pages/en/guide/' },
          { text: packageJSON.version, link: 'https://github.com/lingticio/neuri-js/releases' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Overview', link: '/pages/en/guide/' },
              { text: 'Getting started', link: '/pages/en/guide/getting-started' },
            ],
          },
        ],
      },
    },
    'zh-CN': {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/pages/zh-CN/',
      title: 'Neuri by Lingtic.io x Guii.AI Team',
      description: '简单易用的 Agent 框架和工具库，包括各种结构化数据操作、组合和拼装 Agent 和 function、代码编辑和 fs 的能力，还有许多许多！',
      themeConfig: {
        nav: [
          { text: '指南', link: '/pages/zh-CN/guide/' },
          { text: packageJSON.version, link: 'https://github.com/lingticio/neuri-js/releases' },
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '概览', link: '/pages/zh-CN/guide/' },
              { text: '快速开始', link: '/pages/zh-CN/guide/getting-started' },
            ],
          },
        ],
      },
    },
  },
})
