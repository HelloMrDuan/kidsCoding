import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EditorSlotProps } from '@/features/lessons/workspace/workspace-slots'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { GreetingSessionContext } from './forest-greeting-session'
import { createGreetingSessionStore } from './forest-greeting-session'
import { GreetingRunAdapter } from './forest-greeting-run-adapter'
import { buildGreetingJudgment, judgeGreetingStep } from './forest-greeting-judging'
import { emptyGreetingDraft, type GreetingSlotData } from './forest-greeting-draft'
import { GreetingEditorSlot, resetGreetingSlotLastGoodForTest } from './forest-greeting-slot'

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
        onClick={() =>
          onSnapshotChange([
            { type: 'when_start' },
            { type: 'move_right' },
            { type: 'say_line', line: 'hi-all' },
          ])
        }
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
    </div>
  ),
}))

const START = { type: 'when_start' }
const MOVE = { type: 'move_right' }
const SAY = { type: 'say_line' }
const SAY_HI_ALL = { type: 'say_line', line: 'hi-all' }

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
  const store = createGreetingSessionStore()
  const runAdapter = new GreetingRunAdapter({
    isStepObserved: (stepId) => store.getState().observed.includes(stepId),
  })
  const utils = render(
    <GreetingSessionContext.Provider value={{ store, runAdapter }}>
      <GreetingEditorSlot
        lessonId="lesson-02-forest-greeting"
        initial={initial}
        onChange={onChange}
        onJudgment={onJudgment}
        editable
        shell={shell}
      />
    </GreetingSessionContext.Provider>,
  )
  return { ...utils, onChange, onJudgment, shell, store, runAdapter }
}

function rerenderSlot(
  utils: ReturnType<typeof renderSlot>,
  draft: GreetingSlotData,
  shell: EditorSlotProps['shell'],
) {
  utils.rerender(
    <GreetingSessionContext.Provider value={{ store: utils.store, runAdapter: utils.runAdapter }}>
      <GreetingEditorSlot
        lessonId="lesson-02-forest-greeting"
        initial={draft}
        onChange={utils.onChange}
        editable
        shell={shell}
      />
    </GreetingSessionContext.Provider>,
  )
}

beforeEach(() => {
  resetGreetingSlotLastGoodForTest()
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

describe('GreetingEditorSlot (mocked Blockly surface)', () => {
  it('shows step 1 with its instruction and voiceover', async () => {
    renderSlot(emptyGreetingDraft())
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('forest-greeting-step-progress')).toHaveTextContent('第 1 / 4 关')
    expect(screen.getByTestId('forest-greeting-step-title')).toHaveTextContent('先让小狐狸出场')
    expect(screen.getByTestId('forest-greeting-instruction')).toHaveTextContent('先接好“开始时”和“向右走 100 步”，让小狐狸走上舞台')
    expect(screen.getByTestId('forest-greeting-voiceover')).toHaveTextContent('主语音：先让小狐狸出场。')
    expect(screen.getByTestId('mock-blockly')).toHaveAttribute('data-blocks', '[]')
  })

  it('the slot root scrolls internally (studio 100dvh: bottom buttons must stay reachable)', async () => {
    renderSlot(emptyGreetingDraft())
    await screen.findByTestId('mock-blockly')
    const root = screen.getByTestId('forest-greeting-slot')
    expect(root.style.height).toBe('100%')
    expect(root.style.overflowY).toBe('auto')
  })

  it('a snapshot change persists through onChange, keeping the chosen line (step-2 pass program)', async () => {
    const draft = emptyGreetingDraft()
    draft.stepIndex = 1
    const { onChange } = renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('mock-snapshot-pass-step2'))
    expect(onChange).toHaveBeenCalled()
    const persisted = onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyGreetingDraft>
    expect(persisted.programs['step-2']).toEqual([START, MOVE, SAY_HI_ALL])
    expect(persisted.stepIndex).toBe(1)
  })

  it('complete is blocked before a successful run, then advances after a passed judgment', async () => {
    const draft = emptyGreetingDraft()
    draft.programs['step-1'] = [START, MOVE]
    const utils = renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('forest-greeting-complete-step'))
    expect(screen.getByTestId('forest-greeting-notice')).toHaveTextContent('请先点击舞台上的“运行”按钮观察结果')
    // A passed run: the judgment effect marks the step passed.
    const passed = buildGreetingJudgment(judgeGreetingStep([START, MOVE], 0, false), 0)
    expect(passed.passed).toBe(true)
    rerenderSlot(utils, draft, fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('forest-greeting-complete-step'))
    const advanced = utils.onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyGreetingDraft>
    expect(advanced.stepIndex).toBe(1)
    expect(screen.getByTestId('forest-greeting-step-progress')).toHaveTextContent('第 2 / 4 关')
  })

  it('step-3: completing is gated on the prediction answer, then advances with the done text', async () => {
    const draft = emptyGreetingDraft()
    draft.stepIndex = 2
    draft.programs['step-3'] = [START, SAY]
    const utils = renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    const passed = buildGreetingJudgment(judgeGreetingStep([START, SAY], 2, false), 2)
    expect(passed.passed).toBe(true)
    rerenderSlot(utils, draft, fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('forest-greeting-complete-step'))
    // 还没做预测：不能过关，且停留在第 3 关。
    expect(screen.getByTestId('forest-greeting-step-progress')).toHaveTextContent('第 3 / 4 关')
    act(() => {
      utils.store.setState({ practiceAnswers: { 'step-3': 'stay' } })
    })
    fireEvent.click(screen.getByTestId('forest-greeting-complete-step'))
    const advanced = utils.onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyGreetingDraft>
    expect(advanced.stepIndex).toBe(3)
    expect(screen.getByTestId('forest-greeting-notice')).toHaveTextContent('站在原地打了招呼')
  })

  it('step-4: a designed-mistake run marks observed in the session store, not the draft', async () => {
    const draft = emptyGreetingDraft()
    draft.stepIndex = 3
    const utils = renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    const mistakeJudgment = buildGreetingJudgment(judgeGreetingStep([START, SAY, MOVE], 3, false), 3)
    expect(mistakeJudgment.conclusion).toContain('错误实验已观察')
    rerenderSlot(utils, draft, fakeShell({ judgment: mistakeJudgment }))
    await screen.findByTestId('mock-blockly')
    expect(utils.store.getState().observed).toEqual(['step-4'])
    // The draft itself records no observation (session-only) and no failure.
    const persisted = utils.onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyGreetingDraft> | undefined
    expect(persisted?.failures ?? 0).toBe(0)
  })

  it('last step: a cloud-sync failure is visible (banner + retry), never silent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    )
    const draft = emptyGreetingDraft()
    draft.stepIndex = 3
    draft.programs['step-4'] = [START, MOVE, SAY]
    draft.passed = ['step-1', 'step-2', 'step-3']
    const utils = renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    act(() => {
      utils.store.setState({
        observed: ['step-4'],
        mistakeAnswers: { 'step-4': 'before-walk' },
      })
    })
    const passed = buildGreetingJudgment(judgeGreetingStep([START, MOVE, SAY], 3, true), 3)
    expect(passed.passed).toBe(true)
    rerenderSlot(utils, draft, fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('forest-greeting-complete-step'))
    // 云端失败必须有横幅与重试入口，本机进度已保存，且不跳转。
    expect(await screen.findByTestId('forest-greeting-cloud-failed')).toHaveTextContent('云端同步失败')
    expect(screen.getByTestId('forest-greeting-retry-cloud-sync')).toBeTruthy()
    expect(screen.getByTestId('forest-greeting-continue-local-only')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('kc-progress')).toContain('lesson-02-forest-greeting')
  })

  it('last step: navigation failure is visible (banner + full-page fallback), never silent (OPS-047 F1)', async () => {
    // push 同步抛错：云端同步已成功、跳转失败 → hook 返回
    // 'navigate-failed' 并置 navigationFailed；插槽必须读这个结果，
    // 给横幅与整页备用入口。到达核验路径已由 hook 单测覆盖。
    push.mockImplementationOnce(() => {
      throw new Error('navigation down')
    })
    const draft = emptyGreetingDraft()
    draft.stepIndex = 3
    draft.programs['step-4'] = [START, MOVE, SAY]
    draft.passed = ['step-1', 'step-2', 'step-3']
    const utils = renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    act(() => {
      utils.store.setState({
        observed: ['step-4'],
        mistakeAnswers: { 'step-4': 'before-walk' },
      })
    })
    const passed = buildGreetingJudgment(judgeGreetingStep([START, MOVE, SAY], 3, true), 3)
    expect(passed.passed).toBe(true)
    rerenderSlot(utils, draft, fakeShell({ judgment: passed }))
    await screen.findByTestId('mock-blockly')
    fireEvent.click(screen.getByTestId('forest-greeting-complete-step'))
    // 导航失败必须有横幅与整页备用入口，本机进度已保存，且不跳转、不静默。
    expect(await screen.findByTestId('forest-greeting-navigation-failed')).toHaveTextContent('打开完成页失败了')
    expect(screen.getByTestId('forest-greeting-notice')).toHaveTextContent('跳转到完成页失败')
    const fallback = screen.getByTestId('forest-greeting-open-complete-page')
    expect(fallback).toHaveAttribute('href', '/project/lesson-02-forest-greeting/complete')
    expect(push).toHaveBeenCalledWith('/project/lesson-02-forest-greeting/complete')
    expect(window.localStorage.getItem('kc-progress')).toContain('lesson-02-forest-greeting')
  })

  it('rejects a foreign-lesson import and echoes the empty draft', async () => {
    const { onChange } = renderSlot({ lessonId: 'someone-else', stepIndex: 0, programs: {} })
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('forest-greeting-notice')).toHaveTextContent('导入文件属于其他课节，已拒绝')
    expect(onChange).toHaveBeenCalledWith(emptyGreetingDraft())
  })

  it('offers a one-click legacy import when the new draft is empty and the old route left a draft', async () => {
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-02-forest-greeting:0',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-02-forest-greeting',
        stepIndex: 0,
        blocks: [START],
        updatedAt: new Date().toISOString(),
      }),
    )
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-02-forest-greeting:1',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-02-forest-greeting',
        stepIndex: 1,
        blocks: [START, MOVE, SAY_HI_ALL],
        updatedAt: new Date().toISOString(),
      }),
    )
    const { onChange } = renderSlot(emptyGreetingDraft())
    await screen.findByTestId('mock-blockly')
    expect(screen.getByTestId('forest-greeting-legacy-import')).toHaveTextContent('到第 2 关')
    fireEvent.click(screen.getByTestId('forest-greeting-import-legacy'))
    const imported = onChange.mock.calls.at(-1)?.[0] as ReturnType<typeof emptyGreetingDraft>
    expect(imported.stepIndex).toBe(1)
    expect(imported.programs['step-2']).toEqual([START, MOVE, SAY_HI_ALL])
    expect(imported.passed).toEqual([])
    // The legacy draft is kept, never deleted.
    expect(window.sessionStorage.getItem('kc-lesson-draft:lesson-02-forest-greeting:1')).not.toBeNull()
    expect(screen.queryByTestId('forest-greeting-legacy-import')).toBeNull()
  })

  it('does not offer the legacy import when the new draft is not empty', async () => {
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-02-forest-greeting:0',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-02-forest-greeting',
        stepIndex: 0,
        blocks: [START],
        updatedAt: new Date().toISOString(),
      }),
    )
    const draft = emptyGreetingDraft()
    draft.programs['step-2'] = [START, MOVE]
    renderSlot(draft)
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('forest-greeting-legacy-import')).toBeNull()
  })

  it('reports an unusable legacy draft honestly instead of importing half of it', async () => {
    window.sessionStorage.setItem(
      'kc-lesson-draft:lesson-02-forest-greeting:0',
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-02-forest-greeting',
        stepIndex: 0,
        blocks: [{ type: 'jump' }],
        updatedAt: new Date().toISOString(),
      }),
    )
    renderSlot(emptyGreetingDraft())
    await screen.findByTestId('mock-blockly')
    expect(screen.queryByTestId('forest-greeting-legacy-import')).toBeNull()
    expect(screen.getByTestId('forest-greeting-notice')).toHaveTextContent('没能导入')
  })
})
