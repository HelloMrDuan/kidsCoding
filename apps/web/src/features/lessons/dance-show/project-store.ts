/**
 * OPS-038 Round 2（P1）：《我的舞蹈秀》作品持久化。
 *
 * 作品有保存动作（桥接取回新作品，或文件通道读到作品）时，把完整 .sb3
 * 存到浏览器 IndexedDB（不要只靠内存）；页面加载时若库里有已保存作品，
 * 通过桥接把它载入 GUI，恢复上次的作品。保存、关闭、重新打开后作品仍在。
 *
 * 安全与隐私：只存本页自己的作品（key 固定为 'current'，单份）；
 * 不上传、不跨站共享；数据只在孩子自己的浏览器里。
 * IndexedDB 不可用时（隐私模式禁用等）抛错，调用方如实提示，不静默丢作品。
 */

const DB_NAME = 'kidscoding-dance-show'
const STORE_NAME = 'projects'
const CURRENT_KEY = 'current'
const DB_VERSION = 1

export interface SavedProject {
  /** 完整 .sb3 二进制。 */
  sb3: ArrayBuffer
  /** 保存时的时间戳（毫秒）。 */
  savedAt: number
  /** .sb3 字节数。 */
  byteLength: number
  /** 来源：桥接取回，还是文件通道读到。 */
  source: 'bridge' | 'file'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('浏览器不支持 IndexedDB，作品无法保存到本机'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () =>
      reject(
        new Error(
          `打开作品库失败：${req.error?.message ?? 'IndexedDB error'}`,
        ),
      )
  })
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        let result: T | undefined
        let done = false
        tx.oncomplete = () => {
          db.close()
          if (done) resolve(result as T)
        }
        tx.onerror = () => {
          db.close()
          reject(
            new Error(
              `作品库操作失败：${tx.error?.message ?? 'IndexedDB error'}`,
            ),
          )
        }
        tx.onabort = () => {
          db.close()
          reject(new Error('作品库操作被中止'))
        }
        try {
          const req = fn(tx.objectStore(STORE_NAME))
          req.onsuccess = () => {
            result = req.result
            done = true
          }
          req.onerror = () => {
            // 事务的 onerror 也会触发；这里只记结果，避免重复 reject。
          }
        } catch (e) {
          db.close()
          reject(e instanceof Error ? e : new Error(String(e)))
        }
      }),
  )
}

/** 保存当前作品（覆盖上一份）。返回保存时间戳。 */
export async function saveProjectToStore(
  sb3: ArrayBuffer,
  source: SavedProject['source'],
): Promise<number> {
  const savedAt = Date.now()
  const record: SavedProject = {
    sb3,
    savedAt,
    byteLength: sb3.byteLength,
    source,
  }
  await run('readwrite', (store) => store.put(record, CURRENT_KEY))
  return savedAt
}

/** 读出上次保存的作品；没有保存过时返回 null。 */
export async function loadSavedProject(): Promise<SavedProject | null> {
  const record = await run<SavedProject | undefined>('readonly', (store) =>
    store.get(CURRENT_KEY),
  )
  if (!record || !(record.sb3 instanceof ArrayBuffer)) return null
  return record
}

/** 清空已保存的作品（需要时调用；正常流程不自动清空）。 */
export async function clearSavedProject(): Promise<void> {
  await run('readwrite', (store) => store.delete(CURRENT_KEY))
}
