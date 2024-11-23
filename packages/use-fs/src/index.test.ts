import { readFile as fsReadFile, writeFile as fsWriteFile, mkdir, rmdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Format, LogLevel, setGlobalFormat, setGlobalLogLevel } from '@guiiai/logg'
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
    const { functions: { getWorkingDirectory } } = FileSystem({ basePath: testDir })

    const cwd = await getWorkingDirectory().call({ parameters: [] })
    expect(cwd).toBe(testDir)
  })

  it('should set a new working directory', async () => {
    const {
      functions: {
        getWorkingDirectory,
        setWorkingDirectory,
      },
    } = FileSystem({ basePath: testDir })

    const newDir = join(testDir, 'new-dir')
    await mkdir(newDir, { recursive: true })
    await setWorkingDirectory().call({ parameters: [newDir] })
    const cwd = await getWorkingDirectory().call({ parameters: [] })
    expect(cwd).toBe(newDir)
  })

  it('should throw an error if the directory does not exist', async () => {
    const {
      functions: {
        setWorkingDirectory,
      },
    } = FileSystem({ basePath: testDir })

    await expect(setWorkingDirectory().call({ parameters: ['nonexistent'] })).rejects.toThrow(
      `New working directory nonexistent does not exist`,
    )
  })

  it('should read a file', async () => {
    const {
      functions: {
        readFile,
      },
    } = FileSystem({ basePath: testDir })

    const filePath = join(testDir, 'readme.txt')
    await fsWriteFile(filePath, 'Hello, World!')
    const content = await readFile().call({ parameters: ['readme.txt'] })
    expect(content).toBe('Hello, World!')
  })

  it('should list files in a directory', async () => {
    const {
      functions: {
        listFilesInDirectory,
      },
    } = FileSystem({ basePath: testDir })

    const dirPath = join(testDir, 'list-test')
    await mkdir(dirPath, { recursive: true })
    await fsWriteFile(join(dirPath, 'file1.txt'), '')
    await fsWriteFile(join(dirPath, 'file2.txt'), '')
    const files = await listFilesInDirectory().call({ parameters: ['list-test'] })
    expect(files).toContain('file1.txt')
    expect(files).toContain('file2.txt')
  })

  it('should check if a file exists', async () => {
    const {
      functions: {
        fileExists,
      },
    } = FileSystem({ basePath: testDir })

    const filePath = join(testDir, 'existence.txt')
    await fsWriteFile(filePath, 'Exists')
    const exists = await fileExists().call({ parameters: ['existence.txt'] })
    expect(exists).toBe(true)
  })

  it('should write a file', async () => {
    const {
      functions: {
        writeFile,
      },
    } = FileSystem({ basePath: testDir })

    const filePath = 'write-test.txt'
    await writeFile().call({ parameters: [filePath, 'Written content'] })
    const content = await fsReadFile(join(testDir, filePath), 'utf-8')
    expect(content).toBe('Written content')
  })

  afterAll(async () => {
    await rmdir(testDir, { recursive: true })
  })
})
