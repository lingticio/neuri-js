import { defineToolFunction, toolFunction } from 'neuri/openai'
import { object, string } from 'zod'
import { readDir, readFileContent } from './public'

export {
  readDir,
  readFileContent,
}

export async function GitHubPublicFileSystem(options: { headers: Record<string, string> } = { headers: {} }) {
  async function listFilesInDirectory() {
    return defineToolFunction(
      await toolFunction('listFilesRecursively', 'List files recursively', object({
        repository: string().min(1).describe('The repository to list files from, e.g. "lingticio/neuri-js", or "vuejs/core", "golang/go", etc.'),
        branch: string().optional().default('main').describe('The branch to list files from, e.g. "main", "master", "develop", etc.'),
        directory: string().optional().default('/').describe('The directory to list files from, e.g. "/", "/src", "/docs", "packages", etc.'),
      })),
      async ({ parameters: { branch, directory, repository } }) => {
        return await readDir(repository, directory, { branch, headers: options.headers })
      },
    )
  }

  async function readFile() {
    return defineToolFunction(
      await toolFunction('readFile', 'Read file', object({
        repository: string().min(1).describe('The repository to read file from, e.g. "lingticio/neuri-js", or "vuejs/core", "golang/go", etc.'),
        branch: string().optional().default('main').describe('The branch to read file from, e.g. "main", "master", "develop", etc.'),
        filePath: string().describe('The file path to read, e.g. "/README.md", "/src/index.js", "/docs/README.md", etc.'),
      })),
      async ({ parameters: { repository, filePath, branch } }): Promise<string | Record<string, any> | Blob> => {
        const file = await readFileContent(repository, filePath, { branch, headers: options.headers })
        if (file.textContent) {
          return file.textContent
        }
        else if (file.jsonContent) {
          return file.jsonContent
        }
        else if (file.blobContent) {
          return `This file is a binary file, and cannot be displayed. The size of the file is ${file.blobContent.size} bytes.`
        }

        return `This file contains unknown content.`
      },
    )
  }

  return {
    listFilesInDirectory: await listFilesInDirectory(),
    readFile: await readFile(),
  }
}
