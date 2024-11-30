import { defineToolFunction, toolFunction } from 'neuri/openai'
import { object, string } from 'zod'

import { fs } from './node'

export {
  fs,
}

export async function FileSystem(options?: { basePath?: string }) {
  const _fs = fs(options)

  async function getWorkingDirectory() {
    return defineToolFunction(
      await toolFunction('getWorkingDirectory', 'Get the current working directory', object({})),
      async () => {
        return await _fs.getWorkingDirectory()
      },
    )
  }

  async function setWorkingDirectory() {
    return defineToolFunction(
      await toolFunction('setWorkingDirectory', 'Set the current working directory', object({ dir: string().describe('The new working directory') })),
      async ({ parameters: { dir } }) => {
        return await _fs.setWorkingDirectory(dir)
      },
    )
  }

  async function readFile() {
    return defineToolFunction(
      await toolFunction('readFile', 'Read the contents of a file', object({ filePath: string().describe('The path to the file to read') })),
      async ({ parameters: { filePath } }) => {
        return await _fs.readFile(filePath)
      },
    )
  }

  async function listFilesInDirectory() {
    return defineToolFunction(
      await toolFunction('listFilesInDirectory', 'List the files in a directory', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _fs.listFilesInDirectory(dirPath)
      },
    )
  }

  async function getFileContentsRecursively() {
    return defineToolFunction(
      await toolFunction('getFileContentsRecursively', 'Get the contents of files recursively', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _fs.getFileContentsRecursively(dirPath)
      },
    )
  }

  async function listFilesRecursively() {
    return defineToolFunction(
      await toolFunction('listFilesRecursively', 'List files recursively', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _fs.listFilesRecursively(dirPath)
      },
    )
  }

  async function searchFilesMatchingContents() {
    return defineToolFunction(
      await toolFunction('searchFilesMatchingContents', 'Search files matching contents', object({ contentsRegex: string().describe('The regular expression to search for') })),
      async ({ parameters: { contentsRegex } }) => {
        return await _fs.searchFilesMatchingContents(contentsRegex)
      },
    )
  }

  async function readFileAsXML() {
    return defineToolFunction(
      await toolFunction('readFileAsXML', 'Read a file as XML', object({ filePath: string().describe('The path to the file') })),
      async ({ parameters: { filePath } }) => {
        return await _fs.readFileAsXML(filePath)
      },
    )
  }

  async function fileExists() {
    return defineToolFunction(
      await toolFunction('fileExists', 'Check if a file exists', object({ filePath: string().describe('The path to the file') })),
      async ({ parameters: { filePath } }) => {
        return await _fs.fileExists(filePath)
      },
    )
  }

  async function writeFile() {
    return defineToolFunction(
      await toolFunction('writeFile', 'Write a file', object({ filePath: string().describe('The path to the file'), contents: string().describe('The contents of the file') })),
      async ({ parameters: { filePath, contents } }) => {
        return await _fs.writeFile(filePath, contents)
      },
    )
  }

  async function editFileContents() {
    return defineToolFunction(
      await toolFunction('editFileContents', 'Edit the contents of a file', object({ filePath: string().describe('The path to the file'), descriptionOfChanges: string().describe('The description of the changes') })),
      async ({ parameters: { filePath, descriptionOfChanges } }) => {
        return await _fs.editFileContents(filePath, descriptionOfChanges)
      },
    )
  }

  async function getFileSystemTree() {
    return defineToolFunction(
      await toolFunction('getFileSystemTree', 'Get the file system tree', object({ dirPath: string().optional().describe('The path to the directory') })),
      async ({ parameters: { dirPath } }) => {
        return await _fs.getFileSystemTree(dirPath)
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
