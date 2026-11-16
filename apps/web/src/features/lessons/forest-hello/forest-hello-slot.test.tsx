import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EditorSlotProps } from '@/features/lessons/workspace/workspace-slots'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { ForestSessionContext } from './forest-hello-session'
import { createForestSessionStore } from './forest-hello-session'
import { ForestRunAdapter } from './forest-hello-run-adapter'
import { buildForestJudgment, judgeForestStep } from './forest-hello-judging'
import { emptyForestDraft } from './forest-hello-draft'
import { ForestEditorSlot, resetForestSlotLastGoodForTest } from './forest-hello-slot'

/**
 * 插槽单测：BlocklyWorkspace 在 jsdom 里无法 inject（L01 插槽测试同款
 * 说明），此处只 mock 编辑面本身——mock 按 props.blocks 展示当前程序，
 * 并提供按钮模拟快照变化；判定、完成门控、错误实验流转、旧草稿导入等
 * 插槽逻辑保持真实。
 */
vi.mock('@/features/lessons/blockly/blockly-workspace', () => ({
  BlocklyWorkspace: ({
    blocks,
    onSnapshotChange,
  }: {
    blocks: unknown[]
    onSnapshotChange: (blocks: unknown[]) => void
  }) => (
    <div data-testid="mock-blockly" data-blocks={JSON.stringify(blocks)}>
      <button
        type="button"
        data-testid="mock-snapshot-pass-step2"
        onClick={() => onSnapshotChange([{ type: 'when_start' }, { type: 'move_right' }])}
      >
        模拟第 2 关通过程序
      </button>
      <button
        type="button"
        data-testid="mock-snapshot-wrong"
        onClick={() => onSnapshotChange([{ type: 'move_right' }])}
      >
        模拟错误程序
      </button>
      <button
        type="button"
        data-testid="mock-snapshot-fixed-step4"
        onClick={() => onSnapshotChange([{ type: 'when_start' }, { type: 'move_right' }])}
      >
        模拟第 4 关修好程序
      </button>
    </div>
  ),
}))

const START = { type: 'when_start' }
const MOVE = { type: 'move_right' }

function fakeShell(overrides: Partial<EditorSlotProps['shell']> = {}): EditorSlotProps['shell'] {
  return {
    run: vi.fn(),
    stop: vi.fn(),
    save: vi.fn(),
    running: false,
    saveState: 'unsaved',
    judgment: null,
    ...overrides,
  }
}

function renderSlot(initial: unknown, shell = fakeShell()) {
  const onChange = vi.fn()
  const onJudgment = vi.fn()
  const store = createForestSessionStore()
  const runAdapter = new ForestRunAdapter({
    isStepObserved: (stepId) => store.getState().observed.includes(stepId),
  })
  const utils = render(
    <ForestSessionContext.Provider value={{ store, runAdapter }}>
      <ForestEditorSlot
        lessonId="lesson-01-forest-hello"
        initial={initial}
        onChange={onChange}
        onJudgment={onJudgment}
        editable
        shell={shell}
      />
    </ForestSessionContext.Provider>,
  )
  return { ...utils, onChange, onJudgment, shell, store, runAdapter }
}

beforeEach(() => {
  resetForestSlotLastGoodForTest()
  window.sessionStorage.clear()
  window.localStorage.clear()
  push.mockClear()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ synced: true }) }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ForestEditorSlot (mocked Blockly surface)', () => {
  it('shows step 1 with its instruction and voiceover', async () => {
    renderSlot(emptyForestDraft())
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('forest-hello-step-progress')).toHaveTextContent('第 1 / 4 关')
    expect(screen.getByTestId('forest-hello-step-title')).toHaveTextContent('认识小狐狸和开始积木')
    expect(screen.getByTestId('forest-hello-instruction')).toHaveTextContent('只有“开始时”，小狐狸会走吗？')
    expect(screen.getByTestId('forest-hello-voiceover')).toHaveTextContent('主语音：先放开始积木，认识今天的小狐狸。')
    expect(screen.getByTestId('mock-blockly')).toHaveAttribute('data-blocks', '[]')
  })

  it('the slot root scrolls internally (studio 100dvh: bottom buttons must stay reachable)', async () => {
    // E2E N4/N6 回归：根节点不滚动时，内容高于编辑列，底部“保存作品”
    // 与旧草稿导入按钮落在外壳反馈条下方、无法点击（无任何可滚动祖先）。
    renderSlot(emptyForestDraft())
    await screen.findByTestId('mock-blockly')
    const root = screen.getByTestId('forest-hello-slot')
    expect(root.style.height).toBe('100%')
    expect(root.style.overflowY).toBe('auto')
  })

  it('a snapshot change persists through onChange (step-2 pass program)', async () => {
    const draft = emptyForestDraft()
    draft.stepIndex = 1
    const { onChange } = renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('mock-snapshot-pass-step2'))
    expect(onChange).toHaveBeenCalled()
    const persisted = onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyForestDraft>
    expect(persisted.programs['step-2']).toEqual([START, MOVE])
    expect(persisted.stepIndex).toBe(1)
  })

  it('complete is blocked before a successful run, then advances after a passed judgment', async () => {
    const draft = emptyForestDraft()
    draft.stepIndex = 1
    draft.programs['step-2'] = [START, MOVE]
    const shell = fakeShell()
    const { rerender, onChange, store, runAdapter } = renderSlot(draft, shell)
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('forest-hello-complete-step'))
    expect(screen.getByTestId('forest-hello-notice')).toHaveTextContent('请先点击舞台上的“运行”按钮观察结果')
    // A passed run: the judgment effect marks the step passed.
    const passed = buildForestJudgment(judgeForestStep([START, MOVE], 1, false), 1)
    expect(passed.passed).toBe(true)
    rerender(
      <ForestSessionContext.Provider value={{ store, runAdapter }}>
        <ForestEditorSlot
          lessonId="lesson-01-forest-hello"
          initial={draft}
          onChange={onChange}
          editable
          shell={fakeShell({ judgment: passed })}
        />
      </ForestSessionContext.Provider>,
    )
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('forest-hello-complete-step'))
    const advanced = onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyForestDraft>
    expect(advanced.stepIndex).toBe(2)
    expect(screen.getByTestId('forest-hello-step-progress')).toHaveTextContent('第 3 / 4 关')
  })

  it('step-4: a designed-mistake run marks observed in the session store, not the draft', async () => {
    const draft = emptyForestDraft()
    draft.stepIndex = 3
    const shell = fakeShell()
    const { rerender, onChange, store, runAdapter } = renderSlot(draft, shell)
    await screen.findByTestId('mock-blockly')
    const mistakeJudgment = buildForestJudgment(judgeForestStep([MOVE], 3, false), 3)
    expect(mistakeJudgment.conclusion).toContain('错误实验已观察')
    rerender(
      <ForestSessionContext.Provider value={{ store, runAdapter }}>
        <ForestEditorSlot
          lessonId="lesson-01-forest-hello"
          initial={draft}
          onChange={onChange}
          editable
          shell={fakeShell({ judgment: mistakeJudgment })}
        />
      </ForestSessionContext.Provider>,
    )
    await screen.findByTestId('mock-blockly')
    expect(store.getState().observed).toEqual(['step-4'])
    // The draft itself records no observation (session-only) and no failure.
    const persisted = onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyForestDraft> | undefined
    expect(persisted?.failures ?? 0).toBe(0)
  })

  it('rejects a foreign-lesson import and echoes the empty draft', async () => {
    const { onChange } = renderSlot({ lessonId: 'someone-else', stepIndex: 0, programs: {} })
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('forest-hello-notice')).toHaveTextContent('导入文件属于其他课节，已拒绝')
    expect(onChange).toHaveBeenCalledWith(emptyForestDraft())
  })

  it('offers a one-click legacy import when the new draft is empty and the old route left a draft', async () => {
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-01-forest-hello:0',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-01-forest-hello',
        stepIndex: 0,
        blocks: [START],
        updatedAt: new Date().toISOString(),
      }),
    )
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-01-forest-hello:1',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-01-forest-hello',
        stepIndex: 1,
        blocks: [START, MOVE],
        updatedAt: new Date().toISOString(),
      }),
    )
    const { onChange } = renderSlot(emptyForestDraft())
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('forest-hello-legacy-import')).toHaveTextContent('到第 2 关')
    fireEvent.click(screen.getByTestId('forest-hello-import-legacy'))
    const imported = onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyForestDraft>
    expect(imported.stepIndex).toBe(1)
    expect(imported.programs['step-2']).toEqual([START, MOVE])
    expect(imported.passed).toEqual([])
    // The legacy draft is kept, never deleted.
    expect(window.sessionStorage.getItem('kc-lesson-draft:lesson-01-forest-hello:1')).not.toBeNull()
    expect(screen.queryByTestId('forest-hello-legacy-import')).toBeNull()
  })

  it('does not offer the legacy import when the new draft is not empty', async () => {
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-01-forest-hello:0',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-01-forest-hello',
        stepIndex: 0,
        blocks: [START],
        updatedAt: new Date().toISOString(),
      }),
    )
    const draft = emptyForestDraft()
    draft.programs['step-2'] = [START, MOVE]
    renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('forest-hello-legacy-import')).toBeNull()
  })

  it('reports an unusable legacy draft honestly instead of importing half of it', async () => {
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-01-forest-hello:0',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-01-forest-hello',
        stepIndex: 0,
        blocks: [{ type: 'say_line' }],
        updatedAt: new Date().toISOString(),
      }),
    )
    renderSlot(emptyForestDraft())
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('forest-hello-legacy-import')).toBeNull()
    expect(screen.getByTestId('forest-hello-notice')).toHaveTextContent('没能导入')
  })
})
