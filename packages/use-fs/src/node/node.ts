import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  readdir,
} from 'node:fs/promises'
import { join, relative } from 'node:path'

import { cwd } from 'node:process'
import { useLogg } from '@guiiai/logg'
import { defu } from 'defu'
import { execa } from 'execa'
import ignore from 'ignore'

import { exists } from './utils'

export function fs(options?: { basePath?: string }) {
  const log = useLogg('fs').useGlobalConfig()

  const opts = defu(options, {
    basePath: cwd(),
  })

  let workingDirectory = opts.basePath

  async function getWorkingDirectory() {
    return workingDirectory
  }

  async function setWorkingDirectory(dir: string | undefined): Promise<void> {
    if (!dir)
      throw new Error('dir must be provided')

    let relativeDir = dir
    if (dir.startsWith('/')) {
      if (await exists(dir)) {
        workingDirectory = dir
        log.withField('workingDirectory', workingDirectory).log('workingDirectory is now set')

        return
      }

      relativeDir = dir.substring(1)
    }

    const relativePath = join(await getWorkingDirectory(), relativeDir)
    if (await exists(relativePath)) {
      workingDirectory = relativePath
      log.withField('workingDirectory', workingDirectory).log('workingDirectory is now set')

      return
    }

    throw new Error(`New working directory ${dir} does not exist (current working directory ${workingDirectory}`)
  }

  async function readFile(filePath: string | undefined) {
    if (!filePath)
      throw new Error('filePath must be provided')

    log.withField('filePath', filePath).verbose('Reading file')
    const relativeFullPath = join(await getWorkingDirectory(), filePath)

    if (await exists(relativeFullPath))
      return (await fsReadFile(relativeFullPath)).toString()
    else if (filePath.startsWith('/') && await exists(filePath))
      return (await fsReadFile(filePath)).toString()

    throw new Error(`File ${filePath} does not exist`)
  }

  async function listFilesInDirectory(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = workingDirectory

    log.withField('dirPath', dirPath).verbose('Listing files in directory')

    const ig = ignore()
    const gitIgnorePath = join(await getWorkingDirectory(), dirPath, '.gitignore')
    if (await exists(gitIgnorePath)) {
      let lines = await fsReadFile(gitIgnorePath, 'utf8').then(data => data.split('\n'))
      lines = lines.map(line => line.trim()).filter(line => line.length && !line.startsWith('#'))
      ig.add(lines)
    }

    const files: string[] = []
    const readdirPath = join(await getWorkingDirectory(), dirPath)
    const dirList = await readdir(readdirPath, { withFileTypes: true })

    for (const item of dirList) {
      const direntName = item.isDirectory() ? `${item.name}/` : item.name
      const relativePath = relative(await getWorkingDirectory(), join(await getWorkingDirectory(), dirPath, direntName))
      if (!ig.ignores(relativePath))
        files.push(item.name)
    }

    return files
  }

  async function getFileContentsRecursively(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = workingDirectory

    log.withField('dirPath', dirPath).verbose('Getting file contents recursively')

    const filenames = await listFilesRecursively(dirPath)
    const fileContents: { filename: string, content: string }[] = []

    for (const filename of filenames) {
      const content = await readFile(join(dirPath, filename))
      fileContents.push({ filename, content })
    }

    return fileContents
  }

  async function listFilesRecursively(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = './'

    log.withField('dirPath', dirPath).verbose('Listing files recursively')

    const files: string[] = []
    const dirList = await readdir(join(await getWorkingDirectory(), dirPath), { withFileTypes: true })

    for (const item of dirList) {
      const fullPath = join(dirPath, item.name)
      if (item.isDirectory())
        files.push(...await listFilesRecursively(fullPath))
      else
        files.push(fullPath)
    }

    return files
  }

  async function searchFilesMatchingContents(contentsRegex: string) {
    log.withField('contentsRegex', contentsRegex).verbose('Searching files matching contents')

    const command = `rg --count ${contentsRegex}`
    const { stdout, stderr, exitCode } = await execa(command, { cwd: await getWorkingDirectory() })
    if (exitCode != null && exitCode > 0)
      throw new Error(stderr)

    return stdout.split('\n').filter(line => line)
  }

  async function readFileAsXML(filePath: string | undefined) {
    log.withField('filePath', filePath).verbose('Reading file as XML')

    const content = await readFile(filePath)
    return `<file_content file_path="${filePath}">\n${content}\n</file_contents>\n`
  }

  async function fileExists(filePath: string) {
    log.withField('filePath', filePath).verbose('Checking if file exists')

    return await exists(join(await getWorkingDirectory(), filePath))
  }

  async function writeFile(filePath: string, contents: string) {
    log.withField('filePath', filePath).verbose('Writing file')

    const fullPath = join(await getWorkingDirectory(), filePath)
    await fsWriteFile(fullPath, contents)
    log.withField('filePath', filePath).log('File written')
  }

  async function editFileContents(filePath: string, descriptionOfChanges: string) {
    log.withField('filePath', filePath).verbose('Editing file contents')

    let contents = await readFile(filePath)
    // Assuming `processText` is some function that modifies the text based on the description
    contents = contents.replace(/some pattern/, descriptionOfChanges)
    await writeFile(filePath, contents)
  }

  async function getFileSystemTree(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = './'

    log.withField('dirPath', dirPath).verbose('Getting file system tree')

    const files = await listFilesRecursively(dirPath)
    return files.join('\n')
  }

  return {
    getWorkingDirectory,
    setWorkingDirectory,
    readFile,
    listFilesInDirectory,
    getFileContentsRecursively,
    listFilesRecursively,
    searchFilesMatchingContents,
    readFileAsXML,
    fileExists,
    writeFile,
    editFileContents,
    getFileSystemTree,
  }
}
