import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {decodeSampleArchive, isG2Archive, isG2LessonKey} from './scratch-g2-draft'

describe('G2 local .sb3 draft guards', () => {
  it('accepts only sized ZIP buffers', () => {
    const ok = new Uint8Array(1024); ok[0] = 0x50; ok[1] = 0x4b
    expect(isG2Archive(ok.buffer)).toBe(true)
    expect(isG2Archive(new Uint8Array(1024).buffer)).toBe(false)
    expect(isG2Archive(new Uint8Array(10).buffer)).toBe(false)
    expect(isG2Archive('PK')).toBe(false)
  })
  it('decodes the checked-in base64 sample back to a real .sb3 zip and refuses junk', () => {
    const text = readFileSync(path.resolve(__dirname, '../../../public/scratch-samples/g2-u1-l01-park-friends.sb3.b64'), 'utf8')
    const archive = decodeSampleArchive(text)
    expect(new Uint8Array(archive)[0]).toBe(0x50)
    expect(new Uint8Array(archive)[1]).toBe(0x4b)
    expect(() => decodeSampleArchive('not base64 !!')).toThrow()
    expect(() => decodeSampleArchive(btoa('x'.repeat(400)))).toThrow()
  })
  it('keys drafts per G2 lesson only', () => {
    expect(isG2LessonKey('G2-U1-L01')).toBe(true)
    expect(isG2LessonKey('G3-U1-L02')).toBe(false)
    expect(isG2LessonKey('../G2-U1-L01')).toBe(false)
  })
})
