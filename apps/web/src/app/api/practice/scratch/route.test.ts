import {Buffer} from 'node:buffer'
import {beforeEach,describe,expect,it,vi} from 'vitest'

const mocks=vi.hoisted(()=>({env:vi.fn(),client:vi.fn()}))
vi.mock('@/lib/env',()=>({hasSupabaseEnv:mocks.env}))
vi.mock('@/lib/supabase/server',()=>({createServerSupabaseClient:mocks.client}))
import {GET,PUT} from './route'

function buildZip(entries:{name:string;data:Buffer;method?:number;declaredSize?:number}[]):Buffer{
  const parts:Buffer[]=[]
  const centrals:Buffer[]=[]
  let offset=0
  for(const entry of entries){
    const name=Buffer.from(entry.name)
    const method=entry.method??0
    const compSize=entry.data.length
    const uncompSize=entry.declaredSize??entry.data.length
    const local=Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50,0)
    local.writeUInt16LE(20,4)
    local.writeUInt16LE(0,6)
    local.writeUInt16LE(method,8)
    local.writeUInt16LE(0,10)
    local.writeUInt16LE(0,12)
    local.writeUInt32LE(0,14)
    local.writeUInt32LE(compSize,18)
    local.writeUInt32LE(uncompSize,22)
    local.writeUInt16LE(name.length,26)
    local.writeUInt16LE(0,28)
    parts.push(local,name,entry.data)
    const central=Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50,0)
    central.writeUInt16LE(20,4)
    central.writeUInt16LE(20,6)
    central.writeUInt16LE(0,8)
    central.writeUInt16LE(method,10)
    central.writeUInt16LE(0,12)
    central.writeUInt16LE(0,14)
    central.writeUInt32LE(0,16)
    central.writeUInt32LE(compSize,20)
    central.writeUInt32LE(uncompSize,24)
    central.writeUInt16LE(name.length,28)
    central.writeUInt16LE(0,30)
    central.writeUInt16LE(0,32)
    central.writeUInt16LE(0,34)
    central.writeUInt16LE(0,36)
    central.writeUInt32LE(0,38)
    central.writeUInt32LE(offset,42)
    centrals.push(central,name)
    offset+=30+name.length+entry.data.length
  }
  const cdStart=offset
  let cdSize=0
  for(const c of centrals)cdSize+=c.length
  const eocd=Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50,0)
  eocd.writeUInt16LE(0,4)
  eocd.writeUInt16LE(0,6)
  eocd.writeUInt16LE(entries.length,8)
  eocd.writeUInt16LE(entries.length,10)
  eocd.writeUInt32LE(cdSize,12)
  eocd.writeUInt32LE(cdStart,16)
  eocd.writeUInt16LE(0,20)
  return Buffer.concat([...parts,...centrals,eocd])
}
function zip(){
  // A real minimal project: padded past the route's 300-byte decoded floor
  // so positive cases prove structure acceptance, not length acceptance.
  const project=Buffer.from(JSON.stringify({targets:[],meta:{semver:'3.0.0'},padding:'x'.repeat(400)}))
  return buildZip([{name:'project.json',data:project}]).toString('base64')
}
function fakeZip(){
  // CLOUD-104: the old fixture. PK header, zeros, no central directory.
  const bytes=Buffer.alloc(1024,0)
  bytes[0]=0x50;bytes[1]=0x4b
  return bytes.toString('base64')
}
describe('Scratch authenticated project drafts',()=>{
  const user=vi.fn(),from=vi.fn(),select=vi.fn(),eq=vi.fn(),maybeSingle=vi.fn(),upsert=vi.fn()
  beforeEach(()=>{
    vi.clearAllMocks()
    mocks.env.mockReturnValue(true)
    user.mockResolvedValue({data:{user:{id:'user-a'}},error:null})
    from.mockReturnValue({select,upsert})
    select.mockReturnValue({eq})
    eq.mockReturnValue({eq,maybeSingle})
    maybeSingle.mockResolvedValue({data:{lesson_id:'G3-U1-L02',archive_base64:zip(),updated_at:'2026-10-10T00:00:00Z'},error:null})
    upsert.mockResolvedValue({error:null})
    mocks.client.mockResolvedValue({auth:{getUser:user},from})
  })
  it('fails closed without Supabase or authentication',async()=>{
    mocks.env.mockReturnValue(false)
    expect((await GET()).status).toBe(503)
    expect((await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',body:'{}'}))).status).toBe(503)
    mocks.env.mockReturnValue(true)
    user.mockResolvedValue({data:{user:null},error:null})
    expect((await GET()).status).toBe(401)
    expect((await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',body:'{}'}))).status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })
  it('reads only authenticated account and correct lesson, no public cache',async()=>{
    const response=await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(from).toHaveBeenCalledWith('scratch_practice_drafts')
    expect(select).toHaveBeenCalledWith('lesson_id,archive_base64,updated_at')
    expect(eq).toHaveBeenCalledWith('user_id','user-a')
    expect(eq).toHaveBeenCalledWith('lesson_id','G3-U1-L02')
    expect((await response.json()).draft.archiveBase64).toBe(zip())
  })
  it('keeps different authenticated user ids isolated in API queries and writes',async()=>{
    user.mockResolvedValueOnce({data:{user:{id:'user-a'}},error:null})
      .mockResolvedValueOnce({data:{user:{id:'user-b'}},error:null})
      .mockResolvedValueOnce({data:{user:{id:'user-b'}},error:null})
    await GET()
    await GET()
    expect(eq).toHaveBeenCalledWith('user_id','user-a')
    expect(eq).toHaveBeenCalledWith('user_id','user-b')
    const response=await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',body:JSON.stringify({
      lessonId:'G3-U1-L02',archiveBase64:zip(),userId:'user-a',verifiedGrade:true,
    })}))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      {user_id:'user-b',lesson_id:'G3-U1-L02',archive_base64:zip(),updated_at:expect.any(String)},
      {onConflict:'user_id,lesson_id'},
    )
    expect((await response.json()).verifiedGrade).toBe(false)
  })
  it('rejects cross-origin and fabricated or excessive archives before database write',async()=>{
    const cross=await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',
      headers:{Origin:'https://attacker.invalid'},body:'{}'}))
    expect(cross.status).toBe(403)
    const wrong=await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',
      body:JSON.stringify({lessonId:'G3-U1-L03',archiveBase64:zip()})}))
    expect(wrong.status).toBe(400)
    const malformed=await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',
      body:JSON.stringify({lessonId:'G3-U1-L02',archiveBase64:'foo'})}))
    expect(malformed.status).toBe(400)
    const tooBig=await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',
      headers:{'Content-Length':'99999999'},body:'{}'}))
    expect(tooBig.status).toBe(413)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('returns empty without exposing another account and handles database failure',async()=>{
    maybeSingle.mockResolvedValueOnce({data:null,error:null})
    await expect((await GET()).json()).resolves.toEqual({draft:null})
    upsert.mockResolvedValueOnce({error:{message:'db-down'}})
    expect((await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',
      body:JSON.stringify({lessonId:'G3-U1-L02',archiveBase64:zip()})}))).status).toBe(503)
  })
  it('rejects PK-header garbage and declared zip bombs before database write',async()=>{
    const pseudo=await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',
      body:JSON.stringify({lessonId:'G3-U1-L02',archiveBase64:fakeZip()})}))
    expect(pseudo.status).toBe(400)
    // Declared 60 MB, actually ~500 bytes: length checks pass, so only the
    // structure inspection can reject it.
    const bomb=buildZip([{name:'project.json',data:Buffer.alloc(400,1),declaredSize:60_000_000}]).toString('base64')
    const bombed=await PUT(new Request('http://localhost/api/practice/scratch',{method:'PUT',
      body:JSON.stringify({lessonId:'G3-U1-L02',archiveBase64:bomb})}))
    expect(bombed.status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('does not serve a stored PK-header garbage project',async()=>{
    maybeSingle.mockResolvedValueOnce({data:{lesson_id:'G3-U1-L02',archive_base64:fakeZip(),updated_at:'2026-10-10T00:00:00Z'},error:null})
    const response=await GET()
    expect(response.status).toBe(503)
    expect((await response.json()).error).toBe('invalid-saved-project')
  })
})
