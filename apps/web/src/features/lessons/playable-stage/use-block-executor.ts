import { useState, useCallback } from 'react'

export type ExecutionState = 'idle' | 'running' | 'success' | 'error'

export function useBlockExecutor(blocks: Array<{ type: string }>, requiredBlocks: string[]) {
  const [executionState, setExecutionState] = useState<ExecutionState>('idle')
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(-1)
  const [characterPosition, setCharacterPosition] = useState(0)
  const [characterMessage, setCharacterMessage] = useState<string | null>(null)

  const reset = useCallback(() => {
    setExecutionState('idle')
    setCurrentBlockIndex(-1)
    setCharacterPosition(0)
    setCharacterMessage(null)
  }, [])

  const run = useCallback(async () => {
    reset()
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
      setCurrentBlockIndex(i)
      const block = blocks[i]

      // Delay for animation
      await new Promise(resolve => setTimeout(resolve, 800))

      if (block.type === 'move_right') {
        setCharacterPosition(prev => prev + 100)
      } else if (block.type === 'say_line') {
        setCharacterMessage('你好！')
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setExecutionState('success')
  }, [blocks, requiredBlocks, reset])

  return {
    executionState,
    currentBlockIndex,
    characterPosition,
    characterMessage,
    run,
    reset
  }
}
