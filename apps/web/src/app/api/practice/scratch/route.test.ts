import {Buffer} from 'node:buffer'
import {beforeEach,describe,expect,it,vi} from 'vitest'

const mocks=vi.hoisted(()=>({env:vi.fn(),client:vi.fn()}))
vi.mock('@/lib/env',()=>({hasSupabaseEnv:mocks.env}))
vi.mock('@/lib/supabase/server',()=>({createServerSupabaseClient:mocks.client}))
import {GET,PUT} from './route'

function zip(){
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
})
