// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { workLibrary } from './project-store'

describe('Unified local project storage', () => {
  it('migrates legacy Scratch to guests only and preserves the original ID and archive', async () => {
    const id = '4db939db-aa8e-40f5-bade-637158763216'
    const sb3 = new Uint8Array([10, 42, 12]).buffer
    const request = indexedDB.open('kidscoding-scratch-create', 1)
    const done = new Promise<void>((resolve, reject) => {
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('projects', { keyPath: 'id' })
        store.add({ id, name: '老作品', sb3, createdAt: 1, updatedAt: 2, revision: 4 })
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => { request.result.close(); resolve() }
    })
    await done
    const [guest, signedIn] = await Promise.all([workLibrary('guest').open(id, 'scratch'), workLibrary('user:ada').open(id, 'scratch')])
    expect(guest).toMatchObject({ id, language: 'scratch', revision: 4, sb3 })
    expect(signedIn).toBeNull()
    expect(await workLibrary('guest').list()).toHaveLength(1)
  })

  it('separates accounts, filters wrong language reads and refuses wrong-owner edits', async () => {
    const alice = workLibrary('user:alice')
    const bob = workLibrary('user:bob')
    const work = await alice.create('小程序', { language: 'python', source: 'print(1)' })
    expect((await alice.list()).map((item) => item.id)).toEqual([work.id])
    expect(await alice.open(work.id, 'scratch')).toBeNull()
    expect(await bob.list()).toEqual([])
    await expect(bob.rename(work.id, '不该访问')).rejects.toThrow('找不到')
    await expect(bob.delete(work.id)).rejects.toThrow('找不到')
    expect(await alice.open(work.id, 'python')).toMatchObject({ source: 'print(1)' })
  })

  it('commits just one writer at a revision and keeps copies independent and deleted IDs absent', async () => {
    const library = workLibrary('user:concurrent')
    const work = await library.create('测试', { language: 'python', source: '' })
    const writes = await Promise.allSettled([1, 2].map((number) =>
      library.save(work.id, work.revision, { language: 'python', source: String(number) })))
    expect(writes.map((write) => write.status).sort()).toEqual(['fulfilled', 'rejected'])
    const copy = await library.copy(work.id)
    await library.rename(work.id, '新名')
    await library.save(copy.id, copy.revision, { language: 'python', source: '独立内容' })
    expect(await library.open(work.id, 'python')).toMatchObject({ name: '新名', revision: 1 })
    expect(await library.open(copy.id, 'python')).toMatchObject({ source: '独立内容' })
    await library.delete(work.id)
    await expect(library.save(work.id, 1, { language: 'python', source: '陈旧写入' })).rejects.toThrow('找不到')
  })
})
