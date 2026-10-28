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
