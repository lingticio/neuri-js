# `neuri`

Simple and easy agent framework, include various of structured data manipulation, agent and function compositing, code editing, fs and more!

## Features

- [x] 📦 100% out of the box support for TypeScript
- [x] ✅ over 70% test coverage
- [x] 🧠 Structured data for any models, Llama 3.1, Phi3.5 Mistral, OpenAI, etc.
- [x] 📃 JSON structured data
  - [x] 💦 Works when `stream=True`
- [x] 💻 Code snippet extraction
  - [x] 💦 Works when `stream=True`
  - [x] 🛣️ Path based code snippet extraction
- [x] 👷 Easy to use declaring and compositing agents & functions for models
- [x] 📚 Agent components library
  - [x] FileSystem
- [x] 🚀 Getting started with lines of code

## Bindings

- neuri-js
- [neuri-go](https://github.com/lingticio/neuri-go)

## How to develop

The project uses [`unbuild`](https://github.com/unjs/unbuild) and [`vite`](https://github.com/vitejs/vite) to develop and build. With the powerful features offered from [`jiti`](https://github.com/unjs/jiti), we no longer need to use [Rollup](https://rollupjs.org/) for tedious configuration and then watch the local file changes and bundle the modified and developed the modules without [`vite`](https://github.com/vitejs/vite) for hot-reload. We can directly run the following command to output the bundled file and get started on development:

```shell
pnpm run packages:stub
```

If you use [`@antfu/ni`](https://github.com/antfu/ni), you can also use the following command:

```shell
nr packages:stub
```

Next, you need to start the the documentation site (with VitePress) for previewing and development. You can use the following command:

```shell
pnpm run docs:dev
```

If you use [`@antfu/ni`](https://github.com/antfu/ni), you can also use the following command:

```shell
nr docs:dev
```

## How to build

```shell
pnpm run packages:build
```

If you use [`@antfu/ni`](https://github.com/antfu/ni), you can also use the following command:

```shell
nr packages:build
```

To build the documentation and preview site, you can use the following command:

```shell
pnpm run docs:build
```

If you use [`@antfu/ni`](https://github.com/antfu/ni), you can also use the following command:

```shell
nr docs:build
```

## Our other projects

- [lingticio/llmg](https://github.com/lingticio/llmg) Powerful LLM gateway with tons of special abilities to help you to build your own LLMs across different protocols, process data, orchestrating pipelines, tracings, and more.
- [guiiai/devtools](https://github.com/guiiai/devtools) Amazing frontend DevTools made easy for frontend developers to have LLMs as copilots to write codes with you.
- [nekomeowww/ollama-operator](https://github.com/nekomeowww/ollama-operator) Industrial leading operator implementation to bring the easiness of Ollama to Kubernetes with single command to setup, single command to deploy and scale the models across your environments.
- [nolebase/integrations](https://github.com/nolebase/integrations) A set of human ergonomic, documentation engineers first, accessibility first, audience oriented documentation integrations for your projects, powered by VitePress, and Vue.

## Acknowledgement

- [outlines](https://github.com/outlines-dev/outlines) for providing such powerful ideas to build the structured data manipulation
- [Agentic](https://agentic.so/intro) for providing the completed implementation references for tools and agents
- [shikijs/shiki](https://github.com/shikijs/shiki) for bundling the VSCode TextMate WASM

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=lingticio/neuri-js&type=Date)](https://star-history.com/#lingticio/neuri-js&Date)

## Contributors

Thanks to everyone who contributed to the this project!

[![contributors](https://contrib.rocks/image?repo=lingticio/neuri-js)](https://github.com/lingticio/neuri-js/graphs/contributors)

### Written with ♥
