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
  // We use a ref and layout effect to avoid cascading renders while ensuring sync.
  // Actually, standard practice to avoid the "setState in effect" warning is to clear it in the event handlers
  // (which we do in handleSnapshotChange and goToStep) and simply track the last known values to reset if they unexpectedly mismatch,
  // or use key={} on the component. But here, we can just use the reset logic inside a generic useEffect with a setTimeout, or
  // simply remove this useEffect and rely purely on the parent calling `onRunClear` / `onSnapshotChange` -> triggering a reset explicitly.
  // However, `useBlockExecutor` needs its *internal* state reset.
  // Let's use a ref to track the last values and reset during render, which is the React-recommended way to derive state.

  const [prevStepIndex, setPrevStepIndex] = useState(stepIndex)
  const [prevBlocksKey, setPrevBlocksKey] = useState(JSON.stringify(blocks))

  if (stepIndex !== prevStepIndex || JSON.stringify(blocks) !== prevBlocksKey) {
    setPrevStepIndex(stepIndex)
    setPrevBlocksKey(JSON.stringify(blocks))
    // Reset internal state synchronously during render
    setExecutionState('idle')
    setCharacterMessage(null)
    setCharacterPosition(0)
    runIdRef.current += 1
  }

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
