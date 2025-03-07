import type { ProviderOptions } from '@xsai/providers'
import type { Message } from '@xsai/shared-chat'
import type { Infer, Schema } from 'xsschema'

import type { ChatCompletion, DefinedTool, DefinedToolHooks, InvokeContext } from './openai'
import { composeAgent, defineToolFunction, toolFunction } from './openai'

export interface CallOptions {
  model: string
}

export interface NeuriContext {
  message: Message | Message[]
  messages: Message[]
  reroute: (name: string, messages: Message[], options: CallOptions) => Promise<ChatCompletion | undefined>
}

interface NeuriContextOptions {
  provider: ProviderOptions
  message: Message | Message[]
  messages?: Message[]
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

      const { call } = composeAgent({ provider: options.provider, tools: agent.tools })
      return await call(messages, { model: rerouteOpts.model })
    },
  }
}

export interface Neuri {
  handle: <R>(message: Message | Message[], handler: (ctx: NeuriContext) => Promise<R>) => Promise<R>
  handleStateless: <R>(message: Message | Message[], handler: (ctx: NeuriContext) => Promise<R>) => Promise<R>
}

interface NeuriInternal extends Neuri {
  agents: Agent[]
  messages: Message[]
}

export interface Agent {
  name: string
  tools: DefinedTool<any, any>[]
}

export interface NeuriBuilder {
  agent: (agent: Agent | Promise<Agent>) => NeuriBuilder
  build: (options: { provider: ProviderOptions }) => Promise<Neuri>
}

export interface NeuriBuilderInternal extends Partial<NeuriBuilder> {
  agents: Record<string, Agent>
  promiseAgents: Promise<Agent>[]
}

export type ToolFunc<P, R> = (ctx: InvokeContext<P, R>) => R
export interface ToolOption<P, R> { provider?: ProviderOptions, hooks?: Partial<DefinedToolHooks<P, R>>, description?: string }

export interface AgentBuilder {
  tool: <S extends Schema, R>(name: string, parameters: S, handle: ToolFunc<Infer<S>, R>, options?: ToolOption<Infer<S>, R>) => AgentBuilder
  build: () => Promise<Agent>
}

interface AgentBuilderInternal extends Partial<AgentBuilder> {
  name: string
  tools: DefinedTool<any, any>[]
  promiseTools: Promise<DefinedTool<any, any>>[]
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

function newNeuriBuilderBuild(cb: () => NeuriBuilderInternal): (options: { provider: ProviderOptions }) => Promise<Neuri> {
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
          provider: options.provider,
        }))
      },
      async handleStateless(message, cb) {
        const messages = []
        if (Array.isArray(message)) {
          messages.push(...message)
        }
        else {
          messages.push(message)
        }

        return await cb(newContext({
          message,
          messages,
          agents: neuriInternal.agents,
          provider: options.provider,
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
