/**
 * lesson-01-forest-hello 课堂判定（纯函数，与组件分离）。
 *
 * 判定语义一律复用旧课堂的既有纯函数，不另发明一套：
 * - 程序能否运行、走几步：`simulateProgram`（observable-run.ts）。
 * - 本关是否通过：`evaluateObservable`（SYS-103：按可观察结果判定，
 *   等价程序通过、反例失败、不能运行的程序永不通过）。
 * - 失败一句话：`explainRunFailure`（run-feedback.ts，TQ-008）。
 * - 设计错误实验：`isDesignedMistakeRun`（mistake-steps.ts，TQ-010）。
 * - 每关的目标程序（requiredBlockTypes）取自 launch-lessons.ts 本课
 *   四步原文，不得硬编码第二份目标。
 *
 * 裁定 2（首席 2026-11-15）：必须按四个教学步骤分别验证实际运行、
 * 连接顺序、预测、错误观察与修复，不允许只查静态积木数量。本模块的
 * judgeForestStep 只做“运行一次并判定”；预测回答、错误观察与修复
 * 的门控在插槽的完成处理里（与旧课堂 handleNext 同顺序），判定本身
 * 不代替它们。
 *
 * 三层呈现（buildForestJudgment，只做分层，不改判定语义）：
 * - stage.passed = 实际行走步数等于本关目标步数（第 1 关目标 0 步，
 *   狐狸不动正是预期）；detail 写实际步数与目标步数。
 * - task.passed = evaluateObservable 通过（程序正确且实际运行成功）。
 * - knowledge.passed = “开始时”在最前、移动接在后面（顺序知识）；
 *   结构性失败（缺开始、断开、空程序、不支持的积木）为未通过，
 *   距离类失败（走多/走少）不否定知识——顺序本身用对了。
 * - conclusion passed = task && knowledge。
 */
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { getMistakeStep, isDesignedMistakeRun } from '@/content/curriculum/mistake-steps'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import {
  evaluateObservable,
  simulateProgram,
  STEP_DISTANCE,
  type ObservableVerdict,
  type ProgramBlock,
  type RunFailureCode,
} from '@/features/lessons/blockly/observable-run'
import { getStepJudgeOptions } from '@/features/lessons/blockly/step-judge-options'
import type { JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import { FOREST_LESSON_ID, FOREST_STEP_IDS } from './forest-hello-draft'

/** 每关目标步数（第 1 关目标 0 步：只放开始积木，狐狸不动正是预期）。 */
export const FOREST_STEP_GOALS: Record<string, number> = {
  'step-1': 0,
  'step-2': 100,
  'step-3': 200,
  'step-4': 100,
}

export type ForestFrame = {
  kind: 'move'
  foxPosition: number
}

export type ForestJudgeResult = {
  /** 本关的程序是否正确且实际运行成功。 */
  passed: boolean
  /** 首个可观察差异的失败码；通过时为 null；课程数据缺失时为 invalid_program。 */
  failure: RunFailureCode | 'invalid_program' | null
  /** 给孩子的结论句（通过 / 未通过 / 错误实验观察）。 */
  message: string
  /** 实际行走步数（simulateProgram 的 observed.position）。 */
  foxPosition: number
  /** 按积木逐块展开的运行帧（只有移动帧；不能运行时为空）。 */
  frames: ForestFrame[]
  /** 本次运行是否为设计错误实验（第 4 关预置错误程序的首次运行）。 */
  designedMistake: boolean
  /** 本次判定的完整可观察结论（供三层呈现与失败文案复用）。 */
  verdict: ObservableVerdict | null
  /** 本次判定的程序（传入的完整快照，含 disconnected 散块）。 */
  program: ProgramBlock[]
}

export function getForestLesson() {
  return launchLessons.find((lesson) => lesson.id === FOREST_LESSON_ID) ?? null
}

/** 本关的目标程序（requiredBlockTypes），取自课程数据原文。 */
export function forestStepRequiredBlocks(stepId: string): string[] {
  const lesson = getForestLesson()
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

/**
 * 顺序知识是否用对：程序以“开始时”开头、且无结构性失败。
 * 距离类失败（走多 / 走少）不否定知识——顺序本身用对了。
 */
export function forestKnowledgePassed(
  blocks: ProgramBlock[],
  verdict: ObservableVerdict | null,
): boolean {
  if (!verdict) return false
  if (verdict.code !== null && STRUCTURAL_FAILURES.has(verdict.code)) return false
  return blocks.length > 0 && blocks[0].type === 'when_start'
}

export function judgeForestStep(
  blocks: ProgramBlock[],
  stepIndex: number,
  mistakeObserved = false,
): ForestJudgeResult {
  const lesson = getForestLesson()
  const step = lesson?.steps[Math.min(Math.max(stepIndex, 0), FOREST_STEP_IDS.length - 1)]
  // 完整快照直接判定：含 disconnected 散块时 simulateProgram 判 disconnected
  // 失败（旧课堂同口径），不得先截成主链再判。
  const program = [...blocks]
  const empty: Pick<ForestJudgeResult, 'frames' | 'verdict'> = { frames: [], verdict: null }
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
    getStepJudgeOptions(FOREST_LESSON_ID, step.id),
  )
  const simulation = simulateProgram(program)
  const foxPosition = simulation.ok ? simulation.observed.position : 0
  const frames: ForestFrame[] = []
  if (simulation.ok) {
    let position = 0
    for (const block of program.slice(1)) {
      if (block.type === 'move_right') {
        position += STEP_DISTANCE
        frames.push({ kind: 'move', foxPosition: position })
      }
    }
  }
  const mistake = getMistakeStep(FOREST_LESSON_ID, step.id)
  const designedMistake = isDesignedMistakeRun(mistake, verdict.code, mistakeObserved)
  if (designedMistake) {
    return {
      passed: false,
      failure: verdict.code,
      message: '这是错误程序运行的样子：小狐狸一动不动。看看舞台，回答上面的问题吧！',
      foxPosition,
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
      step.id === 'step-1'
        ? '只有“开始时”，小狐狸一动不动——它在等出发口令呢！'
        : `小狐狸走了 ${foxPosition} 步，到地方啦！`,
    foxPosition,
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
}

/** 由一次判定结果构建三层判定（只做分层呈现，不改判定语义）。 */
export function buildForestJudgment(
  result: ForestJudgeResult,
  stepIndex: number,
): JudgmentResult {
  const stepId = FOREST_STEP_IDS[Math.min(Math.max(stepIndex, 0), FOREST_STEP_IDS.length - 1)]
  const goal = FOREST_STEP_GOALS[stepId] ?? 0
  const stagePassed = result.foxPosition === goal
  const stageDetail =
    stepId === 'step-1'
      ? `舞台结果：小狐狸一动不动（0 步）。只有“开始时”，小狐狸不会走，这正是本关要观察的。`
      : `舞台结果：小狐狸已走 ${result.foxPosition} 步；本关要走 ${goal} 步。`
  const taskPassed = result.passed
  const taskDetail = taskPassed
    ? `任务判定：通过。${result.message}`
    : `任务判定：未通过。${result.message}`
  const knowledgePassed = forestKnowledgePassed(result.program, result.verdict)
  const knowledgeDetail = knowledgePassed
    ? '知识证据：通过。“开始时”必须在最前，移动接在后面；顺序对了，小狐狸才听口令走。'
    : `知识证据：未通过。${KNOWLEDGE_FAILURE_TEXT[result.failure ?? ''] ?? '程序的顺序还不对，先看看“开始时”是不是在最前面。'}`
  const passed = taskPassed && knowledgePassed
  const programText =
    result.program.length > 0 ? result.program.map((block) => block.type).join(' → ') : '（空）'
  const methodEvidence = `方法证据：积木：${programText}；小狐狸位置：${result.foxPosition}；帧数：${result.frames.length}。`
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
