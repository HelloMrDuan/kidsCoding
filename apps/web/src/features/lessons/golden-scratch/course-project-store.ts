type ScratchCourseProject = {
  archive: ArrayBuffer
  stepIndex: number
  observed: boolean
  achievementEarned: boolean
  verified: boolean
  revision: number
}

type PreviousCourseProject = Omit<ScratchCourseProject, 'achievementEarned' | 'verified'> & { finished: boolean }

export function restoreCourseProject(project: ScratchCourseProject | PreviousCourseProject | undefined) {
  if (!project || !('finished' in project)) return project
  const { finished, ...draft } = project
  return { ...draft, achievementEarned: finished, verified: false }
}

const DATABASE = 'kidscoding-scratch-course-projects'
const STORE = 'projects'

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DATABASE, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(STORE)
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
    open.onblocked = () => reject(new Error('本机作品库正在被其他窗口占用。'))
  })
}

export async function loadCourseProject(owner: string, lessonId: string) {
  const db = await database()
  try {
    return await new Promise<ScratchCourseProject | undefined>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get([owner, lessonId])
      request.onsuccess = () => resolve(restoreCourseProject(request.result))
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function saveCourseProject(owner: string, lessonId: string, next: ScratchCourseProject) {
  const db = await database()
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const key = [owner, lessonId]
      const request = store.get(key)
      let conflict = false
      const revision = next.revision + 1
      request.onsuccess = () => {
        if ((request.result?.revision ?? 0) !== next.revision) {
          conflict = true
          tx.abort()
          return
        }
        store.put({ ...next, revision }, key)
      }
      tx.oncomplete = () => resolve(revision)
      tx.onabort = () => reject(conflict ? new Error('另一个页面已保存较新版本。请先导出这一份，再打开最新草稿。') : tx.error)
    })
  } finally {
    db.close()
  }
}
