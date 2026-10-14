import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FeedbackPanel } from './feedback-panel'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('FeedbackPanel', () => {
  it('error tone uses role="alert", other tones use role="status"', () => {
    const { rerender } = render(<FeedbackPanel tone="error" message="运行失败，请重试" />)
    expect(screen.getByRole('alert')).toHaveTextContent('运行失败，请重试')
    rerender(<FeedbackPanel tone="success" message="保存成功" />)
    expect(screen.getByRole('status')).toHaveTextContent('保存成功')
    rerender(<FeedbackPanel tone="warning" message="网络较慢" />)
    expect(screen.getByRole('status')).toHaveTextContent('网络较慢')
    rerender(<FeedbackPanel message="提示信息" />)
    expect(screen.getByRole('status')).toHaveTextContent('提示信息')
  })

  it('renders the title when provided', () => {
    render(<FeedbackPanel tone="error" title="保存失败" message="请检查网络后重试" />)
    expect(screen.getByText('保存失败')).toBeInTheDocument()
    expect(screen.getByText('请检查网络后重试')).toBeInTheDocument()
  })

  it('dismiss button calls onDismiss (positive)', () => {
    const onDismiss = vi.fn()
    render(<FeedbackPanel message="提示" dismissible onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: '关闭提示' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders no dismiss button without onDismiss (no dead button)', () => {
    render(<FeedbackPanel message="提示" dismissible />)
    expect(screen.queryByRole('button', { name: '关闭提示' })).toBeNull()
  })

  it('retry success: calls onRetry once, shows no failure message', async () => {
    const onRetry = vi.fn(() => Promise.resolve())
    render(<FeedbackPanel tone="error" message="保存失败" retry={{ label: '再试一次', onRetry }} />)
    fireEvent.click(screen.getByRole('button', { name: '再试一次' }))
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/重试失败/)).toBeNull()
  })

  it('retry failure: shows the real reason in a nested alert, panel stays, never fakes success', async () => {
    const onRetry = vi.fn(() => Promise.reject(new Error('服务器 500')))
    render(<FeedbackPanel tone="error" message="保存失败" retry={{ label: '再试一次', onRetry }} />)
    fireEvent.click(screen.getByRole('button', { name: '再试一次' }))
    const failure = await screen.findByText('重试失败：服务器 500')
    expect(failure).toHaveAttribute('role', 'alert')
    expect(screen.getByText('保存失败')).toBeInTheDocument()
    // Retry is available again after failure.
    expect(screen.getByRole('button', { name: '再试一次' })).not.toBeDisabled()
  })

  it('ignores extra retry clicks while a retry is running', async () => {
    const gate = deferred<void>()
    const onRetry = vi.fn(() => gate.promise)
    render(<FeedbackPanel tone="error" message="保存失败" retry={{ label: '再试一次', onRetry }} />)
    const button = screen.getByRole('button', { name: '再试一次' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(onRetry).toHaveBeenCalledTimes(1)
    gate.resolve()
    await waitFor(() => expect(button).not.toBeDisabled())
  })
})
