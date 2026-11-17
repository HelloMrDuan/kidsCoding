/**
 * OPS-042：L02 课堂在本机的作品存储（IndexedDB，每关一份）。
 *
 * 机制与 OPS-040 舞蹈秀的 project-store 相同（打开库 → 一次读
 * 写事务 → 写完读回校验字节数），不另造一套；只是数据库与键
 * 按本课隔离：key 是关卡 id，另存一条 meta 记录上次停在哪一关。
 * 存储失败（配额、私密模式、数据库损坏）一律向上抛错，由页面
 * 的保存状态机如实显示“未能保存”，不静默吞掉。
 *
 * 注意：这里存的是孩子当前作品的 .sb3 字节，不做任何教学判定。
 */

import type { LevelId } from '../params'

const DB_NAME = 'kidscoding-g2-u3-l02'
const STORE_NAME = 'projects'
const META_KEY = 'meta:lastLevel'

export type StoredProject = {
  bytes: ArrayBuffer
  savedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('打开本机作品库失败'))
  })
}

function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const request = op(tx.objectStore(STORE_NAME))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () =>
          reject(request.error ?? new Error('本机作品库操作失败'))
        tx.oncomplete = () => db.close()
        tx.onerror = () =>
          reject(tx.error ?? new Error('本机作品库操作失败'))
      }),
  )
}

/** 保存一关的作品；写完读回校验字节数，不一致就抛错。 */
export async function saveLevelProject(
  levelId: LevelId,
  bytes: ArrayBuffer,
): Promise<StoredProject> {
  const savedAt = Date.now()
  await run('readwrite', (store) =>
    store.put({ bytes, savedAt }, levelId),
  )
  const readBack = await loadLevelProject(levelId)
  if (!readBack || readBack.bytes.byteLength !== bytes.byteLength) {
    throw new Error('保存后读回校验失败，作品可能没有存好')
  }
  return readBack
}

/** 读取一关已保存的作品；没有返回 null。 */
export async function loadLevelProject(
  levelId: LevelId,
): Promise<StoredProject | null> {
  const record = await run('readonly', (store) => store.get(levelId))
  if (
    !record ||
    typeof record !== 'object' ||
    !(record.bytes instanceof ArrayBuffer)
  ) {
    return null
  }
  return record as StoredProject
}

/** 记住上次停在哪一关（恢复时回到那一关）。 */
export async function saveLastLevel(levelId: LevelId): Promise<void> {
  await run('readwrite', (store) => store.put(levelId, META_KEY))
}

export async function loadLastLevel(): Promise<LevelId | null> {
  const value = await run('readonly', (store) => store.get(META_KEY))
  return typeof value === 'string' ? (value as LevelId) : null
}
