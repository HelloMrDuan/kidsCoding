import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasSupabaseEnv: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/env', () => ({ hasSupabaseEnv: mocks.hasSupabaseEnv }))
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: mocks.createServerSupabaseClient }))

import { GET, PUT } from './route'

describe('authenticated Python practice cloud draft API', () => {
  const getUser = vi.fn()
  const eq = vi.fn()
  const order = vi.fn()
  const upsert = vi.fn()
  const select = vi.fn()
  const from = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasSupabaseEnv.mockReturnValue(true)
    getUser.mockResolvedValue({ data: { user: {id:'account-123'} }, error:null })
    order.mockResolvedValue({ data: [{lesson_id:'P0-U1-L02',source:'print(2)',updated_at:'2026-10-10T00:00:00Z'}],error:null })
    eq.mockReturnValue({order})
    select.mockReturnValue({eq})
    upsert.mockResolvedValue({error:null})
    from.mockReturnValue({select,upsert})
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
    for(const lessonId of ['P0-U1-L04','P0-U1-L05']) {
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
})
