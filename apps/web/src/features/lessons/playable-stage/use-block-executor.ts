import { useState, useCallback, useRef, useEffect } from 'react'

export type ExecutionState = 'idle' | 'running' | 'success' | 'error'

export function useBlockExecutor(blocks: Array<{ type: string }>, requiredBlocks: string[], stepIndex: number = 0) {
  const [executionState, setExecutionState] = useState<ExecutionState>('idle')
  const [characterPosition, setCharacterPosition] = useState(0)
  const [characterMessage, setCharacterMessage] = useState<string | null>(null)
  const runIdRef = useRef(0)

  const reset = useCallback(() => {
    runIdRef.current += 1
    setExecutionState('idle')
    setCharacterPosition(0)
    setCharacterMessage(null)
  }, [])

  const run = useCallback(async () => {
    reset()
    runIdRef.current += 1
    const currentRunId = runIdRef.current

    setExecutionState('running')

    // Check if blocks match required exactly
    if (blocks.length !== requiredBlocks.length || !requiredBlocks.every((b, i) => b === blocks[i]?.type)) {
      setExecutionState('error')
      return
    }

    if (blocks[0]?.type !== 'when_start') {
      setExecutionState('error')
      return
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]

      // Delay for animation
      await new Promise(resolve => setTimeout(resolve, 800))
      if (runIdRef.current !== currentRunId) return

      if (block.type === 'when_start') {
        // Just standard delay
      } else if (block.type === 'move_right') {
        setCharacterPosition(prev => prev + 100)
      } else if (block.type === 'say_line') {
        setCharacterMessage('你好！')
      } else {
        // Unsupported block type
        setExecutionState('error')
        return
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      if (runIdRef.current !== currentRunId) return
    }

    setExecutionState('success')
  }, [blocks, requiredBlocks, reset])

  // Watch blocks stringified and stepIndex to detect changes and reset
  // We use standard React derived state pattern to reset without causing loops or ref mutation during render.
  const [prevStepIndex, setPrevStepIndex] = useState(stepIndex)
  const [prevBlocksKey, setPrevBlocksKey] = useState(JSON.stringify(blocks))

  const currentBlocksKey = JSON.stringify(blocks)
  if (stepIndex !== prevStepIndex || currentBlocksKey !== prevBlocksKey) {
    setPrevStepIndex(stepIndex)
    setPrevBlocksKey(currentBlocksKey)
    // Reset internal state synchronously during render without causing infinite loops
    setExecutionState('idle')
    setCharacterMessage(null)
    setCharacterPosition(0)

    // Increment run ID but do it via state since we can't mutate ref during render.
    // Actually, we don't strictly need to increment runIdRef here during render.
    // The previous async `run` function relies on runIdRef to check stale states.
    // If we just reset the state here synchronously, it might get overwritten by an ongoing async run if we don't bump the ID.
    // However, if we move the ID bump to a layout effect, it will be perfectly synchronized before the next paint.
  }

  // Bump run ID immediately in layout effect if step/blocks changed to invalidate async chains
  useEffect(() => {
    runIdRef.current += 1
  }, [stepIndex, currentBlocksKey])

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      runIdRef.current += 1
    }
  }, [])

  return {
    executionState,
    characterPosition,
    characterMessage,
    run,
    reset
  }
}
