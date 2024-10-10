import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { parseSync } from '@oxc-parser/wasm/node/oxc_parser_wasm'

export async function readAndParse(input: string) {
  const content = await readFile(input)
  const res = await parseSync(content.toString('utf-8'), {
    sourceFilename: basename(input),
    sourceType: 'module',
  })

  return res.program
}
