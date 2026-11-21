import { BRIDGE_MAX_PAYLOAD_BYTES } from '@/features/lessons/dance-show/gui-bridge'

export const MAX_PROJECT_BYTES = 3 * Math.floor(BRIDGE_MAX_PAYLOAD_BYTES / 4)
export const MAX_PYTHON_BYTES = 128 * 1024
export const MAX_NAME_LENGTH = 60

export type WorkLanguage = 'scratch' | 'python'
export type WorkData = { language: 'scratch'; sb3: ArrayBuffer } | { language: 'python'; source: string }
export type WorkSummary = { id: string; name: string; language: WorkLanguage; createdAt: number; updatedAt: number; revision: number }
export type Work = Omit<WorkSummary, 'language'> & WorkData
type StoredWork = Work & { owner: string }
const DATABASE = 'kidscoding-create'
const STORE = 'works'
/** Retired standalone workshop (/studio/scratch/free). Read-only source. */
const LEGACY_FREE_DATABASE = 'kidscoding-free-create'

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

/**
 * Legacy libraries retired by OPS-050. They are read-only sources: the
 * unified library never creates, rewrites or deletes them.
 *
 * The migration marker stores a SIGNATURE of the legacy contents (row count
 * + newest timestamp) rather than a boolean. A work saved later — the old
 * tab writes its first work after the user already visited /create, or
 * the browser has no indexedDB.databases() — changes the signature and is
 * imported on the next listing. A boolean marker would hide it forever.
 */
const LEGACY_LIBRARIES = [
  { database: 'kidscoding-scratch-create', store: 'projects', marker: 'scratch-library-v1' },
  { database: LEGACY_FREE_DATABASE, store: 'projects', marker: 'free-create-v1' },
] as const

type LegacyRecord = {
  id: string
  name: string
  sb3: unknown
  savedAt?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  revision?: unknown
}

/**
 * Open a database that is only READ, never created. IndexedDB has no
 * "open existing" call, so opening a missing database fires
 * `onupgradeneeded`; aborting that version-change transaction rolls the
 * creation back. A migration probe therefore never leaves an empty legacy
 * database behind (and cannot make "the old library exists" true itself).
 */
function openExisting(name: string) {
  return new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return }
    const request = indexedDB.open(name)
    request.onupgradeneeded = () => {
      try { request.transaction?.abort() } catch { /* The transaction already closed. */ }
    }
    request.onerror = () => resolve(null)
    request.onsuccess = () => resolve(request.result)
  })
}

function legacyArchive(value: unknown): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) return value.byteLength > 0 ? value : null
  if (ArrayBuffer.isView(value) && value.byteLength > 0) {
    return (value.buffer as ArrayBuffer).slice(value.byteOffset, value.byteOffset + value.byteLength)
  }
  return null
}

function legacyStamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function isLegacyRecord(value: unknown): value is LegacyRecord {
  if (!value || typeof value !== 'object') return false
  const work = value as Partial<LegacyRecord>
  return typeof work.id === 'string' && work.id.length > 0 &&
    typeof work.name === 'string' && legacyArchive(work.sb3) !== null
}

function normalizeLegacyWork(record: LegacyRecord): StoredWork | null {
  const sb3 = legacyArchive(record.sb3)
  if (!sb3) return null
  const created = legacyStamp(record.createdAt) ?? legacyStamp(record.savedAt) ?? Date.now()
  const updated = legacyStamp(record.updatedAt) ?? legacyStamp(record.savedAt) ?? created
  const revision = typeof record.revision === 'number' && Number.isFinite(record.revision) && record.revision >= 0 ? record.revision : 0
  return {
    owner: 'guest',
    id: record.id,
    name: legacyWorkName(record.name),
    language: 'scratch',
    sb3,
    createdAt: created,
    updatedAt: updated,
    revision,
  }
}

function legacySignature(records: unknown[]) {
  let newest = 0
  for (const record of records) {
    if (!record || typeof record !== 'object') continue
    for (const key of ['savedAt', 'createdAt', 'updatedAt'] as const) {
      const stamp = legacyStamp((record as Record<string, unknown>)[key])
      if (stamp !== null && stamp > newest) newest = stamp
    }
  }
  return `${records.length}:${newest}`
}

async function readLegacyRecords(library: (typeof LEGACY_LIBRARIES)[number]) {
  const db = await openExisting(library.database)
  if (!db) return null
  try {
    if (!db.objectStoreNames.contains(library.store)) return null
    return await transact<unknown[]>(db, library.store, 'readonly', (tx) => result(tx.objectStore(library.store).getAll()))
  } finally { db.close() }
}

/**
 * Copy one legacy library into the guest library. The copy is idempotent:
 * an existing unified work with the same owner and id is never overwritten,
 * and the signature marker is written only after a complete successful
 * pass, so an interrupted migration is retried instead of marked done.
 */
async function syncLegacyLibrary(db: IDBDatabase, library: (typeof LEGACY_LIBRARIES)[number]): Promise<'absent' | 'synced' | 'failed'> {
  try {
    const records = await readLegacyRecords(library)
    if (records === null) return 'absent'
    const signature = legacySignature(records)
    const marker = await transact(db, 'meta', 'readonly', (tx) => result(tx.objectStore('meta').get(library.marker)))
    if (marker === signature) return 'synced'
    const works = records.map((record) => (isLegacyRecord(record) ? normalizeLegacyWork(record) : null))
      .filter((work): work is StoredWork => work !== null)
    await transact(db, ['meta', STORE], 'readwrite', async (tx) => {
      const meta = tx.objectStore('meta')
      const store = tx.objectStore(STORE)
      for (const work of works) {
        if (await result(store.get([work.owner, work.id]))) continue
        store.put(work)
      }
      await result(meta.put(signature, library.marker))
    })
    return 'synced'
  } catch {
    return 'failed'
  }
}

/**
 * Page-session hint only. Listing always rescans (`force`), so a work that
 * appears after the first render is picked up on the next listing — the hub
 * re-lists on mount, focus and pageshow. Other operations skip the rescan
 * once a scan has fully succeeded; a failed scan never latches.
 */
let guestLibrarySynced = false
async function syncLegacyGuestLibraries(db: IDBDatabase, force: boolean) {
  if (guestLibrarySynced && !force) return
  const states = await Promise.all(LEGACY_LIBRARIES.map((library) => syncLegacyLibrary(db, library)))
  guestLibrarySynced = states.every((state) => state !== 'failed')
}

function legacyWorkName(name: string) {
  const clean = name.trim() || '未命名作品'
  return clean.length > MAX_NAME_LENGTH ? clean.slice(0, MAX_NAME_LENGTH) : clean
}

async function readLegacyFreeWork(id: string): Promise<LegacyRecord | null> {
  const db = await openExisting(LEGACY_FREE_DATABASE)
  if (!db) return null
  try {
    if (!db.objectStoreNames.contains('projects')) return null
    const work = await transact<unknown>(db, 'projects', 'readonly', (tx) => result(tx.objectStore('projects').get(id)))
    return isLegacyRecord(work) ? work : null
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
  const sb3 = legacyArchive(work.sb3)
  if (!sb3) return null

  const target = await open(DATABASE, (database) => {
    database.createObjectStore(STORE, { keyPath: ['owner', 'id'] }).createIndex('owner', 'owner')
    database.createObjectStore('meta')
  })
  try {
    return await transact<WorkSummary>(target, STORE, 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE)
      const again: StoredWork | undefined = await result(store.get([owner, legacyId]))
      if (again) return summary(again)
      const stamp = legacyStamp(work.savedAt) ?? Date.now()
      const adopted: StoredWork = {
        owner,
        id: work.id,
        name: legacyWorkName(work.name),
        language: 'scratch',
        sb3,
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

  async function withStore<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => Promise<T>, forceSync = false) {
    const db = await open(DATABASE, (database) => {
      database.createObjectStore(STORE, { keyPath: ['owner', 'id'] }).createIndex('owner', 'owner')
      database.createObjectStore('meta')
    })
    try {
      if (owner === 'guest') await syncLegacyGuestLibraries(db, forceSync)
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
    // A listing is the moment the user looks at their works: always rescan
    // the legacy libraries so a work saved after the first render appears.
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
    }), true),
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
