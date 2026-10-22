import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DuoProject } from './duo-project'

/**
 * TQ-019: the real Blockly editor does not run in jsdom, so it is replaced by a stand-in
 * with the same contract (blocks out via onSnapshotChange). The stage and judge are real.
 */
vi.mock('../blockly/blockly-workspace', () => ({
  BlocklyWorkspace: ({ onSnapshotChange }: { onSnapshotChange: (next: Array<{ type: string }>) => void }) => (
    <div>
      <button
        data-testid="fake-fix-program"
        onClick={() => onSnapshotChange([{ type: 'when_start' }, { type: 'move_right' }, { type: 'switch_character' }, { type: 'move_right' }])}
        type="button"
      >
        fix
      </button>
      <button
        data-testid="fake-break-program"
        onClick={() => onSnapshotChange([{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }])}
        type="button"
      >
        break
      </button>
    </div>
  ),
}))

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }))

const correct = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'switch_character' }, { type: 'move_right' }]
const noSwitch = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'move_right' }]

async function runUntilResult(text: string) {
  fireEvent.click(screen.getByTestId('run-code-button'))
  await waitFor(() => expect(screen.getByTestId('duo-result')).toHaveTextContent(text), { timeout: 9000 })
}

describe('DuoProject completion-page hints (TQ-019)', () => {
  beforeEach(() => {
    nav.push.mockClear()
  })

  it('escalates hints 1 → 2 → 3 on failed runs, offers the switch remedial at tier 3, and clears on success', async () => {
    render(<DuoProject initialBlocks={noSwitch} lessonId="lesson-10-second-friend" />)
    expect(screen.queryByTestId('duo-project-hint')).not.toBeInTheDocument()
    expect(screen.getByTestId('duo-save-project')).toBeDisabled()

    await runUntilResult('还没切换角色')
    await waitFor(() => expect(screen.getByTestId('duo-project-hint')).toHaveAttribute('data-hint-tier', '1'))
    expect(screen.getByTestId('duo-project-hint')).toHaveTextContent('看看两条轨道')
    expect(screen.queryByTestId('lesson-remedial-link')).not.toBeInTheDocument()

    await runUntilResult('还没切换角色')
    await waitFor(() => expect(screen.getByTestId('duo-project-hint')).toHaveAttribute('data-hint-tier', '2'))
    expect(screen.getByTestId('duo-project-hint')).toHaveTextContent('每个角色有自己的位置')
    expect(screen.queryByTestId('lesson-remedial-link')).not.toBeInTheDocument()

    await runUntilResult('还没切换角色')
    await waitFor(() => expect(screen.getByTestId('duo-project-hint')).toHaveAttribute('data-hint-tier', '3'))
    const link = screen.getByTestId('lesson-remedial-link')
    expect(link).toHaveAttribute('data-remedial-id', 'remedial-switch-character')
    fireEvent.click(link)
    expect(nav.push).toHaveBeenCalledWith('/learn/remedial/remedial-switch-character?from=lesson-10-second-friend&step=step-3')

    fireEvent.click(screen.getByTestId('fake-fix-program'))
    await runUntilResult('运行成功')
    // Step 4 (the work step) also asks the reflection question; answering it is what
    // reports the run success, exactly like the real completion-page flow.
    fireEvent.click(screen.getByTestId('duo-reflect-own'))
    await waitFor(() => expect(screen.queryByTestId('duo-project-hint')).not.toBeInTheDocument())
    expect(screen.getByTestId('duo-save-project')).toBeEnabled()
  }, 60000)

  it('uses the lesson 12 hint layers for the graduation work', async () => {
    render(<DuoProject initialBlocks={noSwitch} lessonId="lesson-12-graduation-show" />)
    await runUntilResult('还没切换角色')
    await waitFor(() => expect(screen.getByTestId('duo-project-hint')).toHaveAttribute('data-hint-tier', '1'))
    expect(screen.getByTestId('duo-project-hint')).toHaveTextContent('看看小熊的距离')
  }, 30000)

  it('a passing run on the saved work shows no hint and unlocks saving', async () => {
    render(<DuoProject initialBlocks={correct} lessonId="lesson-10-second-friend" />)
    await runUntilResult('运行成功')
    fireEvent.click(screen.getByTestId('duo-reflect-own'))
    expect(screen.queryByTestId('duo-project-hint')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('duo-save-project')).toBeEnabled())
  }, 30000)
})
