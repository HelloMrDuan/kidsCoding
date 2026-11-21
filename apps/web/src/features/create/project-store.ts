import { BRIDGE_MAX_PAYLOAD_BYTES } from '@/features/lessons/dance-show/gui-bridge'

export const MAX_PROJECT_BYTES = 3 * Math.floor(BRIDGE_MAX_PAYLOAD_BYTES / 4)
export const MAX_PYTHON_BYTES = 128 * 1024
export const MAX_NAME_LENGTH = 60

export type WorkLanguage = 'scratch' | 'python'
export type WorkData = { language: 'scratch'; sb3: ArrayBuffer } | { language: 'python'; source: string }
export type WorkSummary = { id: string; name: string; language: WorkLanguage; createdAt: number; updatedAt: number; revision: number }
export type Work = Omit<WorkSummary, 'language'> & WorkData
type StoredWork = Work & { owner: string }
type LegacyWork = Omit<WorkSummary, 'language'> & { sb3: ArrayBuffer }
const DATABASE = 'kidscoding-create'
const STORE = 'works'
/** Retired standalone workshop (/studio/scratch/free). Read-only source. */
const LEGACY_FREE_DATABASE = 'kidscoding-free-create'
type LegacyFreeWork = { id: string; name: string; sb3: ArrayBuffer; savedAt?: number }

function open(name: string, upgrade: (db: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('此浏览器无法访问本机作品库。')); return }
    const request = indexedDB.open(name, 1)
    let blocked = false
    request.onupgradeneeded = () => upgrade(request.result)
    request.onblocked = () => { blocked = true; reject(new Error('请关闭其他正在打开作品库的页面后重试。')) }
    request.onerror = () => reject(new Error('无法打开本机作品库。'))
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else resolve(request.result)
    }
  })
}

function result<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(db: IDBDatabase, stores: string | string[], mode: IDBTransactionMode, act: (tx: IDBTransaction) => Promise<T>) {
  const tx = db.transaction(stores, mode)
  const committed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(new Error('无法写入或读取本机作品，请检查浏览器存储空间后重试。'))
  })
  try {
    const [value] = await Promise.all([act(tx), committed])
    return value
  } catch (cause) {
    try { tx.abort() } catch { /* Already closed. */ }
    if (cause instanceof DOMException) throw new Error('本机作品库操作失败，请检查浏览器存储空间后重试。', { cause })
    throw cause
  }
}

let guestImported = false
async function importLegacyGuestWorks(db: IDBDatabase) {
  if (guestImported) return
  const marker = 'scratch-library-v1'
  if (!await transact(db, 'meta', 'readonly', (tx) => result(tx.objectStore('meta').get(marker)))) {
    const old = await open('kidscoding-scratch-create', (database) => database.createObjectStore('projects', { keyPath: 'id' }))
    let works: LegacyWork[]
    try { works = await transact(old, 'projects', 'readonly', (tx) => result(tx.objectStore('projects').getAll())) }
    finally { old.close() }
    await transact(db, ['meta', STORE], 'readwrite', async (tx) => {
      const meta = tx.objectStore('meta')
      if (await result(meta.get(marker))) return
      const store = tx.objectStore(STORE)
      for (const work of works) store.add({ ...work, owner: 'guest', language: 'scratch' })
      await result(meta.put(true, marker))
    })
  }
  await importLegacyFreeCreateWorks(db)
  guestImported = true
}

/**
 * One-time, non-destructive handoff of the retired /studio/scratch/free
 * library (`kidscoding-free-create` / `projects`) into the unified guest
 * library. The legacy database is only read, never deleted or modified, so
 * an interrupted migration can be retried from the same data. Works keep
 * their old id, which lets old deep links resolve after the redirect.
 */
async function importLegacyFreeCreateWorks(db: IDBDatabase) {
  const marker = 'free-create-v1'
  if (await transact(db, 'meta', 'readonly', (tx) => result(tx.objectStore('meta').get(marker)))) return
  const works = await readLegacyFreeWorks()
  if (works === null) return
  await transact(db, ['meta', STORE], 'readwrite', async (tx) => {
    const meta = tx.objectStore('meta')
    if (await result(meta.get(marker))) return
    const store = tx.objectStore(STORE)
    for (const work of works) {
      if (!isLegacyFreeWork(work)) continue
      if (await result(store.get(['guest', work.id]))) continue
      const stamp = typeof work.savedAt === 'number' && work.savedAt > 0 ? work.savedAt : Date.now()
      store.put({
        owner: 'guest',
        id: work.id,
        name: legacyWorkName(work.name),
        language: 'scratch',
        sb3: work.sb3,
        createdAt: stamp,
        updatedAt: stamp,
        revision: 0,
      } satisfies StoredWork)
    }
    await result(meta.put(true, marker))
  })
}

function isLegacyFreeWork(value: unknown): value is LegacyFreeWork {
  if (!value || typeof value !== 'object') return false
  const work = value as Partial<LegacyFreeWork>
  return typeof work.id === 'string' && work.id.length > 0 && typeof work.name === 'string' &&
    work.sb3 instanceof ArrayBuffer && work.sb3.byteLength > 0
}

function legacyWorkName(name: string) {
  const clean = name.trim() || '未命名作品'
  return clean.length > MAX_NAME_LENGTH ? clean.slice(0, MAX_NAME_LENGTH) : clean
}

function legacyDatabaseExists() {
  const api = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }
  return typeof api.databases === 'function' ? api.databases().then((items) => items.some((item) => item.name === LEGACY_FREE_DATABASE)) : Promise.resolve(true)
}

async function readLegacyFreeWorks(): Promise<LegacyFreeWork[] | null> {
  if (typeof indexedDB === 'undefined' || !await legacyDatabaseExists()) return null
  const db = await open(LEGACY_FREE_DATABASE, (database) => database.createObjectStore('projects', { keyPath: 'id' }))
  try {
    return await transact<LegacyFreeWork[]>(db, 'projects', 'readonly', (tx) => result(tx.objectStore('projects').getAll()))
  } finally { db.close() }
}

async function readLegacyFreeWork(id: string): Promise<LegacyFreeWork | null> {
  if (typeof indexedDB === 'undefined' || !await legacyDatabaseExists()) return null
  const db = await open(LEGACY_FREE_DATABASE, (database) => database.createObjectStore('projects', { keyPath: 'id' }))
  try {
    const work = await transact<LegacyFreeWork | undefined>(db, 'projects', 'readonly', (tx) => result(tx.objectStore('projects').get(id)))
    return isLegacyFreeWork(work) ? work : null
  } finally { db.close() }
}

/**
 * Adopt one work opened through an old /studio/scratch/free/<id> bookmark.
 * Copies the record under the CURRENT owner (the old page had no owner
 * scoping) and never overwrites an existing work with the same key.
 */
export async function adoptLegacyFreeCreateWork(owner: string, legacyId: string): Promise<WorkSummary | null> {
  if (owner !== 'guest' && !owner.startsWith('user:')) throw new Error('请重新确认当前账号。')
  const db = await open(DATABASE, (database) => {
    database.createObjectStore(STORE, { keyPath: ['owner', 'id'] }).createIndex('owner', 'owner')
    database.createObjectStore('meta')
  })
  try {
    const existing = await transact<StoredWork | undefined>(db, STORE, 'readonly', (tx) => result(tx.objectStore(STORE).get([owner, legacyId])))
    if (existing) return summary(existing)
  } finally { db.close() }

  const work = await readLegacyFreeWork(legacyId)
  if (!work) return null

  const target = await open(DATABASE, (database) => {
    database.createObjectStore(STORE, { keyPath: ['owner', 'id'] }).createIndex('owner', 'owner')
    database.createObjectStore('meta')
  })
  try {
    return await transact<WorkSummary>(target, STORE, 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE)
      const again: StoredWork | undefined = await result(store.get([owner, legacyId]))
      if (again) return summary(again)
      const stamp = typeof work.savedAt === 'number' && work.savedAt > 0 ? work.savedAt : Date.now()
      const adopted: StoredWork = {
        owner,
        id: work.id,
        name: legacyWorkName(work.name),
        language: 'scratch',
        sb3: work.sb3,
        createdAt: stamp,
        updatedAt: stamp,
        revision: 0,
      }
      await result(store.add(adopted))
      return summary(adopted)
    })
  } finally { target.close() }
}

export function workLibrary(owner: string) {
  if (owner !== 'guest' && !owner.startsWith('user:')) throw new Error('请重新确认当前账号。')

  async function withStore<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => Promise<T>) {
    const db = await open(DATABASE, (database) => {
      database.createObjectStore(STORE, { keyPath: ['owner', 'id'] }).createIndex('owner', 'owner')
      database.createObjectStore('meta')
    })
    try {
      if (owner === 'guest') await importLegacyGuestWorks(db)
      return await transact(db, STORE, mode, (tx) => act(tx.objectStore(STORE)))
    } finally { db.close() }
  }

  function change<T>(id: string, act: (work: StoredWork, store: IDBObjectStore) => Promise<T>) {
    return withStore('readwrite', async (store) => {
      const work: StoredWork | undefined = await result(store.get([owner, id]))
      if (!work) throw new Error('当前本机作品库中找不到此作品。它可能已被删除。')
      return act(work, store)
    })
  }

  return {
    list: () => withStore('readonly', (store) => new Promise<WorkSummary[]>((resolve, reject) => {
      const items: WorkSummary[] = []
      const request = store.index('owner').openCursor(owner)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) { resolve(items.sort((a, b) => b.updatedAt - a.updatedAt)); return }
        items.push(summary(cursor.value))
        cursor.continue()
      }
    })),
    open: (id: string, language: WorkLanguage) => withStore('readonly', async (store) => {
      const work: StoredWork | undefined = await result(store.get([owner, id]))
      return work?.language === language ? work : null
    }),
    create: (name: string, data: WorkData) => withStore('readwrite', async (store) => {
      validateData(data)
      const work = newWork(owner, workName(name), data)
      await result(store.add(work))
      return summary(work)
    }),
    save: (id: string, revision: number, data: WorkData) => change(id, async (current, store) => {
      validateData(data)
      if (current.language !== data.language) throw new Error('作品语言不匹配。')
      if (current.revision !== revision) throw new Error('另一窗口已保存。请先导出当前编辑的版本，再从作品列表重新打开。')
      const work = { ...current, ...data, revision: revision + 1, updatedAt: Date.now() }
      await result(store.put(work))
      return summary(work)
    }),
    rename: (id: string, name: string) => change(id, async (work, store) => {
      await result(store.put({ ...work, name: workName(name), updatedAt: Date.now() }))
    }),
    copy: (id: string) => change(id, async (current, store) => {
      const data: WorkData = current.language === 'scratch' ? { language: 'scratch', sb3: current.sb3 } : { language: 'python', source: current.source }
      const copy = newWork(owner, current.name.slice(0, MAX_NAME_LENGTH - 3) + ' 副本', data)
      await result(store.add(copy))
      return summary(copy)
    }),
    delete: (id: string) => change(id, async (_, store) => { await result(store.delete([owner, id])) }),
  }
}

function summary({ id, name, language, createdAt, updatedAt, revision }: StoredWork): WorkSummary {
  return { id, name, language, createdAt, updatedAt, revision }
}

function workName(name: string) {
  const clean = name.trim()
  if (!clean || clean.length > MAX_NAME_LENGTH) throw new Error('请输入 1 到 60 个字符的作品名称。')
  return clean
}

function newWork(owner: string, name: string, data: WorkData): StoredWork {
  const now = Date.now()
  return { ...data, owner, id: crypto.randomUUID(), name, createdAt: now, updatedAt: now, revision: 0 }
}

export function validateData(data: WorkData) {
  if (data.language === 'python' && new TextEncoder().encode(data.source).byteLength > MAX_PYTHON_BYTES) {
    throw new Error('Python 文件超过 128 KB。请缩短代码后重试。')
  }
  if (data.language === 'scratch' && (!data.sb3.byteLength || data.sb3.byteLength > MAX_PROJECT_BYTES)) {
    throw new Error('作品为空或超过本工作台支持的大小（约 3.75 MB）。')
  }
}
