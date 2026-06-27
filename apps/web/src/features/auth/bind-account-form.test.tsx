import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BindAccountForm } from './bind-account-form'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('@/features/onboarding/onboarding-session', () => ({
  clearOnboardingSession: vi.fn(),
}))

vi.mock('@/features/progress/local-progress', () => ({
  clearGuestProgress: vi.fn(),
}))

import { clearGuestProgress } from '@/features/progress/local-progress'
import { clearOnboardingSession } from '@/features/onboarding/onboarding-session'

function setupForm({
  fetchImpl,
  requestOtp,
  verifyOtp,
}: {
  fetchImpl: ReturnType<typeof vi.fn>
  requestOtp?: ReturnType<typeof vi.fn>
  verifyOtp?: ReturnType<typeof vi.fn>
}) {
  vi.stubGlobal('fetch', fetchImpl)

  const otpRequest = requestOtp ?? vi.fn().mockResolvedValue(undefined)
  const otpVerify = verifyOtp ?? vi.fn().mockResolvedValue(undefined)

  const renderResult = render(
    <BindAccountForm requestOtp={otpRequest} verifyOtp={otpVerify} />,
  )

  async function submitOtp(email: string, token: string) {
    fireEvent.change(screen.getByLabelText('邮箱或手机号'), {
      target: { value: email },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))

    await waitFor(() => {
      expect(otpRequest).toHaveBeenCalledWith('email', email)
    })

    fireEvent.change(screen.getByLabelText('验证码'), {
      target: { value: token },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存我的进度' }))
  }

  return { renderResult, otpRequest, otpVerify, submitOtp }
}

describe('BindAccountForm', () => {
  it('requests an email otp and then verifies it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })

    const { otpVerify, submitOtp } = setupForm({ fetchImpl: fetchMock })

    await submitOtp('family@example.com', '123456')

    await waitFor(() => {
      expect(otpVerify).toHaveBeenCalledWith(
        'email',
        'family@example.com',
        '123456',
      )
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/bind-account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: '小小创作者' }),
      })
    })
  })

  it('clears local guest progress and onboarding session after a successful bind', async () => {
    vi.clearAllMocks()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })

    const { submitOtp } = setupForm({ fetchImpl: fetchMock })

    await submitOtp('family@example.com', '123456')

    await waitFor(() => {
      expect(clearGuestProgress).toHaveBeenCalled()
    })
    expect(clearOnboardingSession).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/parent/overview')
  })

  it('does not clear local progress when otp verification fails', async () => {
    vi.clearAllMocks()
    const fetchMock = vi.fn()
    const verifyOtp = vi.fn().mockRejectedValue(new Error('invalid otp'))

    const { submitOtp } = setupForm({
      fetchImpl: fetchMock,
      verifyOtp,
    })

    await submitOtp('family@example.com', '000000')

    await waitFor(() => {
      expect(screen.getByTestId('bind-account-error')).toHaveTextContent(
        '验证码校验失败',
      )
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(clearGuestProgress).not.toHaveBeenCalled()
    expect(clearOnboardingSession).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('does not clear local progress when the bind-account API fails', async () => {
    vi.clearAllMocks()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'missing-guest-snapshot' }),
    })

    const { submitOtp } = setupForm({ fetchImpl: fetchMock })

    await submitOtp('family@example.com', '123456')

    await waitFor(() => {
      expect(screen.getByTestId('bind-account-error')).toHaveTextContent(
        '没有找到游客进度',
      )
    })
    expect(clearGuestProgress).not.toHaveBeenCalled()
    expect(clearOnboardingSession).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows a generic error when the bind-account API fails without a known payload', async () => {
    vi.clearAllMocks()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'unexpected' }),
    })

    const { submitOtp } = setupForm({ fetchImpl: fetchMock })

    await submitOtp('family@example.com', '123456')

    await waitFor(() => {
      expect(screen.getByTestId('bind-account-error')).toHaveTextContent(
        '绑定失败',
      )
    })
    expect(clearGuestProgress).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})
