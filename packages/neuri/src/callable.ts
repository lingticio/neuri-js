import type { JSONSchema7 } from 'json-schema'

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

export interface Callable<P extends any[], R> {
  name: string
  description: string
  parameters: CallableParameter<P[number]>[]
  returns: CallableReturn<R>[]
  call: (...params: P) => Promise<R>
  toJSONSchema: () => Record<string, any>
  toOpenAIFunctionSchema: () => CallableOpenAIFunction
}

export interface CallableFunctions extends Record<string, () => Callable<any[], any>> {
  [name: string]: () => Callable<any[], any>
}

export interface CallableComponent {
  functions: CallableFunctions
  toJSONSchema: () => Record<string, any>
  toOpenAIToolsSchema: () => CallableOpenAITools
}

export interface CallableBuilder<P extends any[], R> {
  withName: (name: string) => CallableBuilder<P, R>
  withDescription: (description: string) => CallableBuilder<P, R>
  withParameter: (parameter: CallableParameter<P[number]>) => CallableBuilder<P, R>
  withReturn: (returns: CallableReturn<R>) => CallableBuilder<P, R>
  build: (call: Callable<P, R>['call']) => Callable<P, R>
}

export function defineCallable<P extends any[], R>(): CallableBuilder<P, R> {
  const callable: Callable<P, R> = {
    name: '',
    description: '',
    parameters: [],
    returns: [],
    call: async (..._: Partial<P>): Promise<R> => {
      return undefined as R
    },
    toJSONSchema() {
      return toJSONSchema(callable)
    },
    toOpenAIFunctionSchema() {
      return toOpenAIFunctionSchema(callable)
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
