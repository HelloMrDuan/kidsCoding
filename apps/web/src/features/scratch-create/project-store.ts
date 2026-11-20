import { BRIDGE_MAX_PAYLOAD_BYTES } from '@/features/lessons/dance-show/gui-bridge'

// The existing bridge sends loaded archives in base64. Anything saved must fit
// on the way back in, including projects saved by the GUI.
export const MAX_PROJECT_BYTES = 3 * Math.floor(BRIDGE_MAX_PAYLOAD_BYTES / 4)
export const MAX_NAME_LENGTH = 60
const STORE = 'projects'
const DATABASE = 'kidscoding-scratch-create'

export type ScratchWork = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  revision: number
  sb3: ArrayBuffer
}
export type ScratchWorkSummary = Omit<ScratchWork, 'sb3'>

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('此浏览器无法访问本机作品库'))
      return
    }
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onblocked = () => reject(new Error('请关闭其他正在打开作品库的页面后重试'))
    request.onerror = () => reject(new Error('无法打开本机作品库'))
    request.onsuccess = () => resolve(request.result)
  })
}

async function transact<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore, set: (value: T) => void, fail: (message: string) => void) => void,
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      let output: T
      let reason = '无法写入或读取本机作品。请检查浏览器存储空间后重试。'
      tx.oncomplete = () => resolve(output)
      tx.onabort = () => reject(new Error(reason))
      work(tx.objectStore(STORE), (value) => { output = value }, (message) => {
        reason = message
        tx.abort()
      })
    })
  } finally {
    db.close()
  }
}

function summary(work: ScratchWork): ScratchWorkSummary {
  const { id, name, createdAt, updatedAt, revision } = work
  return { id, name, createdAt, updatedAt, revision }
}

export function listScratchWorks() {
  return transact<ScratchWorkSummary[]>('readonly', (store, set) => {
    const records: ScratchWorkSummary[] = []
    const req = store.openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        set(records.sort((a, b) => b.updatedAt - a.updatedAt))
        return
      }
      records.push(summary(cursor.value as ScratchWork))
      cursor.continue()
    }
  })
}

export function openScratchWork(id: string) {
  return transact<ScratchWork | null>('readonly', (store, set) => {
    const req = store.get(id)
    req.onsuccess = () => set(req.result ?? null)
  })
}

function workName(name: string) {
  const clean = name.trim()
  if (!clean || clean.length > MAX_NAME_LENGTH) throw new Error('请输入 1 到 60 个字符的作品名称')
  return clean
}

function checkBytes(sb3: ArrayBuffer) {
  if (sb3.byteLength === 0 || sb3.byteLength > MAX_PROJECT_BYTES) {
    throw new Error('作品为空或超过本工作台支持的大小（约 3.75 MB）')
  }
}

function createWork(name: string, sb3: ArrayBuffer): ScratchWork {
  const now = Date.now()
  return { id: crypto.randomUUID(), name, sb3, createdAt: now, updatedAt: now, revision: 0 }
}

export async function createScratchWork(name: string, sb3: ArrayBuffer) {
  checkBytes(sb3)
  const work = createWork(workName(name), sb3)
  return transact<ScratchWorkSummary>('readwrite', (store, set) => {
    store.add(work)
    set(summary(work))
  })
}

function changeWork<T>(id: string, change: (current: ScratchWork, store: IDBObjectStore) => T) {
  return transact<T>('readwrite', (store, set, fail) => {
    const req = store.get(id)
    req.onsuccess = () => {
      if (!req.result) return fail('未找到此作品。它可能已被删除。')
      try {
        set(change(req.result as ScratchWork, store))
      } catch (error) {
        fail(error instanceof Error ? error.message : '作品库操作失败')
      }
    }
  })
}

export async function saveScratchWork(id: string, revision: number, sb3: ArrayBuffer) {
  checkBytes(sb3)
  return changeWork(id, (current, store) => {
    if (current.revision !== revision) throw new Error('另一窗口已保存此作品。请先导出当前版本，再重新打开作品。')
    const work = { ...current, sb3, revision: revision + 1, updatedAt: Date.now() }
    store.put(work)
    return summary(work)
  })
}

export async function renameScratchWork(id: string, name: string) {
  const clean = workName(name)
  return changeWork(id, (current, store) => {
    store.put({ ...current, name: clean, updatedAt: Date.now() })
  })
}

export function copyScratchWork(id: string) {
  return changeWork(id, (current, store) => {
    const work = createWork(current.name.slice(0, MAX_NAME_LENGTH - 3) + ' 副本', current.sb3)
    store.add(work)
    return summary(work)
  })
}

export function deleteScratchWork(id: string) {
  return changeWork(id, (_, store) => { store.delete(id) })
}
