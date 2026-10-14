import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './button'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('Button', () => {
  it('renders a native button with type="button" by default', () => {
    render(<Button>继续学习</Button>)
    const button = screen.getByRole('button', { name: '继续学习' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('kc-action-surface')
  })

  it('fires onClick once on click (positive)', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>运行程序</Button>)
    fireEvent.click(screen.getByRole('button', { name: '运行程序' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is a focusable native button, so the browser provides Enter/Space activation', () => {
    render(<Button>运行程序</Button>)
    const button = screen.getByRole('button', { name: '运行程序' })
    button.focus()
    expect(document.activeElement).toBe(button)
    expect(button).not.toHaveAttribute('tabindex')
  })

  it('honors an explicit type="submit"', () => {
    render(<Button type="submit">提交</Button>)
    expect(screen.getByRole('button', { name: '提交' })).toHaveAttribute('type', 'submit')
  })

  it('disabled: no click, no focus (negative)', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        运行程序
      </Button>,
    )
    const button = screen.getByRole('button', { name: '运行程序' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
    button.focus()
    expect(document.activeElement).not.toBe(button)
  })

  it('loading: spinner + aria-busy, click does not fire (negative)', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        提交中
      </Button>,
    )
    const button = screen.getByRole('button', { name: '提交中' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('async onClick: shows loading until it resolves, then idle again', async () => {
    const gate = deferred<void>()
    const onClick = vi.fn(() => gate.promise)
    render(<Button onClick={onClick}>保存作品</Button>)
    const button = screen.getByRole('button', { name: '保存作品' })
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    gate.resolve()
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'))
    expect(button).not.toBeDisabled()
  })

  it('async onClick rejection: reports via onError and returns to idle, never fakes success', async () => {
    const gate = deferred<void>()
    const onClick = vi.fn(() => gate.promise)
    const onError = vi.fn()
    render(
      <Button onClick={onClick} onError={onError}>
        保存作品
      </Button>,
    )
    const button = screen.getByRole('button', { name: '保存作品' })
    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
    gate.reject(new Error('网络断开'))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe('网络断开')
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'))
    expect(button).not.toBeDisabled()
  })

  it('ignores extra clicks while an async handler is pending', async () => {
    const gate = deferred<void>()
    const onClick = vi.fn(() => gate.promise)
    render(<Button onClick={onClick}>保存作品</Button>)
    const button = screen.getByRole('button', { name: '保存作品' })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    gate.resolve()
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'))
  })

  it('renders variant and size classes', () => {
    const { rerender } = render(<Button variant="outline">次要</Button>)
    expect(screen.getByRole('button', { name: '次要' })).toHaveClass('kc-btn-outline')
    rerender(<Button variant="dark">深色</Button>)
    expect(screen.getByRole('button', { name: '深色' })).toHaveClass('kc-btn-dark')
    rerender(<Button variant="invert">反色</Button>)
    expect(screen.getByRole('button', { name: '反色' })).toHaveClass('kc-btn-invert')
    rerender(
      <Button size="sm">小按钮</Button>,
    )
    expect(screen.getByRole('button', { name: '小按钮' })).toHaveClass('kc-btn-sm')
  })
})
