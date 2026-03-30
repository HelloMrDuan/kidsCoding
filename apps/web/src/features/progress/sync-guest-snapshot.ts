import type { OnboardingSession } from '@/features/onboarding/onboarding-session'

import type { GuestProgress } from './local-progress'

export async function syncGuestSnapshot({
  onboarding,
  progress,
}: {
  onboarding: OnboardingSession
  progress: GuestProgress
}) {
  await fetch('/api/guest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ onboarding, progress }),
  })
}
