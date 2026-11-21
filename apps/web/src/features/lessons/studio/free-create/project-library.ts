/**
 * 自由创作作品库（Scratch 自由创作工坊）。
 *
 * 与课程作品的区别：不绑定任何课节/关卡，一个孩子可以有多份作品，
 * 每份有独立的 id、名字和保存时间。数据只存在孩子自己的浏览器
 * IndexedDB 里，不上传、不跨站共享。
 *
 * 设计约束：
 * - 存储层通过 `ProjectStore` 接口注入：浏览器用 IndexedDB 实现，
 *   单元测试用内存实现（jsdom 没有 IndexedDB，不伪造浏览器行为）。
 * - 读出的记录必须重新校验（.sb3 是二进制，可能被外部篡改或在
 *   半途失败的写入中损坏），坏记录跳过而不是让整页崩溃。
 * - 删除是显式动作；没有“自动清理”路径。
 */

export const FREE_CREATE_DB = 'kidscoding-free-create'
export const FREE_CREATE_STORE = 'projects'
export const FREE_CREATE_META = 'meta'
export const FREE_CREATE_DB_VERSION = 1

export interface StoredProject {
  id: string
  name: string
  /** 完整 .sb3 二进制。 */
  sb3: ArrayBuffer
  savedAt: number
  byteLength: number
}

/** 列表只需要元数据，不把每份 .sb3 都读进内存。 */
export interface ProjectSummary {
  id: string
  name: string
  savedAt: number
  byteLength: number
}

export interface ProjectStore {
  list(): Promise<ProjectSummary[]>
  get(id: string): Promise<StoredProject | null>
  put(project: StoredProject): Promise<void>
  remove(id: string): Promise<void>
  getLastOpened(): Promise<string | null>
  setLastOpened(id: string | null): Promise<void>
}

export function newProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `project-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

/** 名称规范化：去首尾空白、压缩连续空白、限长；空名回退为“我的作品”。 */
export function normalizeProjectName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  if (trimmed.length === 0) return '我的作品'
  return trimmed.slice(0, 24)
}

/** 默认作品名：按现有份数递增，跳过已用名字。 */
export function defaultProjectName(existing: readonly ProjectSummary[]): string {
  const used = new Set(existing.map((project) => project.name))
  for (let i = 1; i < 1000; i += 1) {
    const name = i === 1 ? '我的作品' : `我的作品 ${i}`
    if (!used.has(name)) return name
  }
  return `我的作品 ${Date.now()}`
}

function isStoredProject(value: unknown): value is StoredProject {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<StoredProject>
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.name === 'string' &&
    record.name.length > 0 &&
    record.sb3 instanceof ArrayBuffer &&
    record.sb3.byteLength > 0 &&
    typeof record.savedAt === 'number' &&
    typeof record.byteLength === 'number'
  )
}

function toSummary(project: StoredProject): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    savedAt: project.savedAt,
    byteLength: project.byteLength,
  }
}

/** 浏览器端 IndexedDB 实现。IndexedDB 不可用时明确抛错，不静默丢作品。 */
export function createIndexedDbProjectStore(): ProjectStore {
  function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('浏览器不支持 IndexedDB，作品无法保存到本机'))
        return
      }
      const request = indexedDB.open(FREE_CREATE_DB, FREE_CREATE_DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(FREE_CREATE_STORE)) {
          db.createObjectStore(FREE_CREATE_STORE)
        }
        if (!db.objectStoreNames.contains(FREE_CREATE_META)) {
          db.createObjectStore(FREE_CREATE_META)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(new Error(`打开作品库失败：${request.error?.message ?? 'IndexedDB error'}`))
    })
  }

  function run(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest,
  ): Promise<unknown> {
    return openDb().then(
      (db) =>
        new Promise<unknown>((resolve, reject) => {
          const tx = db.transaction(storeName, mode)
          let result: unknown
          let readDone = false
          tx.oncomplete = () => {
            db.close()
            if (readDone) resolve(result)
          }
          tx.onerror = () => {
            db.close()
            reject(new Error(`作品库操作失败：${tx.error?.message ?? 'IndexedDB error'}`))
          }
          tx.onabort = () => {
            db.close()
            reject(new Error('作品库操作被中止'))
          }
          try {
            const request = fn(tx.objectStore(storeName))
            request.onsuccess = () => {
              result = request.result
              readDone = true
            }
          } catch (error) {
            db.close()
            reject(error instanceof Error ? error : new Error(String(error)))
          }
        }),
    )
  }

  return {
    async list() {
      const records = (await run(FREE_CREATE_STORE, 'readonly', (store) => store.getAll())) as unknown[]
      return records
        .filter(isStoredProject)
        .map(toSummary)
        .sort((a, b) => b.savedAt - a.savedAt)
    },
    async get(id) {
      const record = await run(FREE_CREATE_STORE, 'readonly', (store) => store.get(id))
      return isStoredProject(record) ? record : null
    },
    async put(project) {
      if (!isStoredProject(project)) throw new Error('作品记录不完整，未保存')
      await run(FREE_CREATE_STORE, 'readwrite', (store) => store.put(project, project.id))
    },
    async remove(id) {
      await run(FREE_CREATE_STORE, 'readwrite', (store) => store.delete(id))
    },
    async getLastOpened() {
      const id = await run(FREE_CREATE_META, 'readonly', (store) => store.get('lastOpened'))
      return typeof id === 'string' && id.length > 0 ? id : null
    },
    async setLastOpened(id) {
      await run(FREE_CREATE_META, 'readwrite', (store) =>
        id === null ? store.delete('lastOpened') : store.put(id, 'lastOpened'),
      )
    },
  }
}

/** 仅用于单元测试的内存实现（不参与生产路径）。 */
export function createMemoryProjectStore(initial: StoredProject[] = []): ProjectStore {
  const projects = new Map<string, StoredProject>(initial.map((p) => [p.id, p]))
  let lastOpened: string | null = null
  return {
    async list() {
      return [...projects.values()].map(toSummary).sort((a, b) => b.savedAt - a.savedAt)
    },
    async get(id) {
      return projects.get(id) ?? null
    },
    async put(project) {
      if (!isStoredProject(project)) throw new Error('作品记录不完整，未保存')
      projects.set(project.id, project)
    },
    async remove(id) {
      projects.delete(id)
      if (lastOpened === id) lastOpened = null
    },
    async getLastOpened() {
      return lastOpened
    },
    async setLastOpened(id) {
      lastOpened = id
    },
  }
}
