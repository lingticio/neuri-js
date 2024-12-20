# 概览

Neuri 是一个简单易用的 AI Agent 框架，它提供了一套完整的工具集来帮助你快速构建基于 OpenAI 的 AI 应用。

## 特性

### 简单易用的 Agent 框架

Neuri 基于 OpenAI 的 Function Calling 功能，提供了一套简单易用的 Agent 框架。你只需要定义工具函数，然后就可以让 AI 自动选择合适的工具来完成任务。

```ts
const agent = await neuri()
  .agent(
    agent('weather')
      .tool('getCurrentLocation', object({}), async () => 'Shanghai')
      .tool('getCurrentWeather', object({ location: string() }),
        async ({ parameters: { location } }) => {
          return `${location}, China: 22 degree Celsius`
        })
      .build()
  )
  .build({
    provider: {
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: process.env.OPENAI_API_BASEURL!,
    },
  })
```

### 丰富的工具函数

Neuri 提供了多个扩展包，包括:

- `@neuri/use-fs`: 文件系统操作，支持本地文件系统和 GitHub 仓库
- `@neuri/use-search`: 搜索引擎集成，支持 Google 搜索
- `@neuri/format-code`: 代码格式化和语法高亮

### 类型安全

Neuri 使用 TypeScript 编写，提供完整的类型定义。工具函数的参数和返回值都有类型检查，让你的代码更加健壮。

### 模块化设计

Neuri 采用模块化设计，核心功能和扩展包分离。你可以按需引入需要的功能，减少打包体积。

## 下一步

- [快速开始](/pages/zh-CN/guide/getting-started): 学习如何安装和使用 Neuri
- [GitHub](https://github.com/lingticio/neuri-js): 访问项目仓库
- [Discord](https://discord.gg/link-to-your-discord): 加入社区讨论
