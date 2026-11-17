import type { SnapshotBlock } from './project-snapshot'

export const GUEST_PROGRESS_STORAGE_KEY = 'kc-progress'
const CHANGE_EVENT = 'kc-progress-change'

export type GuestProgress = {
  completedLessonIds: string[]
  currentLessonId: string
  stars: number
  badgeIds: string[]
  cardIds: string[]
  streakDays: number
  completedProjectIds: string[]
  projectSnapshots: Array<{
    lessonId: string
    updatedAt: string
    /** TQ-012: say blocks may carry the chosen preset `line`; older entries have `type` only. */
    blocks: SnapshotBlock[]
  }>
}

export const defaultGuestProgress: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'lesson-01-forest-hello',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 1,
  completedProjectIds: [],
  projectSnapshots: [],
}

let cachedGuestRaw: string | null | undefined
let cachedGuestSnapshot: GuestProgress = defaultGuestProgress

export function readGuestProgress(): GuestProgress {
  if (typeof window === 'undefined') {
    return defaultGuestProgress
  }

  const raw = window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY)

  if (raw === cachedGuestRaw) {
    return cachedGuestSnapshot
  }

  cachedGuestRaw = raw
  if (!raw) {
    cachedGuestSnapshot = defaultGuestProgress
    return cachedGuestSnapshot
  }

  // OPS-046：损坏的进度键不得让读取抛错——完成流程的首行就是
  // readGuestProgress()，一旦抛错且调用方无外层 try/catch，“完成本课”
  // 会静默失败。损坏值不可恢复，丢弃它并回到默认进度（fail-closed，
  // 不伪造任何进度），避免同一损坏键在每次刷新后都再抛一次。
  try {
    cachedGuestSnapshot = { ...defaultGuestProgress, ...JSON.parse(raw) } as GuestProgress
  } catch {
    window.localStorage.removeItem(GUEST_PROGRESS_STORAGE_KEY)
    cachedGuestRaw = null
    cachedGuestSnapshot = defaultGuestProgress
  }

  return cachedGuestSnapshot
}

export function subscribeGuestProgress(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleChange = () => {
    onChange()
  }

  window.addEventListener('storage', handleChange)
  window.addEventListener(CHANGE_EVENT, handleChange)

  return () => {
    window.removeEventListener('storage', handleChange)
    window.removeEventListener(CHANGE_EVENT, handleChange)
  }
}

export function writeGuestProgress(next: GuestProgress) {
  const raw = JSON.stringify(next)
  window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, raw)
  cachedGuestRaw = raw
  cachedGuestSnapshot = next
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function clearGuestProgress() {
  if (typeof window === 'undefined') {
    return
  }

  cachedGuestRaw = null
  cachedGuestSnapshot = defaultGuestProgress
  window.localStorage.removeItem(GUEST_PROGRESS_STORAGE_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
