/**
 * OPS-052：G0-U1 grid 课的 V3 课程契约（机械派生自已合并的课程数据）。
 *
 * 全部文案来自 `GridLesson` 原文（story / concept / objectives / steps /
 * hints / diagnoses / reflectionCheck / project），不编新教学点、不改课程
 * 数据文件（`g0u1-grid-lessons.ts` 只读）。
 *
 * 与 lesson-01-forest-hello 契约同一形状：
 * - engine='slot'：课程自有编辑器插槽（真实 BlocklyWorkspace）+ 课程自有
 *   舞台插槽（真实 GridStage）；运行与判定唯一来源是 GridRunAdapter。
 * - draftKey 必须等于 `kidscoding-draft:<lessonId>`（外壳校验）。
 * - 三级提示取“第一关”的三层提示原文（课程数据的 hints 就是三层：
 *   看到什么 → 知识点 → 具体怎么做），标题沿用契约对三级的分工。
 * - 进度不填静态 progress：关进度由插槽实时渲染（外壳的 progress 是
 *   静态值，会在切关后说谎）。
 * - fileCapabilities 全开：外壳对插槽课的新建/保存/导出/导入/恢复初始
 *   全部真实可用（导入经 validateDraft 校验本课草稿）。
 * - scopeGap 如实说明：实验课进度只在本机，通过只代表本关真实运行合格。
 */
import type { GridLesson, GridLessonStep } from '@/content/curriculum/g0-u1-grid-lessons'

import { draftKeyFor, type LessonContract } from '../workspace/lesson-contract'
import type { StudioLesson } from '../studio/studio-lesson'
import { v3PreviousLessonLine } from '../v3-unit-context'
import { gridLessonActorName, gridLessonGoalPhrase } from './grid-v3-actor'

const STEP_KIND_LABEL: Record<GridLessonStep['kind'], string> = {
  guided: '引导练习',
  'practice-a': '练习 A',
  'practice-b': '练习 B',
  'error-lab': '错误实验',
  creative: '创意改造',
}

export function gridStepKindLabel(step: GridLessonStep): string {
  return STEP_KIND_LABEL[step.kind]
}

/** 第 N 关（1 起）。 */
export function gridStepNumber(lesson: GridLesson, stepId: string): number {
  return lesson.steps.findIndex((step) => step.id === stepId) + 1
}

/**
 * goal5（契约顺序：学什么 / 解决问题 / 学完能做什么 / 和上节课的联系 /
 * 当前步骤），逐条注明来源：
 * 1. lesson.concept 原文。
 * 2. 第一关 predict 原文（课程自带的“先猜一猜”问题）。
 * 3. 第一条 objective 原文。
 * 4. 本单元（G0-U1 / G0-U3）序号 + 上一课标题，按单元跨引擎计算（第一课如实写“无前置课节”）。
 * 5. 全部关标题原文。
 */
export function buildGridGoal5(lesson: GridLesson): [string, string, string, string, string] {
  // 单元序号与上一课按单元计算（G0-U3 跨网格/事件两种引擎，L05 的上一课是 L04 事件课）。
  const relation = v3PreviousLessonLine(lesson.id, lesson.concept)
  return [
    `今天学什么：${lesson.concept}。`,
    `要解决什么问题：${lesson.steps[0]?.predict ?? lesson.story}`,
    `学完能做什么：${lesson.objectives[0] ?? lesson.concept}`,
    relation,
    gridStepText(lesson),
  ]
}

export function gridStepText(lesson: GridLesson): string {
  return `走完 ${lesson.steps.length} 关：${lesson.steps.map((step) => step.title).join('、')}。`
}

export const GRID_HINT_TITLES = [
  '一级提示：看到什么',
  '二级提示：知识点与积木',
  '三级提示：局部示范与调试线索',
] as const

/** 三级提示：取第一关的三层提示原文（课程数据本身按三层编写）。 */
export function buildGridHints(
  lesson: GridLesson,
): { level: 1 | 2 | 3; title: string; text: string }[] {
  const first = lesson.steps[0]
  if (!first) return []
  return first.hints.map((text, index) => ({
    level: (index + 1) as 1 | 2 | 3,
    title: GRID_HINT_TITLES[index],
    text: `以第一关“${first.title}”为例：${text}`,
  }))
}

/** 方法步骤：每关标题 + 指导原文。 */
export function buildGridMethodSteps(lesson: GridLesson): string[] {
  return lesson.steps.map(
    (step) => `第 ${gridStepNumber(lesson, step.id)} 关（${gridStepKindLabel(step)}）${step.title}：${step.instruction}`,
  )
}

/**
 * 活动分层（契约 1/2/3 级）：按课程数据里真实存在的关型分组，不虚构
 * 活动；某层没有对应关型时省略该条。
 */
export function buildGridActivities(
  lesson: GridLesson,
): { level: 1 | 2 | 3; title: string; text: string }[] {
  const list = (
    kinds: GridLessonStep['kind'][],
  ): GridLessonStep[] => lesson.steps.filter((step) => kinds.includes(step.kind))
  const titles = (steps: GridLessonStep[]) => steps.map((step) => step.title).join('、')
  const actor = gridLessonActorName(lesson)
  const goal = gridLessonGoalPhrase(lesson)
  const activities: { level: 1 | 2 | 3; title: string; text: string }[] = []
  const guided = list(['guided'])
  if (guided.length > 0) {
    activities.push({
      level: 1,
      title: '探索预测：先猜再运行',
      text: `${titles(guided)}：先猜${actor}会怎么走，再按“运行”看真实结果。`,
    })
  }
  const practice = list(['practice-a', 'practice-b'])
  if (practice.length > 0) {
    activities.push({
      level: 2,
      title: '独立解决：自己搭建并验收',
      text: goal === '走到目标格'
        ? `${titles(practice)}：自己拼出路线，真实运行到目标格。`
        : `${titles(practice)}：自己拼出程序，真实运行并${goal}。`,
    })
  }
  const transfer = list(['error-lab', 'creative'])
  if (transfer.length > 0) {
    activities.push({
      level: 3,
      title: '找错与创造：修好程序、设计自己的路线',
      text: `${titles(transfer)}：先看清错误再修好；创意关自己决定目标格，再写出能走到的程序。`,
    })
  }
  return activities
}

export function buildGridScopeGap(lesson: GridLesson): string {
  return `这是实验课（trial）：进度只保存在这台设备的浏览器里；通过只表示本关真实运行合格，不等于完全掌握“${lesson.concept}”。`
}

/** 课程契约（不含 studio 路由附加字段）。 */
export function buildGridContract(lesson: GridLesson): LessonContract {
  const hints = buildGridHints(lesson)
  const methodSteps = buildGridMethodSteps(lesson)
  const goal5 = buildGridGoal5(lesson)
  const actor = gridLessonActorName(lesson)
  const goal = gridLessonGoalPhrase(lesson)
  const creativeNote = goal === '走到目标格' ? '（创意关：你选的那一格）' : ''
  return {
    lessonId: lesson.id,
    title: lesson.title,
    goal5,
    brief: `目标：${lesson.objectives.join('；')}。`,
    step: gridStepText(lesson),
    hints: [
      hints[0]?.text ?? lesson.steps[0]?.hints[0] ?? '',
      hints[1]?.text ?? lesson.steps[0]?.hints[1] ?? '',
      hints[2]?.text ?? lesson.steps[0]?.hints[2] ?? '',
    ] as [string, string, string],
    engine: 'slot',
    judging: {
      stageRule: `运行后${actor}真的按积木${goal}${creativeNote}。`,
      taskRule: `在当前关搭好程序，按“运行”让${actor}真实${goal}；错误实验须先按原样运行看到错误，再修好。`,
      knowledgeRule: `本课知识点：${lesson.concept}。`,
      scopeLabel: '教学定向',
    },
    draftKey: draftKeyFor(lesson.id),
    structuredHints: hints,
    methodSteps,
    scopeGap: buildGridScopeGap(lesson),
    activities: buildGridActivities(lesson),
    fileCapabilities: {
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    },
  }
}

/** 玩法帮助（StudioShell 抽屉）：真实玩法 + 每关标题与指导。 */
export function buildGridHelp(lesson: GridLesson): { title: string; body: string[] } {
  const actor = gridLessonActorName(lesson)
  const goal = gridLessonGoalPhrase(lesson)
  return {
    title: `${lesson.title} · 玩法帮助`,
    body: [
      `玩法：把积木从左边的工具箱拖到画布上，接在“开始时”下面，再按“运行”。${actor}会按积木一步一步走；${goal}才算这一关通过。`,
      '改积木：选中积木后可以删除，也可以拖回工具箱；想从头来，按壳里的“恢复初始”。',
      ...buildGridMethodSteps(lesson),
    ],
  }
}

/** StudioShell 需要的课程视图（契约 + 返回入口 + 帮助）。 */
export function buildGridStudioLesson(lesson: GridLesson): StudioLesson {
  return {
    ...buildGridContract(lesson),
    backHref: `/learn/catalog/${lesson.id}`,
    help: buildGridHelp(lesson),
  }
}
