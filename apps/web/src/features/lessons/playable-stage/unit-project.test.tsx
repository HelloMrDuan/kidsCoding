import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GUEST_PROGRESS_STORAGE_KEY, clearGuestProgress, readGuestProgress } from '@/features/progress/local-progress'

import type { ProgramBlock } from '../blockly/observable-run'
import { UnitProject } from './unit-project'

/**
 * TQ-012: the real Blockly editor does not run in jsdom, so it is replaced by a stand-in with
 * the same contract (blocks in, onSnapshotChange out). The stage, judge and storage are real.
 */
vi.mock('../blockly/blockly-workspace', () => ({
  BlocklyWorkspace: ({ blocks, onSnapshotChange, sayLineChoices }: {
    blocks: ProgramBlock[]
    onSnapshotChange: (next: ProgramBlock[]) => void
    sayLineChoices?: readonly { id: string; text: string }[]
  }) => (
    <div data-testid="fake-workspace" data-blocks={JSON.stringify(blocks)}>
      <button type="button" data-testid="fake-add-move" onClick={() => onSnapshotChange([...blocks, { type: 'move_right' }])}>add move</button>
      <button type="button" data-testid="fake-say-halfway"
        onClick={() => onSnapshotChange(blocks.filter((block) => block.type !== 'say_line').flatMap((block, index) =>
          index === 1 ? [block, { type: 'say_line', line: blocks.find((item) => item.type === 'say_line')?.line }] : [block]))}>say halfway</button>
      {sayLineChoices?.map((choice) => (
        <button key={choice.id} type="button" data-testid={`fake-line-${choice.id}`}
          onClick={() => onSnapshotChange(blocks.map((block) => (block.type === 'say_line' ? { ...block, line: choice.id } : block)))}>{choice.text}</button>
      ))}
    </div>
  ),
}))

const L03 = 'lesson-03-forest-story'
const L06 = 'lesson-06-meadow-story'
const WALK_WALK_SAY = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }, { type: 'say_line', line: 'hello' }]

async function runAndWait() {
  fireEvent.click(screen.getByTestId('run-code-button'))
  await waitFor(() => expect(screen.getByTestId('unit-project')).toHaveAttribute('data-passed', 'true'), { timeout: 4000 })
}

function workspaceBlocks() {
  return JSON.parse(screen.getByTestId('fake-workspace').getAttribute('data-blocks') ?? '[]') as ProgramBlock[]
}

beforeEach(() => {
  clearGuestProgress()
})

afterEach(() => {
  vi.restoreAllMocks()
  clearGuestProgress()
})

describe('UnitProject (TQ-012)', () => {
  it('shows the child prompt and the “两种做法都可以” chip for choice lessons', () => {
    render(<UnitProject lessonId={L03} initialBlocks={WALK_WALK_SAY} />)
    expect(screen.getByTestId('unit-project')).toHaveTextContent('森林里的第一次见面')
    expect(screen.getByTestId('unit-choice-chip')).toHaveTextContent('两种做法都可以')
    expect(screen.getByTestId('unit-mobile-tab-stage')).toHaveAttribute('aria-selected', 'true')
    render(<UnitProject lessonId="lesson-01-forest-hello" initialBlocks={[{ type: 'when_start' }, { type: 'move_right' }]} />)
    expect(screen.getAllByTestId('unit-project')).toHaveLength(2)
    expect(screen.getAllByTestId('unit-choice-chip')).toHaveLength(1)
  })

  it('save is disabled until a passing run; a run that passes enables it', async () => {
    render(<UnitProject lessonId={L03} initialBlocks={WALK_WALK_SAY} />)
    expect(screen.getByTestId('unit-save-project')).toBeDisabled()
    await runAndWait()
    expect(screen.getByTestId('unit-save-project')).toBeEnabled()
  })

  it('any edit after a passing run disables save again', async () => {
    render(<UnitProject lessonId={L03} initialBlocks={WALK_WALK_SAY} />)
    await runAndWait()
    fireEvent.click(screen.getByTestId('fake-line-lets-play'))
    expect(screen.getByTestId('unit-save-project')).toBeDisabled()
    expect(screen.getByTestId('unit-save-status')).toHaveTextContent('先运行一次')
  })

  it('a failing run does not enable save and explains why', async () => {
    render(<UnitProject lessonId={L03} initialBlocks={WALK_WALK_SAY} />)
    fireEvent.click(screen.getByTestId('fake-add-move'))
    fireEvent.click(screen.getByTestId('run-code-button'))
    expect(await screen.findByTestId('stage-run-reason', {}, { timeout: 4000 })).toHaveTextContent(/过头/)
    expect(screen.getByTestId('unit-save-project')).toBeDisabled()
  })

  it('L06: a meadow line said in the forest fails with the friendly place hint', async () => {
    render(<UnitProject lessonId={L06} initialBlocks={[
      { type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'meadow-hi-bird' }, { type: 'switch_scene' }, { type: 'repeat_twice' },
    ]} />)
    fireEvent.click(screen.getByTestId('run-code-button'))
    const reason = await screen.findByTestId('stage-run-reason', {}, { timeout: 5000 })
    expect(reason).toHaveTextContent('“小鸟，你好呀！”要到草地再说哦！')
    expect(screen.getByTestId('stage-run-error')).toHaveAttribute('data-failure-code', 'line-wrong-place')
    expect(screen.getByTestId('unit-save-project')).toBeDisabled()
  })

  it('persists the chosen line and order on save; reopening restores them', async () => {
    const { unmount } = render(<UnitProject lessonId={L03} initialBlocks={WALK_WALK_SAY} />)
    fireEvent.click(screen.getByTestId('fake-line-nice-to-meet'))
    fireEvent.click(screen.getByTestId('fake-say-halfway'))
    await runAndWait()
    fireEvent.click(screen.getByTestId('unit-save-project'))
    expect(screen.getByTestId('unit-save-status')).toHaveTextContent('作品已保存到本机浏览器')
    const saved = readGuestProgress().projectSnapshots.find((snapshot) => snapshot.lessonId === L03)
    expect(saved?.blocks).toEqual([{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'nice-to-meet' }, { type: 'move_right' }])
    unmount()

    render(<UnitProject lessonId={L03} initialBlocks={readGuestProgress().projectSnapshots[0].blocks} />)
    expect(workspaceBlocks()).toEqual(saved?.blocks)
    expect(screen.getByTestId('unit-save-project')).toBeDisabled()
  })

  it('a full browser storage is reported honestly and nothing is claimed as saved', async () => {
    render(<UnitProject lessonId={L03} initialBlocks={WALK_WALK_SAY} />)
    await runAndWait()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    act(() => {
      fireEvent.click(screen.getByTestId('unit-save-project'))
    })
    const status = screen.getByTestId('unit-save-status')
    expect(status).toHaveTextContent('作品尚未保存')
    expect(status).toHaveAttribute('data-save-state', 'error')
    expect(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY)).toBeNull()
  })
})
