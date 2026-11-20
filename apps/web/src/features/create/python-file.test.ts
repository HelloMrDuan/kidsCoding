// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readPythonFile } from './python-file'

describe('import a Python file', () => {
  it('reads UTF-8 source, strips the BOM, and handles Windows line endings', async () => {
    await expect(readPythonFile(new File(['\ufeffprint("你好")\r\n'], '作品.PY')))
      .resolves.toEqual({ name: '作品', source: 'print("你好")\n' })
  })

  it('rejects a wrong extension, binary bytes, and oversize files', async () => {
    await expect(readPythonFile(new File(['a'], 'code.txt'))).rejects.toThrow('.py')
    await expect(readPythonFile(new File([new Uint8Array([0xff])], 'code.py'))).rejects.toThrow('UTF-8')
    await expect(readPythonFile(new File(['字'.repeat(50000)], 'large.py'))).rejects.toThrow('128 KB')
  })
})
