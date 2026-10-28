import {describe,expect,it} from 'vitest'
import {checkScratchUploadConflict,decodeScratchDraft,encodeScratchDraft,parseScratchCloudResponse} from './scratch-cloud-draft'

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
describe('Scratch upload conflict check',()=>{
  it('flags strictly newer cloud, not equal or older',()=>{
    expect(checkScratchUploadConflict('2026-10-28T10:00:00.000Z','2026-10-28T09:00:00.000Z')).toBe('newer')
    expect(checkScratchUploadConflict('2026-10-28T09:00:00.000Z','2026-10-28T09:00:00.000Z')).toBe('none')
    expect(checkScratchUploadConflict('2026-10-28T08:00:00.000Z','2026-10-28T09:00:00.000Z')).toBe('none')
  })
  it('treats missing cloud as no conflict',()=>{
    expect(checkScratchUploadConflict(null,'2026-10-28T09:00:00.000Z')).toBe('none')
    expect(checkScratchUploadConflict(undefined,'2026-10-28T09:00:00.000Z')).toBe('none')
  })
  it('treats unknown local age or unreadable cloud time as unknown-age',()=>{
    expect(checkScratchUploadConflict('2026-10-28T10:00:00.000Z',null)).toBe('unknown-age')
    expect(checkScratchUploadConflict('2026-10-28T10:00:00.000Z','not-a-date')).toBe('unknown-age')
    expect(checkScratchUploadConflict('not-a-date','2026-10-28T09:00:00.000Z')).toBe('unknown-age')
  })
})
