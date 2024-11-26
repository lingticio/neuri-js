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
import { defineToolFunction, toolFunction } from 'neuri/openai'
import { object, string } from 'zod'

import { exists } from './utils'

export async function FileSystem(options?: { basePath?: string }) {
  const log = useLogg('useFileSystem').useGlobalConfig()

  const opts = defu(options, {
    basePath: cwd(),
  })

  let workingDirectory = opts.basePath

  async function _getWorkingDirectory() {
    return workingDirectory
  }

  async function _setWorkingDirectory(dir: string | undefined) {
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

    const relativePath = join(await _getWorkingDirectory(), relativeDir)
    if (await exists(relativePath)) {
      workingDirectory = relativePath
      log.withField('workingDirectory', workingDirectory).log('workingDirectory is now set')

      return
    }

    throw new Error(`New working directory ${dir} does not exist (current working directory ${workingDirectory}`)
  }

  async function getWorkingDirectory() {
    return defineToolFunction<void, string>(
      await toolFunction('getWorkingDirectory', 'Get the current working directory', object({})),
      _getWorkingDirectory,
    )
  }

  async function _readFile(filePath: string | undefined) {
    if (!filePath)
      throw new Error('filePath must be provided')

    log.withField('filePath', filePath).verbose('Reading file')
    const relativeFullPath = join(await _getWorkingDirectory(), filePath)

    if (await exists(relativeFullPath))
      return (await fsReadFile(relativeFullPath)).toString()
    else if (filePath.startsWith('/') && await exists(filePath))
      return (await fsReadFile(filePath)).toString()

    throw new Error(`File ${filePath} does not exist`)
  }

  async function _listFilesInDirectory(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = workingDirectory

    log.withField('dirPath', dirPath).verbose('Listing files in directory')

    const ig = ignore()
    const gitIgnorePath = join(await _getWorkingDirectory(), dirPath, '.gitignore')
    if (await exists(gitIgnorePath)) {
      let lines = await fsReadFile(gitIgnorePath, 'utf8').then(data => data.split('\n'))
      lines = lines.map(line => line.trim()).filter(line => line.length && !line.startsWith('#'))
      ig.add(lines)
    }

    const files: string[] = []
    const readdirPath = join(await _getWorkingDirectory(), dirPath)
    const dirList = await readdir(readdirPath, { withFileTypes: true })

    for (const item of dirList) {
      const direntName = item.isDirectory() ? `${item.name}/` : item.name
      const relativePath = relative(await _getWorkingDirectory(), join(await _getWorkingDirectory(), dirPath, direntName))
      if (!ig.ignores(relativePath))
        files.push(item.name)
    }

    return files
  }

  async function _getFileContentsRecursively(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = workingDirectory

    log.withField('dirPath', dirPath).verbose('Getting file contents recursively')

    const filenames = await _listFilesRecursively(dirPath)
    const fileContents: { filename: string, content: string }[] = []

    for (const filename of filenames) {
      const content = await _readFile(join(dirPath, filename))
      fileContents.push({ filename, content })
    }

    return fileContents
  }

  async function _listFilesRecursively(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = './'

    log.withField('dirPath', dirPath).verbose('Listing files recursively')

    const files: string[] = []
    const dirList = await readdir(join(await _getWorkingDirectory(), dirPath), { withFileTypes: true })

    for (const item of dirList) {
      const fullPath = join(dirPath, item.name)
      if (item.isDirectory())
        files.push(...await _listFilesRecursively(fullPath))
      else
        files.push(fullPath)
    }

    return files
  }

  async function _searchFilesMatchingContents(contentsRegex: string) {
    log.withField('contentsRegex', contentsRegex).verbose('Searching files matching contents')

    const command = `rg --count ${contentsRegex}`
    const { stdout, stderr, exitCode } = await execa(command, { cwd: await _getWorkingDirectory() })
    if (exitCode != null && exitCode > 0)
      throw new Error(stderr)

    return stdout.split('\n').filter(line => line)
  }

  async function _readFileAsXML(filePath: string | undefined) {
    log.withField('filePath', filePath).verbose('Reading file as XML')

    const content = await _readFile(filePath)
    return `<file_content file_path="${filePath}">\n${content}\n</file_contents>\n`
  }

  async function _fileExists(filePath: string) {
    log.withField('filePath', filePath).verbose('Checking if file exists')

    return await exists(join(await _getWorkingDirectory(), filePath))
  }

  async function _writeFile(filePath: string, contents: string) {
    log.withField('filePath', filePath).verbose('Writing file')

    const fullPath = join(await _getWorkingDirectory(), filePath)
    await fsWriteFile(fullPath, contents)
    log.withField('filePath', filePath).log('File written')
  }

  async function _editFileContents(filePath: string, descriptionOfChanges: string) {
    log.withField('filePath', filePath).verbose('Editing file contents')

    let contents = await _readFile(filePath)
    // Assuming `processText` is some function that modifies the text based on the description
    contents = contents.replace(/some pattern/, descriptionOfChanges)
    await _writeFile(filePath, contents)
  }

  async function _getFileSystemTree(dirPath: string | undefined) {
    if (dirPath == null)
      dirPath = './'

    log.withField('dirPath', dirPath).verbose('Getting file system tree')

    const files = await _listFilesRecursively(dirPath)
    return files.join('\n')
  }

  async function setWorkingDirectory() {
    return defineToolFunction(
      await toolFunction('setWorkingDirectory', 'Set the current working directory', object({ dir: string().describe('The new working directory') })),
      async ({ parameters: { dir } }) => {
        return await _setWorkingDirectory(dir)
      },
    )
  }

  async function readFile() {
    return defineToolFunction(
      await toolFunction('readFile', 'Read the contents of a file', object({ filePath: string().describe('The path to the file to read') })),
      async ({ parameters: { filePath } }) => {
        return await _readFile(filePath)
      },
    )
  }

  async function listFilesInDirectory() {
    return defineToolFunction(
      await toolFunction('listFilesInDirectory', 'List the files in a directory', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _listFilesInDirectory(dirPath)
      },
    )
  }

  async function getFileContentsRecursively() {
    return defineToolFunction(
      await toolFunction('getFileContentsRecursively', 'Get the contents of files recursively', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _getFileContentsRecursively(dirPath)
      },
    )
  }

  async function listFilesRecursively() {
    return defineToolFunction(
      await toolFunction('listFilesRecursively', 'List files recursively', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _listFilesRecursively(dirPath)
      },
    )
  }

  async function searchFilesMatchingContents() {
    return defineToolFunction(
      await toolFunction('searchFilesMatchingContents', 'Search files matching contents', object({ contentsRegex: string().describe('The regular expression to search for') })),
      async ({ parameters: { contentsRegex } }) => {
        return await _searchFilesMatchingContents(contentsRegex)
      },
    )
  }

  async function readFileAsXML() {
    return defineToolFunction(
      await toolFunction('readFileAsXML', 'Read a file as XML', object({ filePath: string().describe('The path to the file') })),
      async ({ parameters: { filePath } }) => {
        return await _readFileAsXML(filePath)
      },
    )
  }

  async function fileExists() {
    return defineToolFunction(
      await toolFunction('fileExists', 'Check if a file exists', object({ filePath: string().describe('The path to the file') })),
      async ({ parameters: { filePath } }) => {
        return await _fileExists(filePath)
      },
    )
  }

  async function writeFile() {
    return defineToolFunction(
      await toolFunction('writeFile', 'Write a file', object({ filePath: string().describe('The path to the file'), contents: string().describe('The contents of the file') })),
      async ({ parameters: { filePath, contents } }) => {
        return await _writeFile(filePath, contents)
      },
    )
  }

  async function editFileContents() {
    return defineToolFunction(
      await toolFunction('editFileContents', 'Edit the contents of a file', object({ filePath: string().describe('The path to the file'), descriptionOfChanges: string().describe('The description of the changes') })),
      async ({ parameters: { filePath, descriptionOfChanges } }) => {
        return await _editFileContents(filePath, descriptionOfChanges)
      },
    )
  }

  async function getFileSystemTree() {
    return defineToolFunction(
      await toolFunction('getFileSystemTree', 'Get the file system tree', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _getFileSystemTree(dirPath)
      },
    )
  }

  return {
    getWorkingDirectory: await getWorkingDirectory(),
    setWorkingDirectory: await setWorkingDirectory(),
    readFile: await readFile(),
    listFilesInDirectory: await listFilesInDirectory(),
    getFileContentsRecursively: await getFileContentsRecursively(),
    listFilesRecursively: await listFilesRecursively(),
    searchFilesMatchingContents: await searchFilesMatchingContents(),
    readFileAsXML: await readFileAsXML(),
    fileExists: await fileExists(),
    writeFile: await writeFile(),
    editFileContents: await editFileContents(),
    getFileSystemTree: await getFileSystemTree(),
  }
}
