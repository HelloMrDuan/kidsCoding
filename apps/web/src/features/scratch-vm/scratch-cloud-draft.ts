import {SCRATCH_DRAFT_LESSON_ID, isScratchArchive} from './scratch-local-draft'

export const MAX_SCRATCH_ARCHIVE_BYTES=5_000_000
export const MAX_SCRATCH_BASE64_LENGTH=Math.ceil(MAX_SCRATCH_ARCHIVE_BYTES/3)*4
export const MAX_SCRATCH_REQUEST_BYTES=MAX_SCRATCH_BASE64_LENGTH+2048

export function encodeScratchDraft(archive:ArrayBuffer):string | null {
  if(!isScratchArchive(archive)) return null
  const bytes=new Uint8Array(archive)
  // Small chunks avoid stack argument limits; never upload a verified score.
  let binary=''
  for(let i=0;i<bytes.length;i+=8192){
    binary+=String.fromCharCode(...bytes.subarray(i,i+8192))
  }
  return btoa(binary)
}

export function decodeScratchDraft(value:unknown):ArrayBuffer | null {
  if(typeof value!=='string'||value.length>MAX_SCRATCH_BASE64_LENGTH||value.length<400) return null
  try{
    const binary=atob(value)
    const bytes=new Uint8Array(binary.length)
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)
    return isScratchArchive(bytes.buffer)?bytes.buffer:null
  }catch{return null}
}

export function parseScratchCloudResponse(value:unknown):ArrayBuffer|null {
  if(!value||typeof value!=='object'||Array.isArray(value))return null
  const row=value as Record<string,unknown>
  if(row.lessonId!==SCRATCH_DRAFT_LESSON_ID)return null
  return decodeScratchDraft(row.archiveBase64)
}

export type ScratchUploadConflict='none'|'newer'|'unknown-age'

/**
 * CLOUD-103: Scratch save must never silently overwrite a cloud draft that is
 * newer than the local one. Mirrors the Python portfolio guard
 * (findUploadConflicts): a conflict exists exactly when the cloud copy is
 * strictly newer than local. Equal timestamps are not conflicts. A missing or
 * unparsable timestamp on either side cannot prove local-is-newer, so it is
 * surfaced as unknown-age instead of silently uploading. No cloud draft at
 * all means no conflict.
 */
export function checkScratchUploadConflict(
  cloudUpdatedAt:string|null|undefined,
  localSavedAt:string|null|undefined,
):ScratchUploadConflict{
  if(!cloudUpdatedAt)return 'none'
  if(!Number.isFinite(Date.parse(cloudUpdatedAt)))return 'unknown-age'
  if(!localSavedAt||!Number.isFinite(Date.parse(localSavedAt)))return 'unknown-age'
  return Date.parse(cloudUpdatedAt)>Date.parse(localSavedAt)?'newer':'none'
}

/**
 * CLOUD-104: a Scratch .sb3 is a ZIP, and the PK header alone does not prove
 * it. A file with a PK header but no central directory is not a project, and
 * a small compressed file can declare gigabytes of uncompressed content (zip
 * bomb) that the VM would inflate inside the browser tab. This parser reads
 * only the End of Central Directory and the central directory itself: no
 * inflate, no new dependency, and it works on both the route (Buffer is a
 * Uint8Array) and the trial (ArrayBuffer). Declared sizes are what a bomb
 * must lie about, so summing them catches it; a corrupt file whose declared
 * sizes lie fails later at VM load with the existing observable error.
 * The 50 MB cap is 10x the 5 MB compressed cap; the real course sample
 * declares 6,764 bytes, so legitimate work has three orders of magnitude
 * of headroom.
 */
export const MAX_SCRATCH_DECOMPRESSED_BYTES=50_000_000

export type ScratchArchiveInspection=
  |{ok:true;entryCount:number;totalUncompressedBytes:number}
  |{ok:false;reason:'not-a-zip'|'truncated'|'no-project'|'unsupported-method'|'too-large'}

function u16le(bytes:Uint8Array,offset:number):number{
  return bytes[offset]|(bytes[offset+1]<<8)
}

function u32le(bytes:Uint8Array,offset:number):number{
  return (bytes[offset]|(bytes[offset+1]<<8)|(bytes[offset+2]<<16)|(bytes[offset+3]<<24))>>>0
}

export function inspectScratchArchive(bytes:Uint8Array):ScratchArchiveInspection{
  if(bytes.length<22)return{ok:false,reason:'not-a-zip'}
  // Find the End of Central Directory, scanning backwards. The comment
  // length must fill exactly to EOF, so a PK signature embedded in file
  // content cannot fake a directory.
  let eocd=-1
  const floor=Math.max(0,bytes.length-22-65535)
  for(let pos=bytes.length-22;pos>=floor;pos--){
    if(bytes[pos]===0x50&&bytes[pos+1]===0x4b&&bytes[pos+2]===0x05&&bytes[pos+3]===0x06){
      if(u16le(bytes,pos+20)===bytes.length-(pos+22)){eocd=pos;break}
    }
  }
  if(eocd<0)return{ok:false,reason:'not-a-zip'}
  const disk=u16le(bytes,eocd+4),cdDisk=u16le(bytes,eocd+6)
  const entriesThisDisk=u16le(bytes,eocd+8),totalEntries=u16le(bytes,eocd+10)
  const cdSize=u32le(bytes,eocd+12),cdOffset=u32le(bytes,eocd+16)
  if(disk!==0||cdDisk!==0||entriesThisDisk!==totalEntries)return{ok:false,reason:'unsupported-method'}
  if(totalEntries===0xffff||cdSize===0xffffffff||cdOffset===0xffffffff)return{ok:false,reason:'unsupported-method'}
  if(cdOffset+cdSize>bytes.length)return{ok:false,reason:'truncated'}
  let pos=cdOffset,total=0,hasProject=false
  const decoder=new TextDecoder()
  for(let i=0;i<totalEntries;i++){
    if(pos+46>bytes.length)return{ok:false,reason:'truncated'}
    if(!(bytes[pos]===0x50&&bytes[pos+1]===0x4b&&bytes[pos+2]===0x01&&bytes[pos+3]===0x02))return{ok:false,reason:'truncated'}
    const method=u16le(bytes,pos+10)
    const compSize=u32le(bytes,pos+20),uncompSize=u32le(bytes,pos+24)
    const nameLen=u16le(bytes,pos+28),extraLen=u16le(bytes,pos+30),commentLen=u16le(bytes,pos+32)
    if(compSize===0xffffffff||uncompSize===0xffffffff)return{ok:false,reason:'unsupported-method'}
    if(method!==0&&method!==8)return{ok:false,reason:'unsupported-method'}
    const end=pos+46+nameLen+extraLen+commentLen
    if(end>bytes.length)return{ok:false,reason:'truncated'}
    const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen))
    if(name==='project.json')hasProject=true
    total+=uncompSize
    if(total>MAX_SCRATCH_DECOMPRESSED_BYTES)return{ok:false,reason:'too-large'}
    pos=end
  }
  if(totalEntries===0||!hasProject)return{ok:false,reason:'no-project'}
  return{ok:true,entryCount:totalEntries,totalUncompressedBytes:total}
}
