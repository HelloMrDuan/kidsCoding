import {describe,expect,it} from 'vitest'
import {isScratchArchive} from './scratch-local-draft'

describe('untrusted local Scratch .sb3 draft validation',()=>{
  it('accepts valid-sized ZIP signatures without calling them verified grades',()=>{
    const archive=new Uint8Array(1024)
    archive[0]=0x50;archive[1]=0x4b
    expect(isScratchArchive(archive.buffer)).toBe(true)
  })
  it('rejects malformed, empty, non-ZIP and oversized project buffers',()=>{
    expect(isScratchArchive(null)).toBe(false)
    expect(isScratchArchive(new Uint8Array(299).buffer)).toBe(false)
    expect(isScratchArchive(new Uint8Array(1024).buffer)).toBe(false)
    const huge=new Uint8Array(5_000_001)
    huge[0]=0x50;huge[1]=0x4b
    expect(isScratchArchive(huge.buffer)).toBe(false)
  })
})
