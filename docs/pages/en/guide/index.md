# Overview

Neuri is a simple and easy-to-use AI Agent framework that provides a complete toolkit to help you quickly build OpenAI-based AI applications.

## Features

- 📦 **100% TypeScript Support** - Complete type definitions out of the box
- ✅ **High Test Coverage** - Over 70% test coverage ensures reliability
- 🧠 **Model Agnostic** - Structured data support for various models including Llama 3.1, Phi3.5 Mistral, OpenAI, etc.
- 📃 **JSON Structured Data**
  - Works with streaming responses
  - Clean and type-safe data handling
- 💻 **Code Snippet Extraction**
  - Supports streaming extraction
  - Path-based code snippet handling
  - Powered by VSCode TextMate grammar
- 👷 **Easy Agent Composition**
  - Simple API for declaring and composing agents
  - Flexible function composition
  - Built-in tool function system
- 📚 **Rich Component Library**
  - FileSystem operations (local & GitHub)
  - Search engine integration
  - Code formatting utilities

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

## Related Projects

- [neuri-go](https://github.com/lingticio/neuri-go) - Go implementation of Neuri
- [llmg](https://github.com/lingticio/llmg) - Powerful LLM gateway for building LLM applications
- [devtools](https://github.com/guiiai/devtools) - Frontend DevTools with LLM copilot features
- [ollama-operator](https://github.com/nekomeowww/ollama-operator) - Kubernetes operator for Ollama
- [nolebase/integrations](https://github.com/nolebase/integrations) - Documentation integrations powered by VitePress

## Next Steps

- [Getting Started](/pages/en/guide/getting-started): Learn how to install and use Neuri
- [GitHub](https://github.com/lingticio/neuri-js): Visit the project repository
- [Discord](https://discord.gg/link-to-your-discord): Join the community discussion
