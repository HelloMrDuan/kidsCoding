import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useBlockExecutor } from './use-block-executor'

describe('useBlockExecutor', () => {
  it('returns idle state initially', () => {
    const { result } = renderHook(() => useBlockExecutor([], []))
    expect(result.current.executionState).toBe('idle')
  })

  it('fails if blocks do not match required blocks', async () => {
    const { result } = renderHook(() =>
      useBlockExecutor([{ type: 'move_right' }], ['when_start', 'move_right']),
    )

    await act(async () => {
      await result.current.run()
    })

    expect(result.current.executionState).toBe('error')
  })

  it('fails if the first block is not when_start', async () => {
    const { result } = renderHook(() =>
      useBlockExecutor([{ type: 'move_right' }], ['move_right']),
    )

    await act(async () => {
      await result.current.run()
    })

    expect(result.current.executionState).toBe('error')
  })

  it('fails if an unsupported block is provided', async () => {
    const { result } = renderHook(() =>
      useBlockExecutor(
        [{ type: 'when_start' }, { type: 'unsupported_block' }],
        ['when_start', 'unsupported_block'],
      ),
    )

    await act(async () => {
      await result.current.run()
    })

    expect(result.current.executionState).toBe('error')
  })

  it('resets execution state when blocks change', async () => {
    const { result, rerender } = renderHook(
      ({ blocks, required }) => useBlockExecutor(blocks, required),
      {
        initialProps: {
          blocks: [{ type: 'when_start' }],
          required: ['when_start'],
        },
      },
    )

    await act(async () => {
      await result.current.run()
    })

    // Fast forward or await state change to success
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500))
    })

    expect(result.current.executionState).toBe('success')

    rerender({
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      required: ['when_start', 'move_right'],
    })

    expect(result.current.executionState).toBe('idle')
  })

  it('executes a three-block forest greeting and produces the visible speech bubble', async () => {
    const blocks=[{type:'when_start'},{type:'move_right'},{type:'say_line'}]
    const {result}=renderHook(()=>useBlockExecutor(blocks,blocks.map(b=>b.type)))
    await act(async()=>{await result.current.run()})
    expect(result.current.executionState).toBe('success')
    expect(result.current.characterPosition).toBe(100)
    expect(result.current.characterMessage).toBe('你好！')
  })

  it('runs real meadow transition, repeat move and travel speech',async()=>{
    const sequence=['when_start','move_right','switch_scene','repeat_twice','say_line']
    const blocks=sequence.map(type=>({type}))
    const {result}=renderHook(()=>useBlockExecutor(blocks,sequence))
    await act(async()=>{await result.current.run()})
    expect(result.current.executionState).toBe('success')
    expect(result.current.characterPosition).toBe(200)
    expect(result.current.stageScene).toBe('meadow')
    expect(result.current.characterMessage).toBe('我到草地啦！')
  })

  it('refuses to repeat a movement that does not exist',async()=>{
    const sequence=['when_start','repeat_twice']
    const {result}=renderHook(()=>useBlockExecutor(sequence.map(type=>({type})),sequence))
    await act(async()=>{await result.current.run()})
    expect(result.current.executionState).toBe('error')
  })

  it('cancels pending updates on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useBlockExecutor([{ type: 'when_start' }], ['when_start']),
    )

    let promise: Promise<void>
    act(() => {
      promise = result.current.run()
    })

    unmount()

    await act(async () => {
      await promise
    })

    // It should not have reached success state because it unmounted during async operation
    expect(result.current.executionState).not.toBe('success')
  })
})
