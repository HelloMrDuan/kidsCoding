import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AgeBandForm } from './age-band-form'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('./onboarding-session', () => ({
  readOnboardingSession: () => ({
    ageBand: null,
    answers: [],
    recommendedLevel: null,
  }),
  writeOnboardingSession: vi.fn(),
}))

describe('AgeBandForm', () => {
  beforeEach(() => {
    push.mockReset()
  })

  it('renders a clear age entry choice with one primary action per card', () => {
    render(<AgeBandForm />)

    expect(screen.getByTestId('age-band-form')).toBeInTheDocument()
    expect(screen.getByText('先选一个年龄入口')).toBeInTheDocument()
    expect(screen.getByText('6-8 岁')).toBeInTheDocument()
    expect(screen.getByText('9-12 岁')).toBeInTheDocument()
    expect(screen.getByText('13 岁以上')).toBeInTheDocument()
    expect(screen.getAllByText('从这里开始')).toHaveLength(3)
  })
})
