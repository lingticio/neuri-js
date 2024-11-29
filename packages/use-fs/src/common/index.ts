export interface EntryNode<M = Record<string, any>> {
  basename: string
  path: string
  absolutePath: string
  isDirectory: () => boolean
  isFile: () => boolean
  directory?: Directory<M>
}

export interface Directory<M = Record<string, any>> {
  children?: EntryNode[]
  metadata?: M
}

export interface ReadFile {
  raw?: unknown
  textContent?: string
  jsonContent?: Record<string, any>
  blobContent?: Blob
}
