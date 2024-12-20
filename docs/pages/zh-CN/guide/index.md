# 概览

Neuri 是一个简单易用的 AI Agent 框架，它提供了一套完整的工具集来帮助你快速构建基于 OpenAI 的 AI 应用。

## 特性

- 📦 **完整的 TypeScript 支持** - 开箱即用的完整类型定义
- ✅ **高测试覆盖率** - 超过 70% 的测试覆盖率确保可靠性
- 🧠 **模型无关性** - 支持包括 Llama 3.1、Phi3.5 Mistral、OpenAI 等多种模型的结构化数据处理
- 📃 **JSON 结构化数据**
  - 支持流式响应
  - 清晰且类型安全的数据处理
- 💻 **代码片段提取**
  - 支持流式提取
  - 基于路径的代码片段处理
  - 由 VSCode TextMate 语法提供支持
- 👷 **简单的 Agent 组合**
  - 用于声明和组合 Agent 的简洁 API
  - 灵活的函数组合
  - 内置工具函数系统
- 📚 **丰富的组件库**
  - 文件系统操作（本地和 GitHub）
  - 搜索引擎集成
  - 代码格式化工具

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

## 相关项目

- [neuri-go](https://github.com/lingticio/neuri-go) - Neuri 的 Go 语言实现
- [llmg](https://github.com/lingticio/llmg) - 用于构建 LLM 应用的强大网关
- [devtools](https://github.com/guiiai/devtools) - 带有 LLM 协作功能的前端开发工具
- [ollama-operator](https://github.com/nekomeowww/ollama-operator) - Ollama 的 Kubernetes 操作器
- [nolebase/integrations](https://github.com/nolebase/integrations) - 基于 VitePress 的文档集成工具

## 下一步

- [快速开始](/pages/zh-CN/guide/getting-started): 学习如何安装和使用 Neuri
- [GitHub](https://github.com/lingticio/neuri-js): 访问项目仓库
- [Discord](https://discord.gg/link-to-your-discord): 加入社区讨论
