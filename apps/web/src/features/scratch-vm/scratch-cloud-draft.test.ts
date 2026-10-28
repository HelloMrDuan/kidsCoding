import {describe,expect,it} from 'vitest'
import {checkScratchUploadConflict,decodeScratchDraft,encodeScratchDraft,parseScratchCloudResponse,inspectScratchArchive,MAX_SCRATCH_DECOMPRESSED_BYTES} from './scratch-cloud-draft'

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

// CLOUD-104: the PK header alone is not a project. This builder writes real
// central directories (stored entries unless a method is overridden) so the
// parser is tested against bytes a ZIP reader would actually accept.
function buildZip(entries:{name:string;data:Uint8Array;method?:number;declaredSize?:number}[]):Uint8Array{
  const encoder=new TextEncoder()
  const parts:Uint8Array[]=[]
  const centrals:Uint8Array[]=[]
  let offset=0
  for(const entry of entries){
    const name=encoder.encode(entry.name)
    const method=entry.method??0
    const compSize=entry.data.length
    const uncompSize=entry.declaredSize??entry.data.length
    const local=new DataView(new ArrayBuffer(30))
    local.setUint32(0,0x04034b50,true)
    local.setUint16(4,20,true)
    local.setUint16(6,0,true)
    local.setUint16(8,method,true)
    local.setUint16(10,0,true)
    local.setUint16(12,0,true)
    local.setUint32(14,0,true)
    local.setUint32(18,compSize,true)
    local.setUint32(22,uncompSize,true)
    local.setUint16(26,name.length,true)
    local.setUint16(28,0,true)
    parts.push(new Uint8Array(local.buffer),name,entry.data)
    const central=new DataView(new ArrayBuffer(46))
    central.setUint32(0,0x02014b50,true)
    central.setUint16(4,20,true)
    central.setUint16(6,20,true)
    central.setUint16(8,0,true)
    central.setUint16(10,method,true)
    central.setUint16(12,0,true)
    central.setUint16(14,0,true)
    central.setUint32(16,0,true)
    central.setUint32(20,compSize,true)
    central.setUint32(24,uncompSize,true)
    central.setUint16(28,name.length,true)
    central.setUint16(30,0,true)
    central.setUint16(32,0,true)
    central.setUint16(34,0,true)
    central.setUint16(36,0,true)
    central.setUint32(38,0,true)
    central.setUint32(42,offset,true)
    centrals.push(new Uint8Array(central.buffer),name)
    offset+=30+name.length+entry.data.length
  }
  const cdStart=offset
  let cdSize=0
  for(const c of centrals)cdSize+=c.length
  const eocd=new DataView(new ArrayBuffer(22))
  eocd.setUint32(0,0x06054b50,true)
  eocd.setUint16(4,0,true)
  eocd.setUint16(6,0,true)
  eocd.setUint16(8,entries.length,true)
  eocd.setUint16(10,entries.length,true)
  eocd.setUint32(12,cdSize,true)
  eocd.setUint32(16,cdStart,true)
  eocd.setUint16(20,0,true)
  const out=new Uint8Array(offset+cdSize+22)
  let p=0
  for(const part of [...parts,...centrals,new Uint8Array(eocd.buffer)]){out.set(part,p);p+=part.length}
  return out
}

function projectJson():Uint8Array{
  return new TextEncoder().encode(JSON.stringify({targets:[],meta:{semver:'3.0.0'}}))
}

describe('Scratch archive structure inspection',()=>{
  it('accepts a real central directory with project.json',()=>{
    const zip=buildZip([
      {name:'project.json',data:projectJson()},
      {name:'0.png',data:new Uint8Array([1,2,3])},
    ])
    expect(inspectScratchArchive(zip)).toEqual({ok:true,entryCount:2,totalUncompressedBytes:projectJson().length+3})
  })
  it('rejects a PK header without a central directory',()=>{
    const fake=new Uint8Array(1024)
    fake[0]=0x50;fake[1]=0x4b
    expect(inspectScratchArchive(fake)).toEqual({ok:false,reason:'not-a-zip'})
  })
  it('rejects a zip without project.json',()=>{
    const zip=buildZip([{name:'other.txt',data:new TextEncoder().encode('hi')}])
    expect(inspectScratchArchive(zip)).toEqual({ok:false,reason:'no-project'})
  })
  it('rejects an unsupported compression method',()=>{
    const zip=buildZip([{name:'project.json',data:projectJson(),method:99}])
    expect(inspectScratchArchive(zip)).toEqual({ok:false,reason:'unsupported-method'})
  })
  it('rejects a declared size above the decompressed cap without inflating',()=>{
    const zip=buildZip([{name:'project.json',data:projectJson(),declaredSize:MAX_SCRATCH_DECOMPRESSED_BYTES+1}])
    expect(inspectScratchArchive(zip)).toEqual({ok:false,reason:'too-large'})
  })
  it('rejects a truncated central directory',()=>{
    const zip=buildZip([{name:'project.json',data:projectJson()}])
    const corrupted=new Uint8Array(zip)
    const eocd=zip.length-22
    const cdOffset=corrupted[eocd+16]|(corrupted[eocd+17]<<8)|(corrupted[eocd+18]<<16)|(corrupted[eocd+19]<<24)
    corrupted[cdOffset]=0x00
    expect(inspectScratchArchive(corrupted)).toEqual({ok:false,reason:'truncated'})
  })
  it('rejects a ZIP64-style directory',()=>{
    const zip=buildZip([{name:'project.json',data:projectJson()}])
    const patched=new Uint8Array(zip)
    const eocd=patched.length-22
    patched[eocd+10]=0xff;patched[eocd+11]=0xff
    expect(inspectScratchArchive(patched)).toEqual({ok:false,reason:'unsupported-method'})
  })
})
