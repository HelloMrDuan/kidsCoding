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
