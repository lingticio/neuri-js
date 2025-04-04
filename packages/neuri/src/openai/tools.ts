import type { CommonRequestOptions } from '@xsai/shared'
import type { Infer, Schema } from 'xsschema'
import type { DefinedTool, DefinedToolHooks, InvokeContext, Tool } from './types'

import { toJsonSchema } from 'xsschema'

type JSONSchema = Awaited<ReturnType<typeof toJsonSchema>> & Record<string, any>

interface ToolFunction<_P> extends Tool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: JSONSchema
  }
}

export async function toolFunction<S extends Schema, P extends Infer<S>>(name: string, description: string, parameters: S): Promise<ToolFunction<P>> {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: await toJsonSchema(parameters as any),
    },
  }
}

export function defineToolFunction<F extends (ctx: InvokeContext<P, R>) => R, P = Parameters<F>, R = ReturnType<F>>(
  tool: ToolFunction<P>,
  func: F,
  options?: {
    provider?: Omit<CommonRequestOptions, 'model'>
    hooks?: Partial<DefinedToolHooks<P, R>>
  },
): DefinedTool<P, R> {
  const hooks: DefinedToolHooks<P, R> = {
    configureProvider: async o => o,
    preInvoke: async () => {},
    postInvoke: async () => {},
  }

  if (options?.hooks?.configureProvider != null)
    hooks.configureProvider = options.hooks.configureProvider
  if (options?.hooks?.preInvoke != null)
    hooks.preInvoke = options?.hooks?.preInvoke
  if (options?.hooks?.postInvoke != null)
    hooks.postInvoke = options?.hooks?.postInvoke

  return {
    provider: options?.provider ?? { baseURL: 'https://api.openai.com/v1', apiKey: '' },
    tool,
    func,
    hooks,
  }
}

export function tools(tools: DefinedTool<any, any>[]): Tool[] {
  return tools.map(tool => tool.tool)
}
