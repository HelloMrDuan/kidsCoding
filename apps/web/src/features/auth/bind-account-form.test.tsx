import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BindAccountForm } from './bind-account-form'

const push = vi.fn()
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ ok: true }),
})

vi.stubGlobal('fetch', fetchMock)

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}))

describe('BindAccountForm', () => {
  it('requests an email otp and then verifies it', async () => {
    const requestOtp = vi.fn().mockResolvedValue(undefined)
    const verifyOtp = vi.fn().mockResolvedValue(undefined)

    render(
      <BindAccountForm requestOtp={requestOtp} verifyOtp={verifyOtp} />,
    )

    fireEvent.change(screen.getByLabelText('邮箱或手机号'), {
      target: { value: 'family@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))

    await waitFor(() => {
      expect(requestOtp).toHaveBeenCalledWith('email', 'family@example.com')
    })

    fireEvent.change(screen.getByLabelText('验证码'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存我的进度' }))

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith(
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
})
