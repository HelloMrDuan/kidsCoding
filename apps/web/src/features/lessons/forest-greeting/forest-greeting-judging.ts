/**
 * lesson-02-forest-greeting 课堂判定（纯函数，与组件分离）。
 *
 * 判定语义一律复用旧课堂的既有纯函数，不另发明一套：
 * - 程序能否运行、走几步、说什么、何时说：`simulateProgram` /
 *   `sayMessageFor`（observable-run.ts）。
 * - 本关是否通过：`evaluateObservable`（SYS-103：按可观察结果判定，
 *   等价程序通过、反例失败、不能运行的程序永不通过），判定选项取
 *   `getStepJudgeOptions`（本课 acceptedLines = 4 句预设对白原文，
 *   任选一句都算说对）。
 * - 失败一句话：`explainRunFailure`（run-feedback.ts，TQ-008）。
 * - 设计错误实验：`isDesignedMistakeRun`（mistake-steps.ts，TQ-010）。
 * - 每关的目标程序（requiredBlockTypes）取自 launch-lessons.ts 本课
 *   四步原文，不得硬编码第二份目标。
 *
 * 裁定 2（首席 2026-11-15）：必须按四个教学步骤分别验证实际运行、
 * 连接顺序、预测、错误观察与修复，不允许只查静态积木数量。本模块的
 * judgeGreetingStep 只做“运行一次并判定”；预测回答、错误观察与修复
 * 的门控在插槽的完成处理里（与旧课堂 handleNext 同顺序），判定本身
 * 不代替它们。
 *
 * 运行帧（与 lesson-01 的区别）：除移动帧外还有说话帧——狐狸必须按
 * 实际积木顺序先移动、再在对应位置显示对白，帧序列就是舞台播放与
 * 动作日志的唯一来源，不允许静态演示冒充。
 *
 * 三层呈现（buildGreetingJudgment，只做分层，不改判定语义）：
 * - stage.passed = 实际行走步数等于本关目标步数，且说话情况与本关
 *   目标一致（该说时说了、在对的位置说；不该说时没说）。
 * - task.passed = evaluateObservable 通过（程序正确且实际运行成功）。
 * - knowledge.passed = 顺序知识用对：“开始时”在最前、动作与对白按
 *   顺序发生；结构性失败与说话时机/对白类失败为未通过，距离类失败
 *   （走多/走少）不否定知识。
 * - conclusion passed = task && knowledge。
 */
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { getMistakeStep, isDesignedMistakeRun } from '@/content/curriculum/mistake-steps'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import {
  evaluateObservable,
  sayMessageFor,
  simulateProgram,
  STEP_DISTANCE,
  type ObservableVerdict,
  type ProgramBlock,
  type RunFailureCode,
} from '@/features/lessons/blockly/observable-run'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import type { JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import { GREETING_LESSON_ID, GREETING_STEP_IDS } from './forest-greeting-draft'

/** 每关目标步数（第 3 关目标 0 步：不走路，站在原地说话正是预期）。 */
export const GREETING_STEP_GOALS: Record<string, number> = {
  'step-1': 100,
  'step-2': 100,
  'step-3': 0,
  'step-4': 100,
}

/** 每关目标说话位置（步）；null = 本关不说话。 */
export const GREETING_STEP_SPEAK_AT: Record<string, number | null> = {
  'step-1': null,
  'step-2': 100,
  'step-3': 0,
  'step-4': 100,
}

export type GreetingFrame =
  | { kind: 'move'; foxPosition: number }
  | { kind: 'say'; foxPosition: number; message: string }

export type GreetingJudgeResult = {
  /** 本关的程序是否正确且实际运行成功。 */
  passed: boolean
  /** 首个可观察差异的失败码；通过时为 null；课程数据缺失时为 invalid_program。 */
  failure: RunFailureCode | 'invalid_program' | null
  /** 给孩子的结论句（通过 / 未通过 / 错误实验观察）。 */
  message: string
  /** 实际行走步数（simulateProgram 的 observed.position）。 */
  foxPosition: number
  /** 实际说出的对白（最后一句）；没说话为 null。 */
  spokenLine: string | null
  /** 实际说话时的位置（步）；没说话为 null。 */
  spokenAt: number | null
  /** 按积木逐块展开的运行帧（移动帧 + 说话帧；不能运行时为空）。 */
  frames: GreetingFrame[]
  /** 本次运行是否为设计错误实验（第 4 关预置错误程序的首次运行）。 */
  designedMistake: boolean
  /** 本次判定的完整可观察结论（供三层呈现与失败文案复用）。 */
  verdict: ObservableVerdict | null
  /** 本次判定的程序（传入的完整快照，含 disconnected 散块）。 */
  program: ProgramBlock[]
}

export function getGreetingLesson() {
  return launchLessons.find((lesson) => lesson.id === GREETING_LESSON_ID) ?? null
}

/** 本关的目标程序（requiredBlockTypes），取自课程数据原文。 */
export function greetingStepRequiredBlocks(stepId: string): string[] {
  const lesson = getGreetingLesson()
  return [...(lesson?.steps.find((step) => step.id === stepId)?.requiredBlockTypes ?? [])]
}

/**
 * 本模块不对程序做“主链截取”：旧课堂把完整快照（含 disconnected 散块）
 * 交给 evaluateStep，散块会判为 disconnected 失败（“有积木掉队啦！”），
 * 本课沿用同一口径——散块不计入运行是 G1-U1-L01 的做法，不适用于本课。
 */

const STRUCTURAL_FAILURES: ReadonlySet<string> = new Set([
  'empty',
  'disconnected',
  'missing-start',
  'extra-start',
  'unsupported-block',
  'too-many-blocks',
  'goal-misconfigured',
])

/** 说话时机 / 对白类失败：本课的顺序知识本身没用对。 */
const SAY_FAILURES: ReadonlySet<string> = new Set([
  'missing-say',
  'extra-say',
  'wrong-line',
  'unknown-line',
  'line-wrong-place',
  'say-too-early',
  'say-too-late',
])

/**
 * 顺序知识是否用对：程序以“开始时”开头、无结构性失败、且没有
 * 说话时机/对白类失败。距离类失败（走多 / 走少）不否定知识。
 */
export function greetingKnowledgePassed(
  blocks: ProgramBlock[],
  verdict: ObservableVerdict | null,
): boolean {
  if (!verdict) return false
  if (verdict.code !== null && STRUCTURAL_FAILURES.has(verdict.code)) return false
  if (verdict.code !== null && SAY_FAILURES.has(verdict.code)) return false
  return blocks.length > 0 && blocks[0].type === 'when_start'
}

export function judgeGreetingStep(
  blocks: ProgramBlock[],
  stepIndex: number,
  mistakeObserved = false,
): GreetingJudgeResult {
  const lesson = getGreetingLesson()
  const step = lesson?.steps[Math.min(Math.max(stepIndex, 0), GREETING_STEP_IDS.length - 1)]
  // 完整快照直接判定：含 disconnected 散块时 simulateProgram 判 disconnected
  // 失败（旧课堂同口径），不得先截成主链再判。
  const program = [...blocks]
  const empty: Pick<GreetingJudgeResult, 'frames' | 'verdict' | 'spokenLine' | 'spokenAt'> = {
    frames: [],
    verdict: null,
    spokenLine: null,
    spokenAt: null,
  }
  if (!lesson || !step) {
    return {
      passed: false,
      failure: 'invalid_program',
      message: '这一关还没准备好，请爸爸妈妈帮忙看看。',
      foxPosition: 0,
      ...empty,
      designedMistake: false,
      program,
    }
  }
  const verdict = evaluateObservable(
    step.requiredBlockTypes,
    program,
    getStepJudgeOptions(GREETING_LESSON_ID, step.id),
  )
  const simulation = simulateProgram(program)
  const foxPosition = simulation.ok ? simulation.observed.position : 0
  const spokenLine = simulation.ok ? simulation.observed.message : null
  const spokenAt = simulation.ok ? simulation.observed.messageAt : null
  const frames: GreetingFrame[] = []
  if (simulation.ok) {
    let position = 0
    for (const block of program.slice(1)) {
      if (block.type === 'move_right') {
        position += STEP_DISTANCE
        frames.push({ kind: 'move', foxPosition: position })
      } else if (block.type === 'say_line') {
        frames.push({ kind: 'say', foxPosition: position, message: sayMessageFor(block, 'forest', 'start') })
      }
    }
  }
  const mistake = getMistakeStep(GREETING_LESSON_ID, step.id)
  const designedMistake = isDesignedMistakeRun(mistake, verdict.code, mistakeObserved)
  if (designedMistake) {
    return {
      passed: false,
      failure: verdict.code,
      message: '这是错误程序运行的样子：小狐狸还没走上舞台，就先把话说了。看看舞台，回答上面的问题吧！',
      foxPosition,
      spokenLine,
      spokenAt,
      frames,
      designedMistake: true,
      verdict,
      program,
    }
  }
  if (!verdict.passed) {
    return {
      passed: false,
      failure: verdict.code,
      message:
        explainRunFailure(verdict, '小狐狸', 'walk') || verdict.reason || '再看看积木的顺序吧！',
      foxPosition,
      spokenLine,
      spokenAt,
      frames,
      designedMistake: false,
      verdict,
      program,
    }
  }
  return {
    passed: true,
    failure: null,
    message:
      step.id === 'step-3'
        ? `小狐狸站在原地，说：“${spokenLine}”`
        : spokenLine
          ? `小狐狸先走上舞台，再说：“${spokenLine}”`
          : `小狐狸走了 ${foxPosition} 步，走上舞台啦！`,
    foxPosition,
    spokenLine,
    spokenAt,
    frames,
    designedMistake: false,
    verdict,
    program,
  }
}

const KNOWLEDGE_FAILURE_TEXT: Record<string, string> = {
  'missing-start': '“开始时”不在最前面，小狐狸听不到出发口令。',
  'extra-start': '开始积木一块就够啦，多出来的那块要拿走。',
  disconnected: '有积木掉队啦！把它们都接在“开始时”下面，排成一串。',
  empty: '舞台上还空空的，先放一块“开始时”吧！',
  'unsupported-block': '这块积木这节课还用不上，先把它拿走吧。',
  'say-too-early': '“说一句话”排在移动前面啦：要先出场，再打招呼。',
  'say-too-late': '说话太晚啦，看看“说一句话”应该接在哪里。',
  'missing-say': '还没有“说一句话”，小狐狸没有开口。',
  'extra-say': '这一关还不用说话，先把“说一句话”拿走。',
  'wrong-line': '说的不是预设对白里的句子，在“选一句对白”里重新挑一句。',
  'unknown-line': '这句对白这里不能用，请在“选一句对白”里重新挑一句。',
}

/** 由一次判定结果构建三层判定（只做分层呈现，不改判定语义）。 */
export function buildGreetingJudgment(
  result: GreetingJudgeResult,
  stepIndex: number,
): JudgmentResult {
  const stepId = GREETING_STEP_IDS[Math.min(Math.max(stepIndex, 0), GREETING_STEP_IDS.length - 1)]
  const goal = GREETING_STEP_GOALS[stepId] ?? 0
  const speakAt = GREETING_STEP_SPEAK_AT[stepId] ?? null
  const speechMatches =
    speakAt === null
      ? result.spokenLine === null
      : result.spokenLine !== null && result.spokenAt === speakAt
  const stagePassed = result.foxPosition === goal && speechMatches
  const actualSpeech =
    result.spokenLine === null
      ? '没有说话'
      : `在 ${result.spokenAt} 步时说：“${result.spokenLine}”`
  const goalSpeech =
    speakAt === null ? '本关不说话' : `要在 ${speakAt} 步时说一句预设对白`
  const stageDetail = `舞台结果：小狐狸已走 ${result.foxPosition} 步，${actualSpeech}；本关要走 ${goal} 步，${goalSpeech}。`
  const taskPassed = result.passed
  const taskDetail = taskPassed
    ? `任务判定：通过。${result.message}`
    : `任务判定：未通过。${result.message}`
  const knowledgePassed = greetingKnowledgePassed(result.program, result.verdict)
  const knowledgeDetail = knowledgePassed
    ? '知识证据：通过。动作和对白按积木顺序发生：“开始时”在最前，先出场、再说话（本关不说话时就没有说话积木）。'
    : `知识证据：未通过。${KNOWLEDGE_FAILURE_TEXT[result.failure ?? ''] ?? '程序的顺序还不对，先看看“开始时”是不是在最前面、“说一句话”排在哪里。'}`
  const passed = taskPassed && knowledgePassed
  const programText =
    result.program.length > 0 ? result.program.map((block) => block.type).join(' → ') : '（空）'
  const methodEvidence = `方法证据：积木：${programText}；小狐狸位置：${result.foxPosition}；说话：${result.spokenLine === null ? '无' : `“${result.spokenLine}”@${result.spokenAt} 步`}；帧数：${result.frames.length}。`
  return {
    layers: [
      { id: 'stage', label: '舞台结果', passed: stagePassed, detail: stageDetail },
      { id: 'task', label: '任务判定', passed: taskPassed, detail: taskDetail },
      { id: 'knowledge', label: '知识证据', passed: knowledgePassed, detail: knowledgeDetail },
    ],
    passed,
    conclusion: result.designedMistake
      ? `结论：错误实验已观察。${result.message}`
      : passed
        ? `结论：已完成。${result.message}`
        : `结论：未合格。${result.message}`,
    methodEvidence,
  }
}
