import { cwd } from 'node:process'

import { FunctionDeclaration, Project } from 'ts-morph'
import { findConfigFile, sys } from 'typescript'
import { it } from 'vitest'

it('readAndParse', async () => {
  const configFilePath = findConfigFile(cwd(), sys.fileExists)
  if (!configFilePath)
    throw new Error('No config file found')

  const project = new Project({
    tsConfigFilePath: configFilePath,
  })

  const files = project.getSourceFiles()
  files.forEach((file) => {
    if (!file.getBaseName().includes('callable.ts'))
      return

    const declarationsMap = file.getExportedDeclarations()
    if (declarationsMap.size === 0)
      return

    for (const [name, declarations] of declarationsMap.entries()) {
      for (const declaration of declarations) {
        if (!(declaration instanceof FunctionDeclaration))
          continue

        console.log(name)
        const references = declaration.findReferences()
        for (const reference of references) {
          const refs = reference.getReferences()
          for (const ref of refs)
            console.log(' ->', ref.getSourceFile().getBaseName(), `${file.getBaseName()}${ref.getTextSpan().getStart()}:${ref.getTextSpan().getEnd()}`)
        }
      }
    }
  })

  // const config = readConfigFile(configFilePath, sys.readFile) as {
  //   config: {
  //     include: string[]
  //     exclude?: string[]
  //   }
  // }
  // const files = await glob([
  //   ...config.config.include,
  //   ...config.config.exclude?.map(pattern => `!${pattern}`) || [],
  // ], {
  //   cwd: cwd(),
  // })

  // for (const file of files) {
  //   const ast = await readAndParse(file)
  //   project.createSourceFile(file, ast)
  // }

  // const visitors: RecursiveVisitors<unknown> & {
  //   StringLiteral: typeof base.Literal
  //   BooleanLiteral: typeof base.Literal
  //   FunctionBody: () => void
  //   TSTypeAliasDeclaration: () => void
  //   TSInterfaceDeclaration: () => void
  //   TSDeclareFunction: () => void
  // } = {
  //   ...base,
  //   StringLiteral: base.Literal,
  //   BooleanLiteral: base.Literal,
  //   FunctionBody() {},
  //   TSTypeAliasDeclaration() {},
  //   TSInterfaceDeclaration() { },
  //   TSDeclareFunction() {},
  // }

  // const exportedFunctions: string[] = []

  // simple(ast, {
  //   ExportNamedDeclaration(node) {
  //     simple(node, {
  //       FunctionDeclaration(node) {
  //         exportedFunctions.push(node.id?.name ?? '')
  //       },
  //     }, visitors)
  //   },
  // }, visitors)

  // console.log(stringify(exportedFunctions))
})
