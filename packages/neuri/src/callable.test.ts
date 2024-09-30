import { describe, expect, it } from 'vitest'
import { defineCallable, defineCallableComponent } from './callable'

describe('callable', () => {
  it('should handle toJSONSchema', () => {
    const callable = defineCallable<[string], string>()
      .withName('test')
      .withDescription('test description')
      .withParameter({ name: 'param', description: 'param description', type: 'string' })
      .withReturn({ name: 'return', description: 'return description', type: 'string' })
      .build(async (param: string) => param)

    const schema = callable.toJSONSchema()
    expect(schema).toEqual({
      title: 'test',
      description: 'test description',
      type: 'object',
      properties: {
        parameters: {
          type: 'object',
          properties: {
            param: {
              type: 'string',
              description: 'param description',
            },
          },
          required: ['param'],
        },
        returns: {
          type: 'object',
          properties: {
            return: {
              type: 'string',
              description: 'return description',
            },
          },
          required: ['return'],
        },
      },
    })
  })

  it('should handle toOpenAIFunctionSchema', () => {
    const callable = defineCallable<[string], string>()
      .withName('test')
      .withDescription('test description')
      .withParameter({ name: 'param', description: 'param description', type: 'string' })
      .withReturn({ name: 'return', description: 'return description', type: 'string' })
      .build(async (param: string) => param)

    const schema = callable.toOpenAIFunctionSchema()
    expect(schema).toEqual({
      type: 'function',
      function: {
        name: 'test',
        description: 'test description',
        parameters: {
          type: 'object',
          properties: {
            param: {
              type: 'string',
              description: 'param description',
            },
          },
          required: ['param'],
        },
      },
    })
  })
})

describe('callableComponent', () => {
  it('should handle toToolsJSONSchema', () => {
    const functionTest = () => defineCallable<[string], string>()
      .withName('test')
      .withDescription('test description')
      .withParameter({ name: 'param', description: 'param description', type: 'string' })
      .withReturn({ name: 'return', description: 'return description', type: 'string' })
      .build(async (param: string) => param)

    const functionAdd = () => defineCallable<[number, number], number>()
      .withName('add')
      .withDescription('add description')
      .withParameter({ name: 'a', description: 'a description', type: 'number' })
      .withParameter({ name: 'b', description: 'b description', type: 'number' })
      .withReturn({ name: 'return', description: 'return description', type: 'number' })
      .build(async (a: number, b: number) => a + b)

    const component = defineCallableComponent('test', 'test description', {
      test: functionTest,
      add: functionAdd,
    })

    const schema = component.toJSONSchema()
    expect(schema).toEqual({
      title: 'test',
      description: 'test description',
      type: 'object',
      properties: {
        test: {
          title: 'test',
          description: 'test description',
          type: 'object',
          properties: {
            parameters: {
              type: 'object',
              properties: {
                param: {
                  type: 'string',
                  description: 'param description',
                },
              },
              required: ['param'],
            },
            returns: {
              type: 'object',
              properties: {
                return: {
                  type: 'string',
                  description: 'return description',
                },
              },
              required: ['return'],
            },
          },
        },
        add: {
          title: 'add',
          description: 'add description',
          type: 'object',
          properties: {
            parameters: {
              type: 'object',
              properties: {
                a: {
                  type: 'number',
                  description: 'a description',
                },
                b: {
                  type: 'number',
                  description: 'b description',
                },
              },
              required: ['a', 'b'],
            },
            returns: {
              type: 'object',
              properties: {
                return: {
                  type: 'number',
                  description: 'return description',
                },
              },
              required: ['return'],
            },
          },
        },
      },
    })
  })

  it('should handle toOpenAIToolsSchema', () => {
    const functionTest = () => defineCallable<[string], string>()
      .withName('test')
      .withDescription('test description')
      .withParameter({ name: 'param', description: 'param description', type: 'string' })
      .withReturn({ name: 'return', description: 'return description', type: 'string' })
      .build(async (param: string) => param)

    const functionAdd = () => defineCallable<[number, number], number>()
      .withName('add')
      .withDescription('add description')
      .withParameter({ name: 'a', description: 'a description', type: 'number' })
      .withParameter({ name: 'b', description: 'b description', type: 'number' })
      .withReturn({ name: 'return', description: 'return description', type: 'number' })
      .build(async (a: number, b: number) => a + b)

    const component = defineCallableComponent('test', 'test description', {
      test: functionTest,
      add: functionAdd,
    })

    const schema = component.toOpenAIToolsSchema()
    expect(schema).toEqual({
      tools: [
        {
          type: 'function',
          function: {
            name: 'test',
            description: 'test description',
            parameters: {
              type: 'object',
              properties: {
                param: {
                  type: 'string',
                  description: 'param description',
                },
              },
              required: ['param'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'add',
            description: 'add description',
            parameters: {
              type: 'object',
              properties: {
                a: {
                  type: 'number',
                  description: 'a description',
                },
                b: {
                  type: 'number',
                  description: 'b description',
                },
              },
              required: ['a', 'b'],
            },
          },
        },
      ],
    })
  })
})
