# 快速开始

## 安装

使用你喜欢的包管理器安装 Neuri:

```bash
pnpm add neuri
```

## 使用

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

## Neuri API 文档

### 核心概念

#### Agent

Agent 是 Neuri 的核心概念，它代表一个可以执行特定任务的智能体。每个 Agent 都可以包含多个工具函数（Tool Functions）。

#### Tool Function

工具函数是 Agent 可以调用的具体功能实现。每个工具函数都需要定义:
- 名称
- 参数 Schema
- 处理逻辑
- 可选的描述和钩子函数

### API 参考

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
