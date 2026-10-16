import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultGuestProgress } from './local-progress'
import { syncGuestSnapshot } from './sync-guest-snapshot'

const PROGRESS = defaultGuestProgress
const ONBOARDING = {} as Parameters<typeof syncGuestSnapshot>[0]['onboarding']

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ guestId: 'guest-1', synced: true }),
    }),
  )
})

describe('syncGuestSnapshot', () => {
  it('reports synced when the server persisted the snapshot to the cloud', async () => {
    await expect(
      syncGuestSnapshot({ onboarding: ONBOARDING, progress: PROGRESS }),
    ).resolves.toEqual({ ok: true, synced: true })
  })

  it('does not report synced when the server has no cloud backend configured', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ guestId: 'guest-1', synced: false }),
    } as Response)

    await expect(
      syncGuestSnapshot({ onboarding: ONBOARDING, progress: PROGRESS }),
    ).resolves.toEqual({ ok: true, synced: false })
  })

  it('reports failure on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    await expect(
      syncGuestSnapshot({ onboarding: ONBOARDING, progress: PROGRESS }),
    ).resolves.toEqual({ ok: false, synced: false })
  })

  it('reports failure when the network request throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))

    await expect(
      syncGuestSnapshot({ onboarding: ONBOARDING, progress: PROGRESS }),
    ).resolves.toEqual({ ok: false, synced: false })
  })

  it('reports failure when the response body is not valid JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('bad json')
      },
    } as Response)

    await expect(
      syncGuestSnapshot({ onboarding: ONBOARDING, progress: PROGRESS }),
    ).resolves.toEqual({ ok: false, synced: false })
  })
})
