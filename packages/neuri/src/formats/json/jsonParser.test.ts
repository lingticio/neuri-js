import { describe, expect, it } from 'vitest'
import type { Token } from './jsonParser'
import { createJSONParser, stringifyTokens } from './jsonParser'

describe('jsonParser', () => {
  it('should parse json', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n{\"name\": \"abcd\",\n\"age\": 30\n}```'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }
    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`{"name":"abcd","age":30}`)
  })

  it('should parse json with nested objects', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n{\"name\": \"abcd\",\n\"age\": 30\n,\"address\": {\"city\": \"New York\", \"zip\": 10001}}'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }

    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`{"name":"abcd","age":30,"address":{"city":"New York","zip":10001}}`)
  })

  it('should be able to parse json body with missing close', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n{\"name\": \"abcd\",\n\"age\": 30\n```'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }

    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`{"name":"abcd","age":30}`)
  })

  it('should be able to parse json body with mixed quotes', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n{\"name\": \"abcd\",\n\'age\': 30}'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }

    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`{"name":"abcd","age":30}`)
  })

  it('should parse json array with primitive values', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n[1, \"abcd\", true, null]'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }

    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`[1,"abcd",true,null]`)
  })

  it('should parse json array with objects', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n[{\"name\": \"abcd\",\n\"age\": 30\n}, {\"name\": \"efgh\",\n\"age\": 40\n}]'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }

    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`[{"name":"abcd","age":30},{"name":"efgh","age":40}]`)
  })

  it('should parse json array with nested arrays of arrays', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n[{\n\"elements\": [\n{ \"elements\": [\n{\"name\": \"abcd\"}]\n}\n]\n}]'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }

    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`[{"elements":[{"elements":[{"name":"abcd"}]}]}]`)
  })

  it('should parse json array with missing close', () => {
    const parser = createJSONParser()
    const str = 'Some of the test string\n```json\n[1000,{\"name\": \"abcd\",\n\"age\": 30'
    const tokens: Token[] = []

    for (const char of str) {
      const currentTokens = parser.parse(char)
      tokens.push(...currentTokens)
    }

    const finalTokens = parser.end()
    tokens.push(...finalTokens)

    const parsed = stringifyTokens(tokens)
    expect(parsed).equal(`[1000,{"name":"abcd","age":30}]`)
  })
})
