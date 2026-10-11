import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBlockExecutor } from './use-block-executor'

const correct = ['when_start', 'move_right', 'switch_character', 'move_right', 'say_line']
function mount(types = correct, step = 2) {
  return renderHook(() => useBlockExecutor(types.map(type => ({ type })), correct, step, 'dialogue'))
}
async function run(result: ReturnType<typeof mount>['result']) {
  await act(async () => { const pending = result.current.run(); await vi.runAllTimersAsync(); await pending })
}
describe('lesson 11 independent dialogue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('executes bear speech without changing fox speech or positions, then reruns and resets', async () => {
    const { result } = mount()
    await run(result)
    expect(result.current.executionState).toBe('success')
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(100)
    expect(result.current.characterMessage).toBeNull()
    expect(result.current.partnerMessage).toBe('我们一起出发吧！')
    expect(result.current.actionLog.at(-1)).toBe('小熊说：我们一起出发吧！')
    const log = result.current.actionLog
    await run(result)
    expect(result.current.actionLog).toEqual(log)
    expect(result.current.characterMessage).toBeNull()
    act(() => result.current.reset())
    expect(result.current.partnerMessage).toBeNull()
    expect(result.current.characterPosition).toBe(0)
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.activeActor).toBe('main')
  })
  it('retains actual wrong-target speech for diagnosis, never awards a pass', async () => {
    const { result } = mount(['when_start', 'move_right', 'say_line', 'switch_character', 'move_right'])
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(100)
    expect(result.current.characterMessage).toBe('你好！')
    expect(result.current.partnerMessage).toBeNull()
    expect(result.current.errorMessage).toContain('正确角色')
  })
  it('marks only the bear as speaking while its instruction executes', async () => {
    const { result } = mount()
    let pending: Promise<void>
    act(() => { pending = result.current.run() })
    await act(async () => { await vi.advanceTimersByTimeAsync(2200) })
    expect(result.current.actorActions).toEqual({ main: 'idle', partner: 'speaking' })
    expect(result.current.characterMessage).toBeNull()
    expect(result.current.partnerMessage).toBe('我们一起出发吧！')
    await act(async () => { await vi.runAllTimersAsync(); await pending })
    expect(result.current.actorActions).toEqual({ main: 'idle', partner: 'idle' })
  })
  it('requires actual bear speech even when both actors have moved', async () => {
    const { result } = mount(correct.slice(0, -1))
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.errorMessage).toContain('小熊还没说')
  })
  it.each([
    ['when_start', 'move_right', 'say_line'],
    ['when_start', 'move_right', 'switch_character', 'say_line'],
    ['when_start', 'move_right', 'switch_character', 'switch_character', 'say_line'],
    ['when_start', 'switch_character', 'move_right', 'say_line'],
    ['when_start', 'move_right', 'switch_character', 'move_right', 'move_right', 'say_line'],
    ['when_start', 'move_right', 'repeat_twice', 'say_line'],
    ['when_clicked', 'move_right', 'say_line'],
    ['when_start', ...Array<string>(24).fill('say_line')],
  ])('rejects missing movement/switch, wrong order, unsupported or oversized program %j', async (...types) => {
    const { result } = mount(types)
    await run(result)
    expect(result.current.executionState).toBe('error')
  })
  it('checks intermediate targets: start-only observation and silent independent movement', async () => {
    const observation = mount(['when_start'], 0)
    await run(observation.result)
    expect(observation.result.current.executionState).toBe('success')
    const movement = mount(correct.slice(0, -1), 1)
    await run(movement.result)
    expect(movement.result.current.executionState).toBe('success')
    expect(movement.result.current.partnerMessage).toBeNull()
  })
  it('keeps both messages independent in the creative variant', async () => {
    const { result } = mount(['when_start', 'say_line', 'move_right', 'switch_character', 'move_right', 'say_line'], 4)
    await run(result)
    expect(result.current.executionState).toBe('success')
    expect(result.current.characterMessage).toBe('你好！')
    expect(result.current.partnerMessage).toBe('我们一起出发吧！')
  })
  it('cancels pending dialogue on reset during the run', async () => {
    const { result } = mount()
    let pending: Promise<void>
    act(() => { pending = result.current.run() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1850) })
    expect(result.current.partnerPosition).toBe(100)
    act(() => result.current.reset())
    await act(async () => { await vi.runAllTimersAsync(); await pending })
    expect(result.current.executionState).toBe('idle')
    expect(result.current.partnerMessage).toBeNull()
    expect(result.current.partnerPosition).toBe(0)
  })
  it('editing cancels pending speech, invalidates old credit, and a repair can pass', async () => {
    const { result, rerender } = renderHook(({ types }) => useBlockExecutor(types.map(type => ({ type })), correct, 2, 'dialogue'), { initialProps: { types: correct } })
    let pending: Promise<void>
    act(() => { pending = result.current.run() })
    rerender({ types: correct.slice(0, -1) })
    await act(async () => { await vi.runAllTimersAsync(); await pending })
    expect(result.current.executionState).toBe('idle')
    expect(result.current.partnerMessage).toBeNull()
    await run(result)
    expect(result.current.executionState).toBe('error')
    rerender({ types: correct })
    await run(result)
    expect(result.current.executionState).toBe('success')
  })
  it('rejects detached speech instead of executing it', async () => {
    const { result } = renderHook(() => useBlockExecutor(correct.map((type, i) => ({ type, disconnected: i === 4 })), correct, 2, 'dialogue'))
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.partnerMessage).toBeNull()
    expect(result.current.errorMessage).toContain('没有接')
  })
})
