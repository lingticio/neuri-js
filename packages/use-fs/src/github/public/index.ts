import type { Directory, EntryNode, ReadFile } from '../../common'
import type { BaseResponse, Tree, TreeItem } from './types'

import { defu } from 'defu'
import { defineToolFunction, toolFunction } from 'neuri/openai'
import { FetchError, ofetch } from 'ofetch'
import { object, string } from 'zod'

interface ReadDirOptions {
  branch: string
  noAncestors: boolean
  headers: Record<string, string>
  strict: boolean
}

export interface GitHubDirectory extends Directory<Omit<Tree, 'tree' | 'fileTree'>> { }
export interface GitHubEntryNode extends EntryNode<Omit<Tree, 'tree' | 'fileTree'>> { }

function newGitHubEntryNodeFromTreeItem(treeItem: TreeItem, dir: string): GitHubEntryNode {
  const node: GitHubEntryNode = {
    basename: treeItem.name,
    path: treeItem.path,
    isDirectory: () => treeItem.contentType === 'directory',
    isFile: () => treeItem.contentType === 'file',
    absolutePath: `${dir}/${treeItem.path}`,
  }
  if (node.isDirectory()) {
    node.directory = {
      children: [],
    }
  }

  return node
}

function newGitHubDirectoryFromTree(tree: Tree, dir: string): GitHubDirectory {
  const directory: GitHubDirectory = {
    children: tree.tree?.items.map(treeItem => newGitHubEntryNodeFromTreeItem(treeItem, dir)),
  }

  delete tree.tree
  delete tree.fileTree

  directory.metadata = tree
  return directory
}

async function readDir(
  cwd: string,
  dir: string,
  options: Partial<ReadDirOptions> = {
    branch: 'main',
    noAncestors: true,
    headers: {},
    strict: false,
  },
): Promise<GitHubDirectory> {
  const opts = defu<ReadDirOptions, Partial<ReadDirOptions>[]>(options, {
    branch: 'main',
    noAncestors: true,
    headers: {},
    strict: false,
  })

  try {
    const base = `https://github.com/${cwd}/tree/${opts.branch || 'main'}`

    const files = await ofetch<BaseResponse<Tree>>(
      `${base}${dir}${opts.noAncestors ? '?noancestors=1' : ''}`,
      {
        headers: Object.assign({
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
        }, opts.headers),
      },
    )

    return newGitHubDirectoryFromTree(files.payload, base)
  }
  catch (err) {
    if (err instanceof FetchError) {
      if (err.statusCode === 404) {
        if (opts.strict) {
          throw new Error(`Directory not found: ${dir}`)
        }
        else {
          return {
            children: [],
          }
        }
      }
    }

    throw err
  }
}

interface ReadFileOptions {
  branch: string
  headers: Record<string, string>
}

async function readFileContent<R = any>(cwd: string, path: string, options: Partial<ReadFileOptions> = { branch: 'main', headers: {} }): Promise<ReadFile> {
  const opts = defu<ReadFileOptions, Partial<ReadFileOptions>[]>(options, {
    branch: 'main',
    headers: {},
  })

  try {
    const file = await ofetch<R>(`https://raw.githubusercontent.com/${cwd}/${opts.branch}${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      },
    })

    const readFile: ReadFile = {
      raw: file,
    }
    if (typeof file === 'string') {
      readFile.textContent = file
    }
    else if (typeof file === 'object') {
      readFile.jsonContent = file as unknown as Record<string, any>
    }
    else if (file instanceof Blob) {
      readFile.blobContent = file
    }

    return readFile
  }
  catch (err) {
    if (err instanceof FetchError) {
      throw new TypeError(`File not found: ${path}`)
    }

    throw err
  }
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
        const result = await readDir(repository, directory, { branch, headers: options.headers })
        return JSON.stringify(result)
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
      async ({ parameters: { repository, filePath, branch } }) => {
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
