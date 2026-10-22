import type { OnboardingSession } from '@/features/onboarding/onboarding-session'

import { toGuestSyncPayload } from './guest-snapshot-payload'
import type { GuestProgress } from './local-progress'

export type GuestSyncResult = {
  /** The request reached the server and got a 2xx response. */
  ok: boolean
  /**
   * The server actually persisted the snapshot to the cloud backend.
   * `false` on a 2xx response means the environment has no cloud backend
   * configured (the server reports `synced: false`) — the local save is
   * still real, but there is no cloud copy, so callers must not display
   * "synced to cloud".
   */
  synced: boolean
}

export async function syncGuestSnapshot({
  onboarding,
  progress,
}: {
  onboarding: OnboardingSession
  progress: GuestProgress
}): Promise<GuestSyncResult> {
  let response: Response

  try {
    response = await fetch('/api/guest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // TQ-013: only the minimal whitelist leaves the device; assessment answers,
      // stars, streak and other local-only fields are never uploaded.
      body: JSON.stringify(toGuestSyncPayload({ onboarding, progress })),
    })
  } catch {
    return { ok: false, synced: false }
  }

  if (!response.ok) {
    return { ok: false, synced: false }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, synced: false }
  }

  if (!payload || typeof payload !== 'object') {
    return { ok: false, synced: false }
  }

  return {
    ok: true,
    synced: (payload as { synced?: unknown }).synced === true,
  }
}
