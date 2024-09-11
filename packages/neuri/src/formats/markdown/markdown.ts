import { unified } from 'unified'
import RemarkParse from 'remark-parse'
import type { Code, Node } from 'mdast'
import { visit } from 'unist-util-visit'

function isCodeNode(node: Node): node is Code {
  return node.type === 'code'
}

export function extractCodesFromMarkdown(text: string): { content: string, lang: string }[] {
  const hast = unified().use(RemarkParse).parse(text)

  const codes: { content: string, lang: string }[] = []
  visit(hast, 'code', (node: Node) => {
    if (!isCodeNode(node))
      return

    const lang = node.lang || ''
    const content = node.value || ''
    codes.push({ content, lang })
  })

  return codes
}

/**
 * Callback function for updating the parsed code.
 * @param update - Object containing the parsed code text.
 */
type UpdateCallback = (update: { content: string, lang: string }) => void

/**
 * Interface for a streamable parser.
 */
interface StreamableParser {
  /**
   * Feed a chunk of code to the parser.
   * @param chunk - The code chunk to parse.
   */
  feed: (chunk: string) => Promise<void>
  /**
   * End the parsing process and return the final parsed code.
   * @returns A promise that resolves to the final parsed code.
   */
  end: () => Promise<{ content: string, lang: string }[]>
}

function trimCodeBlockBoundary(content: string): string {
  return content.replace(/\n(`){1,}$/, '')
}

/**
 * Create a streamable parser for a specific language.
 *
 * @param callback - Callback function to update the parsed code.
 * @returns A streamable parser object.
 */
export function createStreamableCodesFromMarkdownExtractor(callback: UpdateCallback): StreamableParser {
  let buffer = ''
  let previousCodes: { content: string, lang: string }[] = []
  let lastUpdate: { content: string, lang: string } | null = null

  async function feed(chunk: string) {
    buffer += chunk

    const currentCodes = extractCodesFromMarkdown(buffer)
    if (currentCodes.length === 0)
      return

    for (let i = 0; i < currentCodes.length; i++) {
      const currentCode = currentCodes[i]
      const previousCode = previousCodes[i]

      if (!previousCode || currentCode.content !== previousCode.content || currentCode.lang !== previousCode.lang) {
        const trimmedContent = trimCodeBlockBoundary(currentCode.content)
        const update = { content: trimmedContent, lang: currentCode.lang }

        // Deduplicate updates
        if (!lastUpdate || update.content !== lastUpdate.content) {
          if (update.content === '') {
            // Skip empty code blocks
            continue
          }

          callback(update)
          lastUpdate = update
        }
      }
    }

    previousCodes = currentCodes
  }

  async function end() {
    return extractCodesFromMarkdown(buffer)
  }

  return { feed, end }
}
