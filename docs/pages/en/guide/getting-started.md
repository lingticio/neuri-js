# Getting Started

## Installation

Install Neuri using your favorite package manager:

```bash
pnpm add neuri
```

## Basic Usage

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

// Create OpenAI client instance
const openai: OpenAI = new OpenAI({
  baseURL: env.OPENAI_API_BASEURL,
  apiKey: env.OPENAI_API_KEY,
})

// Compose Agent and tool functions
const { call } = composeAgent({
  openAI: openai,
  tools: [
    // Define a tool function to get city
    defineToolFunction<Record<string, never>, string>(
      await toolFunction('getCity', 'Get the user\'s city', z.object({})),
      async () => {
        return 'New York City'
      }
    ),
    // Define a tool function to get weather
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

// Call Agent for conversation
const response = await call([
  system('I am a helpful assistant that can provide weather information.'),
  user('What is the weather like today?')
], {
  model: 'openai/gpt-3.5-turbo'
})

const result = resolveFirstTextContentFromChatCmpl(response)
console.log(result)
```

## Extension Packages

### @neuri/use-fs

Filesystem related tool functions package, supporting local filesystem and GitHub repository operations.

```ts
import { FileSystem } from '@neuri/use-fs/node'
import { GitHubPublicFileSystem } from '@neuri/use-fs/github'

// Local filesystem
const fs = await FileSystem()
const { readFile, writeFile, listFilesInDirectory } = fs

// GitHub repository operations
const github = await GitHubPublicFileSystem()
const { listFilesInDirectory: listGitHubFiles, readFile: readGitHubFile } = github
```

### @neuri/use-search

Search engine related tool functions package, currently supporting Google search (via SerpAPI).

```ts
import { SerpApi } from '@neuri/use-search/serpapi'

const serpapi = await SerpApi({
  apiKey: 'your-serpapi-key'
})

const { searchGoogle } = serpapi
```

### @neuri/format-code

Code formatting and syntax highlighting related tool functions package.

```ts
import { tokenizeByTextMateGrammar } from '@neuri/format-code/textmate'

// Use TextMate grammar to parse code
const result = await tokenizeByTextMateGrammar('typescript', code)
```

## API Reference

### Core APIs

#### neuri()

Create a new Neuri builder instance.

#### agent(name?: string)

Create a new Agent builder instance.

Parameters:
- `name`: Agent name, optional. Defaults to `__default__`

#### composeAgent(options)

Compose Agent and tool functions.

Parameters:
- `options.openAI`: OpenAI client instance
- `options.tools`: Array of tool functions

#### defineToolFunction(tool, func, options?)

Define a tool function.

Parameters:
- `tool`: Tool function definition created by `toolFunction()`
- `func`: Tool function implementation
- `options`: Optional configuration including provider and hooks

#### toolFunction(name, description, parameters)

Create a tool function definition.

Parameters:
- `name`: Tool function name
- `description`: Tool function description
- `parameters`: Parameter Schema, supports zod or valibot
