import {describe,expect,it} from 'vitest'
import {decodeScratchDraft,encodeScratchDraft,parseScratchCloudResponse} from './scratch-cloud-draft'

function zip(size=1024):ArrayBuffer{
  const bytes=new Uint8Array(size)
  bytes[0]=0x50;bytes[1]=0x4b
  return bytes.buffer
}
describe('Scratch private cloud transfer format',()=>{
  it('roundtrips genuine ZIP signature bytes without forging scores',()=>{
    const original=zip()
    const encoded=encodeScratchDraft(original)
    expect(typeof encoded).toBe('string')
    const restored=decodeScratchDraft(encoded)
    expect(restored).not.toBeNull()
    expect(new Uint8Array(restored!)).toEqual(new Uint8Array(original))
    expect(parseScratchCloudResponse({lessonId:'G3-U1-L02',archiveBase64:encoded,passed:true})).not.toBeNull()
  })
  it('rejects tampered response, wrong lesson and oversized payload',()=>{
    const encoded=encodeScratchDraft(zip())
    expect(parseScratchCloudResponse({lessonId:'G3-U1-L03',archiveBase64:encoded})).toBeNull()
    expect(decodeScratchDraft('garbage')).toBeNull()
    expect(encodeScratchDraft(new Uint8Array(10).buffer)).toBeNull()
    expect(decodeScratchDraft('A'.repeat(7_000_000))).toBeNull()
  })
})
