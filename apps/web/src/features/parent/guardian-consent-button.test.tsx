import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GuardianConsentButton } from './guardian-consent-button'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
  }),
}))

describe('guardian consent button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the grant and refreshes the status on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchImpl)
    render(<GuardianConsentButton />)
    fireEvent.click(screen.getByTestId('guardian-consent-grant'))
    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalledWith('/api/guardian-consent', { method: 'POST' })
    })
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled()
    })
    expect(screen.queryByText('确认失败，请重试。')).toBeNull()
  })

  it('shows a retry note and does not refresh when the grant fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchImpl)
    render(<GuardianConsentButton />)
    fireEvent.click(screen.getByTestId('guardian-consent-grant'))
    await waitFor(() => {
      expect(screen.getByText('确认失败，请重试。')).toBeTruthy()
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
