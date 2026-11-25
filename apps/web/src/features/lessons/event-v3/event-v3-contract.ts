/**
 * OPS-053：G0-U2 事件课的 V3 课程契约（机械派生自已合并的课程数据）。
 *
 * 全部文案来自 `EventLesson` 原文（story / concept / objectives / steps /
 * hints / reflectionCheck / project），不编新教学点、不改课程数据文件
 * （`g0-u2-event-lessons.ts` 只读）。
 *
 * 与 grid-v3 契约同一形状：
 * - engine='slot'：课程自有编辑器插槽（真实 BlocklyWorkspace，按角色分脚本）+
 *   课程自有舞台插槽（真实 EventStage）；运行检查与判定唯一来源是
 *   EventRunAdapter（checkEventGoal）。
 * - draftKey 必须等于 `kidscoding-draft:<lessonId>`（外壳校验）。
 * - 三级提示取“第一关”的三层提示原文。
 * - 进度不填静态 progress：关进度由插槽实时渲染。
 * - fileCapabilities 全开（导入经 validateDraft 校验本课草稿）。
 * - scopeGap 如实说明：实验课进度只在本机，通过只代表本关真实运行检查合格。
 */
import type { EventLesson, EventLessonStep } from '@/content/curriculum/g0-u2-event-lessons'

import { draftKeyFor, type LessonContract } from '../workspace/lesson-contract'
import type { StudioLesson } from '../studio/studio-lesson'
import { EVENT_V3_LESSON_IDS, eventV3LessonIndex, getPreviousEventV3Lesson } from './event-v3-lessons'

const STEP_KIND_LABEL: Record<EventLessonStep['kind'], string> = {
  guided: '引导练习',
  'practice-a': '练习 A',
  'practice-b': '练习 B',
  'error-lab': '错误实验',
  creative: '创意改造',
}

export function eventStepKindLabel(step: EventLessonStep): string {
  return STEP_KIND_LABEL[step.kind]
}

/** 第 N 关（1 起）。 */
export function eventStepNumber(lesson: EventLesson, stepId: string): number {
  return lesson.steps.findIndex((step) => step.id === stepId) + 1
}

export function eventStepText(lesson: EventLesson): string {
  return `走完 ${lesson.steps.length} 关：${lesson.steps.map((step) => step.title).join('、')}。`
}

/**
 * goal5（学什么 / 解决问题 / 学完能做什么 / 和上节课的联系 / 当前步骤）：
 * 1. lesson.concept 原文；2. 第一关 predict 原文；3. 第一条 objective 原文；
 * 4. G0-U2 单元序号 + 上一课标题（第一课如实写“无前置课节”）；5. 全部关标题。
 */
export function buildEventGoal5(lesson: EventLesson): [string, string, string, string, string] {
  const index = Math.max(eventV3LessonIndex(lesson.id), 0)
  const previous = getPreviousEventV3Lesson(lesson.id)
  const relation = previous
    ? `和上节课的联系：上一课《${previous.title}》学的是“${previous.concept}”；本课接着学“${lesson.concept}”，是 G0 森林事件单元的第 ${index + 1} 课（共 ${EVENT_V3_LESSON_IDS.length} 课）。`
    : `和上节课的联系：无前置课节，本课是 G0 森林事件单元的第 1 课（共 ${EVENT_V3_LESSON_IDS.length} 课）。`
  return [
    `今天学什么：${lesson.concept}。`,
    `要解决什么问题：${lesson.steps[0]?.predict ?? lesson.story}`,
    `学完能做什么：${lesson.objectives[0] ?? lesson.concept}`,
    relation,
    eventStepText(lesson),
  ]
}

export const EVENT_HINT_TITLES = [
  '一级提示：看到什么',
  '二级提示：知识点与积木',
  '三级提示：局部示范与调试线索',
] as const

/** 三级提示：取第一关的三层提示原文。 */
export function buildEventHints(lesson: EventLesson): { level: 1 | 2 | 3; title: string; text: string }[] {
  const first = lesson.steps[0]
  if (!first) return []
  return first.hints.map((text, index) => ({
    level: (index + 1) as 1 | 2 | 3,
    title: EVENT_HINT_TITLES[index],
    text: `以第一关“${first.title}”为例：${text}`,
  }))
}

/** 方法步骤：每关标题 + 指导原文。 */
export function buildEventMethodSteps(lesson: EventLesson): string[] {
  return lesson.steps.map(
    (step) => `第 ${eventStepNumber(lesson, step.id)} 关（${eventStepKindLabel(step)}）${step.title}：${step.instruction}`,
  )
}

/** 活动分层：按课程数据里真实存在的关型分组，不虚构活动；某层没有对应关型时省略。 */
export function buildEventActivities(lesson: EventLesson): { level: 1 | 2 | 3; title: string; text: string }[] {
  const list = (kinds: EventLessonStep['kind'][]) => lesson.steps.filter((step) => kinds.includes(step.kind))
  const titles = (steps: EventLessonStep[]) => steps.map((step) => step.title).join('、')
  const activities: { level: 1 | 2 | 3; title: string; text: string }[] = []
  const guided = list(['guided'])
  if (guided.length > 0) {
    activities.push({
      level: 1,
      title: '探索预测：先猜再运行检查',
      text: `${titles(guided)}：先猜事件发生后谁会动、怎么动，再按“运行检查”看真实结果。`,
    })
  }
  const practice = list(['practice-a', 'practice-b'])
  if (practice.length > 0) {
    activities.push({
      level: 2,
      title: '独立解决：给对的角色拼对的事件',
      text: `${titles(practice)}：选好角色、拼好事件和动作，真实运行检查通过。`,
    })
  }
  const transfer = list(['error-lab', 'creative'])
  if (transfer.length > 0) {
    activities.push({
      level: 3,
      title: '找错与创造：修好程序、决定让谁动',
      text: `${titles(transfer)}：先看清错误再修好；创意关自己选一位朋友，再拼出能让它动起来的程序。`,
    })
  }
  return activities
}

export function buildEventScopeGap(lesson: EventLesson): string {
  return `这是实验课（trial）：进度只保存在这台设备的浏览器里；通过只表示本关真实运行检查合格，不等于完全掌握“${lesson.concept}”。`
}

/** 课程契约（不含 studio 路由附加字段）。 */
export function buildEventContract(lesson: EventLesson): LessonContract {
  const hints = buildEventHints(lesson)
  return {
    lessonId: lesson.id,
    title: lesson.title,
    goal5: buildEventGoal5(lesson),
    brief: `目标：${lesson.objectives.join('；')}。`,
    step: eventStepText(lesson),
    hints: [
      hints[0]?.text ?? lesson.steps[0]?.hints[0] ?? '',
      hints[1]?.text ?? lesson.steps[0]?.hints[1] ?? '',
      hints[2]?.text ?? lesson.steps[0]?.hints[2] ?? '',
    ] as [string, string, string],
    engine: 'slot',
    judging: {
      stageRule: '运行检查时依次触发本关的事件，舞台上的角色真的按积木做出了目标动作，没做不该做的动作。',
      taskRule: '在当前关给要求的角色拼好事件和动作，按“运行检查”真实通过；错误实验须先按原样运行检查看到错误，再修好。',
      knowledgeRule: `本课知识点：${lesson.concept}。`,
      scopeLabel: '教学定向',
    },
    draftKey: draftKeyFor(lesson.id),
    structuredHints: hints,
    methodSteps: buildEventMethodSteps(lesson),
    scopeGap: buildEventScopeGap(lesson),
    activities: buildEventActivities(lesson),
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
export function buildEventHelp(lesson: EventLesson): { title: string; body: string[] } {
  return {
    title: `${lesson.title} · 玩法帮助`,
    body: [
      '玩法：先在编辑器上方选好要编程的角色，把积木从左边拖到画布上，接在“开始时”或“被点击时”下面，再按“运行检查”。检查会依次按开始旗、点角色，看舞台是不是符合目标。',
      '自由试一试：舞台上可以直接按开始旗、点角色，看看你的程序会让谁动起来；想好了再按“运行检查”。',
      '改积木：选中积木后可以删除，也可以拖回工具箱；想从头来，按壳里的“恢复初始”。',
      ...buildEventMethodSteps(lesson),
    ],
  }
}

/** StudioShell 需要的课程视图（契约 + 返回入口 + 帮助）。 */
export function buildEventStudioLesson(lesson: EventLesson): StudioLesson {
  return {
    ...buildEventContract(lesson),
    backHref: `/learn/catalog/${lesson.id}`,
    help: buildEventHelp(lesson),
  }
}
