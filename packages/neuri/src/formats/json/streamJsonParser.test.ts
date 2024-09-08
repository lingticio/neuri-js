import { describe, expect, it } from 'vitest'

import { createStreamableJSONParser } from './streamJsonParser'

describe('createStreamableJSONParser', () => {
  it('should parse a simple object', () => {
    const fullStr = '{"a": 1, "b": "2"}'
    const updates: any[] = []

    const parser = createStreamableJSONParser({
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'string' },
      },
    }, (update) => {
      updates.push(update)
    })

    for (const char of fullStr)
      parser.feed(char)

    const result = parser.end()

    // Assert on the collected updates
    expect(updates).toEqual([
      { path: ['a'], value: 1, previousValue: undefined },
      { path: ['b'], value: '2', previousValue: undefined },
    ])

    // Assert on the final result
    expect(result).toEqual({ a: 1, b: '2' })
  })

  it('should parse a simple object with long string', () => {
    const fullStr = '{"a": 1, "b": "lorum ipsum"}'
    const updates: any[] = []

    const parser = createStreamableJSONParser({
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'string' },
      },
    }, (update) => {
      updates.push(update)
    })

    for (const char of fullStr)
      parser.feed(char)

    const result = parser.end()

    // Assert on the collected updates
    expect(updates).toEqual([
      { path: ['a'], value: 1, previousValue: undefined },
      { path: ['b'], value: 'l', previousValue: undefined },
      { path: ['b'], value: 'lo', previousValue: 'l' },
      { path: ['b'], value: 'lor', previousValue: 'lo' },
      { path: ['b'], value: 'loru', previousValue: 'lor' },
      { path: ['b'], value: 'lorum', previousValue: 'loru' },
      { path: ['b'], value: 'lorum ', previousValue: 'lorum' },
      { path: ['b'], value: 'lorum i', previousValue: 'lorum ' },
      { path: ['b'], value: 'lorum ip', previousValue: 'lorum i' },
      { path: ['b'], value: 'lorum ips', previousValue: 'lorum ip' },
      { path: ['b'], value: 'lorum ipsu', previousValue: 'lorum ips' },
      { path: ['b'], value: 'lorum ipsum', previousValue: 'lorum ipsu' },
    ])

    // Assert on the final result
    expect(result).toEqual({ a: 1, b: 'lorum ipsum' })
  })
})
