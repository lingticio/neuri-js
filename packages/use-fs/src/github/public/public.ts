import type { ReadFile } from '../../common'
import type { BaseResponse, GitHubDirectory, GitHubEntryNode, Tree, TreeItem } from './types'

import { defu } from 'defu'
import { FetchError, ofetch } from 'ofetch'

interface ReadDirOptions {
  branch: string
  noAncestors: boolean
  headers: Record<string, string>
  strict: boolean
}

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

export async function readDir(
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

export async function readFileContent<R = any>(cwd: string, path: string, options: Partial<ReadFileOptions> = { branch: 'main', headers: {} }): Promise<ReadFile> {
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
