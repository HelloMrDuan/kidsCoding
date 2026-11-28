/**
 * OPS-056：启蒙课 V3 判定与逐帧展开（纯函数）。
 *
 * 判定一律复用旧课堂既有纯函数，不另发明规则：
 * - 单角色课（L02～L09）：evaluateObservable + getStepJudgeOptions；能否运行看
 *   simulateProgram；设计错误实验看 isDesignedMistakeRun；失败句子用 explainRunFailure。
 * - 双角色课（L10～L12）：judgeDuoProgram（independent / dialogue / graduation）。
 * 逐帧展开与旧执行器 useBlockExecutor 同语义：移动 / 重复 / 切场景（清气泡）/
 * 说话（sayMessageFor）；双角色在 failIndex 处停下，对白与礼物条件照旧。
 */
import { getMistakeStep, isDesignedMistakeRun } from '@/content/curriculum/mistake-steps'
import { motionVerbForTemplate } from '@/features/lessons/blockly/block-labels'
import {
  evaluateObservable,
  sayMessageFor,
  simulateProgram,
  STEP_DISTANCE,
  type ObservableVerdict,
  type ProgramBlock,
} from '@/features/lessons/blockly/observable-run'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import {
  isDuoDesignedMistakeRun,
  judgeDuoProgram,
  type DuoMode,
  type DuoVerdict,
} from '@/features/lessons/playable-stage/duo-judge'
import { getMainCharacterLabel } from '@/features/lessons/playable-stage/playable-stage'
import type { JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import { getLaunchV3Lesson, getLaunchV3Template, launchV3DuoMode } from './launch-v3-lessons'

export type LaunchActor = 'main' | 'partner'
export type LaunchActorAction = 'idle' | 'moving' | 'speaking'

/** 一帧舞台状态（帧后的完整状态，舞台直接渲染）。 */
export type LaunchStageFrame = {
  mainPosition: number
  partnerPosition: number
  mainMessage: string | null
  partnerMessage: string | null
  scene: 'forest' | 'meadow'
  activeActor: LaunchActor
  mainAction: LaunchActorAction
  partnerAction: LaunchActorAction
  /** 本帧的动作日志行；null = 本帧不产生日志。 */
  log: string | null
}

export const EMPTY_LAUNCH_FRAME: LaunchStageFrame = {
  mainPosition: 0,
  partnerPosition: 0,
  mainMessage: null,
  partnerMessage: null,
  scene: 'forest',
  activeActor: 'main',
  mainAction: 'idle',
  partnerAction: 'idle',
  log: null,
}

export const GIFT_FOUND_LOG = '礼物已找到：狐狸 100 步，小熊 200 步，两个目标都到位'

export type LaunchJudgeResult = {
  passed: boolean
  failure: string | null
  message: string
  trigger: 'start' | 'click'
  /** 程序能否开始运行（不能运行时直接 error，不伪造播放，也不进入等待点击）。 */
  canRun: boolean
  frames: LaunchStageFrame[]
  /** 运行结束时的舞台状态（无帧时为初始状态）。 */
  final: LaunchStageFrame
  designedMistake: boolean
  giftFound: boolean
  verdict: ObservableVerdict | null
  duoVerdict: DuoVerdict | null
  program: ProgramBlock[]
}

function singleFrames(program: ProgramBlock[]): LaunchStageFrame[] {
  const trigger = program[0]?.type === 'when_clicked' ? 'click' : 'start'
  let position = 0
  let scene: 'forest' | 'meadow' = 'forest'
  let message: string | null = null
  let moved = false
  const frames: LaunchStageFrame[] = []
  const push = (action: LaunchActorAction, log: string) =>
    frames.push({
      ...EMPTY_LAUNCH_FRAME,
      mainPosition: position,
      mainMessage: message,
      scene,
      mainAction: action,
      log,
    })
  for (const block of program.slice(1)) {
    if (block.type === 'move_right') {
      position += STEP_DISTANCE
      moved = true
      push('moving', '向右走 100 步')
    } else if (block.type === 'repeat_twice') {
      if (!moved) break
      position += STEP_DISTANCE
      push('moving', '再走 100 步（重复）')
    } else if (block.type === 'switch_scene') {
      scene = 'meadow'
      // 在森林说的话留在森林：换场景时清掉旧气泡（与旧执行器一致）。
      message = null
      push('idle', '切换场景到草地')
    } else if (block.type === 'say_line') {
      message = sayMessageFor(block, scene, trigger)
      push('speaking', `说：${message}`)
    } else {
      break
    }
  }
  return frames
}

function duoFrames(
  program: ProgramBlock[],
  mode: DuoMode,
  stepIndex: number,
  verdict: DuoVerdict,
): LaunchStageFrame[] {
  const dialogue = mode === 'dialogue'
  const graduation = mode === 'graduation'
  let actor: LaunchActor = 'main'
  let fox = 0
  let bear = 0
  let foxMessage: string | null = null
  let bearMessage: string | null = null
  const frames: LaunchStageFrame[] = []
  const label = (who: LaunchActor) => (who === 'main' ? '小狐狸' : '小熊')
  const push = (action: LaunchActorAction, log: string | null) =>
    frames.push({
      mainPosition: fox,
      partnerPosition: bear,
      mainMessage: foxMessage,
      partnerMessage: bearMessage,
      scene: 'forest',
      activeActor: actor,
      mainAction: actor === 'main' ? action : 'idle',
      partnerAction: actor === 'partner' ? action : 'idle',
      log,
    })
  for (let i = 1; i < program.length; i++) {
    // 判定已模拟同一段程序：在它失败的那一块停下（与旧执行器一致）。
    if (verdict.failIndex === i) break
    const type = program[i].type
    if (type === 'move_right' || (type === 'repeat_twice' && graduation)) {
      if (actor === 'main') fox += STEP_DISTANCE
      else bear += STEP_DISTANCE
      push(
        'moving',
        type === 'move_right' ? `${label(actor)}向右走 100 步` : `${label(actor)}再走 100 步（重复）`,
      )
    } else if (type === 'switch_character') {
      actor = 'partner'
      push('idle', '切换到小熊：后面的动作只给小熊')
    } else if (type === 'say_line' && (dialogue || (graduation && stepIndex === 4))) {
      if (actor === 'main') foxMessage = '你好！'
      else bearMessage = graduation ? '找到礼物啦！' : '我们一起出发吧！'
      push('speaking', `${label(actor)}说：${actor === 'main' ? foxMessage : bearMessage}`)
    } else if (type === 'say_line' && actor === 'main' && stepIndex === 4) {
      foxMessage = '你好！'
      push('speaking', '小狐狸说：你好！')
    } else {
      push('idle', null)
    }
  }
  return frames
}

function invalidResult(program: ProgramBlock[]): LaunchJudgeResult {
  return {
    passed: false,
    failure: 'invalid_program',
    message: '这一关还没准备好，请爸爸妈妈帮忙看看。',
    trigger: 'start',
    canRun: false,
    frames: [],
    final: EMPTY_LAUNCH_FRAME,
    designedMistake: false,
    giftFound: false,
    verdict: null,
    duoVerdict: null,
    program,
  }
}

const MISTAKE_MESSAGE = '这是错误程序运行的样子。看看舞台，回答上面的问题吧！'

export function judgeLaunchStep(
  lessonId: string,
  blocks: ProgramBlock[],
  stepIndex: number,
  mistakeObserved = false,
): LaunchJudgeResult {
  const program = blocks.map((block) => ({ ...block }))
  const lesson = getLaunchV3Lesson(lessonId)
  if (!lesson || lesson.steps.length === 0) return invalidResult(program)
  const index = Math.min(Math.max(Math.floor(stepIndex), 0), lesson.steps.length - 1)
  const step = lesson.steps[index]
  const trigger = program[0]?.type === 'when_clicked' ? 'click' : 'start'
  const mode = launchV3DuoMode(lessonId)

  if (mode) {
    const duo = judgeDuoProgram(program, mode, index)
    const canRun = duo.code !== 'not-connected' && duo.code !== 'no-start'
    const frames = canRun ? duoFrames(program, mode, index, duo) : []
    const designedMistake = index === 3 && !mistakeObserved && isDuoDesignedMistakeRun(duo, mode)
    const giftFound = mode === 'graduation' && index >= 2 && duo.passed
    const message = duo.passed
      ? giftFound
        ? '礼物找到啦！狐狸 100 步，小熊 200 步，两个目标都到位。'
        : `运行成功：小狐狸走了 ${duo.fox} 步，小熊走了 ${duo.bear} 步。`
      : designedMistake
        ? MISTAKE_MESSAGE
        : (duo.reason ?? '再看看积木的顺序吧！')
    return {
      passed: duo.passed,
      failure: duo.code,
      message,
      trigger: 'start',
      canRun,
      frames,
      final: frames[frames.length - 1] ?? EMPTY_LAUNCH_FRAME,
      designedMistake,
      giftFound,
      verdict: null,
      duoVerdict: duo,
      program,
    }
  }

  const verdict = evaluateObservable(
    step.requiredBlockTypes,
    program,
    getStepJudgeOptions(lessonId, step.id),
  )
  const simulation = simulateProgram(program)
  const frames = simulation.ok ? singleFrames(program) : []
  const designedMistake = isDesignedMistakeRun(
    getMistakeStep(lessonId, step.id),
    verdict.code,
    mistakeObserved,
  )
  const template = getLaunchV3Template(lessonId)
  const final = frames[frames.length - 1] ?? EMPTY_LAUNCH_FRAME
  const label = getMainCharacterLabel(template)
  let message: string
  if (designedMistake) {
    message = MISTAKE_MESSAGE
  } else if (!verdict.passed) {
    message =
      explainRunFailure(verdict, label, motionVerbForTemplate(template?.id)) ||
      verdict.reason ||
      '再看看积木的顺序吧！'
  } else {
    const scenePart = final.scene === 'meadow' ? '，来到草地' : ''
    const sayPart = final.mainMessage ? `，说：“${final.mainMessage}”` : ''
    message = `运行成功：${label}移动了 ${final.mainPosition} 步${scenePart}${sayPart}。`
  }
  return {
    passed: verdict.passed,
    failure: verdict.code,
    message,
    trigger,
    canRun: simulation.ok,
    frames,
    final,
    designedMistake,
    giftFound: false,
    verdict,
    duoVerdict: null,
    program,
  }
}

/** 只说明数量 / 距离 / 选句的差异，不否定“顺序与事件”知识本身。 */
const NON_KNOWLEDGE_CODES: ReadonlySet<string> = new Set([
  'too-few-moves',
  'too-many-moves',
  'wrong-line',
  'unknown-line',
  'wrong-distance',
])

export function launchKnowledgePassed(result: LaunchJudgeResult): boolean {
  if (result.passed) return true
  if (!result.canRun) return false
  return result.failure !== null && NON_KNOWLEDGE_CODES.has(result.failure)
}

/** 三层判定（只做分层呈现，不改判定语义）。 */
export function buildLaunchJudgment(result: LaunchJudgeResult): JudgmentResult {
  const final = result.final
  let stagePassed: boolean
  let stageDetail: string
  if (result.duoVerdict) {
    stagePassed = result.passed
    stageDetail = `舞台结果：小狐狸 ${final.mainPosition} 步，小熊 ${final.partnerPosition} 步${result.giftFound ? '，礼物已找到' : ''}。`
  } else {
    const goal = result.verdict?.goal ?? null
    const actual = result.verdict?.actual ?? null
    stagePassed = Boolean(goal && actual && goal.position === actual.position && goal.scene === actual.scene)
    stageDetail = goal
      ? `舞台结果：实际 ${final.mainPosition} 步、${final.scene === 'meadow' ? '草地' : '森林'}；本关要 ${goal.position} 步、${goal.scene === 'meadow' ? '草地' : '森林'}。`
      : '舞台结果：程序没有运行起来。'
  }
  const knowledgePassed = launchKnowledgePassed(result)
  const passed = result.passed && knowledgePassed
  const programText =
    result.program.length > 0 ? result.program.map((block) => block.type).join(' → ') : '（空）'
  return {
    layers: [
      { id: 'stage', label: '舞台结果', passed: stagePassed, detail: stageDetail },
      {
        id: 'task',
        label: '任务判定',
        passed: result.passed,
        detail: `任务判定：${result.passed ? '通过' : '未通过'}。${result.message}`,
      },
      {
        id: 'knowledge',
        label: '知识证据',
        passed: knowledgePassed,
        detail: knowledgePassed
          ? '知识证据：通过。事件、顺序与角色归属用对了。'
          : `知识证据：未通过。${result.message}`,
      },
    ],
    passed,
    conclusion: result.designedMistake
      ? `结论：错误实验已观察。${result.message}`
      : passed
        ? `结论：已完成。${result.message}`
        : `结论：未合格。${result.message}`,
    methodEvidence: `方法证据：积木：${programText}；主角位置：${final.mainPosition}；伙伴位置：${final.partnerPosition}；帧数：${result.frames.length}。`,
  }
}
