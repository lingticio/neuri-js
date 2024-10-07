import type { JSONSchema7 } from 'json-schema'
import type { OpenAI } from 'openai'

export interface CallableOpenAIFunction {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, any>
  }
}

export interface CallableOpenAITools {
  tools: CallableOpenAIFunction[]
}

export interface CallableContext<P> {
  parameters: P
}

export interface CallableParameter<P> extends JSONSchema7 {
  name: string
  optional?: boolean
  defaultValue?: P
}

export interface CallableReturn<R> extends JSONSchema7 {
  name: string
  optional?: boolean
  defaultValue?: R
}

export interface Callable<P, R> {
  name: string
  description: string
  parameters: CallableParameter<P extends any[] ? P[number] : unknown>[]
  returns: CallableReturn<R>[]
  call: (ctx: CallableContext<P>) => Promise<R>
  toJSONSchema: () => Record<string, any>
  toOpenAIFunctionSchema: () => CallableOpenAIFunction
}

export interface CallableFunctions<P = any, R = any> extends Record<string, () => Callable<P, R>> {
  [name: string]: () => Callable<P, R>
}

export interface CallableComponent {
  functions: CallableFunctions<any[], any>
  toJSONSchema: () => Record<string, any>
  toOpenAIToolsSchema: () => CallableOpenAITools
}

export interface CallableBuilder<P, R> {
  withName: (name: string) => CallableBuilder<P, R>
  withDescription: (description: string) => CallableBuilder<P, R>
  withParameter: (parameter: CallableParameter<P extends any[] ? P[number] : unknown>) => CallableBuilder<P, R>
  withReturn: (returns: CallableReturn<R>) => CallableBuilder<P, R>
  build: (call: Callable<P, R>['call']) => Callable<P, R>
}

export function defineCallable<P extends any[], R>(): CallableBuilder<P, R> {
  const callable: Callable<P, R> = {
    name: '',
    description: '',
    parameters: [],
    returns: [],
    call: async (_): Promise<R> => {
      return undefined as R
    },
    toJSONSchema() {
      return toJSONSchema(callable as unknown as Callable<any[], any>)
    },
    toOpenAIFunctionSchema() {
      return toOpenAIFunctionSchema(callable as unknown as Callable<any[], any>)
    },
  }

  const callableBuilder: CallableBuilder<P, R> = {
    withName(name) {
      callable.name = name
      return this
    },
    withDescription(description) {
      callable.description = description
      return this
    },
    withParameter(parameter) {
      callable.parameters.push(parameter)
      return this
    },
    withReturn(returns) {
      callable.returns.push(returns)
      return this
    },
    build(call) {
      callable.call = call
      return callable
    },
  }

  return callableBuilder
}

export function defineCallableComponent(toolSetName: string, toolSetDescription: string, exposedFunctions: CallableFunctions): CallableComponent {
  const component: CallableComponent = {
    functions: exposedFunctions,
    toJSONSchema() {
      return toToolsJSONSchema(toolSetName, toolSetDescription, component)
    },
    toOpenAIToolsSchema: () => {
      return toOpenAIToolsSchema(component)
    },
  }

  return component
}

export function toJSONSchema(callable: Callable<any[], any>): any {
  return {
    title: callable.name,
    description: callable.description,
    type: 'object',
    properties: {
      parameters: {
        type: 'object',
        properties: callable.parameters.reduce((acc, param) => {
          acc[param.name] = { ...param }
          if (param.defaultValue != null)
            acc[param.name].default = param.defaultValue

          delete acc[param.name].name

          return acc
        }, {} as Record<string, any>),
        required: callable.parameters
          .filter(param => typeof param.optional === 'undefined' || !param.optional)
          .map(param => param.name),
      },
      returns: {
        type: 'object',
        properties: callable.returns.reduce((acc, ret) => {
          acc[ret.name] = { ...ret }
          if (ret.defaultValue != null)
            acc[ret.name].default = ret.defaultValue

          delete acc[ret.name].name

          return acc
        }, {} as Record<string, any>),
        required: callable.returns
          .filter(ret => typeof ret.optional === 'undefined' || !ret.optional)
          .map(ret => ret.name),
      },
    },
  }
}

export function toToolsJSONSchema(toolSetName: string, toolSetDescription: string, callableComponent: CallableComponent): any {
  return {
    title: toolSetName,
    description: toolSetDescription,
    type: 'object',
    properties: Object.entries(callableComponent.functions).reduce((acc, [name, func]) => {
      acc[name] = func().toJSONSchema()
      return acc
    }, {} as Record<string, any>),
  }
}

export function toOpenAIFunctionSchema(callable: Callable<any[], any>): CallableOpenAIFunction {
  return {
    type: 'function',
    function: {
      name: callable.name,
      description: callable.description,
      parameters: {
        ...toJSONSchema(callable).properties.parameters,
      },
    },
  }
}

export function toOpenAIToolsSchema(callableComponent: CallableComponent): CallableOpenAITools {
  return {
    tools: Object.entries(callableComponent.functions).map(([_, func]) => func().toOpenAIFunctionSchema()),
  }
}

export function invokeCallableComponent(openAI: OpenAI, request: OpenAI.ChatCompletionCreateParams, completion: OpenAI.ChatCompletion, callableComponent: CallableComponent) {
  completion.choices.forEach((choice) => {
    if (!choice.message.tool_calls)
      return

    choice.message.tool_calls.forEach((toolCall) => {
      const matchedFunc = callableComponent.functions[toolCall.function.name]
      if (!matchedFunc)
        return

      const argumentsParsed = JSON.parse(toolCall.function.arguments)

      const ctx = { parameters: argumentsParsed }
      matchedFunc().call(ctx)
    })
  })
}
