const STORAGE_KEY = 'kc-progress'
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
    blocks: Array<{ type: string }>
  }>
}

export const defaultGuestProgress: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'move-character',
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

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (raw === cachedGuestRaw) {
    return cachedGuestSnapshot
  }

  cachedGuestRaw = raw
  cachedGuestSnapshot = raw
    ? ({ ...defaultGuestProgress, ...JSON.parse(raw) } as GuestProgress)
    : defaultGuestProgress

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
  cachedGuestRaw = raw
  cachedGuestSnapshot = next
  window.localStorage.setItem(STORAGE_KEY, raw)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
