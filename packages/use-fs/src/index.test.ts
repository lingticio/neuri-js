import { readFile as fsReadFile, writeFile as fsWriteFile, mkdir, rmdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel } from '@guiiai/logg'

import { newTestInvokeContext } from 'neuri/openai'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FileSystem } from '.'
import { exists } from './utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const testDir = join(__dirname, 'testdata')

setGlobalFormat(Format.Pretty)
setGlobalLogLevel(LogLevel.Debug)

describe('useFileSystem', () => {
  beforeAll(async () => {
    if (!(await exists(testDir)))
      await mkdir(testDir, { recursive: true })
  })

  it('should get the current working directory', async () => {
    const { getWorkingDirectory } = await FileSystem({ basePath: testDir })

    const cwd = await getWorkingDirectory.func(newTestInvokeContext())
    expect(cwd).toBe(testDir)
  })

  it('should set a new working directory', async () => {
    const {
      getWorkingDirectory,
      setWorkingDirectory,
    } = await FileSystem({ basePath: testDir })

    const newDir = join(testDir, 'new-dir')
    await mkdir(newDir, { recursive: true })
    await setWorkingDirectory.func(newTestInvokeContext({ dir: newDir }))
    const cwd = await getWorkingDirectory.func(newTestInvokeContext({} as unknown as void))
    expect(cwd).toBe(newDir)
  })

  it('should throw an error if the directory does not exist', async () => {
    const {
      setWorkingDirectory,
    } = await FileSystem({ basePath: testDir })

    await expect(setWorkingDirectory.func(newTestInvokeContext({ dir: 'nonexistent' }))).rejects.toThrow(
      `New working directory nonexistent does not exist`,
    )
  })

  it('should read a file', async () => {
    const {
      readFile,
    } = await FileSystem({ basePath: testDir })

    const filePath = join(testDir, 'readme.txt')
    await fsWriteFile(filePath, 'Hello, World!')
    const content = await readFile.func(newTestInvokeContext({ filePath: 'readme.txt' }))
    expect(content).toBe('Hello, World!')
  })

  it('should list files in a directory', async () => {
    const {
      listFilesInDirectory,
    } = await FileSystem({ basePath: testDir })

    const dirPath = join(testDir, 'list-test')
    await mkdir(dirPath, { recursive: true })
    await fsWriteFile(join(dirPath, 'file1.txt'), '')
    await fsWriteFile(join(dirPath, 'file2.txt'), '')
    const files = await listFilesInDirectory.func(newTestInvokeContext({ dirPath: 'list-test' } as { dirPath?: string }))
    expect(files).toContain('file1.txt')
    expect(files).toContain('file2.txt')
  })

  it('should check if a file exists', async () => {
    const {
      fileExists,
    } = await FileSystem({ basePath: testDir })

    const filePath = join(testDir, 'existence.txt')
    await fsWriteFile(filePath, 'Exists')
    const exists = await fileExists.func(newTestInvokeContext({ filePath: 'existence.txt' }))
    expect(exists).toBe(true)
  })

  it('should write a file', async () => {
    const {
      writeFile,
    } = await FileSystem({ basePath: testDir })

    const filePath = 'write-test.txt'
    await writeFile.func(newTestInvokeContext({ filePath, contents: 'Written content' }))
    const content = await fsReadFile(join(testDir, filePath), 'utf-8')
    expect(content).toBe('Written content')
  })

  afterAll(async () => {
    await rmdir(testDir, { recursive: true })
  })
})
