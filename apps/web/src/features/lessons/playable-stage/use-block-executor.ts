import { useState, useCallback, useRef, useEffect } from 'react'

export type ExecutionState = 'idle' | 'armed' | 'running' | 'success' | 'error'

export function useBlockExecutor(blocks: Array<{ type: string }>, requiredBlocks: string[], stepIndex: number = 0) {
  const [executionState, setExecutionState] = useState<ExecutionState>('idle')
  const [characterPosition, setCharacterPosition] = useState(0)
  const [characterMessage, setCharacterMessage] = useState<string | null>(null)
  const [stageScene, setStageScene] = useState<'forest' | 'meadow'>('forest')
  const runIdRef = useRef(0)

  const reset = useCallback(() => {
    runIdRef.current += 1
    setExecutionState('idle')
    setCharacterPosition(0)
    setCharacterMessage(null)
    setStageScene('forest')
  }, [])

  // Execute the actual lesson block program. The event hat alone never
  // moves a sprite: click-triggered code only starts after a real UI click.
  const execute = useCallback(async (id: number) => {
    setExecutionState('running')
    for (let i = 1; i < blocks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 330))
      if (runIdRef.current !== id) return
      const type = blocks[i].type
      if (type === 'move_right') {
        setCharacterPosition(prev => prev + 100)
      } else if (type === 'switch_scene') {
        setStageScene('meadow')
      } else if (type === 'repeat_twice') {
        if (!blocks.slice(0, i).some(b => b.type === 'move_right')) {
          setExecutionState('error')
          return
        }
        setCharacterPosition(prev => prev + 100)
      } else if (type === 'say_line') {
        setCharacterMessage(blocks.slice(0, i).some(b => b.type === 'switch_scene')
          ? '我到草地啦！'
          : blocks[0].type === 'when_clicked' ? '蝴蝶收到你的点击啦！' : '你好！')
      } else {
        setExecutionState('error')
        return
      }
      await new Promise(resolve => setTimeout(resolve, 180))
      if (runIdRef.current !== id) return
    }
    if (runIdRef.current === id) setExecutionState('success')
  }, [blocks])

  const run = useCallback(async () => {
    reset()
    const id = ++runIdRef.current
    setExecutionState('running')
    if (blocks.length !== requiredBlocks.length || !requiredBlocks.every((type, i) => type === blocks[i]?.type)) {
      setExecutionState('error')
      return
    }
    if (blocks[0]?.type !== 'when_start' && blocks[0]?.type !== 'when_clicked') {
      setExecutionState('error')
      return
    }
    if (blocks[0].type === 'when_clicked') {
      setExecutionState('armed')
      return
    }
    // The start event is immediately dispatched by the Run button.
    await new Promise(resolve => setTimeout(resolve, 330))
    if (runIdRef.current !== id) return
    await execute(id)
  }, [blocks, requiredBlocks, reset, execute])

  const clickCharacter = useCallback(async () => {
    if (executionState !== 'armed' || blocks[0]?.type !== 'when_clicked') return
    await execute(runIdRef.current)
  }, [executionState, blocks, execute])

  const [prevStepIndex, setPrevStepIndex] = useState(stepIndex)
  const [prevBlocksKey, setPrevBlocksKey] = useState(JSON.stringify(blocks))
  const currentBlocksKey = JSON.stringify(blocks)
  if (stepIndex !== prevStepIndex || currentBlocksKey !== prevBlocksKey) {
    setPrevStepIndex(stepIndex)
    setPrevBlocksKey(currentBlocksKey)
    setExecutionState('idle')
    setCharacterMessage(null)
    setCharacterPosition(0)
    setStageScene('forest')
  }

  useEffect(() => { runIdRef.current += 1 }, [stepIndex, currentBlocksKey])
  useEffect(() => () => { runIdRef.current += 1 }, [])

  return { executionState, characterPosition, characterMessage, stageScene, run, reset, clickCharacter }
}
