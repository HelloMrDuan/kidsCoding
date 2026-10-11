import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBlockExecutor } from './use-block-executor'

const correct = ['when_start', 'move_right', 'switch_character', 'move_right']
function mount(types = correct, step = 2) {
  return renderHook(() => useBlockExecutor(types.map(type => ({ type })), correct, step, true))
}
async function run(result: ReturnType<typeof mount>['result']) {
  await act(async () => {
    const pending = result.current.run()
    await vi.runAllTimersAsync()
    await pending
  })
}
describe('lesson 10 independent actors', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('executes independent movement, reruns without accumulation, and resets both actors', async () => {
    const { result } = mount()
    await run(result)
    expect(result.current.executionState).toBe('success')
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(100)
    expect(result.current.activeActor).toBe('partner')
    await run(result)
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(100)
    act(() => result.current.reset())
    expect(result.current.characterPosition).toBe(0)
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.activeActor).toBe('main')
    expect(result.current.actionLog).toEqual([])
  })
  it('keeps bear still during the fox-only exercise', async () => {
    const { result } = mount(['when_start', 'move_right'], 1)
    await run(result)
    expect(result.current.executionState).toBe('success')
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.characterPosition).toBe(100)
  })
  it('runs the missing-switch mistake, retaining actual wrong positions for diagnosis', async () => {
    const { result } = mount(['when_start', 'move_right', 'move_right'])
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.characterPosition).toBe(200)
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.errorMessage).toContain('小熊还没动')
  })
  it.each([
    ['move_right'], ['when_clicked', 'move_right'],
    ['when_start', 'switch_character', 'move_right'],
    ['when_start', 'move_right', 'switch_character', 'switch_character', 'move_right'],
    ['when_start', 'move_right', 'switch_character'],
    ['when_start', 'move_right', 'switch_character', 'say_line', 'move_right'],
    ['when_start', 'unsupported'],
    ['when_start', 'move_right', 'switch_character', 'move_right', 'move_right'],
    ['when_start', ...Array<string>(24).fill('move_right')],
  ])('rejects wrong-target, duplicate-switch or malformed program %j', async (...types) => {
    const { result } = mount(types)
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.errorMessage).toBeTruthy()
  })
  it('accepts an equivalent creative program with a fox greeting before switching', async () => {
    const { result } = mount(['when_start', 'move_right', 'say_line', 'switch_character', 'move_right'], 4)
    await run(result)
    expect(result.current.executionState).toBe('success')
    expect(result.current.characterMessage).toBe('你好！')
    expect(result.current.partnerPosition).toBe(100)
  })
  it('cancels in-flight movement when reset is pressed', async () => {
    const { result } = mount()
    let pending: Promise<void>
    act(() => { pending = result.current.run() })
    await act(async () => { await vi.advanceTimersByTimeAsync(700) })
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(0)
    act(() => result.current.reset())
    await act(async () => { await vi.runAllTimersAsync(); await pending })
    expect(result.current.executionState).toBe('idle')
    expect(result.current.characterPosition).toBe(0)
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.actorActions).toEqual({ main: 'idle', partner: 'idle' })
  })
  it('invalidates results on edit and recovers after repair', async () => {
    const { result, rerender } = renderHook(({ types }) => useBlockExecutor(types.map(type => ({ type })), correct, 2, true), { initialProps: { types: correct } })
    await run(result)
    rerender({ types: ['when_start', 'move_right', 'move_right'] })
    expect(result.current.executionState).toBe('idle')
    expect(result.current.partnerPosition).toBe(0)
    await run(result)
    expect(result.current.executionState).toBe('error')
    rerender({ types: correct })
    await run(result)
    expect(result.current.executionState).toBe('success')
  })
  it('rejects detached actions instead of flattening them into executable code', async () => {
    const { result } = renderHook(() => useBlockExecutor(correct.map((type, i) => ({ type, disconnected: i === 2 })), correct, 2, true))
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.errorMessage).toContain('没有接')
    expect(result.current.characterPosition).toBe(0)
    expect(result.current.partnerPosition).toBe(0)
  })
})
