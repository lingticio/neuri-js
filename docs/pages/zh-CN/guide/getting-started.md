# 快速开始

## 安装

使用你喜欢的包管理器安装 Neuri:

```bash
# npm
npm install neuri

# pnpm
pnpm add neuri

# yarn
yarn add neuri
```

## 基础使用

下面是一个简单的天气查询示例，展示了如何使用 Neuri 创建和组合 Agent：

```ts
import { env } from 'node:process'
import {
  composeAgent,
  defineToolFunction,
  resolveFirstTextContentFromChatCmpl,
  system,
  toolFunction,
  user,
} from 'neuri/openai'
import OpenAI from 'openai'
import * as z from 'zod'

// 创建 OpenAI 客户端实例
const openai: OpenAI = new OpenAI({
  baseURL: env.OPENAI_API_BASEURL,
  apiKey: env.OPENAI_API_KEY,
})

// 组合 Agent 和工具函数
const { call } = composeAgent({
  openAI: openai,
  tools: [
    // 定义一个获取城市的工具函数
    defineToolFunction<Record<string, never>, string>(
      await toolFunction('getCity', 'Get the user\'s city', z.object({})),
      async () => {
        return 'New York City'
      }
    ),
    // 定义一个获取天气的工具函数
    defineToolFunction<{ cityCode: string }, { city: string, weather: string, degreesCelsius: number }>(
      await toolFunction('getWeather', 'Get the current weather', z.object({
        cityCode: z.string().min(1).describe('City code to get weather for')
      })),
      async ({ parameters: { cityCode } }) => {
        return {
          city: 'New York City',
          weather: 'sunny',
          degreesCelsius: 26
        }
      }
    )
  ]
})

// 调用 Agent 进行对话
const response = await call([
  system('I am a helpful assistant that can provide weather information.'),
  user('What is the weather like today?')
], {
  model: 'openai/gpt-3.5-turbo'
})

const result = resolveFirstTextContentFromChatCmpl(response)
console.log(result)
```

## 扩展包

### @neuri/use-fs

文件系统相关的工具函数包，支持本地文件系统和 GitHub 仓库操作。

```ts
import { FileSystem } from '@neuri/use-fs/node'
import { GitHubPublicFileSystem } from '@neuri/use-fs/github'

// 本地文件系统操作
const fs = await FileSystem()
const { readFile, writeFile, listFilesInDirectory } = fs

// GitHub 仓库操作
const github = await GitHubPublicFileSystem()
const { listFilesInDirectory: listGitHubFiles, readFile: readGitHubFile } = github

// 读取本地文件
const content = await readFile('path/to/file.txt')

// 读取 GitHub 仓库文件
const githubContent = await readGitHubFile({
  repository: 'owner/repo',
  filePath: '/README.md',
  branch: 'main'
})
```

### @neuri/use-search

搜索引擎相关的工具函数包，目前支持 Google 搜索(通过 SerpAPI)。

```ts
import { SerpApi } from '@neuri/use-search/serpapi'

const serpapi = await SerpApi({
  apiKey: 'your-serpapi-key'
})

const { searchGoogle } = serpapi

// 执行搜索
const results = await searchGoogle.func({
  parameters: {
    q: 'Neuri.js',
    location: 'United States'
  }
})
```

### @neuri/format-code

代码格式化和语法高亮相关的工具函数包。

```ts
import { tokenizeByTextMateGrammar } from '@neuri/format-code/textmate'

// 使用 TextMate 语法解析代码
const code = `
function hello() {
  console.log("Hello, World!")
}
`
const result = await tokenizeByTextMateGrammar('typescript', code)
```

## API 参考

### 核心 API

#### neuri()

创建一个新的 Neuri 构建器实例。

#### agent(name?: string)

创建一个新的 Agent 构建器实例。

参数:
- `name`: Agent 的名称，可选。默认为 `__default__`

#### composeAgent(options)

组合 Agent 和工具函数。

参数:
- `options.openAI`: OpenAI 客户端实例
- `options.tools`: 工具函数数组

#### defineToolFunction(tool, func, options?)

定义一个工具函数。

参数:
- `tool`: 由 `toolFunction()` 创建的工具函数定义
- `func`: 工具函数的具体实现
- `options`: 可选配置项，包括 provider 和 hooks

#### toolFunction(name, description, parameters)

创建一个工具函数定义。

参数:
- `name`: 工具函数名称
- `description`: 工具函数描述
- `parameters`: 参数 Schema，支持 zod 或 valibot
