import type { Infer, Schema } from '@typeschema/main'
import type OpenAI from 'openai'

import type { ChatCompletion, InvokeContext, Tool, ToolHooks } from './openai'
import { composeAgent, defineToolFunction, toolFunction } from './openai'

export interface CallOptions {
  model: string
}

export interface NeuriContext {
  message: OpenAI.ChatCompletionMessageParam | OpenAI.ChatCompletionMessageParam[]
  messages: OpenAI.ChatCompletionMessageParam[]
  reroute: (name: string, messages: OpenAI.ChatCompletionMessageParam[], options: CallOptions) => Promise<ChatCompletion | undefined>
}

interface NeuriContextOptions {
  openAI: OpenAI
  message: OpenAI.ChatCompletionMessageParam | OpenAI.ChatCompletionMessageParam[]
  messages?: OpenAI.ChatCompletionMessageParam[]
  agents?: Agent[]
}

function newContext(options: NeuriContextOptions): NeuriContext {
  return {
    message: options.message,
    messages: options.messages || [],
    async reroute(name, messages, rerouteOpts) {
      let agent: Agent | undefined

      for (const a of options.agents || []) {
        if (a.name === name) {
          agent = a
          break
        }
      }
      if (!agent) {
        throw new Error(`Agent "${name}" not found`)
      }

      const { call } = composeAgent({ openAI: options.openAI, tools: agent.tools })
      return await call(messages, { model: rerouteOpts.model })
    },
  }
}

export interface Neuri {
  handle: <R>(message: OpenAI.ChatCompletionMessageParam | OpenAI.ChatCompletionMessageParam[], handler: (ctx: NeuriContext) => Promise<R>) => Promise<R>
}

interface NeuriInternal extends Neuri {
  agents: Agent[]
  messages: OpenAI.ChatCompletionMessageParam[]
}

export interface Agent {
  name: string
  tools: Tool<any, any>[]
}

export interface NeuriBuilder {
  agent: (agent: Agent | Promise<Agent>) => NeuriBuilder
  build: (options: { openAI: OpenAI }) => Promise<Neuri>
}

export interface NeuriBuilderInternal extends Partial<NeuriBuilder> {
  agents: Record<string, Agent>
  promiseAgents: Promise<Agent>[]
}

export type ToolFunc<P, R> = (ctx: InvokeContext<P, R>) => R
export interface ToolOption<P, R> { openAI?: OpenAI, hooks?: Partial<ToolHooks<P, R>>, description?: string }

export interface AgentBuilder {
  tool: <S extends Schema, R>(name: string, parameters: S, handle: ToolFunc<Infer<S>, R>, options?: ToolOption<Infer<S>, R>) => AgentBuilder
  build: () => Promise<Agent>
}

interface AgentBuilderInternal extends Partial<AgentBuilder> {
  name: string
  tools: Tool<any, any>[]
  promiseTools: Promise<Tool<any, any>>[]
}

function newNeuriBuilderAgent(cb: () => NeuriBuilderInternal): (agent: Agent | Promise<Agent>) => NeuriBuilder {
  return (agent: Agent | Promise<Agent>) => {
    const neuriBuilder = cb()

    if (agent instanceof Promise) {
      neuriBuilder.promiseAgents.push(agent)
    }
    else {
      neuriBuilder.agents[agent.name] = agent
    }

    return neuriBuilder as NeuriBuilder
  }
}

function newNeuriBuilderBuild(cb: () => NeuriBuilderInternal): (options: { openAI: OpenAI }) => Promise<Neuri> {
  return async (options): Promise<Neuri> => {
    const neuriBuilder = cb()

    const agents = await Promise.all(neuriBuilder.promiseAgents)

    for (const agent of agents) {
      neuriBuilder.agents[agent.name] = agent
    }

    const neuriInternal: NeuriInternal = {
      agents,
      messages: [],
      async handle(message, cb) {
        if (Array.isArray(message)) {
          neuriInternal.messages.push(...message)
        }
        else {
          neuriInternal.messages.push(message)
        }

        return await cb(newContext({
          message,
          messages: neuriInternal.messages,
          agents: neuriInternal.agents,
          openAI: options.openAI,
        }))
      },
    }

    return neuriInternal
  }
}

function newNeuriBuilder() {
  const builderContainer: NeuriBuilderInternal = {
    agents: {},
    promiseAgents: [],
    agent: newNeuriBuilderAgent(() => builderContainer),
    build: newNeuriBuilderBuild(() => builderContainer),
  }

  return builderContainer as NeuriBuilder
}

function newAgentBuilderTool(cb: () => AgentBuilderInternal): <P, R>(name: string, parameters: Schema, handle: ToolFunc<P, R>, options?: ToolOption<P, R>) => AgentBuilder {
  return (name, parameters, handle, options) => {
    const agentBuilder = cb()

    const futureToolBuilder = async () => {
      return defineToolFunction(await toolFunction(name, options?.description ?? '', parameters), handle, options)
    }

    agentBuilder.promiseTools.push(futureToolBuilder())

    return agentBuilder as AgentBuilder
  }
}

function newAgentBuilderBuild(cb: () => AgentBuilderInternal): () => Promise<Agent> {
  return async () => {
    const agentBuilder = cb()
    const tools = await Promise.all(agentBuilder.promiseTools)

    agentBuilder.tools = [...tools]

    return {
      name: agentBuilder.name,
      tools: agentBuilder.tools,
    }
  }
}

function newAgentBuilder(name: string) {
  const builderContainer: AgentBuilderInternal = {
    name,
    tools: [],
    promiseTools: [],
    tool: newAgentBuilderTool(() => builderContainer),
    build: newAgentBuilderBuild(() => builderContainer),
  }

  return builderContainer as AgentBuilder
}

export function neuri(): NeuriBuilder {
  return newNeuriBuilder()
}

export function agent(name?: string): AgentBuilder {
  return newAgentBuilder(name ?? '__default__')
}
