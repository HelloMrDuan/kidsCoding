import type {
  AgeBand,
  AssessmentAnswer,
  StartLevel,
} from '@/features/domain/types'

const STORAGE_KEY = 'kc-onboarding'
const CHANGE_EVENT = 'kc-onboarding-change'

export type OnboardingSession = {
  ageBand: AgeBand | null
  answers: AssessmentAnswer[]
  recommendedLevel: StartLevel | null
}

export const defaultOnboardingSession: OnboardingSession = {
  ageBand: null,
  answers: [],
  recommendedLevel: null,
}

let cachedOnboardingRaw: string | null | undefined
let cachedOnboardingSnapshot: OnboardingSession = defaultOnboardingSession

export function readOnboardingSession(): OnboardingSession {
  if (typeof window === 'undefined') {
    return defaultOnboardingSession
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (raw === cachedOnboardingRaw) {
    return cachedOnboardingSnapshot
  }

  cachedOnboardingRaw = raw
  cachedOnboardingSnapshot = raw
    ? (JSON.parse(raw) as OnboardingSession)
    : defaultOnboardingSession

  return cachedOnboardingSnapshot
}

export function subscribeOnboardingSession(onChange: () => void) {
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

export function writeOnboardingSession(session: OnboardingSession) {
  const raw = JSON.stringify(session)
  cachedOnboardingRaw = raw
  cachedOnboardingSnapshot = session
  window.localStorage.setItem(STORAGE_KEY, raw)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
