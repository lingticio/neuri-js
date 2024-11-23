import type { JSONSchema7 } from 'json-schema'
import type { Token } from './jsonParser'
import Ajv from 'ajv'
import { createJSONParser } from './jsonParser'

type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[]

interface JSONUpdate {
  path: string[]
  value: JSONValue
  previousValue?: JSONValue
}

type UpdateCallback = (update: JSONUpdate) => void

interface ParserState {
  currentObject: { [key: string]: JSONValue }
  stack: { object: { [key: string]: JSONValue }, key: string }[]
  currentPath: string[]
  currentString: string
}

export function createStreamableJSONParser(schema: JSONSchema7, callback: UpdateCallback) {
  const parser = createJSONParser()
  const ajv = new Ajv()
  const validate = ajv.compile(schema)

  const initialState: ParserState = {
    currentObject: {},
    stack: [],
    currentPath: [],
    currentString: '',
  }

  let state = initialState

  function updateValue(path: string[], value: JSONValue, currentObject: { [key: string]: JSONValue }): { [key: string]: JSONValue } {
    let current: any = currentObject
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current))
        current[path[i]] = {}

      current = current[path[i]]
    }

    const lastKey = path[path.length - 1]
    const previousValue = current[lastKey]

    current[lastKey] = value

    callback({ path, value, previousValue })

    return currentObject
  }

  function processToken(token: Token, state: ParserState): ParserState {
    let { currentObject, stack, currentPath, currentString } = state

    switch (token.type) {
      case 'JSONObject':
      case 'JSONArray':
        if (currentPath.length > 0) {
          stack = [...stack, {
            object: currentObject,
            key: currentPath[currentPath.length - 1],
          }]

          const newValue: JSONValue = token.type === 'JSONObject' ? {} : []
          currentObject = updateValue(currentPath, newValue, currentObject)
        }
        break
      case 'JSONField':
        currentPath = [...currentPath, token.content]
        currentString = ''
        if (token.children.length > 0) {
          // Override
          ({
            currentObject,
            stack,
            currentPath,
            currentString,
          } = processToken(token.children[0], { currentObject, stack, currentPath, currentString }))
        }
        break
      case 'JSONString':
        if (currentPath.length > 0) {
          const content = token.content.replace(/^"|"$/g, '')

          for (const char of content) {
            currentString += char
            currentObject = updateValue(currentPath, currentString, currentObject)
          }
        }
        break
      case 'JSONNumber':
      case 'JSONBoolean':
      case 'JSONNull':
        // eslint-disable-next-line no-case-declarations
        let value: JSONValue
        switch (token.type) {
          case 'JSONNumber':
            value = Number(token.content)
            break
          case 'JSONBoolean':
            value = token.content === 'true'
            break
          case 'JSONNull':
            value = null
            break
        }

        currentObject = updateValue(currentPath, value, currentObject)
        currentPath = currentPath.slice(0, -1)

        break
    }

    if (token.type === 'JSONObject' || token.type === 'JSONArray') {
      for (const child of token.children) {
        if (child.type === 'JSONField')
          ({ currentObject, stack, currentPath, currentString } = processToken(child, { currentObject, stack, currentPath, currentString }))
      }

      if (stack.length > 0) {
        const { object, key } = stack[stack.length - 1]
        object[key] = currentObject
        currentObject = object
        stack = stack.slice(0, -1)
        currentPath = currentPath.slice(0, -1)
      }
    }

    return { currentObject, stack, currentPath, currentString }
  }

  function feed(chunk: string) {
    const tokens = parser.parse(chunk)
    for (const token of tokens)
      state = processToken(token, state)
  }

  function end(): { [key: string]: JSONValue } | null {
    const finalTokens = parser.end()
    for (const token of finalTokens)
      state = processToken(token, state)

    if (validate(state.currentObject)) {
      return state.currentObject
    }
    else {
      console.error('Validation errors:', validate.errors)
      return null
    }
  }

  return { feed, end }
}
