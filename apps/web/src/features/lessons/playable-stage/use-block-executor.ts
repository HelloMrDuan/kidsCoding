import { useState, useCallback, useRef, useEffect } from 'react'

export type ExecutionState = 'idle' | 'armed' | 'running' | 'success' | 'error'

export function useBlockExecutor(blocks: Array<{ type: string }>, requiredBlocks: string[], stepIndex: number = 0, duoEnabled = false) {
  const [executionState, setExecutionState] = useState<ExecutionState>('idle')
  const [characterPosition, setCharacterPosition] = useState(0)
  const [characterMessage, setCharacterMessage] = useState<string | null>(null)
  const [stageScene, setStageScene] = useState<'forest' | 'meadow'>('forest')
  const [partnerPosition,setPartnerPosition]=useState(0)
  const [partnerMessage,setPartnerMessage]=useState<string|null>(null)
  const [activeActor,setActiveActor]=useState<'main'|'partner'>('main')
  const [actionLog,setActionLog]=useState<string[]>([])
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
    setActionLog([])
  }, [])

  // Execute the actual lesson block program. The event hat alone never
  // moves a sprite: click-triggered code only starts after a real UI click.
  const execute = useCallback(async (id: number) => {
    setExecutionState('running')
    let actor:'main'|'partner'='main'
    let movedMain=false
    let movedPartner=false
    let switched=false
    for (let i = 1; i < blocks.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 330))
      if (runIdRef.current !== id) return
      const type = blocks[i].type
      if (type === 'move_right') {
        if (actor==='partner') {
          movedPartner=true
          setPartnerPosition(prev=>prev+100)
          setActionLog(prev=>[...prev,'第二位朋友向右走了一步'])
        } else {
          movedMain=true
          setCharacterPosition(prev=>prev+100)
          setActionLog(prev=>[...prev,'第一位朋友向右走了一步'])
        }
      } else if (type === 'switch_character') {
        // A constrained teaching adapter: control switches to the partner's
        // subsequent instructions, not an official Scratch multi-target VM.
        if(!duoEnabled||switched||!movedMain) {
          setExecutionState('error')
          return
        }
        switched=true
        actor='partner'
        setActiveActor('partner')
        setActionLog(prev=>[...prev,'接下来由第二位朋友执行积木'])
      } else if (type === 'switch_scene') {
        setStageScene('meadow')
      } else if (type === 'repeat_twice') {
        if(actor==='partner'?!movedPartner:!movedMain){
          setExecutionState('error')
          return
        }
        if(actor==='partner'){
          setPartnerPosition(prev=>prev+100)
          setActionLog(prev=>[...prev,'第二位朋友把自己的移动再做一次'])
        }else{
          setCharacterPosition(prev=>prev+100)
        }
      } else if (type === 'say_line') {
        if(actor==='partner'){
          if(!movedPartner){setExecutionState('error');return}
          setPartnerMessage('一起找到礼物啦！')
          setActionLog(prev=>[...prev,'第二位朋友说出合作对白'])
        }else{
          setCharacterMessage(blocks.slice(0, i).some(b => b.type === 'switch_scene')
            ? '我到草地啦！'
            : blocks[0].type === 'when_clicked' ? '蝴蝶收到你的点击啦！' : '你好！')
        }
      } else {
        setExecutionState('error')
        return
      }
      await new Promise(resolve => setTimeout(resolve, 180))
      if (runIdRef.current !== id) return
    }
    if (runIdRef.current === id) setExecutionState('success')
  }, [blocks,duoEnabled])

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
    setPartnerPosition(0)
    setPartnerMessage(null)
    setActiveActor('main')
    setActionLog([])
  }

  useEffect(() => { runIdRef.current += 1 }, [stepIndex, currentBlocksKey])
  useEffect(() => () => { runIdRef.current += 1 }, [])

  return { executionState, characterPosition, characterMessage, partnerPosition, partnerMessage, activeActor, actionLog, stageScene, run, reset, clickCharacter }
}
