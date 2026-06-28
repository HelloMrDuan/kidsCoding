import { expect, test } from '@playwright/test'

import { FIRST_LAUNCH_LESSON_ID } from './_fixtures/curriculum'

// Admin pages may render in ENABLE_ADMIN_BYPASS mode for E2E, but the
// server-side APIs must ALWAYS enforce auth — they return 503 when Supabase
// is not configured and never trust the caller. These tests verify the
// server-side authorization boundary regardless of page-level bypass.

test.describe('admin API authorization', () => {
  test('admin lesson API rejects unauthenticated requests with 503', async ({
    request,
  }) => {
    const response = await request.get(
      `/api/admin/lessons/${FIRST_LAUNCH_LESSON_ID}`,
    )
    // Without Supabase env, the API returns 503 (supabase-unavailable).
    // Without service role the API never trusts the caller.
    expect(response.status()).toBe(503)
    const body = await response.json()
    expect(body).toEqual({ error: 'supabase-unavailable' })
  })

  test('admin lesson draft API rejects unauthenticated requests with 503', async ({
    request,
  }) => {
    const response = await request.post(
      `/api/admin/lessons/${FIRST_LAUNCH_LESSON_ID}/draft`,
      {
        data: {
          lesson: {
            id: FIRST_LAUNCH_LESSON_ID,
            title: 'tampered',
            goal: 'x',
            steps: [],
            hintLayers: [],
            phase: 'trial',
            mode: 'guided',
            sortOrder: 1,
          },
        },
      },
    )
    expect(response.status()).toBe(503)
  })

  test('admin lesson publish API rejects unauthenticated requests with 503', async ({
    request,
  }) => {
    const response = await request.post(
      `/api/admin/lessons/${FIRST_LAUNCH_LESSON_ID}/publish`,
    )
    expect(response.status()).toBe(503)
  })

  test('admin AI settings API rejects unauthenticated requests with 503', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/ai/settings', {
      data: {
        defaultProviderSlot: 'secondary',
        defaultModel: 'qwen2.5-coder:7b',
      },
    })
    expect(response.status()).toBe(503)
  })

  test('admin generate skeleton API rejects unauthenticated requests with 503', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/ai/curriculum-skeleton')
    expect(response.status()).toBe(503)
  })

  test('admin generate draft API rejects unauthenticated requests with 503', async ({
    request,
  }) => {
    const response = await request.post(
      `/api/admin/ai/lessons/${FIRST_LAUNCH_LESSON_ID}/generate-draft`,
    )
    expect(response.status()).toBe(503)
  })
})
