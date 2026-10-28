import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasSupabaseEnv: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/env', () => ({ hasSupabaseEnv: mocks.hasSupabaseEnv }))
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }))

import { DELETE, GET, PUT } from './route'

describe('authenticated Python practice cloud draft API', () => {
  const getUser = vi.fn()
  const eq = vi.fn()
  const order = vi.fn()
  const upsert = vi.fn()
  const select = vi.fn()
  const from = vi.fn()
  const deleteFn = vi.fn()
  const deleteEq = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasSupabaseEnv.mockReturnValue(true)
    getUser.mockResolvedValue({ data: { user: {id:'account-123'} }, error:null })
    order.mockResolvedValue({ data: [{lesson_id:'P0-U1-L02',source:'print(2)',updated_at:'2026-10-10T00:00:00Z'}],error:null })
    eq.mockReturnValue({order})
    select.mockReturnValue({eq})
    upsert.mockResolvedValue({error:null})
    from.mockReturnValue({select,upsert,delete:deleteFn})
    deleteFn.mockReturnValue({eq:deleteEq})
    deleteEq.mockReturnValue({eq:deleteEq})
    mocks.createServerSupabaseClient.mockResolvedValue({auth:{getUser},from})
  })

  it('fails closed when Supabase is unavailable', async () => {
    mocks.hasSupabaseEnv.mockReturnValue(false)
    expect((await GET()).status).toBe(503)
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{method:'PUT',body:'{}'}))).status).toBe(503)
  })

  it('rejects unauthenticated reads and writes', async () => {
    getUser.mockResolvedValue({data:{user:null},error:null})
    expect((await GET()).status).toBe(401)
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{method:'PUT',body:'{}'}))).status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })

  it('selects only current users drafts', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(from).toHaveBeenCalledWith('python_practice_drafts')
    expect(select).toHaveBeenCalledWith('lesson_id,source,updated_at')
    expect(eq).toHaveBeenCalledWith('user_id','account-123')
    await expect(response.json()).resolves.toEqual({drafts:[{
      lessonId:'P0-U1-L02',source:'print(2)',updatedAt:'2026-10-10T00:00:00Z',
    }]})
  })

  it('never uses supplied user id or client claimed pass state', async () => {
    const response = await PUT(new Request('http://localhost/api/practice/drafts',{
      method:'PUT',headers:{Origin:'http://localhost','Content-Type':'application/json'},
      body:JSON.stringify({lessonId:'P0-U1-L02',source:'print(1)',passed:true,userId:'other-user'}),
    }))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({user_id:'account-123',lesson_id:'P0-U1-L02',source:'print(1)'}),
      {onConflict:'user_id,lesson_id'},
    )
    const saved=upsert.mock.calls[0][0]
    expect(saved).not.toHaveProperty('passed')
    expect(saved).not.toHaveProperty('userId')
    const body=await response.json()
    expect(body.verifiedGrade).toBe(false)
  })

  it('accepts new lesson source drafts without any claimed grade', async () => {
    for(const lessonId of ['P0-U1-L04','P0-U1-L05','P0-U1-L06']) {
      const response = await PUT(new Request('http://localhost/api/practice/drafts',{
        method:'PUT',body:JSON.stringify({lessonId,source:'def lesson(): pass',passed:true}),
      }))
      expect(response.status).toBe(200)
      expect((await response.json()).verifiedGrade).toBe(false)
    }
  })

  it('rejects invalid lessons and cross-origin writes', async () => {
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{
      method:'PUT',body:JSON.stringify({lessonId:'P0-U1-L01',source:'print(1)'}),
    }))).status).toBe(400)
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{
      method:'PUT',headers:{Origin:'https://evil.invalid'},
      body:JSON.stringify({lessonId:'P0-U1-L02',source:'print(1)'}),
    }))).status).toBe(403)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects oversized declarations and bodies', async () => {
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{
      method:'PUT',headers:{'Content-Length':'12001'},body:'{}',
    }))).status).toBe(413)
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{
      method:'PUT',body:'x'.repeat(12001),
    }))).status).toBe(413)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects overlong source and malformed JSON', async () => {
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{
      method:'PUT',body:JSON.stringify({lessonId:'P0-U1-L02',source:'x'.repeat(5001)}),
    }))).status).toBe(400)
    expect((await PUT(new Request('http://localhost/api/practice/drafts',{
      method:'PUT',body:'{not json',
    }))).status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('deletes only the authenticated account lesson draft', async () => {
    const response = await DELETE(new Request('http://localhost/api/practice/drafts?lessonId=P0-U1-L02',{method:'DELETE'}))
    expect(response.status).toBe(200)
    expect(from).toHaveBeenCalledWith('python_practice_drafts')
    expect(deleteFn).toHaveBeenCalled()
    expect(deleteEq).toHaveBeenCalledWith('user_id','account-123')
    expect(deleteEq).toHaveBeenCalledWith('lesson_id','P0-U1-L02')
    await expect(response.json()).resolves.toEqual({deleted:true,lessonId:'P0-U1-L02'})
  })

  it('refuses delete without a lesson id, authentication, or same origin', async () => {
    expect((await DELETE(new Request('http://localhost/api/practice/drafts',{method:'DELETE'}))).status).toBe(400)
    expect(deleteFn).not.toHaveBeenCalled()
    mocks.hasSupabaseEnv.mockReturnValue(false)
    expect((await DELETE(new Request('http://localhost/api/practice/drafts?lessonId=P0-U1-L02',{method:'DELETE'}))).status).toBe(503)
    mocks.hasSupabaseEnv.mockReturnValue(true)
    getUser.mockResolvedValue({data:{user:null},error:null})
    expect((await DELETE(new Request('http://localhost/api/practice/drafts?lessonId=P0-U1-L02',{method:'DELETE'}))).status).toBe(401)
    getUser.mockResolvedValue({data:{user:{id:'account-123'}},error:null})
    expect((await DELETE(new Request('http://localhost/api/practice/drafts?lessonId=P0-U1-L02',{method:'DELETE',
      headers:{Origin:'https://evil.invalid'}}))).status).toBe(403)
    expect(deleteFn).not.toHaveBeenCalled()
  })

  it('reports storage failure on delete instead of claiming success', async () => {
    deleteEq.mockReturnValueOnce({eq:deleteEq})
    deleteEq.mockResolvedValueOnce({error:{message:'db-down'}})
    const response = await DELETE(new Request('http://localhost/api/practice/drafts?lessonId=P0-U1-L02',{method:'DELETE'}))
    expect(response.status).toBe(503)
    expect((await response.json()).error).toBe('cloud-draft-storage-unavailable')
  })
})
