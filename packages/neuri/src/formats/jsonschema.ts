/**
 * Original implementation made by outlines-dev/outlines: Structured Text Generation https://github.com/outlines-dev/outlines
 * Code: https://github.com/outlines-dev/outlines/blob/8e94488d4ee3c5a29a919d0b9e19f7ea4170b1f4/outlines/fsm/json_schema.py
 * License: Apache-2.0 license
 *
 * Much appreciation to the original authors for the great work, and for making it open source.
 *
 * You could consider it as a port of the Python code to TypeScript. But it's not a direct port, it's a simplified version,
 * and refined to be more idiomatic in TypeScript with better taste, style and structure.
 */

import type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema'

const STRING_INNER = '([^"\\\\\\x00-\\x1F\\x7F-\\x9F]|\\\\["\\\\])'
const STRING = `"${STRING_INNER}*"`
const INTEGER = '(-)?(0|[1-9][0-9]*)'
const NUMBER = `${INTEGER}(\.[0-9]+)?([eE][+-]?[0-9]+)?`
const BOOLEAN = '(true|false)'
const NULL = 'null'
const WHITESPACE = '\\s*'

const typeToRegex: { [key: string]: string } = {
  string: STRING,
  integer: INTEGER,
  number: NUMBER,
  boolean: BOOLEAN,
  null: NULL,
}

const DATE_TIME = '"(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\\.[0-9]{3})?(Z)?"'
const DATE = '"(?:\\d{4})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])"'
const TIME = '"(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\\.[0-9]+)?(Z)?"'
const UUID = '"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'

const formatToRegex: { [key: string]: string } = {
  'uuid': UUID,
  'date-time': DATE_TIME,
  'date': DATE,
  'time': TIME,
}

interface LegalType { type: JSONSchema7TypeName, depth?: number }

export type { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName }

export interface JSONSchemaDraft202012 extends JSONSchema7 {
  depth?: number
  minDigitsInteger?: string
  maxDigitsInteger?: string
  minDigitsFraction?: string
  maxDigitsFraction?: string
  minDigitsExponent?: string
  maxDigitsExponent?: string
  minDigits?: string
  maxDigits?: string
  // TODO: remove once JSONSchema7 is correctly defined, or
  // JSON Schema - 2020-12 Release Notes
  // https://json-schema.org/draft/2020-12/release-notes
  // is implemented in the JSON Schema package
  prefixItems?: JSONSchema7Definition[]
}

/**
 * Ensures that the bounds of a number are valid. Bounds are used as quantifiers in the regex.
 *
 * Tweaked implementation from the original Python code to TypeScript of outlines
 * https://github.com/outlines-dev/outlines/blob/8e94488d4ee3c5a29a919d0b9e19f7ea4170b1f4/outlines/fsm/json_schema.py#L101
 *
 * @param minBound The minimum value that the number can take.
 * @param maxBound The maximum value that the number can take.
 * @param startOffset Number of elements that are already present in the regex but still need to be counted.
 * @returns The minimum and maximum value that the number can take.
 */
function validateQuantifiers(
  minBound: string | undefined,
  maxBound: string | undefined,
  startOffset: number = 0,
): [string, string] {
  const min = minBound === undefined ? '' : (Number.parseInt(minBound) - startOffset).toString()
  const max = maxBound === undefined ? '' : (Number.parseInt(maxBound) - startOffset).toString()

  if (min && max) {
    if (Number.parseInt(max) < Number.parseInt(min))
      throw new Error('max bound must be greater than or equal to min bound')
  }

  return [min, max]
}

/**
 * Get the pattern for the number of items in an array.
 *
 * Tweaked implementation from the original Python code to TypeScript of outlines
 * https://github.com/outlines-dev/outlines/blob/8e94488d4ee3c5a29a919d0b9e19f7ea4170b1f4/outlines/fsm/json_schema.py#L89C5-L89C27
 *
 * @param minItems The minimum number of items in the array.
 * @param maxItems The maximum number of items in the array.
 * @returns The pattern for the number of items in an array.
 */
function getNumItemsPattern(
  minItems?: string | number,
  maxItems?: string | number,
): string | null {
  const min = minItems ? Number.parseInt(String(minItems)) : 0
  if (maxItems === undefined) {
    return `{${Math.max(min - 1, 0)},}`
  }
  else {
    const max = Number.parseInt(String(maxItems))
    if (max < 1)
      return null

    return `{${Math.max(min - 1, 0)},${max - 1}}`
  }
}

function getSchemaByJsonPath(schema: any, path: string): any {
  const parts = path.split('/')
  let current = schema
  for (const part of parts) {
    if (part in current)
      current = current[part]
    else
      throw new Error(`Invalid reference: ${path}`)
  }
  return current
}

function getCombinations(arr: string[], k: number): string[][] {
  if (k === 1)
    return arr.map(x => [x])
  const combos: string[][] = []
  for (let i = 0; i < arr.length - k + 1; i++) {
    const head = arr[i]
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1)
    for (const combo of tailCombos)
      combos.push([head, ...combo])
  }
  return combos
}

function combineSchemas(schemas: string[]): string {
  const properties = schemas.map(schema => schema.slice(2, -2)).join(',')
  return `\\{${properties}\\}`
}

function handleEmptySchema(whitespacePattern: string, rootSchema: JSONSchemaDraft202012): string {
  const types: JSONSchemaDraft202012[] = [
    { type: 'boolean' },
    { type: 'null' },
    { type: 'number' },
    { type: 'integer' },
    { type: 'string' },
    { type: 'array' },
    { type: 'object' },
  ]
  const regexps = types.map(t => toRegex(t, whitespacePattern, rootSchema))
  return `(${regexps.join('|')})`
}

function handleProperties(
  instance: JSONSchemaDraft202012,
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
) {
  let regex = '\\{'
  const properties = instance.properties! // NOTICE: we can safely assume that properties is defined
  const requiredProperties = instance.required || []
  const isRequired = Object.keys(properties).map(item => requiredProperties.includes(item))

  if (isRequired.some(Boolean)) {
    const lastRequiredPos = isRequired.lastIndexOf(true)
    Object.entries(properties).forEach(([name, value], i) => {
      let subRegExps = `${whitespacePattern}"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"${whitespacePattern}:${whitespacePattern}`
      subRegExps += toRegex(value, whitespacePattern, rootSchema)
      if (i < lastRequiredPos)
        subRegExps = `${subRegExps}${whitespacePattern},`
      else if (i > lastRequiredPos)
        subRegExps = `${whitespacePattern},${subRegExps}`

      regex += isRequired[i] ? subRegExps : `(${subRegExps})?`
    })
  }
  else {
    // Case where no property is required
    const propertySubRegExps = Object.entries(properties).map(([name, value]) => {
      const subRegExp = `${whitespacePattern}"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"${whitespacePattern}:${whitespacePattern}${toRegex(value, whitespacePattern, rootSchema)}`
      return subRegExp
    })

    const possiblePatterns = propertySubRegExps.map((subRegExp, i) => {
      const before = propertySubRegExps.slice(0, i).map(s => `(${s}${whitespacePattern},)?`).join('')
      const after = propertySubRegExps.slice(i + 1).map(s => `(${whitespacePattern},${s})?`).join('')
      return before + subRegExp + after
    })

    regex += `(${possiblePatterns.join('|')})?`
  }

  regex += `${whitespacePattern}\\}`
  return regex
}

function handleAllOf(
  allOf: JSONSchema7Definition[],
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const subSchemas = allOf
  let mergedProperties: { [key: string]: JSONSchema7Definition } = {}
  let requiredProperties: string[] = []

  subSchemas.forEach((subSchema) => {
    if (typeof subSchema === 'object' && !Array.isArray(subSchema)) {
      if (subSchema.properties)
        mergedProperties = { ...mergedProperties, ...subSchema.properties }

      if (subSchema.required)
        requiredProperties = [...requiredProperties, ...subSchema.required]
    }
  })

  let regex = '\\{'
  const propertyRegExps = Object.entries(mergedProperties).map(([key, value]) => {
    const propertyRegex = toRegex(value, whitespacePattern, rootSchema)
    const isRequired = requiredProperties.includes(key)
    return isRequired
      ? `${whitespacePattern}"${key}"${whitespacePattern}:${whitespacePattern}${propertyRegex}`
      : `(${whitespacePattern}"${key}"${whitespacePattern}:${whitespacePattern}${propertyRegex})?`
  })

  regex += propertyRegExps.join(`${whitespacePattern},`)
  regex += `${whitespacePattern}\\}`

  return regex
}

function handleAnyOf(
  anyOf: JSONSchema7Definition[],
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const subSchemas = anyOf
  const subRegExps = subSchemas.map(schema => toRegex(schema, whitespacePattern, rootSchema))

  // Combine all possible combinations
  const combinations = []
  for (let i = 1; i <= subRegExps.length; i++) {
    for (const combo of getCombinations(subRegExps, i))
      combinations.push(combineSchemas(combo))
  }

  return `(${combinations.join('|')})`
}

function handleOneOf(
  oneOf: JSONSchema7Definition[],
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const subRegExps = oneOf.map((t: any) => toRegex(t, whitespacePattern, rootSchema))
  const xorPatterns = subRegExps.map(subRegExp => `(?:${subRegExp})`)
  return `(${xorPatterns.join('|')})`
}

function handlePrefixItems(
  instance: JSONSchemaDraft202012,
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const prefixItems = instance.prefixItems! // NOTICE: we can safely assume that prefixItems is defined
  const elementPatterns = prefixItems.map((t: any) => toRegex(t, whitespacePattern, rootSchema))
  const commaSplitPattern = `${whitespacePattern},${whitespacePattern}`
  const tupleInner = elementPatterns.join(commaSplitPattern)
  let regex = `\\[${whitespacePattern}${tupleInner}`

  // Handle additional items if specified
  if ('items' in instance && instance.items) {
    const additionalItemsRegex = toRegex(instance.items, whitespacePattern, rootSchema)
    regex += `(${commaSplitPattern}${additionalItemsRegex})*`
  }

  regex += `${whitespacePattern}\\]`
  return regex
}

function handleEnum(enumValues: any[]): string {
  const choices = enumValues.map((choice: any) => {
    if (['number', 'boolean', 'string'].includes(typeof choice) || choice === null)
      return JSON.stringify(choice).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    throw new TypeError(`Unsupported data type in enum: ${typeof choice}`)
  })
  return `(${choices.join('|')})`
}

function handleConst(constValue: any): string {
  if (['number', 'boolean', 'string'].includes(typeof constValue) || constValue === null)
    return JSON.stringify(constValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  throw new TypeError(`Unsupported data type in const: ${typeof constValue}`)
}

function handleRef(
  ref: string,
  rootSchema: JSONSchemaDraft202012,
  whitespacePattern: string,
): string {
  const path = ref
  if (path.startsWith('#/')) {
    // Internal reference
    const refInstance = getSchemaByJsonPath(rootSchema, path.slice(2))
    return toRegex(refInstance, whitespacePattern, rootSchema)
  }
  else {
    throw new Error('External references are not supported')
  }
}

function handleStringType(
  instance: JSONSchemaDraft202012,
  _: string,
): string {
  if ('maxLength' in instance || 'minLength' in instance) {
    const maxItems = instance.maxLength ?? ''
    const minItems = instance.minLength ?? ''
    const [min, max] = validateQuantifiers(minItems.toString(), maxItems.toString())
    return `"${STRING_INNER}{${min},${max}}"`
  }
  else if ('pattern' in instance && instance.pattern != null) {
    const pattern = instance.pattern
    return pattern[0] === '^' && pattern[pattern.length - 1] === '$'
      ? `("${pattern.slice(1, -1)}")`
      : `("${pattern}")`
  }
  else if ('format' in instance && instance.format != null) {
    const format = instance.format
    if (format in formatToRegex)
      return formatToRegex[format]

    throw new Error(`Format ${format} is not supported`)
  }
  else {
    return typeToRegex.string
  }
}

function handleNumberType(instance: JSONSchemaDraft202012): string {
  const bounds = ['minDigitsInteger', 'maxDigitsInteger', 'minDigitsFraction', 'maxDigitsFraction', 'minDigitsExponent', 'maxDigitsExponent']
  if (bounds.some(bound => bound in instance)) {
    const [minDigitsInteger, maxDigitsInteger] = validateQuantifiers((instance as JSONSchemaDraft202012).minDigitsInteger, (instance as JSONSchemaDraft202012).maxDigitsInteger, 1)
    const [minDigitsFraction, maxDigitsFraction] = validateQuantifiers((instance as JSONSchemaDraft202012).minDigitsFraction, (instance as JSONSchemaDraft202012).maxDigitsFraction)
    const [minDigitsExponent, maxDigitsExponent] = validateQuantifiers((instance as JSONSchemaDraft202012).minDigitsExponent, (instance as JSONSchemaDraft202012).maxDigitsExponent)

    const integersQuantifier = minDigitsInteger || maxDigitsInteger ? `{${minDigitsInteger},${maxDigitsInteger}}` : '*'
    const fractionQuantifier = minDigitsFraction || maxDigitsFraction ? `{${minDigitsFraction},${maxDigitsFraction}}` : '+'
    const exponentQuantifier = minDigitsExponent || maxDigitsExponent ? `{${minDigitsExponent},${maxDigitsExponent}}` : '+'

    return `((-)?(0|[1-9][0-9]${integersQuantifier}))(\.[0-9]${fractionQuantifier})?([eE][+-][0-9]${exponentQuantifier})?`
  }

  if (instance.type === 'integer') {
    if ('minDigits' in instance || 'maxDigits' in instance) {
      const [minDigits, maxDigits] = validateQuantifiers(instance.minDigits, instance.maxDigits, 1)
      return `(-)?(0|[1-9][0-9]{${minDigits},${maxDigits}})`
    }
    return typeToRegex.integer
  }

  return typeToRegex.number
}

function handleArrayType(
  instance: JSONSchemaDraft202012,
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const numRepeats = getNumItemsPattern(instance.minItems, instance.maxItems)
  const allowEmpty = Number.parseInt(String(instance.minItems) || '0') === 0 ? '?' : ''

  if ('items' in instance && instance.items) {
    const itemsRegex = toRegex(instance.items, whitespacePattern, rootSchema)
    return `\\[${whitespacePattern}(${itemsRegex}(${whitespacePattern},${whitespacePattern}${itemsRegex})*)${allowEmpty}${whitespacePattern}\\]`
  }
  else if ('contains' in instance && instance.contains) {
    const containsRegex = toRegex(instance.contains, whitespacePattern, rootSchema)
    return `\\[${whitespacePattern}(.*${containsRegex}.*){${numRepeats}}${allowEmpty}${whitespacePattern}\\]`
  }
  else {
    const legalTypes: LegalType[] = [
      { type: 'boolean' },
      { type: 'null' },
      { type: 'number' },
      { type: 'integer' },
      { type: 'string' },
    ]

    const depth = (instance as JSONSchemaDraft202012).depth || 2
    if (depth > 0) {
      legalTypes.push({ type: 'object', depth: depth - 1 })
      legalTypes.push({ type: 'array', depth: depth - 1 })
    }
    const regExps = legalTypes.map(t => toRegex(t, whitespacePattern, rootSchema))
    return `\\[${whitespacePattern}(${regExps.join('|')})(${whitespacePattern},${whitespacePattern}(${regExps.join('|')})){${numRepeats}}${allowEmpty}${whitespacePattern}\\]`
  }
}

function handleObjectType(
  instance: JSONSchemaDraft202012,
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const numRepeats = getNumItemsPattern(instance.minProperties, instance.maxProperties)
  if (numRepeats === null)
    return `\\{${whitespacePattern}\\}`

  const allowEmpty = Number.parseInt(String(instance.minProperties || '0')) === 0 ? '?' : ''

  let additionalProperties = instance.additionalProperties

  if (additionalProperties === undefined || additionalProperties === true) {
    const legalTypes: LegalType[] = [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'null' },
    ]
    const depth = (instance as JSONSchemaDraft202012).depth || 2
    if (depth > 0) {
      legalTypes.push({ type: 'object', depth: depth - 1 })
      legalTypes.push({ type: 'array', depth: depth - 1 })
    }
    additionalProperties = { anyOf: legalTypes }
  }

  const valuePattern = toRegex(additionalProperties, whitespacePattern, rootSchema)
  const keyValuePattern = `${STRING}${whitespacePattern}:${whitespacePattern}${valuePattern}`
  const keyValueSuccessorPattern = `${whitespacePattern},${whitespacePattern}${keyValuePattern}`
  const multipleKeyValuePattern = `(${keyValuePattern}(${keyValueSuccessorPattern}){${numRepeats}})${allowEmpty}`

  return `\\{${whitespacePattern}${multipleKeyValuePattern}${whitespacePattern}\\}`
}

function handleMultipleTypes(
  types: JSONSchema7TypeName[],
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const regExps = types
    .filter(t => t !== 'object')
    .map(t => toRegex({ type: t }, whitespacePattern, rootSchema))
  return `(${regExps.join('|')})`
}

function handleType(
  instance: JSONSchemaDraft202012,
  whitespacePattern: string,
  rootSchema: JSONSchemaDraft202012,
): string {
  const instanceType = instance.type
  if (instanceType === 'string')
    return handleStringType(instance, whitespacePattern)
  if (instanceType === 'number' || instanceType === 'integer')
    return handleNumberType(instance)
  if (instanceType === 'array')
    return handleArrayType(instance, whitespacePattern, rootSchema)
  if (instanceType === 'object')
    return handleObjectType(instance, whitespacePattern, rootSchema)
  if (instanceType === 'boolean')
    return typeToRegex.boolean
  if (instanceType === 'null')
    return typeToRegex.null
  if (Array.isArray(instanceType))
    return handleMultipleTypes(instanceType, whitespacePattern, rootSchema)

  throw new Error(`Unsupported type: ${instanceType}`)
}

/**
 * Translate a JSON Schema instance into a regex that validates the schema.
 * Many features of JSON schema are missing:
 * - Handle `additionalProperties` keyword
 * - Handle types defined as a list
 * - Handle constraints on numbers
 * - Handle special patterns: `date`, `uri`, etc.
 *
 * This does not support recursive definitions.
 *
 * Tweaked implementation from the original Python code to TypeScript of outlines
 * https://github.com/outlines-dev/outlines/blob/8e94488d4ee3c5a29a919d0b9e19f7ea4170b1f4/outlines/fsm/json_schema.py#L142
 *
 * @param instance - The instance to translate
 * @param whitespacePattern - Pattern to use for JSON syntactic whitespace (doesn't impact string literals)
 * @param rootSchema - The root schema
 * @returns - A regex that used to validate, extract the JSON or primitive values against the schema
 */
function toRegex(
  instance: boolean | JSONSchemaDraft202012 | JSONSchema7Definition | JSONSchema7Definition[],
  whitespacePattern: string | undefined,
  rootSchema: JSONSchemaDraft202012,
): string {
  if (whitespacePattern === undefined)
    whitespacePattern = WHITESPACE

  if (typeof instance === 'boolean')
    return instance ? '.*' : 'a^' // matches everything or nothing

  if (Object.keys(instance).length === 0)
    return handleEmptySchema(whitespacePattern, rootSchema)

  if ('properties' in instance && instance.properties)
    return handleProperties(instance, whitespacePattern, rootSchema)

  if ('allOf' in instance && instance.allOf)
    return handleAllOf(instance.allOf, whitespacePattern, rootSchema)

  if ('anyOf' in instance && instance.anyOf)
    return handleAnyOf(instance.anyOf, whitespacePattern, rootSchema)

  if ('oneOf' in instance && instance.oneOf)
    return handleOneOf(instance.oneOf, whitespacePattern, rootSchema)

  if ('prefixItems' in instance && instance.prefixItems)
    return handlePrefixItems(instance, whitespacePattern, rootSchema)

  if ('enum' in instance && instance.enum)
    return handleEnum(instance.enum)

  if ('const' in instance)
    return handleConst(instance.const)

  if ('$ref' in instance && instance.$ref != null)
    return handleRef(instance.$ref, rootSchema, whitespacePattern)

  if ('type' in instance)
    return handleType(instance, whitespacePattern, rootSchema)

  throw new Error(`Could not translate the instance to a regular expression. Make sure it is valid to the JSON Schema specification.`)
}

/**
 * Turn a plain text JSON schema into a regex that matches any JSON object that follows
 * this schema.
 *
 * It works the same as {@link buildRegexFromSchema} but takes a string instead of an object.
 *
 * JSON Schema is a declarative language that allows to annotate JSON documents
 * with types and descriptions. These schemas can be generated from any TypeScript
 * JSON Schema tools, but not only limited to TypeScript, for example, an OpenAPI
 * spec would do so and fit in the JSON schema's world, so does the Kubernetes CRD
 * spec, as well as gRPC, tRPC, GraphQL, and many other API specs.
 *
 * And by ensuring that the generation respects the schema we ensure
 * that the output can be parsed into these objects.
 * This function parses the provided schema and builds a generation schedule which
 * mixes deterministic generation (fixed strings), and sampling with constraints.
 *
 * References - [JSON Schema](https://json-schema.org/)
 *
 * Tweaked implementation from the original Python code to TypeScript of outlines
 * https://github.com/outlines-dev/outlines/blob/8e94488d4ee3c5a29a919d0b9e19f7ea4170b1f4/outlines/fsm/json_schema.py#L44
 *
 * @param schema A string that represents a JSON Schema.
 * @param whitespacePattern Pattern to use for JSON syntactic whitespace (doesn't impact string literals)
 * @returns A generation schedule. A list of strings that represent the JSON schema's structure and regular expression that define the structure of the fields.
 */
export function buildRegexFromSchemaString(schema: string, whitespacePattern?: string): string {
  const parsedSchema: JSONSchemaDraft202012 = JSON.parse(schema)
  return buildRegexFromSchema(parsedSchema, whitespacePattern)
}

/**
 * Turn a JSON schema object into a regex that matches any JSON object that follows
 * this schema.
 *
 * It works the same as {@link buildRegexFromSchemaString} but takes a JSON object instead of a string.
 *
 * JSON Schema is a declarative language that allows to annotate JSON documents
 * with types and descriptions. These schemas can be generated from any TypeScript
 * JSON Schema tools, but not only limited to TypeScript, for example, an OpenAPI
 * spec would do so and fit in the JSON schema's world, so does the Kubernetes CRD
 * spec, as well as gRPC, tRPC, GraphQL, and many other API specs.
 *
 * And by ensuring that the generation respects the schema we ensure
 * that the output can be parsed into these objects.
 * This function parses the provided schema and builds a generation schedule which
 * mixes deterministic generation (fixed strings), and sampling with constraints.
 *
 * References - [JSON Schema](https://json-schema.org/)
 *
 * Tweaked implementation from the original Python code to TypeScript of outlines
 * https://github.com/outlines-dev/outlines/blob/8e94488d4ee3c5a29a919d0b9e19f7ea4170b1f4/outlines/fsm/json_schema.py#L44
 *
 * @param schema A string that represents a JSON Schema.
 * @param whitespacePattern Pattern to use for JSON syntactic whitespace (doesn't impact string literals)
 * @returns A generation schedule. A list of strings that represent the JSON schema's structure and regular expression that define the structure of the fields.
 */
export function buildRegexFromSchema(schema: JSONSchemaDraft202012, whitespacePattern?: string): string {
  const innerRegex = toRegex(schema, whitespacePattern, schema)
  return `${WHITESPACE}${innerRegex}${WHITESPACE}`
}

/**
 * Extracts the JSON object in plain text from a string that matches the provided schema.
 *
 * This function extracts the JSON object from a string that matches the provided schema.
 * It uses the regular expression generated by {@link buildRegexFromSchema}.
 *
 * @param schema The JSON schema object.
 * @param extractFrom The string (or plain text) to extract the JSON object from.
 * @returns The JSON object extracted from the string.
 */
export function extractBySchema(schema: JSONSchemaDraft202012, extractFrom: string): string {
  const regexp = buildRegexFromSchema(schema)
  const match = extractFrom.match(new RegExp(regexp))
  if (!match)
    throw new Error('No match found')
  if (match.length === 0)
    throw new Error('No match found')

  return String(match[0]).trim()
}

/**
 * Extracts the JSON object from a string that matches the provided schema.
 *
 * This function extracts the JSON object from a string that matches the provided schema.
 * It uses the regular expression generated by {@link buildRegexFromSchema}.
 *
 * @param schema The JSON schema object.
 * @param extractFrom The string (or plain text) to extract the JSON object from.
 * @returns The parsed JSON object extracted from the string.
 */
export function extractObjectBySchema<T = any>(schema: JSONSchemaDraft202012, extractFrom: string): T {
  const extracted = extractBySchema(schema, extractFrom)
  return JSON.parse(extracted) as T
}
