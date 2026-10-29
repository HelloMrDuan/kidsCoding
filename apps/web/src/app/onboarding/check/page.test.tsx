import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assessmentQuestions } from '@/content/assessment/questions'
import { ONBOARDING_SESSION_STORAGE_KEY } from '@/features/onboarding/onboarding-session'

import AssessmentPage from './page'

const replace = vi.fn()
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}))

// HYDRATION-418: the check page used to read the localStorage session during
// render, so SSR (no session) disagreed with the hydrated render (session)
// and React reported error #418. The session now arrives through
// useSyncExternalStore (default snapshot on the server and during hydration),
// so these tests assert the load path itself: a seeded session reaches the form
// with its progress restored, and an empty session redirects to the age page.
// jsdom cannot reproduce React's hydration error, so the absence of #418 is
// proven by the production-build Chrome E2E, not by this file.
describe('AssessmentPage session load', () => {
  beforeEach(() => {
    replace.mockReset()
    push.mockReset()
    window.localStorage.clear()
  })

  it('restores progress from a seeded session after load', async () => {
    const first = assessmentQuestions[0].options[0]
    window.localStorage.setItem(
      ONBOARDING_SESSION_STORAGE_KEY,
      JSON.stringify({
        ageBand: 'age_9_12',
        answers: [
          { questionId: assessmentQuestions[0].id, optionId: first.id, score: first.score },
        ],
        recommendedLevel: null,
      }),
    )

    render(<AssessmentPage />)

    expect(await screen.findByText('第 2 / 4 题')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('redirects to the age page when no session exists', async () => {
    render(<AssessmentPage />)

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/onboarding/age')
    })
    expect(screen.queryByTestId('assessment-form')).not.toBeInTheDocument()
  })
})
