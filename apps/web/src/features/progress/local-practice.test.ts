import { describe, expect, it } from 'vitest'
import { collectLocalPractices, parseLocalPractice, PRACTICE_STORAGE_PREFIX } from './local-practice'

describe('local Python practice portfolio is untrusted and defensive', () => {
  const key = 'P0-U1-L02'
  const record = JSON.stringify({source:'def introduce(name,hobby):\n    return name', passed:true, savedAt:'2026-10-10T10:00:00.000Z'})
  it('loads a valid supported lesson without claiming a verified result', () => {
    expect(parseLocalPractice(key, record)).toMatchObject({lessonId:key, passed:true})
  })
  it('rejects malformed JSON, unknown lessons, oversized source, and invalid time', () => {
    expect(parseLocalPractice(key,'{')).toBeNull()
    expect(parseLocalPractice('P0-U9-L09',record)).toBeNull()
    expect(parseLocalPractice(key, JSON.stringify({source:'x'.repeat(5001),savedAt:'2026-10-10'}))).toBeNull()
    expect(parseLocalPractice(key, JSON.stringify({source:'ok',savedAt:'broken'}))).toBeNull()
  })
  it('ignores corrupted entries and sorts valid drafts latest first', () => {
    const items = new Map<string,string>([
      [PRACTICE_STORAGE_PREFIX+key, record],
      [PRACTICE_STORAGE_PREFIX+'P0-U1-L03', JSON.stringify({source:'def weather_line(x,y): pass',passed:false,savedAt:'2026-10-10T11:00:00Z'})],
    ])
    const result = collectLocalPractices({getItem:k=>items.get(k)??null})
    expect(result.map(x=>x.lessonId)).toEqual(['P0-U1-L03', 'P0-U1-L02'])
  })
  it('accepts a capstone source draft without certifying any grade', () => {
    const raw=JSON.stringify({source:'def make_profile(a,b,c): pass',passed:true,savedAt:'2026-10-10T14:00:00Z'})
    expect(parseLocalPractice('P0-U1-L06',raw)).toMatchObject({lessonId:'P0-U1-L06',passed:true})
  })
  it('does not throw when browser storage is denied', () => {
    const fail = {getItem:():string|null=>{throw Error('privacy blocked')}}
    expect(collectLocalPractices(fail)).toEqual([])
  })
})
