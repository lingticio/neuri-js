// import type OpenAI from 'openai'
// import type { InvokeContext, Tool, ToolHooks } from './openai'

// interface Neuri { }
// interface Agent { }

// interface NeuriBuilder {
//   agent: (agent: Agent) => NeuriBuilder
//   build: () => Neuri
// }

// interface AgentBuilder {
//   tool: <P, R>(
//     tool: OpenAI.Chat.ChatCompletionTool,
//     func: (ctx: InvokeContext<P, R>) => Promise<R>,
//     options?: {
//       openAI?: OpenAI
//       hooks?: Partial<ToolHooks<P, R>>
//     },
//   ) => AgentBuilder
//   build: () => Agent
// }

// function neuri(): NeuriBuilder {
//   return undefined as unknown as NeuriBuilder
// }

// function agent(): AgentBuilder {
//   return undefined as unknown as AgentBuilder
// }
