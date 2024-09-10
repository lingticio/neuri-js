import { describe, expect, it } from 'vitest'

import { createStreamableGolangParser, createStreamableJavaScriptParser, createStreamableRustParser, createStreamableTsxParser, createStreamableTypeScriptParser, createStreamableVueParser } from './streamTextmate'

function generateExpectedUpdates(code: string): { text: string }[] {
  const updates: { text: string }[] = []
  let currentStr = ''

  for (const char of code) {
    currentStr += char
    updates.push({ text: currentStr.trim() })
  }

  return updates
}

describe('streamTextmate', () => {
  it('should parse Vue code', async () => {
    const code = ''// '<template><div>Hello World</div></template>'
    const fullStr = `Sure, here is the code: \`\`\`${code}\`\`\``
    const updates: any[] = []

    const parser = createStreamableVueParser((update) => {
      updates.push(update)
    })

    for (const char of fullStr)
      await parser.feed(char)

    expect(updates).toEqual(generateExpectedUpdates(code))
  })

  it('should parse TSX code', async () => {
    const code = 'const element = <div>Hello World</div>;'
    const fullStr = `Sure, here is the code: \`\`\`${code}\`\`\``
    const updates: any[] = []

    const parser = createStreamableTsxParser((update) => {
      updates.push(update)
    })

    for (const char of fullStr)
      await parser.feed(char)

    await parser.end()

    expect(updates).toEqual(generateExpectedUpdates(code))
  })

  it('should parse Golang code', async () => {
    const code = 'func main() { fmt.Println("Hello World") }'
    const updates: any[] = []

    const parser = createStreamableGolangParser((update) => {
      updates.push(update)
    })

    for (const char of code)
      await parser.feed(char)

    await parser.end()

    expect(updates).toEqual(generateExpectedUpdates(code))
  })

  it('should parse JavaScript code', async () => {
    const code = 'console.log("Hello World");'
    const updates: any[] = []

    const parser = createStreamableJavaScriptParser((update) => {
      updates.push(update)
    })

    for (const char of code)
      await parser.feed(char)

    await parser.end()

    expect(updates).toEqual(generateExpectedUpdates(code))
  })

  it('should parse TypeScript code', async () => {
    const code = 'const message: string = "Hello World";'
    const updates: any[] = []

    const parser = createStreamableTypeScriptParser((update) => {
      updates.push(update)
    })

    for (const char of code)
      await parser.feed(char)

    await parser.end()

    expect(updates).toEqual(generateExpectedUpdates(code))
  })

  it('should parse Rust code', async () => {
    const code = 'fn main() { println!("Hello World"); }'
    const updates: any[] = []

    const parser = createStreamableRustParser((update) => {
      updates.push(update)
    })

    for (const char of code)
      await parser.feed(char)

    await parser.end()

    expect(updates).toEqual(generateExpectedUpdates(code))
  })
})
