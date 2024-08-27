import {
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  readdir,
} from 'node:fs/promises'
import { cwd } from 'node:process'
import { join, relative } from 'node:path'
import { defu } from 'defu'
import { useLogg } from '@guiiai/logg'
import ignore from 'ignore'
import { execa } from 'execa'

import type { CallableComponent } from '../../callable'
import { defineCallable, defineCallableComponent } from '../../callable'
import { exists } from './utils'

export function FileSystem(options?: { basePath?: string }): CallableComponent {
  const log = useLogg('useFileSystem').useGlobalConfig()

  const opts = defu(options, {
    basePath: cwd(),
  })

  let workingDirectory = opts.basePath

  function getWorkingDirectory() {
    return defineCallable<[], string>().withReturn({
      name: 'workingDirectory',
      description: 'The current working directory',
      type: 'string',
      required: true,
    }).build(async () => {
      log.withField('workingDirectory', workingDirectory).log('Getting working directory')
      return workingDirectory
    })
  }

  function setWorkingDirectory() {
    return defineCallable<[string], void>()
      .withReturn({
        name: 'workingDirectory',
        description: 'The new working directory',
        type: 'void',
        required: true,
      })
      .build(async (dir) => {
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

        const relativePath = join(await getWorkingDirectory().call(), relativeDir)
        if (await exists(relativePath)) {
          workingDirectory = relativePath
          log.withField('workingDirectory', workingDirectory).log('workingDirectory is now set')

          return
        }

        throw new Error(`New working directory ${dir} does not exist (current working directory ${workingDirectory}`)
      })
  }

  function readFile() {
    return defineCallable<[string], string>()
      .withName('readFile')
      .withDescription('Read the contents of a file')
      .withParameter({
        name: 'filePath',
        description: 'The path to the file to read',
        type: 'string',
        required: true,
      })
      .withReturn({
        name: 'contents',
        description: 'The contents of the file',
        type: 'string',
        required: true,
      })
      .build(async (filePath) => {
        log.withField('filePath', filePath).verbose('Reading file')
        const relativeFullPath = join(await getWorkingDirectory().call(), filePath)

        if (await exists(relativeFullPath))
          return (await fsReadFile(relativeFullPath)).toString()
        else if (filePath.startsWith('/') && await exists(filePath))
          return (await fsReadFile(filePath)).toString()

        throw new Error(`File ${filePath} does not exist`)
      })
  }

  function listFilesInDirectory() {
    return defineCallable<[string], string[]>()
      .withName('listFilesInDirectory')
      .withDescription('List the files in a directory')
      .withParameter({
        name: 'dirPath',
        description: 'The path to the directory',
        type: 'string',
        required: false,
        defaultValue: '.',
      })
      .withReturn({
        name: 'files',
        description: 'The list of files in the directory',
        type: 'string[]',
        required: true,
      })
      .build(async (dirPath) => {
        if (dirPath == null)
          dirPath = '.'

        log.withField('dirPath', dirPath).verbose('Listing files in directory')

        const ig = ignore()
        const gitIgnorePath = join(await getWorkingDirectory().call(), dirPath, '.gitignore')
        if (await exists(gitIgnorePath)) {
          let lines = await fsReadFile(gitIgnorePath, 'utf8').then(data => data.split('\n'))
          lines = lines.map(line => line.trim()).filter(line => line.length && !line.startsWith('#'))
          ig.add(lines)
        }

        const files: string[] = []
        const readdirPath = join(await getWorkingDirectory().call(), dirPath)
        const dirList = await readdir(readdirPath, { withFileTypes: true })

        for (const item of dirList) {
          const direntName = item.isDirectory() ? `${item.name}/` : item.name
          const relativePath = relative(await getWorkingDirectory().call(), join(await getWorkingDirectory().call(), dirPath, direntName))
          if (!ig.ignores(relativePath))
            files.push(item.name)
        }

        return files
      })
  }

  function getFileContentsRecursively() {
    return defineCallable<[string], Map<string, string>>()
      .withName('getFileContentsRecursively')
      .withDescription('Get the contents of files recursively')
      .withParameter({
        name: 'dirPath',
        description: 'The path to the directory',
        type: 'string',
        required: false,
        defaultValue: '.',
      })
      .withReturn({
        name: 'fileContents',
        description: 'The contents of the files',
        type: 'Map<string, string>',
        required: true,
      })
      .build(async (dirPath) => {
        log.withField('dirPath', dirPath).verbose('Getting file contents recursively')

        const filenames = await listFilesRecursively().call(dirPath)
        const fileContents = new Map<string, string>()

        for (const filename of filenames) {
          const content = await readFile().call(join(dirPath, filename))
          fileContents.set(filename, content)
        }

        return fileContents
      })
  }

  function listFilesRecursively() {
    return defineCallable<[string], string[]>()
      .withName('listFilesRecursively')
      .withDescription('List files recursively')
      .withParameter({
        name: 'dirPath',
        description: 'The path to the directory',
        type: 'string',
        required: false,
        defaultValue: './',
      })
      .withReturn({
        name: 'files',
        description: 'The list of files',
        type: 'string[]',
        required: true,
      })
      .build(async (dirPath) => {
        if (dirPath == null)
          dirPath = './'

        log.withField('dirPath', dirPath).verbose('Listing files recursively')

        const files: string[] = []
        const dirList = await readdir(join(await getWorkingDirectory().call(), dirPath), { withFileTypes: true })

        for (const item of dirList) {
          const fullPath = join(dirPath, item.name)
          if (item.isDirectory())
            files.push(...await listFilesRecursively().call(fullPath))
          else
            files.push(fullPath)
        }

        return files
      })
  }

  function searchFilesMatchingContents() {
    return defineCallable<[string], string[]>()
      .withName('searchFilesMatchingContents')
      .withDescription('Search files matching contents')
      .withParameter({
        name: 'contentsRegex',
        description: 'The regular expression to search for',
        type: 'string',
        required: true,
      })
      .withReturn({
        name: 'files',
        description: 'The list of files',
        type: 'string[]',
        required: true,
      })
      .build(async (contentsRegex) => {
        log.withField('contentsRegex', contentsRegex).verbose('Searching files matching contents')

        const command = `rg --count ${contentsRegex}`
        const { stdout, stderr, exitCode } = await execa(command, { cwd: await getWorkingDirectory().call() })
        if (exitCode != null && exitCode > 0)
          throw new Error(stderr)

        return stdout.split('\n').filter(line => line)
      })
  }

  function readFileAsXML() {
    return defineCallable<[string], string>()
      .withName('readFileAsXML')
      .withDescription('Read a file as XML')
      .withParameter({
        name: 'filePath',
        description: 'The path to the file',
        type: 'string',
        required: true,
      })
      .build(async (filePath) => {
        log.withField('filePath', filePath).verbose('Reading file as XML')

        const content = await readFile().call(filePath)
        return `<file_content file_path="${filePath}">\n${content}\n</file_contents>\n`
      })
  }

  function fileExists() {
    return defineCallable<[string], boolean>()
      .withName('fileExists')
      .withDescription('Check if a file exists')
      .withParameter({
        name: 'filePath',
        description: 'The path to the file',
        type: 'string',
        required: true,
      })
      .withReturn({
        name: 'exists',
        description: 'Whether the file exists',
        type: 'boolean',
        required: true,
      })
      .build(async (filePath) => {
        log.withField('filePath', filePath).verbose('Checking if file exists')

        return await exists(join(await getWorkingDirectory().call(), filePath))
      })
  }

  function writeFile() {
    return defineCallable<[string, string], void>()
      .withName('writeFile')
      .withDescription('Write a file')
      .withParameter({
        name: 'filePath',
        description: 'The path to the file',
        type: 'string',
        required: true,
      })
      .withParameter({
        name: 'contents',
        description: 'The contents of the file',
        type: 'string',
        required: true,
      })
      .build(async (filePath, contents) => {
        log.withField('filePath', filePath).verbose('Writing file')

        const fullPath = join(await getWorkingDirectory().call(), filePath)
        await fsWriteFile(fullPath, contents)
        log.withField('filePath', filePath).log('File written')
      })
  }

  function editFileContents() {
    return defineCallable<[string, string], void>()
      .withName('editFileContents')
      .withDescription('Edit the contents of a file')
      .withParameter({
        name: 'filePath',
        description: 'The path to the file',
        type: 'string',
        required: true,
      })
      .withParameter({
        name: 'descriptionOfChanges',
        description: 'The description of the changes',
        type: 'string',
        required: true,
      })
      .withReturn({
        name: 'void',
        description: 'No return value',
        type: 'void',
        required: true,
      })
      .build(async (filePath, descriptionOfChanges) => {
        log.withField('filePath', filePath).verbose('Editing file contents')

        let contents = await readFile().call(filePath)
        // Assuming `processText` is some function that modifies the text based on the description
        contents = contents.replace(/some pattern/, descriptionOfChanges)
        await writeFile().call(filePath, contents)
      })
  }

  function getFileSystemTree() {
    return defineCallable<[string], string>()
      .withName('getFileSystemTree')
      .withDescription('Get the file system tree')
      .withParameter({
        name: 'dirPath',
        description: 'The path to the directory',
        type: 'string',
        required: false,
        defaultValue: './',
      })
      .withReturn({
        name: 'tree',
        description: 'The file system tree',
        type: 'string',
        required: true,
      })
      .build(async (dirPath) => {
        if (dirPath == null)
          dirPath = './'

        log.withField('dirPath', dirPath).verbose('Getting file system tree')

        const files = await listFilesRecursively().call(dirPath)
        return files.join('\n')
      })
  }

  return defineCallableComponent(
    'FileSystem',
    'A component for interacting with the file system',
    {
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
    },
  )
}
