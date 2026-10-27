// Stores genuine Scratch VM .sb3 bytes per G2 lesson in this browser's IndexedDB.
// Separate database from the G3 meteor lab; never uploads, never a verified grade.
const DATABASE = 'kidscoding-scratch-g2-v1'
const STORE = 'projects'
const LIMIT = 5_000_000

export function isG2Archive(value: unknown): value is ArrayBuffer {
  if (!(value instanceof ArrayBuffer) || value.byteLength < 300 || value.byteLength > LIMIT) return false
  const header = new Uint8Array(value, 0, 2)
  return header[0] === 0x50 && header[1] === 0x4b
}

/** Decode a checked-in base64 sample (.sb3.b64) back into the original .sb3 zip bytes. */
export function decodeSampleArchive(text: string): ArrayBuffer {
  const clean = text.replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw new Error('课程示例编码无效')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  if (!isG2Archive(bytes.buffer)) throw new Error('课程示例不是有效的 Scratch 项目')
  return bytes.buffer
}

export function isG2LessonKey(lessonId: string): boolean {
  return /^G2-U\d-L\d{2}$/.test(lessonId)
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('浏览器不支持 IndexedDB')); return }
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('本机数据库打开失败'))
    request.onblocked = () => reject(new Error('本机数据库被其他页面占用'))
  })
}

export async function readG2Draft(lessonId: string): Promise<ArrayBuffer | null> {
  if (!isG2LessonKey(lessonId)) return null
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(lessonId)
      req.onsuccess = () => {
        const candidate: unknown = req.result?.archive
        resolve(isG2Archive(candidate) ? candidate : null)
      }
      req.onerror = () => reject(req.error ?? new Error('草稿读取失败'))
    })
  } finally { db.close() }
}

export async function saveG2Draft(lessonId: string, archive: ArrayBuffer): Promise<void> {
  if (!isG2LessonKey(lessonId)) throw new Error('课程编号无效')
  if (!isG2Archive(archive)) throw new Error('不是有效的 Scratch 项目文件')
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({archive, savedAt: new Date().toISOString()}, lessonId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('本机保存失败'))
      tx.onabort = () => reject(tx.error ?? new Error('本机保存已取消'))
    })
  } finally { db.close() }
}

export async function removeG2Draft(lessonId: string): Promise<void> {
  if (!isG2LessonKey(lessonId)) return
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(lessonId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('删除本机草稿失败'))
      tx.onabort = () => reject(tx.error ?? new Error('删除本机草稿已取消'))
    })
  } finally { db.close() }
}
