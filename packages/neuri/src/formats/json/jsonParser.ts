export type TokenType =
  | 'Text'
  | 'JSONObject'
  | 'JSONArray'
  | 'JSONField'
  | 'JSONString'
  | 'JSONNumber'
  | 'JSONBoolean'
  | 'JSONNull'

export interface Pos {
  offset: number
  line: number
  column: number
}

export interface Token {
  type: TokenType
  content: string
  pos: Pos
  children: Token[]
}

export type ParserState =
  | 'Text'
  | 'JSONStart'
  | 'JSONString'
  | 'JSONEscape'
  | 'JSONFieldName'
  | 'JSONFieldValue'
  | 'JSONNumber'

export function createJSONParser() {
  let buffer = ''
  let inSingleQuote = false
  let insideJSON = false
  let state: ParserState = 'Text'
  const stateStack: ParserState[] = []
  let depth = 0
  let tokenStart: Pos = { offset: 0, line: 1, column: 1 }
  const pos: Pos = { offset: 0, line: 1, column: 1 }
  let currentToken: Token | null = null
  let currentContainer: Token | null = null
  let tree: Token[] = []

  function pushState(newState: ParserState) {
    stateStack.push(newState)
    state = newState
  }

  function popState() {
    if (stateStack.length > 1) {
      stateStack.pop()
      state = stateStack[stateStack.length - 1]
    }
  }

  function handleStateJSONNumber(char: string) {
    if (/[\d.eE+-]/.test(char)) {
      buffer += char
    }
    else {
      completeCurrentToken()
      popState()
      processChar(char)
    }
  }

  function completeCurrentToken() {
    if (buffer === '')
      return

    let tokenType: TokenType
    let value = buffer

    switch (state) {
      case 'JSONString':
        tokenType = 'JSONString'
        value = value.replace(/^['"]|['"]$/g, '')
        break
      case 'JSONNumber':
        tokenType = 'JSONNumber'
        value = trimTrailingNonNumber(value)
        break
      case 'JSONFieldValue':
        tokenType = determineValueType(value)
        break
      default:
        tokenType = 'JSONString'
    }

    const valueToken: Token = { type: tokenType, content: value, pos: tokenStart, children: [] }

    if (currentToken && currentToken.type === 'JSONField')
      currentToken.children.push(valueToken)
    else if (currentContainer)
      currentContainer.children.push(valueToken)

    buffer = ''
    tokenStart = { ...pos }
  }

  function trimTrailingNonNumber(s: string): string {
    return s.replace(/[^0-9.eE+-]+$/, '')
  }

  function determineValueType(value: string): TokenType {
    if (value === 'true' || value === 'false')
      return 'JSONBoolean'
    if (value === 'null')
      return 'JSONNull'
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value))
      return 'JSONNumber'
    return 'JSONString'
  }

  function processChar(char: string) {
    switch (state) {
      case 'Text':
        handleStateText(char)
        break
      case 'JSONStart':
        handleStateJSONStart(char)
        break
      case 'JSONString':
        handleStateJSONString(char)
        break
      case 'JSONEscape':
        handleStateJSONEscape(char)
        break
      case 'JSONFieldName':
        handleStateJSONFieldName(char)
        break
      case 'JSONFieldValue':
        handleStateJSONFieldValue(char)
        break
      case 'JSONNumber':
        handleStateJSONNumber(char)
        break
    }
  }

  function handleStateText(char: string) {
    if (char === '{' || char === '[') {
      flushBuffer()
      startNewJSONToken(char)
      insideJSON = true
      pushState('JSONStart')
    }
    else {
      if (buffer.length === 0)
        tokenStart = { ...pos }

      buffer += char
    }
  }

  function handleStateJSONStart(char: string) {
    switch (true) {
      case char === '"' || char === '\'':
        pushState('JSONString')
        inSingleQuote = (char === '\'')
        buffer += char
        break
      case char === '}' || char === ']':
        completeCurrentToken()
        depth--
        if (depth === 0) {
          insideJSON = false
          popState()
          flushBuffer()
          currentContainer = null
        }
        else {
          popState()
          currentContainer = findParentContainer()
        }
        currentToken = currentContainer
        break
      case char === '{' || char === '[':
        completeCurrentToken()
        startNewJSONToken(char)
        break
      case char === ':':
        startNewJSONField()
        pushState('JSONFieldValue')
        break
      case char === ',':
        completeCurrentToken()
        if (currentContainer && currentContainer.type === 'JSONArray')
          currentToken = currentContainer

        break
      case /\d|-/.test(char):
        pushState('JSONNumber')
        buffer += char
        break
      case /[tfn]/.test(char):
        pushState('JSONFieldValue')
        buffer += char
        break
      default:
        if (!/\s/.test(char)) {
          if (currentContainer && currentContainer.type === 'JSONArray')
            pushState('JSONFieldValue')
          else
            pushState('JSONFieldName')

          buffer += char
        }
    }
  }

  function handleStateJSONString(char: string) {
    buffer += char
    if (char === '\\') {
      pushState('JSONEscape')
    }
    else if ((char === '"' && !inSingleQuote) || (char === '\'' && inSingleQuote)) {
      popState()
      inSingleQuote = false
    }
  }

  function handleStateJSONEscape(char: string) {
    buffer += char
    popState()
  }

  function handleStateJSONFieldName(char: string) {
    if (char === ':') {
      startNewJSONField()
      popState()
      pushState('JSONFieldValue')
    }
    else {
      buffer += char
    }
  }

  function handleStateJSONFieldValue(char: string) {
    switch (true) {
      case char === ',' || char === '}' || char === ']':
        completeCurrentToken()
        popState()
        if (char === '}' || char === ']')
          processChar(char)

        break
      case char === '{' || char === '[':
        startNewJSONToken(char)
        break
      case char === '"' || char === '\'':
        pushState('JSONString')
        inSingleQuote = (char === '\'')
        buffer += char
        break
      case /\d|-/.test(char):
        popState()
        pushState('JSONNumber')
        buffer += char
        break
      case /[tfn]/.test(char):
        buffer += char
        break
      default:
        if (!/\s/.test(char))
          buffer += char
    }
  }

  function startNewJSONToken(char: string) {
    const tokenType: TokenType = char === '{' ? 'JSONObject' : 'JSONArray'
    const newToken: Token = { type: tokenType, content: '', pos: { ...pos }, children: [] }
    if (currentContainer) {
      if (currentToken && currentToken.type === 'JSONField')
        currentToken.children.push(newToken)
      else
        currentContainer.children.push(newToken)
    }
    else {
      tree.push(newToken)
    }

    currentContainer = newToken
    currentToken = newToken
    pushState('JSONStart')
    depth++
  }

  function startNewJSONField() {
    const fieldName = buffer.trim().replace(/^["']|["']$/g, '')
    const newToken: Token = { type: 'JSONField', content: fieldName, pos: { ...tokenStart }, children: [] }
    if (currentContainer)
      currentContainer.children.push(newToken)

    currentToken = newToken
    buffer = ''
  }

  function findParentContainer(): Token | null {
    if (!currentContainer)
      return null

    const findParent = (token: Token): Token | null => {
      for (const child of token.children) {
        if (child === currentContainer)
          return token

        const result = findParent(child)
        if (result)
          return result
      }
      return null
    }

    for (const token of tree) {
      const result = findParent(token)
      if (result)
        return result
    }

    return null
  }

  function autoCloseJSON() {
    while (depth > 0) {
      depth--
      completeCurrentToken()
    }
  }

  function flushBuffer() {
    if (buffer.length > 0) {
      if (!insideJSON)
        tree.push({ type: 'Text', content: buffer, pos: { ...tokenStart }, children: [] })

      buffer = ''
    }
  }

  function getCompletedTokens(): Token[] {
    const completedTokens = []
    for (const token of tree) {
      if (token.type === 'Text' || ((token.type === 'JSONObject' || token.type === 'JSONArray') && state === 'Text'))
        completedTokens.push(token)
      else
        break
    }
    tree = tree.slice(completedTokens.length)
    return completedTokens
  }

  function updatePosition(char: string) {
    pos.offset++
    if (char === '\n') {
      pos.line++
      pos.column = 1
    }
    else {
      pos.column++
    }
  }

  return {
    parse: (chunk: string): Token[] => {
      for (const char of chunk) {
        processChar(char)
        updatePosition(char)
      }
      return getCompletedTokens()
    },
    end: (): Token[] => {
      if (insideJSON)
        autoCloseJSON()

      flushBuffer()
      insideJSON = false
      return tree
    },
  }
}

export function stringifyTokens(tokens: Token[]): string {
  return tokens.map((token) => {
    if (token.type === 'JSONObject' || token.type === 'JSONArray')
      return stringifyToken(token)

    return ''
  }).join('')
}

function stringifyToken(token: Token): string {
  switch (token.type) {
    case 'Text':
      return token.content
    case 'JSONObject':
      return stringifyObject(token)
    case 'JSONArray':
      return stringifyArray(token)
    case 'JSONField':
      return stringifyField(token)
    case 'JSONString':
      return token.content
    case 'JSONNumber':
    case 'JSONBoolean':
    case 'JSONNull':
      return token.content
    default:
      return ''
  }
}

function stringifyObject(token: Token): string {
  const parts = token.children
    .filter(child => child.type === 'JSONField')
    .map(stringifyToken)
  return `{${parts.join(',')}}`
}

function stringifyArray(token: Token): string {
  const parts = token.children.map((child) => {
    switch (child.type) {
      case 'JSONObject':
      case 'JSONArray':
        return stringifyToken(child)
      case 'JSONField':
        return child.children.length > 0 ? stringifyToken(child.children[0]) : 'null'
      default:
        return stringifyToken(child)
    }
  })
  return `[${parts.join(',')}]`
}

function stringifyField(token: Token): string {
  if (token.children.length > 0) {
    const childValue = stringifyToken(token.children[0])
    return `"${token.content}":${childValue}`
  }
  return `"${token.content}":null`
}
