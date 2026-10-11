import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBlockExecutor } from './use-block-executor'

const correct = ['when_start', 'move_right', 'switch_character', 'move_right', 'repeat_twice']
const explicit = ['when_start', 'move_right', 'switch_character', 'move_right', 'move_right']
function mount(types = correct, step = 2) {
  return renderHook(() => useBlockExecutor(types.map(type => ({ type })), correct, step, 'graduation'))
}
async function run(result: ReturnType<typeof mount>['result']) {
  await act(async () => { const pending = result.current.run(); await vi.runAllTimersAsync(); await pending })
}
describe('lesson 12 actual graduation gift', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it.each([correct, explicit])('finds a gift from actual independent positions using %j', async (...types) => {
    const { result } = mount(types)
    expect(result.current.giftFound).toBe(false)
    await run(result)
    expect(result.current.executionState).toBe('success')
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(200)
    expect(result.current.giftFound).toBe(true)
    const log = result.current.actionLog
    await run(result)
    expect(result.current.actionLog).toEqual(log)
    expect(result.current.partnerPosition).toBe(200)
    act(() => result.current.reset())
    expect(result.current.giftFound).toBe(false)
    expect(result.current.characterPosition).toBe(0)
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.activeActor).toBe('main')
  })
  it('only marks bear moving during repetition and awards the gift after the program finishes', async () => {
    const { result } = mount()
    let pending: Promise<void>
    act(() => { pending = result.current.run() })
    await act(async () => { await vi.advanceTimersByTimeAsync(2200) })
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(200)
    expect(result.current.actorActions).toEqual({ main: 'idle', partner: 'moving' })
    expect(result.current.giftFound).toBe(false)
    await act(async () => { await vi.runAllTimersAsync(); await pending })
    expect(result.current.giftFound).toBe(true)
  })
  it('retains the real shortfall, without a gift', async () => {
    const { result } = mount(correct.slice(0, -1), 3)
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.partnerPosition).toBe(100)
    expect(result.current.errorMessage).toContain('小熊 200 步')
    expect(result.current.giftFound).toBe(false)
  })
  it.each([
    ['when_start', 'move_right', 'move_right', 'move_right'],
    ['when_start', 'move_right', 'repeat_twice', 'switch_character', 'move_right'],
    ['when_start', 'move_right', 'switch_character', 'repeat_twice'],
    [...correct, 'move_right'],
    [...correct, 'switch_character'],
    [...correct, 'switch_scene'],
    ['when_start', 'switch_character', 'move_right'],
    ['when_clicked', 'move_right'],
    ['when_start', ...Array<string>(24).fill('move_right')],
  ])('rejects missing switch, wrong repeat target/order, overshoot and boundaries %j', async (...types) => {
    const { result } = mount(types)
    await run(result)
    expect(result.current.executionState).toBe('error')
    expect(result.current.giftFound).toBe(false)
  })
  it('allows independently targeted optional greetings in a creative work', async () => {
    const { result } = mount(['when_start', 'say_line', 'move_right', 'switch_character', 'move_right', 'repeat_twice', 'say_line'], 4)
    await run(result)
    expect(result.current.giftFound).toBe(true)
    expect(result.current.characterMessage).toBe('你好！')
    expect(result.current.partnerMessage).toBe('找到礼物啦！')
  })
  it('does not reveal a gift during observation or fox-only practice', async () => {
    for (const [types, step] of [[['when_start'], 0], [['when_start', 'move_right'], 1]] as const) {
      const { result } = mount([...types], step)
      await run(result)
      expect(result.current.executionState).toBe('success')
      expect(result.current.giftFound).toBe(false)
      expect(result.current.partnerPosition).toBe(0)
    }
  })
  it('cancels repetition on reset and invalidates the gift when editing', async () => {
    const { result, rerender } = renderHook(({ types }) => useBlockExecutor(types.map(type => ({ type })), correct, 4, 'graduation'), { initialProps: { types: correct } })
    let pending: Promise<void>
    act(() => { pending = result.current.run() })
    await act(async () => { await vi.advanceTimersByTimeAsync(1850) })
    act(() => result.current.reset())
    await act(async () => { await vi.runAllTimersAsync(); await pending })
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.giftFound).toBe(false)
    await run(result)
    expect(result.current.giftFound).toBe(true)
    rerender({ types: correct.slice(0, -1) })
    expect(result.current.giftFound).toBe(false)
    await run(result)
    expect(result.current.executionState).toBe('error')
    rerender({ types: explicit })
    await run(result)
    expect(result.current.giftFound).toBe(true)
  })
  it('never executes a detached repeat', async () => {
    const { result } = renderHook(() => useBlockExecutor(correct.map((type, i) => ({ type, disconnected: i === 4 })), correct, 2, 'graduation'))
    await run(result)
    expect(result.current.giftFound).toBe(false)
    expect(result.current.partnerPosition).toBe(0)
    expect(result.current.errorMessage).toContain('没有接')
  })
})
