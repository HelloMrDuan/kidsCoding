import {Buffer} from 'node:buffer'
import {NextResponse} from 'next/server'
import {hasSupabaseEnv} from '@/lib/env'
import {createServerSupabaseClient} from '@/lib/supabase/server'
import {SCRATCH_DRAFT_LESSON_ID} from '@/features/scratch-vm/scratch-local-draft'
import {MAX_SCRATCH_ARCHIVE_BYTES,MAX_SCRATCH_BASE64_LENGTH,MAX_SCRATCH_REQUEST_BYTES,inspectScratchArchive} from '@/features/scratch-vm/scratch-cloud-draft'

export const runtime='nodejs'
const HEADERS={'Cache-Control':'private, no-store'}

function validBase64(raw:unknown):raw is string {
  if(typeof raw!=='string'||raw.length<400||raw.length>MAX_SCRATCH_BASE64_LENGTH||
    raw.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(raw))return false
  const bytes=Buffer.from(raw,'base64')
  return bytes.length>=300&&bytes.length<=MAX_SCRATCH_ARCHIVE_BYTES&&
    bytes[0]===0x50&&bytes[1]===0x4b&&bytes.toString('base64')===raw&&
    // CLOUD-104: the PK header alone is not a project. A file without a
    // central directory, or one declaring more than the decompressed cap,
    // is rejected here (PUT 400) and never served back (GET 503) instead
    // of failing later, silently or otherwise, inside the VM.
    inspectScratchArchive(bytes).ok
}

async function readLimitedBody(request:Request):Promise<string|null> {
  const reader=request.body?.getReader()
  if(!reader)return null
  let total=0
  const chunks:Uint8Array[]=[]
  while(true){
    const {value,done}=await reader.read()
    if(done)break
    total+=value.byteLength
    if(total>MAX_SCRATCH_REQUEST_BYTES){
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const result=new Uint8Array(total)
  let offset=0
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength}
  return new TextDecoder().decode(result)
}

async function authenticatedClient(){
  if(!hasSupabaseEnv())return null
  const client=await createServerSupabaseClient()
  const {data:{user},error}=await client.auth.getUser()
  return {client,user:error?null:user}
}

export async function GET() {
  if(!hasSupabaseEnv())return NextResponse.json({error:'cloud-sync-not-configured'},{status:503,headers:HEADERS})
  const context=await authenticatedClient()
  if(!context?.user)return NextResponse.json({error:'authentication-required'},{status:401,headers:HEADERS})
  const {data,error}=await context.client.from('scratch_practice_drafts')
    .select('lesson_id,archive_base64,updated_at')
    .eq('user_id',context.user.id).eq('lesson_id',SCRATCH_DRAFT_LESSON_ID).maybeSingle()
  if(error)return NextResponse.json({error:'cloud-draft-storage-unavailable'},{status:503,headers:HEADERS})
  if(!data)return NextResponse.json({draft:null},{headers:HEADERS})
  if(!validBase64(data.archive_base64))return NextResponse.json({error:'invalid-saved-project'},{status:503,headers:HEADERS})
  return NextResponse.json({draft:{lessonId:data.lesson_id,archiveBase64:data.archive_base64,updatedAt:data.updated_at}},
    {headers:HEADERS})
}

export async function PUT(request:Request) {
  if(!hasSupabaseEnv())return NextResponse.json({error:'cloud-sync-not-configured'},{status:503,headers:HEADERS})
  if(request.headers.get('sec-fetch-site')==='cross-site'||
    (request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin))
    return NextResponse.json({error:'cross-origin-request'},{status:403,headers:HEADERS})
  const context=await authenticatedClient()
  if(!context?.user)return NextResponse.json({error:'authentication-required'},{status:401,headers:HEADERS})
  if(Number(request.headers.get('content-length')??'0')>MAX_SCRATCH_REQUEST_BYTES)
    return NextResponse.json({error:'request-too-large'},{status:413,headers:HEADERS})
  let body:unknown
  try {
    const json=await readLimitedBody(request)
    if(json===null)return NextResponse.json({error:'request-too-large'},{status:413,headers:HEADERS})
    body=JSON.parse(json)
  }catch{return NextResponse.json({error:'invalid-json'},{status:400,headers:HEADERS})}
  if(!body||typeof body!=='object'||Array.isArray(body))
    return NextResponse.json({error:'invalid-project'},{status:400,headers:HEADERS})
  const raw=body as Record<string,unknown>
  if(raw.lessonId!==SCRATCH_DRAFT_LESSON_ID||!validBase64(raw.archiveBase64))
    return NextResponse.json({error:'invalid-project'},{status:400,headers:HEADERS})
  const updatedAt=new Date().toISOString()
  const {error}=await context.client.from('scratch_practice_drafts').upsert({
    user_id:context.user.id,lesson_id:SCRATCH_DRAFT_LESSON_ID,
    archive_base64:raw.archiveBase64,updated_at:updatedAt,
  },{onConflict:'user_id,lesson_id'})
  if(error)return NextResponse.json({error:'cloud-draft-storage-unavailable'},{status:503,headers:HEADERS})
  return NextResponse.json({synced:true,lessonId:SCRATCH_DRAFT_LESSON_ID,updatedAt,verifiedGrade:false},
    {headers:HEADERS})
}

// CLOUD-105: delete the account's own cloud draft for the single Scratch
// lesson. The database already permits owner deletes
// (scratch_delete_own); this route was the missing half. Same-origin,
// authenticated mutation; the row filter always comes from the session,
// never from caller-supplied ids.
export async function DELETE(request:Request) {
  if(!hasSupabaseEnv())return NextResponse.json({error:'cloud-sync-not-configured'},{status:503,headers:HEADERS})
  if(request.headers.get('sec-fetch-site')==='cross-site'||
    (request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin))
    return NextResponse.json({error:'cross-origin-request'},{status:403,headers:HEADERS})
  const context=await authenticatedClient()
  if(!context?.user)return NextResponse.json({error:'authentication-required'},{status:401,headers:HEADERS})
  const {error}=await context.client.from('scratch_practice_drafts').delete()
    .eq('user_id',context.user.id).eq('lesson_id',SCRATCH_DRAFT_LESSON_ID)
  if(error)return NextResponse.json({error:'cloud-draft-storage-unavailable'},{status:503,headers:HEADERS})
  return NextResponse.json({deleted:true,lessonId:SCRATCH_DRAFT_LESSON_ID},{headers:HEADERS})
}
