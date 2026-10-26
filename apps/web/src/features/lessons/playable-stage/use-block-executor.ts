import { useState, useCallback, useRef, useEffect } from 'react'
import { evaluateObservable, MAX_PROGRAM_BLOCKS, sayMessageFor, simulateProgram, type JudgeOptions, type ObservableVerdict, type ProgramBlock } from '../blockly/observable-run'
import { judgeDuoProgram, type DuoMode } from './duo-judge'

const NO_JUDGE_OPTIONS: JudgeOptions = {}

/** TQ-012: a custom judge (unit projects accept several programs); replaces evaluateObservable. */
export type ProgramJudge = (blocks: ProgramBlock[]) => ObservableVerdict

export type ExecutionState = 'idle' | 'armed' | 'running' | 'success' | 'error'

export function useBlockExecutor(blocks: ProgramBlock[], requiredBlocks: string[], stepIndex: number = 0, duoEnabled: boolean | 'dialogue' | 'graduation' = false, judgeOptions: JudgeOptions = NO_JUDGE_OPTIONS, judge?: ProgramJudge) {
  const dialogueEnabled = duoEnabled === 'dialogue'
  const graduationEnabled = duoEnabled === 'graduation'
  const duoMode: DuoMode | null = !duoEnabled ? null : graduationEnabled ? 'graduation' : dialogueEnabled ? 'dialogue' : 'independent'
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
    // TQ-015: duo verdicts and kid-short failure reasons come from the pure judge;
    // this hook only animates the same program and surfaces the judge's result.
    const duoVerdict = duoMode ? judgeDuoProgram(blocks, duoMode, stepIndex) : null
    if (duoVerdict && (duoVerdict.code === 'not-connected' || duoVerdict.code === 'no-start')) {
      setErrorMessage(duoVerdict.reason)
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
        // The judge has already simulated this exact program: stop where it fails.
        if (duoVerdict && duoVerdict.failIndex === i) { fail(duoVerdict.reason ?? ''); return }
        if (type === 'move_right') {
          setActorActions({ main: actor === 'main' ? 'moving' : 'idle', partner: actor === 'partner' ? 'moving' : 'idle' })
          if (actor === 'main') {
            fox += 100
            setCharacterPosition(fox)
          } else {
            bear += 100
            setPartnerPosition(bear)
          }
          setActionLog(prev => [...prev, `${actor === 'main' ? '小狐狸' : '小熊'}向右走 100 步`])
        } else if (type === 'switch_character') {
          actor = 'partner'
          setActiveActor(actor)
          setActionLog(prev => [...prev, '切换到小熊：后面的动作只给小熊'])
        } else if (type === 'repeat_twice' && graduationEnabled) {
          setActorActions({ main: actor === 'main' ? 'moving' : 'idle', partner: actor === 'partner' ? 'moving' : 'idle' })
          if (actor === 'main') { fox += 100; setCharacterPosition(fox) }
          else { bear += 100; setPartnerPosition(bear) }
          setActionLog(prev => [...prev, `${actor === 'main' ? '小狐狸' : '小熊'}再走 100 步（重复）`])
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
        }
        // Any other block was already stopped by the judge's failIndex above.
        await new Promise(resolve => setTimeout(resolve, 180))
        if (runIdRef.current !== id) return
        setActorActions({ main: 'idle', partner: 'idle' })
        continue
      }
      // UX-204: the classroom stage observes the same per-block actions the duo
      // stage already shows — moving/speaking windows plus a plain-language log,
      // so a repeat is visible as its own event, not just a bigger step count.
      // Log lines stay generic here: this path runs every 01–09 template, and
      // the hook does not know the main character's label.
      if (type === 'move_right') {
        setActorActions({ main: 'moving', partner: 'idle' })
        setCharacterPosition(prev => prev + 100)
        setActionLog(prev => [...prev, '向右走 100 步'])
      } else if (type === 'switch_scene') {
        setStageScene('meadow')
        // TQ-011: a line said in the forest stays in the forest — the new scene starts without
        // the old bubble, so the meadow never shows “你好！” that was said before the switch.
        setCharacterMessage(null)
        setActionLog(prev => [...prev, '切换场景到草地'])
      } else if (type === 'repeat_twice') {
        if (!blocks.slice(0, i).some(b => b.type === 'move_right')) {
          setExecutionState('error')
          return
        }
        setActorActions({ main: 'moving', partner: 'idle' })
        setCharacterPosition(prev => prev + 100)
        setActionLog(prev => [...prev, '再走 100 步（重复）'])
      } else if (type === 'say_line') {
        const message = sayMessageFor(
          blocks[i],
          blocks.slice(0, i).some(b => b.type === 'switch_scene') ? 'meadow' : 'forest',
          blocks[0].type === 'when_clicked' ? 'click' : 'start',
        )
        setActorActions({ main: 'speaking', partner: 'idle' })
        setCharacterMessage(message)
        setActionLog(prev => [...prev, `说：${message}`])
      } else {
        setExecutionState('error')
        return
      }
      await new Promise(resolve => setTimeout(resolve, 180))
      if (runIdRef.current !== id) return
      setActorActions({ main: 'idle', partner: 'idle' })
    }
    if (!duoEnabled) {
      // SYS-103: judge the observed result, so equivalent programs pass and counter-examples fail.
      const verdict = judge ? judge(blocks) : evaluateObservable(requiredBlocks, blocks, judgeOptions)
      if (!verdict.passed) {
        fail(verdict.reason)
        return
      }
    }
    if (duoEnabled) {
      if (duoVerdict && !duoVerdict.passed) {
        fail(duoVerdict.reason ?? '')
        return
      }
      if (graduationEnabled && stepIndex >= 2) {
        setGiftFound(true)
        setActionLog(prev => [...prev, '礼物已找到：狐狸 100 步，小熊 200 步，两个目标都到位'])
      }
    }
    if (runIdRef.current === id) setExecutionState('success')
  }, [blocks, requiredBlocks, duoEnabled, duoMode, dialogueEnabled, graduationEnabled, stepIndex, judgeOptions, judge])

  const run = useCallback(async () => {
    reset()
    const id = ++runIdRef.current
    setExecutionState('running')
    if (blocks.length > MAX_PROGRAM_BLOCKS) {
      setErrorMessage(`一次最多运行 ${MAX_PROGRAM_BLOCKS} 块积木。`)
      setExecutionState('error')
      return
    }
    if (!duoEnabled) {
      // A program that cannot actually run never starts (and never earns completion).
      const simulation = simulateProgram(blocks)
      if (!simulation.ok) {
        setErrorMessage(simulation.reason)
        setExecutionState('error')
        return
      }
    }
    if (duoEnabled ? blocks[0]?.type !== 'when_start' : blocks[0]?.type !== 'when_start' && blocks[0]?.type !== 'when_clicked') {
      setErrorMessage(duoMode ? judgeDuoProgram(blocks, duoMode, stepIndex).reason : '请把“开始时”放在最前面，告诉朋友什么时候行动。')
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
  }, [blocks, requiredBlocks, reset, execute, duoEnabled, duoMode, stepIndex])

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
