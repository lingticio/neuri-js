import { describe, expect, it } from 'vitest'
import type { JSONSchemaDraft202012 } from './jsonschema'
import { buildRegexFromSchema, buildRegexFromSchemaString, extractBySchema, extractObjectBySchema } from './jsonschema'

describe('buildRegexFromSchemaString', () => {
  const createDistortions = (str: string, primitiveType?: boolean) => [
    `Sure, here's the JSON: ${str}`,
    `The JSON object is: \n\`\`\`json\n${str}\n\`\`\``,
    `Here's what you asked for:\n${str}\nIs there anything else?`,
    primitiveType ? undefined : `{"result": ${str}}`,
    `[${str}]`,
  ].filter(Boolean) as string[]

  const createInvalidDistortions = (str: string, primitiveType?: boolean) => [
    `This is invalid: ${str}`,
    `\`\`\`json\n${str}\n\`\`\``,
    primitiveType ? undefined : `{"invalid": ${str}}`,
  ] as string[]

  it('handles basic object schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '{"name":"John","age":30}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"name":123,"age":30}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles arrays', () => {
    const schema = {
      type: 'array',
      items: { type: 'number' },
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '[1,2,3]'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '["abcd","abcd","abcd"]'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles string formats', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        date: { type: 'string', format: 'date-time' },
      },
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '{"id":"123e4567-e89b-12d3-a456-426614174000","date":"2023-06-13T15:30:00Z"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"id":"not-a-uuid","date":"2023-06-13"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles number constraints', () => {
    const schema = {
      type: 'object',
      properties: {
        integer: { type: 'integer', minimum: 0, maximum: 100 },
        float: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
      },
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '{"integer":50,"float":0.5}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"integer":"50","float":"0.5"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles required properties', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
      },
      required: ['id'],
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '{"id":1,"name":"John"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"name":"John"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles enums', () => {
    const schema = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['red', 'green', 'blue'] },
      },
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '{"color":"red"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"color":"yellow"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      },
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '{"person":{"name":"John","age":30}}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"person":{name:"John","age":30}}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles oneOf', () => {
    const schema = {
      oneOf: [
        { type: 'object', properties: { value: { type: 'string' } } },
        { type: 'object', properties: { value: { type: 'number' } } },
      ],
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJSONs = ['{"value":"text"}', '{"value":1}']
    validJSONs.forEach((validJson) => {
      createDistortions(validJson, true).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeTruthy()
        expect(match?.[0]).toContain(validJson)
      })
    })

    const invalidJson = 'true'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles allOf', () => {
    const schema = {
      allOf: [
        { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] },
        { type: 'object', properties: { b: { type: 'string' } }, required: ['b'] },
      ],
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJson = '{"a":1,"b":"text"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJSONs = ['{"a":1}', '{"b":"text"}', '{"a":"1","b":"text"}']
    invalidJSONs.forEach((invalidJson) => {
      createInvalidDistortions(invalidJson).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeNull()
      })
    })
  })

  it('handles anyOf', () => {
    const schema = {
      anyOf: [
        { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] },
        { type: 'object', properties: { b: { type: 'string' } }, required: ['b'] },
      ],
    }

    const regexString = buildRegexFromSchemaString(JSON.stringify(schema))
    const regex = new RegExp(regexString)

    const validJSONs = ['{"a":1}', '{"b":"text"}', '{"a":1,"b":"text"}']
    validJSONs.forEach((validJson) => {
      createDistortions(validJson).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeTruthy()
        expect(match?.[0]).toContain(validJson)
      })
    })

    const invalidJSONs = ['{"a":"1"}', '{"b":2}', '{}']
    invalidJSONs.forEach((invalidJson) => {
      createInvalidDistortions(invalidJson).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeNull()
      })
    })
  })
})

describe('buildRegexFromSchema', () => {
  const createDistortions = (str: string, primitiveType?: boolean) => [
    `Sure, here's the JSON: ${str}`,
    `The JSON object is: \n\`\`\`json\n${str}\n\`\`\``,
    `Here's what you asked for:\n${str}\nIs there anything else?`,
    primitiveType ? undefined : `{"result": ${str}}`,
    `[${str}]`,
  ].filter(Boolean) as string[]

  const createInvalidDistortions = (str: string, primitiveType?: boolean) => [
    `This is invalid: ${str}`,
    `\`\`\`json\n${str}\n\`\`\``,
    primitiveType ? undefined : `{"invalid": ${str}}`,
  ] as string[]

  it('handles basic object schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '{"name":"John","age":30}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"name":123,"age":30}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles arrays', () => {
    const schema = {
      type: 'array',
      items: { type: 'number' },
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '[1,2,3]'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '["abcd","abcd","abcd"]'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles string formats', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        date: { type: 'string', format: 'date-time' },
      },
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '{"id":"123e4567-e89b-12d3-a456-426614174000","date":"2023-06-13T15:30:00Z"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"id":"not-a-uuid","date":"2023-06-13"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles number constraints', () => {
    const schema = {
      type: 'object',
      properties: {
        integer: { type: 'integer', minimum: 0, maximum: 100 },
        float: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 },
      },
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '{"integer":50,"float":0.5}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"integer":"50","float":"0.5"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles required properties', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'number' },
        name: { type: 'string' },
      },
      required: ['id'],
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '{"id":1,"name":"John"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"name":"John"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles enums', () => {
    const schema = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['red', 'green', 'blue'] },
      },
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '{"color":"red"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"color":"yellow"}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      },
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '{"person":{"name":"John","age":30}}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJson = '{"person":{name:"John","age":30}}'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles oneOf', () => {
    const schema = {
      oneOf: [
        { type: 'object', properties: { value: { type: 'string' } } },
        { type: 'object', properties: { value: { type: 'number' } } },
      ],
    } as JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJSONs = ['{"value":"text"}', '{"value":1}']
    validJSONs.forEach((validJson) => {
      createDistortions(validJson, true).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeTruthy()
        expect(match?.[0]).toContain(validJson)
      })
    })

    const invalidJson = 'true'
    createInvalidDistortions(invalidJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeNull()
    })
  })

  it('handles allOf', () => {
    const schema: JSONSchemaDraft202012 = {
      allOf: [
        {
          type: 'object',
          properties: {
            a: { type: 'number' },
          },
          required: ['a'],
        },
        {
          type: 'object',
          properties: {
            b: { type: 'string' },
          },
          required: ['b'],
        },
      ],
    } satisfies JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJson = '{"a":1,"b":"text"}'
    createDistortions(validJson).forEach((distorted) => {
      const match = regex.exec(distorted)
      expect(match).toBeTruthy()
      expect(match?.[0]).toContain(validJson)
    })

    const invalidJSONs = ['{"a":1}', '{"b":"text"}', '{"a":"1","b":"text"}']
    invalidJSONs.forEach((invalidJson) => {
      createInvalidDistortions(invalidJson).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeNull()
      })
    })
  })

  it('handles anyOf', () => {
    const schema = {
      anyOf: [
        { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] },
        { type: 'object', properties: { b: { type: 'string' } }, required: ['b'] },
      ],
    } as JSONSchemaDraft202012

    const regexString = buildRegexFromSchema(schema)
    const regex = new RegExp(regexString)

    const validJSONs = ['{"a":1}', '{"b":"text"}', '{"a":1,"b":"text"}']
    validJSONs.forEach((validJson) => {
      createDistortions(validJson).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeTruthy()
        expect(match?.[0]).toContain(validJson)
      })
    })

    const invalidJSONs = ['{"a":"1"}', '{"b":2}', '{}']
    invalidJSONs.forEach((invalidJson) => {
      createInvalidDistortions(invalidJson).forEach((distorted) => {
        const match = regex.exec(distorted)
        expect(match).toBeNull()
      })
    })
  })
})

describe('extractBySchema', () => {
  it('extracts object properties', () => {
    const extractedObject = extractBySchema(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      },
      `Sure, here's the JSON: {"name":"John","age":30}`,
    )
    return expect(extractedObject).toEqual('{"name":"John","age":30}')
  })
})

describe('extractObjectBySchema', () => {
  it('extracts object properties', () => {
    const extractedObject = extractObjectBySchema<{
      name: string
      age: number
    }>(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      },
      `Sure, here's the JSON: \`\`\`json{"name":"John","age":30}\`\`\``,
    )
    return expect(extractedObject).toEqual({ name: 'John', age: 30 })
  })
})
