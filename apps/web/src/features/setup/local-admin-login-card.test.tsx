import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalAdminLoginCard } from './local-admin-login-card'

const push = vi.fn()
const signInWithPassword = vi.fn().mockResolvedValue({ error: null })

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithPassword,
    },
  }),
}))

describe('LocalAdminLoginCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs in and redirects to /admin', async () => {
    render(<LocalAdminLoginCard defaultEmail="admin-local@kidscoding.test" />)

    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'admin-local@kidscoding.test' },
    })
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'KidsCodingLocalAdmin123!' },
    })
    fireEvent.click(screen.getByTestId('local-admin-login-submit'))

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'admin-local@kidscoding.test',
        password: 'KidsCodingLocalAdmin123!',
      })
      expect(push).toHaveBeenCalledWith('/admin')
    })
  })

  it('rejects non-default emails before calling Supabase', async () => {
    render(<LocalAdminLoginCard defaultEmail="admin-local@kidscoding.test" />)

    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'other@example.com' },
    })
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'KidsCodingLocalAdmin123!' },
    })
    fireEvent.click(screen.getByTestId('local-admin-login-submit'))

    await waitFor(() => {
      expect(signInWithPassword).not.toHaveBeenCalled()
    })

    expect(screen.getByText('请使用本地管理员邮箱登录。')).toBeInTheDocument()
  })
})
