import { describe, expect, it } from 'vitest'
import { readDir, readFileContent } from '.'

describe('use-fs/github/public', async () => {
  it('should list tree of files', async () => {
    const files = await readDir('lingticio/neuri-js', '/', { branch: 'main' })
    expect(files.children).toBeDefined()
    expect(files.children?.length).toBeGreaterThan(0)

    const foundReadmeFile = files.children?.find(file => file.basename === 'README.md')
    expect(foundReadmeFile).toBeDefined()
  })

  it('should read file', async () => {
    const file = await readFileContent<string>('lingticio/neuri-js', '/README.md', { branch: 'main' })
    expect(file).toBeDefined()
    expect(file.textContent).toBeDefined()
    expect(file.textContent?.length).toBeGreaterThan(0)
  })
})
