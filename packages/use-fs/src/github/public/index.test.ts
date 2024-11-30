import { invoke } from 'neuri/test'
import { describe, expect, it } from 'vitest'
import { GitHubPublicFileSystem } from '.'

describe('use-fs/github/public', async () => {
  it('should list tree of files', async () => {
    const { listFilesInDirectory } = await GitHubPublicFileSystem()

    const files = await invoke(listFilesInDirectory, { repository: 'lingticio/neuri-js', directory: '/', branch: 'main' })
    expect(files.children).toBeDefined()
    expect(files.children?.length).toBeGreaterThan(0)

    const foundReadmeFile = files.children?.find(file => file.basename === 'README.md')
    expect(foundReadmeFile).toBeDefined()
  })

  it('should read file', async () => {
    const { readFile } = await GitHubPublicFileSystem()

    const file = await invoke(readFile, { repository: 'lingticio/neuri-js', filePath: '/README.md', branch: 'main' })
    expect(file).toBeDefined()
    expect(file).toBeDefined()
    expect(typeof file).toBe('string')
    expect((file as string).length).toBeGreaterThan(0)
  })
})
