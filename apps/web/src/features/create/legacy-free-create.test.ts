// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'

import { adoptLegacyFreeCreateWork, workLibrary } from './project-store'

const LEGACY = 'kidscoding-free-create'

function openLegacy(write: (store: IDBObjectStore) => void) {
  const request = indexedDB.open(LEGACY, 1)
  return new Promise<void>((resolve, reject) => {
    request.onupgradeneeded = () => {
      request.result.createObjectStore('projects', { keyPath: 'id' })
      request.result.createObjectStore('meta')
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('projects', 'readwrite')
      write(tx.objectStore('projects'))
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
  })
}

async function readLegacy(id: string) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(LEGACY)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
  try {
    return await new Promise<{ id: string; name: string; sb3: ArrayBuffer } | undefined>((resolve, reject) => {
      const request = db.transaction('projects', 'readonly').objectStore('projects').get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally { db.close() }
}

describe('retired free-create library handoff', () => {
  it('copies guest works into the unified library, keeps IDs and never deletes the old database', async () => {
    const sb3 = new Uint8Array([80, 75, 3, 4]).buffer
    await openLegacy((store) => {
      store.put({ id: 'legacy-1', name: '旧作品甲', sb3, savedAt: 1234, byteLength: 4 })
      store.put({ id: 'legacy-2', name: '旧作品乙', sb3, savedAt: 5678, byteLength: 4 })
    })

    const guest = workLibrary('guest')
    const listed = await guest.list()
    expect(listed.map((item) => item.id).sort()).toEqual(['legacy-1', 'legacy-2'])
    expect(await guest.open('legacy-1', 'scratch')).toMatchObject({
      id: 'legacy-1',
      name: '旧作品甲',
      language: 'scratch',
      createdAt: 1234,
      updatedAt: 1234,
      revision: 0,
      sb3,
    })
    // Legacy rows are still present, byte for byte, after the migration.
    expect(await readLegacy('legacy-1')).toMatchObject({ id: 'legacy-1', name: '旧作品甲', sb3 })
    expect(await readLegacy('legacy-2')).toMatchObject({ id: 'legacy-2', name: '旧作品乙' })
  })

  it('adopts an old deep link for a signed-in owner and is idempotent', async () => {
    const sb3 = new Uint8Array([9, 8, 7]).buffer
    await openLegacy((store) => store.put({ id: 'legacy-deep', name: '深的作品', sb3, savedAt: 42 }))

    const adopted = await adoptLegacyFreeCreateWork('user:ada', 'legacy-deep')
    expect(adopted).toMatchObject({ id: 'legacy-deep', name: '深的作品', language: 'scratch' })
    expect(await workLibrary('user:ada').open('legacy-deep', 'scratch')).toMatchObject({ id: 'legacy-deep', sb3 })
    // Second open reuses the adopted copy instead of adding another one.
    expect(await adoptLegacyFreeCreateWork('user:ada', 'legacy-deep')).toMatchObject({ id: 'legacy-deep' })
    expect(await workLibrary('user:ada').list()).toHaveLength(1)
    // Adopting for one owner does not leak the work into another account.
    expect(await workLibrary('user:bob').list()).toEqual([])
    // The work named in the old database still exists.
    expect(await readLegacy('legacy-deep')).toMatchObject({ id: 'legacy-deep' })
  })

  it('returns null for a legacy ID that does not exist', async () => {
    expect(await adoptLegacyFreeCreateWork('user:ada', 'missing')).toBeNull()
  })
})
