import { useState, useCallback, useRef, useEffect } from 'react'

export type ExecutionState = 'idle' | 'running' | 'success' | 'error'

export function useBlockExecutor(blocks: Array<{ type: string }>, requiredBlocks: string[]) {
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

    // Check if blocks match required
    if (blocks.length < requiredBlocks.length || !requiredBlocks.every((b, i) => b === blocks[i]?.type)) {
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

  // Watch blocks stringified to detect changes and reset
  const blocksKey = JSON.stringify(blocks)
  useEffect(() => {
    reset()
  }, [blocksKey, reset])

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
