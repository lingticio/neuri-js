import type { Directory, EntryNode } from '../../common'

export interface BaseResponse<T> {
  payload: T
  title: string
}

export interface Tree {
  allShortcutsEnabled?: boolean
  path?: string
  repo?: Repo
  currentUser?: any
  refInfo?: RefInfo
  tree?: TreeList
  fileTree?: FileTree
  fileTreeProcessingTime?: number
  foldersToFetch?: unknown[]
  treeExpanded?: boolean
  symbolsExpanded?: boolean
  csrf_tokens?: CsrfTokens
}

export interface Repo {
  id: number
  defaultBranch: string
  name: string
  ownerLogin: string
  currentUserCanPush: boolean
  isFork: boolean
  isEmpty: boolean
  createdAt: string
  ownerAvatar: string
  public: boolean
  private: boolean
  isOrgOwned: boolean
}

export interface RefInfo {
  name?: string
  listCacheKey?: string
  canEdit?: boolean
  refType?: string
  currentOid?: string
}

export interface TreeList {
  items: TreeItem[]
  templateDirectorySuggestionUrl?: string
  readme?: string
  totalCount?: number
  showBranchInfobar?: boolean
}

export enum ContentType {
  File = 'file',
  Directory = 'directory',
}

export interface TreeItem {
  name: string
  path: string
  contentType: ContentType
}

export interface FileTree {
  [key: string]: {
    items: TreeItem[]
    totalCount: number
  }
}

export interface CsrfTokens {
  [key: string]: {
    post: string
  }
}

export interface GitHubDirectory extends Directory<Omit<Tree, 'tree' | 'fileTree'>> { }
export interface GitHubEntryNode extends EntryNode<Omit<Tree, 'tree' | 'fileTree'>> { }
