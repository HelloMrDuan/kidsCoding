import { describe, expect, it } from 'vitest'

import { validateSb3Buffer } from './sb3-import'

function buffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('validateSb3Buffer', () => {
  it('不是 zip 时给出中文提示，而不是 JSZip 的英文错误', async () => {
    await expect(validateSb3Buffer(buffer('not a zip'))).rejects.toThrow('不是有效的 .sb3 作品')
  })

  it('是 zip 但缺少 project.json 时保留具体原因', async () => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    zip.file('readme.txt', 'no project here')
    const bytes = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(validateSb3Buffer(bytes)).rejects.toThrow('缺少 project.json')
  })
})
