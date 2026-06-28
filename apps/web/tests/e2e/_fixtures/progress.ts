export const GUEST_PROGRESS_STORAGE_KEY = 'kc-progress'
export const ONBOARDING_SESSION_STORAGE_KEY = 'kc-onboarding'

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

export const GUEST_PROGRESS_FIXTURE: GuestProgress = {
  completedLessonIds: ['lesson-01-forest-hello'],
  currentLessonId: 'lesson-02-forest-greeting',
  stars: 3,
  badgeIds: ['lesson-lesson-01-forest-hello', 'first-project'],
  cardIds: ['theme-forest-fox', 'growth-first-project'],
  streakDays: 1,
  completedProjectIds: ['lesson-01-forest-hello'],
  projectSnapshots: [
    {
      lessonId: 'lesson-01-forest-hello',
      updatedAt: '2026-03-31T10:00:00.000Z',
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
    },
  ],
}

export const EMPTY_GUEST_PROGRESS: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'lesson-01-forest-hello',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 1,
  completedProjectIds: [],
  projectSnapshots: [],
}

function buildGuestProgressInitScript(progress: GuestProgress): string {
  const key = GUEST_PROGRESS_STORAGE_KEY
  const raw = JSON.stringify(progress)
  return `window.localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(raw)});`
}

function buildOnboardingInitScript(): string {
  const key = ONBOARDING_SESSION_STORAGE_KEY
  const raw = JSON.stringify({
    ageBand: 'age_6_8',
    answers: [],
    recommendedLevel: 'starter',
  })
  return `window.localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(raw)});`
}

export function seedGuestProgress(page: import('@playwright/test').Page, progress: GuestProgress = GUEST_PROGRESS_FIXTURE) {
  return page.addInitScript(buildGuestProgressInitScript(progress))
}

export function seedOnboardingSession(page: import('@playwright/test').Page) {
  return page.addInitScript(buildOnboardingInitScript())
}

export async function readGuestProgressRaw(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), GUEST_PROGRESS_STORAGE_KEY)
}

export async function readOnboardingSessionRaw(page: import('@playwright/test').Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), ONBOARDING_SESSION_STORAGE_KEY)
}
