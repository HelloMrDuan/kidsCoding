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
})
