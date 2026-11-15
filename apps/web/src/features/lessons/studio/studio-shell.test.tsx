import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEMO_A, DEMO_SLOT } from '../workspace/demo-contracts'
import type { ShellControl } from '../workspace/workspace-slots'
import { StudioShell } from './studio-shell'
import type { StudioLesson } from './studio-lesson'

function lesson(overrides: Partial<StudioLesson> = {}): StudioLesson {
  return {
    ...DEMO_SLOT.contract,
    backHref: '/learn/map',
    help: { title: '本课帮助', body: ['第一步：读目标', '第二步：做任务'] },
    ...overrides,
  }
}

function fakeControl(overrides: Partial<ShellControl> = {}): ShellControl {
  return {
    run: vi.fn(),
    stop: vi.fn(),
    save: vi.fn(),
    running: false,
    saveState: 'unsaved',
    judgment: null,
    file: {
      newLesson: vi.fn(),
      export: vi.fn(),
      import: vi.fn(),
      reset: vi.fn(),
      capabilities: { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true },
    },
    stage: { visible: true, toggle: vi.fn(), canToggle: true },
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('StudioShell topbar', () => {
  it('renders back / title / demo badge / progress / current goal from the contract only', () => {
    render(
      <StudioShell lesson={lesson()}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.getByTestId('studio-back')).toHaveAttribute('href', '/learn/map')
    expect(screen.getByTestId('studio-title')).toHaveTextContent('演示：插槽课自查清单')
    expect(screen.getByTestId('studio-demo-badge')).toHaveTextContent('演示')
    expect(screen.getByTestId('studio-progress')).toHaveTextContent('演示进度 1/3')
    expect(screen.getByTestId('studio-goal-current')).toHaveTextContent(
      '今天学什么：通用插槽课（slot 引擎）如何工作',
    )
  })

  it('shows the step text when the contract has no progress', () => {
    render(
      <StudioShell lesson={{ ...DEMO_A.contract, backHref: '/learn/map' }}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.getByTestId('studio-progress')).toHaveTextContent('当前步骤：搭脚本并运行一次')
  })

  it('shows no save chip until the workspace reports a save state — never a fabricated one', () => {
    render(
      <StudioShell lesson={lesson()}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.queryByTestId('studio-save-chip')).toBeNull()
  })

  it('renders the reported save state in the topbar chip', () => {
    const { rerender } = render(
      <StudioShell lesson={lesson()} saveState="unsaved">
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.getByTestId('studio-save-chip')).toHaveTextContent('未保存')
    rerender(
      <StudioShell lesson={lesson()} saveState="saved">
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.getByTestId('studio-save-chip')).toHaveTextContent('已保存到本机')
    rerender(
      <StudioShell lesson={lesson()} saveState="failed" saveMessage="草稿超限">
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.getByTestId('studio-save-chip')).toHaveTextContent('未能保存')
    expect(screen.getByTestId('studio-save-message')).toHaveTextContent('草稿超限')
  })

  it('has no run button in the topbar — run stays inside the editor area', () => {
    render(
      <StudioShell lesson={lesson()}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    const topbar = screen.getByTestId('studio-topbar')
    expect(within(topbar).queryByText(/运行/)).toBeNull()
    expect(within(topbar).queryByTestId(/run/)).toBeNull()
  })
})

describe('StudioShell guidance drawer', () => {
  it('is closed by default and opens from the topbar with contract content', () => {
    render(
      <StudioShell lesson={lesson()}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.queryByTestId('studio-guide-drawer')).toBeNull()
    fireEvent.click(screen.getByTestId('studio-guide-button'))
    const drawer = screen.getByTestId('studio-guide-drawer')
    expect(within(drawer).getByTestId('studio-goal5').querySelectorAll('li')).toHaveLength(5)
    expect(within(drawer).getByText('演示任务：勾选三项自查清单，点检查看插槽内结果，并保存到本机。')).toBeTruthy()
    expect(within(drawer).getByText('本课帮助')).toBeTruthy()
    fireEvent.click(screen.getByTestId('studio-guide-close'))
    expect(screen.queryByTestId('studio-guide-drawer')).toBeNull()
  })

  it('toggling the drawer does not remount the editor child (same DOM node)', () => {
    render(
      <StudioShell lesson={lesson()}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    const before = screen.getByTestId('studio-child-editor')
    fireEvent.click(screen.getByTestId('studio-guide-button'))
    fireEvent.click(screen.getByTestId('studio-guide-close'))
    fireEvent.click(screen.getByTestId('studio-guide-button'))
    fireEvent.click(screen.getByTestId('studio-guide-button'))
    expect(screen.getByTestId('studio-child-editor')).toBe(before)
  })

  it('reveals hints progressively, never the answer level first', () => {
    render(
      <StudioShell lesson={lesson()}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    fireEvent.click(screen.getByTestId('studio-guide-button'))
    expect(screen.queryByTestId('studio-hint-1')).toBeNull()
    fireEvent.click(screen.getByTestId('studio-hint-reveal-1'))
    expect(screen.getByTestId('studio-hint-1')).toHaveTextContent('三项分别是什么？先读一遍再勾。')
    expect(screen.queryByTestId('studio-hint-2')).toBeNull()
    fireEvent.click(screen.getByTestId('studio-hint-reveal-3'))
    expect(screen.getByTestId('studio-hint-2')).toHaveTextContent('点检查，结果只在插槽内显示。')
    expect(screen.getByTestId('studio-hint-3')).toHaveTextContent('改动后旧结果失效，重新点检查。')
  })
})

describe('StudioShell file menu and stage toggle', () => {
  it('drives the workspace file actions through ShellControl and hides unsupported ones', () => {
    const control = fakeControl({
      file: {
        newLesson: vi.fn(),
        export: vi.fn(),
        import: vi.fn(),
        reset: vi.fn(),
        capabilities: { canNew: true, canSave: true, canExport: false, canImport: true, canReset: true },
      },
    })
    render(
      <StudioShell lesson={lesson()} shellControl={control}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.queryByTestId('studio-file-menu')).toBeNull()
    fireEvent.click(screen.getByTestId('studio-file-menu-button'))
    const menu = screen.getByTestId('studio-file-menu')
    expect(within(menu).queryByTestId('studio-file-export')).toBeNull()
    fireEvent.click(within(menu).getByTestId('studio-file-save'))
    expect(control.save).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('studio-file-menu-button'))
    fireEvent.click(within(screen.getByTestId('studio-file-menu')).getByTestId('studio-file-new'))
    expect(control.file?.newLesson).toHaveBeenCalledTimes(1)
  })

  it('shows no file menu when the workspace reports no file surface', () => {
    const control = fakeControl({ file: undefined })
    render(
      <StudioShell lesson={lesson()} shellControl={control}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.queryByTestId('studio-file-menu-button')).toBeNull()
  })

  it('shows the stage toggle only when the stage can toggle, and calls toggle', () => {
    const control = fakeControl()
    render(
      <StudioShell lesson={lesson()} shellControl={control}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.getByTestId('studio-stage-toggle')).toHaveTextContent('隐藏舞台')
    fireEvent.click(screen.getByTestId('studio-stage-toggle'))
    expect(control.stage?.toggle).toHaveBeenCalledTimes(1)
  })

  it('hides the stage toggle when the lesson has no stage', () => {
    const control = fakeControl({ stage: { visible: false, toggle: vi.fn(), canToggle: false } })
    render(
      <StudioShell lesson={lesson()} shellControl={control}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.queryByTestId('studio-stage-toggle')).toBeNull()
  })
})

describe('StudioShell fail-closed', () => {
  it('renders the validation errors and no editor for an invalid contract', () => {
    const bad = { ...DEMO_A.contract, backHref: '' } as unknown as StudioLesson
    render(
      <StudioShell lesson={bad}>
        <div data-testid="studio-child-editor">编辑器</div>
      </StudioShell>,
    )
    expect(screen.getByTestId('studio-shell-invalid')).toHaveTextContent('backHref')
    expect(screen.queryByTestId('studio-child-editor')).toBeNull()
    expect(screen.queryByTestId('studio-topbar')).toBeNull()
  })
})
