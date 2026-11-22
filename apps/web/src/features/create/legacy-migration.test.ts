// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'

import { workLibrary } from './project-store'

const FREE = 'kidscoding-free-create'
const SCRATCH = 'kidscoding-scratch-create'
const UNIFIED = 'kidscoding-create'

type LegacyRow = { id: string; name: string; sb3: ArrayBuffer; savedAt?: number }

function bytes(...values: number[]) {
  return new Uint8Array(values).buffer
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Open an existing database. Does not create stores: the migration code owns creation. */
function openRaw(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

/** Test-side seeding helper (never used by the migration code itself). */
async function seedLegacy(name: string, rows: LegacyRow[]) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects', { keyPath: 'id' })
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
  try {
    const tx = db.transaction('projects', 'readwrite')
    for (const row of rows) tx.objectStore('projects').put(row)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}

async function readLegacyRows(name: string): Promise<LegacyRow[]> {
  const db = await openRaw(name)
  try {
    return await requestResult(db.transaction('projects', 'readonly').objectStore('projects').getAll())
  } finally { db.close() }
}

async function deleteDatabase(name: string) {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

async function databaseNames() {
  return (await indexedDB.databases()).map((database) => database.name)
}

/** Marker stored by the migration inside the unified library. */
async function readMarker(key: string) {
  const db = await openRaw(UNIFIED)
  try {
    return await requestResult(db.transaction('meta', 'readonly').objectStore('meta').get(key))
  } finally { db.close() }
}

/** Simulates a unified work that already exists under the same owner and id. */
async function writeUnified(work: { id: string; name: string; sb3: ArrayBuffer; revision: number }) {
  const db = await openRaw(UNIFIED)
  try {
    const tx = db.transaction('works', 'readwrite')
    tx.objectStore('works').put({ owner: 'guest', language: 'scratch', createdAt: 1, updatedAt: 1, ...work })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
  } finally { db.close() }
}

describe('legacy library migration boundaries', () => {
  it('does not create or mark a missing legacy library, and imports works saved later', async () => {
    expect(await workLibrary('guest').list()).toEqual([])
    expect(await databaseNames()).not.toContain(FREE)
    expect(await databaseNames()).not.toContain(SCRATCH)
    // A missing source must not be recorded as migrated.
    expect(await readMarker('free-create-v1')).toBeUndefined()
    expect(await readMarker('scratch-library-v1')).toBeUndefined()

    // The retired tab saves its first work afterwards.
    await seedLegacy(FREE, [{ id: 'late-1', name: '后来保存的作品', sb3: bytes(1, 2, 3), savedAt: 1000 }])
    const listed = await workLibrary('guest').list()
    expect(listed.filter((work) => work.id === 'late-1')).toHaveLength(1)
    expect(listed.find((work) => work.id === 'late-1')).toMatchObject({
      name: '后来保存的作品',
      language: 'scratch',
    })
    expect(await workLibrary('guest').open('late-1', 'scratch')).toMatchObject({ sb3: bytes(1, 2, 3) })
    // The marker is a content signature, not a boolean.
    expect(await readMarker('free-create-v1')).toBe('1:1000')
  })

  it('keeps working without indexedDB.databases() and still imports a library created later', async () => {
    await deleteDatabase(FREE)
    await deleteDatabase(SCRATCH)
    const factory = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }
    const savedDatabases = factory.databases
    const before = await readMarker('free-create-v1')
    try {
      Object.defineProperty(factory, 'databases', { value: undefined, configurable: true })
      // A browser without databases(): the probe must not create the old DBs.
      await workLibrary('guest').list()
    } finally {
      Object.defineProperty(factory, 'databases', { value: savedDatabases, configurable: true })
    }
    expect(await databaseNames()).not.toContain(FREE)
    expect(await databaseNames()).not.toContain(SCRATCH)
    // The absent library is not (re)marked as migrated.
    expect(await readMarker('free-create-v1')).toBe(before)

    await seedLegacy(FREE, [{ id: 'late-2', name: '没有 databases() 也能恢复', sb3: bytes(4, 5), savedAt: 2000 }])
    const listed = await workLibrary('guest').list()
    expect(listed.filter((work) => work.id === 'late-2')).toHaveLength(1)
  })

  it('re-reads a legacy library that existed but was empty when migration first ran', async () => {
    await deleteDatabase(FREE)
    await seedLegacy(FREE, [])
    await workLibrary('guest').list()
    expect(await readMarker('free-create-v1')).toBe('0:0')

    await seedLegacy(FREE, [{ id: 'late-3', name: '空库之后的第一份作品', sb3: bytes(6), savedAt: 3000 }])
    const refreshed = await workLibrary('guest').list()
    expect(refreshed.filter((work) => work.id === 'late-3')).toHaveLength(1)
  })

  it('is idempotent, never overwrites the unified copy and leaves legacy bytes intact', async () => {
    const original = bytes(7, 7, 7)
    await seedLegacy(FREE, [{ id: 'repeat-1', name: '旧副本', sb3: original, savedAt: 4000 }])
    expect((await workLibrary('guest').list()).filter((work) => work.id === 'repeat-1')).toHaveLength(1)
    await workLibrary('guest').list()
    await workLibrary('guest').list()
    expect((await workLibrary('guest').list()).filter((work) => work.id === 'repeat-1')).toHaveLength(1)
    expect(await workLibrary('guest').open('repeat-1', 'scratch')).toMatchObject({
      name: '旧副本',
      revision: 0,
      sb3: original,
    })

    // The old tab saves again under the same id: the copy the child already
    // has is not replaced, and the legacy row keeps its own content.
    const revisited = bytes(9, 9)
    await seedLegacy(FREE, [{ id: 'repeat-1', name: '旧副本改名', sb3: revisited, savedAt: 5000 }])
    await workLibrary('guest').list()
    expect(await workLibrary('guest').open('repeat-1', 'scratch')).toMatchObject({
      name: '旧副本',
      sb3: original,
    })
    const legacy = await readLegacyRows(FREE)
    expect(legacy.find((row) => row.id === 'repeat-1')).toMatchObject({ name: '旧副本改名', sb3: revisited })
  })

  it('never overwrites a unified work that already uses the same owner and id', async () => {
    await workLibrary('guest').list()
    const mine = bytes(5, 5, 5)
    await writeUnified({ id: 'shared-id', name: '统一库里的版本', sb3: mine, revision: 3 })
    await seedLegacy(FREE, [{ id: 'shared-id', name: '旧库里的版本', sb3: bytes(6, 6), savedAt: 6000 }])

    const listed = await workLibrary('guest').list()
    expect(listed.filter((work) => work.id === 'shared-id')).toHaveLength(1)
    expect(await workLibrary('guest').open('shared-id', 'scratch')).toMatchObject({
      name: '统一库里的版本',
      revision: 3,
      sb3: mine,
    })
  })

  it('keeps migrated guest works out of signed-in libraries', async () => {
    const signedIn = await workLibrary('user:ada').list()
    expect(signedIn.map((work) => work.id)).not.toContain('late-1')
    expect(signedIn.map((work) => work.id)).not.toContain('repeat-1')
  })
})
