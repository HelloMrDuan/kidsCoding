import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FirstAdminBootstrapCard } from './first-admin-bootstrap-card'

const push = vi.fn()
const fetchMock = vi.fn()
const requestOtp = vi.fn().mockResolvedValue(undefined)
const verifyOtp = vi.fn().mockResolvedValue(undefined)

vi.stubGlobal('fetch', fetchMock)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      signInWithOtp: ({ email }: { email: string }) => requestOtp(email),
      verifyOtp: ({ email, token }: { email: string; token: string }) =>
        verifyOtp(email, token),
    },
  }),
}))

describe('FirstAdminBootstrapCard', () => {
  it('shows login controls when the user is not logged in and reloads after otp verification', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'not_logged_in' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'ready',
            identityLabel: 'owner@example.com',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    render(<FirstAdminBootstrapCard token="setup-demo-token" />)

    await screen.findByText('请先登录后继续')
    fireEvent.change(screen.getByLabelText('邮箱'), {
      target: { value: 'owner@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))

    await waitFor(() => {
      expect(requestOtp).toHaveBeenCalledWith('owner@example.com')
    })

    fireEvent.change(screen.getByLabelText('验证码'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: '验证并继续' }))

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith('owner@example.com', '123456')
    })
    await screen.findByText('owner@example.com')
  })

  it('submits the bootstrap confirmation and redirects to /admin', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'ready',
            identityLabel: 'owner@example.com',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    render(<FirstAdminBootstrapCard token="setup-demo-token" />)

    await screen.findByText('owner@example.com')
    fireEvent.click(screen.getByTestId('setup-admin-confirm'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/setup/admin/bootstrap',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'setup-demo-token' }),
        }),
      )
    })
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin')
    })
  })
})
