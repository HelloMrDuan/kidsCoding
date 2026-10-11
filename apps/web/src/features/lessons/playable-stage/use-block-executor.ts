import { useState, useCallback, useRef, useEffect } from 'react'

export type ExecutionState = 'idle' | 'armed' | 'running' | 'success' | 'error'

export function useBlockExecutor(blocks: Array<{ type: string; disconnected?: boolean }>, requiredBlocks: string[], stepIndex: number = 0, duoEnabled: boolean | 'dialogue' | 'graduation' = false) {
  const dialogueEnabled = duoEnabled === 'dialogue'
  const graduationEnabled = duoEnabled === 'graduation'
  const [giftFound, setGiftFound] = useState(false)
  const [executionState, setExecutionState] = useState<ExecutionState>('idle')
  const [characterPosition, setCharacterPosition] = useState(0)
  const [characterMessage, setCharacterMessage] = useState<string | null>(null)
  const [stageScene, setStageScene] = useState<'forest' | 'meadow'>('forest')
  const [partnerPosition, setPartnerPosition] = useState(0)
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null)
  const [activeActor, setActiveActor] = useState<'main' | 'partner'>('main')
  const [actorActions, setActorActions] = useState<{ main: 'idle' | 'moving' | 'speaking'; partner: 'idle' | 'moving' | 'speaking' }>({ main: 'idle', partner: 'idle' })
  const [actionLog, setActionLog] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const runIdRef = useRef(0)

  const reset = useCallback(() => {
    runIdRef.current += 1
    setExecutionState('idle')
    setCharacterPosition(0)
    setCharacterMessage(null)
    setStageScene('forest')
    setPartnerPosition(0)
    setPartnerMessage(null)
    setActiveActor('main')
    setActorActions({ main: 'idle', partner: 'idle' })
    setActionLog([])
    setErrorMessage(null)
    setGiftFound(false)
  }, [])

  // Execute the actual lesson block program. The event hat alone never
  // moves a sprite: click-triggered code only starts after a real UI click.
  const execute = useCallback(async (id: number) => {
    setExecutionState('running')
    if (duoEnabled && blocks.some(block => block.disconnected)) {
      setErrorMessage('有积木没有接在“开始时”下面。请把动作连成一条程序再运行。')
      setExecutionState('error')
      return
    }
    let actor: 'main' | 'partner' = 'main'
    let fox = 0
    let bear = 0
    let foxMessage: string | null = null
    let bearMessage: string | null = null
    const fail = (message: string) => {
      setErrorMessage(message)
      setExecutionState('error')
    }
    for (let i = 1; i < blocks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 330))
      if (runIdRef.current !== id) return
      const type = blocks[i].type
      if (duoEnabled) {
        // Lessons 10–12 interpret the actual connected program with two targets.
        // Validate observed coordinates, not a precomputed answer animation.
        if (type === 'move_right') {
          setActorActions({ main: actor === 'main' ? 'moving' : 'idle', partner: actor === 'partner' ? 'moving' : 'idle' })
          if (actor === 'main') {
            fox += 100
            setCharacterPosition(fox)
          } else {
            bear += 100
            setPartnerPosition(bear)
          }
          setActionLog(prev => [...prev, `${actor === 'main' ? '小狐狸' : '小熊'}向右移动 100 步`])
        } else if (type === 'switch_character') {
          if (actor === 'partner') { fail('已经在操作小熊了。本课只切换一次，重复切换没有新目标。'); return }
          if (fox !== 100) { fail('先让小狐狸走 100 步，再把操作权交给小熊。'); return }
          actor = 'partner'
          setActiveActor(actor)
          setActionLog(prev => [...prev, '切换到小熊：后面的动作只给小熊'])
        } else if (type === 'repeat_twice' && graduationEnabled) {
          if (blocks[i - 1]?.type !== 'move_right') { fail('“再做一次”要接在当前角色的移动后面，切换不会把狐狸的移动交给小熊重复。'); return }
          setActorActions({ main: actor === 'main' ? 'moving' : 'idle', partner: actor === 'partner' ? 'moving' : 'idle' })
          if (actor === 'main') { fox += 100; setCharacterPosition(fox) }
          else { bear += 100; setPartnerPosition(bear) }
          setActionLog(prev => [...prev, `${actor === 'main' ? '小狐狸' : '小熊'}再移动 100 步（再做一次）`])
        } else if (type === 'say_line' && (dialogueEnabled || graduationEnabled && stepIndex === 4)) {
          setActorActions({ main: actor === 'main' ? 'speaking' : 'idle', partner: actor === 'partner' ? 'speaking' : 'idle' })
          if (actor === 'main') {
            foxMessage = '你好！'
            setCharacterMessage(foxMessage)
          } else {
            bearMessage = graduationEnabled ? '找到礼物啦！' : '我们一起出发吧！'
            setPartnerMessage(bearMessage)
          }
          setActionLog(prev => [...prev, `${actor === 'main' ? '小狐狸' : '小熊'}说：${actor === 'main' ? foxMessage : bearMessage}`])
        } else if (type === 'say_line' && actor === 'main' && stepIndex === 4) {
          setCharacterMessage('你好！')
          setActionLog(prev => [...prev, '小狐狸说：你好！'])
        } else {
          fail(type === 'say_line' ? '这次改造只给小狐狸加问候，请放在切换之前。' : '这块积木还不能在本课执行。请用开始、移动和角色切换。')
          return
        }
        await new Promise(resolve => setTimeout(resolve, 180))
        if (runIdRef.current !== id) return
        setActorActions({ main: 'idle', partner: 'idle' })
        continue
      }
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
    if (duoEnabled) {
      const expectedFox = stepIndex === 0 ? 0 : 100
      const expectedBear = graduationEnabled ? (stepIndex < 2 ? 0 : 200) : dialogueEnabled ? (stepIndex === 0 ? 0 : 100) : stepIndex < 2 ? 0 : 100
      if (fox !== expectedFox || bear !== expectedBear) {
        fail(`目标：小狐狸 ${expectedFox} 步、小熊 ${expectedBear} 步；实际：小狐狸 ${fox} 步、小熊 ${bear} 步。${bear === 0 && expectedBear > 0 ? '小熊还没动，看看操作权交给谁了。' : '检查移动次数和动作目标。'}`)
        return
      }
      if (dialogueEnabled) {
        if (foxMessage !== null && stepIndex < 4) {
          fail('实际是小狐狸说了“你好！”，小熊的目标对白没有交给正确角色。把说话积木移到切换之后。')
          return
        }
        if (stepIndex >= 2 && bearMessage !== '我们一起出发吧！') {
          fail('两位朋友到位了，但小熊还没说“我们一起出发吧！”。检查切换后有没有说话积木。')
          return
        }
        if (stepIndex < 2 && (foxMessage !== null || bearMessage !== null)) {
          fail('这一步先观察起点或独立移动，暂时不用说话积木。')
          return
        }
      }
      if (graduationEnabled && stepIndex >= 2) {
        setGiftFound(true)
        setActionLog(prev => [...prev, '礼物已找到：狐狸 100 步，小熊 200 步，两个目标都到位'])
      }
    }
    if (runIdRef.current === id) setExecutionState('success')
  }, [blocks, duoEnabled, dialogueEnabled, graduationEnabled, stepIndex])

  const run = useCallback(async () => {
    reset()
    const id = ++runIdRef.current
    setExecutionState('running')
    if ((!duoEnabled && (blocks.length !== requiredBlocks.length || !requiredBlocks.every((type, i) => type === blocks[i]?.type))) || blocks.length > 24) {
      setErrorMessage('积木数量或顺序不符合任务；一次最多运行 24 块。')
      setExecutionState('error')
      return
    }
    if (duoEnabled ? blocks[0]?.type !== 'when_start' : blocks[0]?.type !== 'when_start' && blocks[0]?.type !== 'when_clicked') {
      setErrorMessage('请把“开始时”放在最前面，告诉朋友什么时候行动。')
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
  }, [blocks, requiredBlocks, reset, execute, duoEnabled])

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
    setPartnerPosition(0)
    setPartnerMessage(null)
    setActiveActor('main')
    setActorActions({ main: 'idle', partner: 'idle' })
    setActionLog([])
    setErrorMessage(null)
    setGiftFound(false)
  }

  useEffect(() => { runIdRef.current += 1 }, [stepIndex, currentBlocksKey])
  useEffect(() => () => { runIdRef.current += 1 }, [])

  return { executionState, giftFound, characterPosition, characterMessage, partnerPosition, partnerMessage, activeActor, actorActions, actionLog, errorMessage, stageScene, run, reset, clickCharacter }
}
