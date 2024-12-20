# Overview

Neuri is a simple and easy-to-use AI Agent framework that provides a complete toolkit to help you quickly build OpenAI-based AI applications.

## Features

### Simple Agent Framework

Neuri is built on OpenAI's Function Calling feature and provides a simple agent framework. You just need to define tool functions, and then let AI automatically choose the right tools to complete tasks.

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

### Rich Tool Functions

Neuri provides multiple extension packages, including:

- `@neuri/use-fs`: Filesystem operations, supporting local filesystem and GitHub repositories
- `@neuri/use-search`: Search engine integration, supporting Google search
- `@neuri/format-code`: Code formatting and syntax highlighting

### Type Safe

Neuri is written in TypeScript and provides complete type definitions. Tool function parameters and return values are type-checked to make your code more robust.

### Modular Design

Neuri uses a modular design where core functionality and extension packages are separated. You can import only the features you need to reduce bundle size.

## Next Steps

- [Getting Started](/pages/en/guide/getting-started): Learn how to install and use Neuri
- [GitHub](https://github.com/lingticio/neuri-js): Visit the project repository
- [Discord](https://discord.gg/link-to-your-discord): Join the community discussion
