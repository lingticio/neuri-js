import type { Schema } from '@typeschema/main'
import type OpenAI from 'openai'

import { defineToolFunction, type InvokeContext, type Tool, toolFunction, type ToolHooks } from './openai'

export interface Neuri { }
export interface Agent {
  name: string
  tools: Tool<any, any>[]
}

export interface NeuriBuilder {
  agent: (agent: Agent | Promise<Agent>) => NeuriBuilder
  build: () => Promise<Neuri>
}

export interface NeuriBuilderInternal extends Partial<NeuriBuilder> {
  agents: Record<string, Agent>
  promiseAgents: Promise<Agent>[]
}

export type ToolFunc<P, R> = (ctx: InvokeContext<P, R>) => Promise<R>
export interface ToolOption<P, R> { openAI?: OpenAI, hooks?: Partial<ToolHooks<P, R>>, description?: string }

export interface AgentBuilder {
  tool: <P, R>(name: string, parameters: Schema, handle: ToolFunc<P, R>, options?: ToolOption<P, R>) => AgentBuilder
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

function newNeuriBuilderBuild(cb: () => NeuriBuilderInternal): () => Promise<Neuri> {
  return async () => {
    const neuriBuilder = cb()

    const agents = await Promise.all(neuriBuilder.promiseAgents)

    for (const agent of agents) {
      neuriBuilder.agents[agent.name] = agent
    }

    return {
      agents,
    }
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
      name: 'agent',
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
