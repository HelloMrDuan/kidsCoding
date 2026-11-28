/**
 * OPS-056：启蒙课 lesson-02～lesson-12 的 V3 课程契约（按课程 ID 参数化）。
 *
 * 与 OPS-041 forest-hello-contract 同一形状，全部内容机械派生自已合并的课程数据原文，
 * 不编新教学点、不改课程数据文件（只读）：
 * - title / goal / steps / hintLayers / rewardCardId / phase / sortOrder：`launch-lessons.ts`。
 * - 单元名、单元简介、单元内序号：`foundation-units.ts`。
 * - 每关语音：`foundation-voiceovers.ts`（与 steps 一一对应）。
 * - 设计错误关 / 第二练习关：`mistake-steps.ts` / `practice-steps.ts`（只用于活动分层）。
 * - engine='slot'；draftKey = `kidscoding-draft:<lessonId>`（外壳校验）。
 * - progress 不填：关进度由插槽实时渲染。fileCapabilities 全开。
 * - judging 文案与 forest-hello 同一分工（舞台 / 任务 / 知识），scopeLabel='教学定向'。
 */
import { foundationUnits } from '@/content/curriculum/foundation-units'
import { foundationVoiceovers } from '@/content/curriculum/foundation-voiceovers'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { practiceSteps } from '@/content/curriculum/practice-steps'

import { draftKeyFor, type LessonContract } from '../workspace/lesson-contract'
import { getLaunchV3Lesson, getLaunchV3Template, launchV3DuoMode } from './launch-v3-lessons'

export const LAUNCH_HINT_TITLES = [
  '一级提示：方向',
  '二级提示：知识点与积木',
  '三级提示：局部示范与调试线索',
] as const

type LaunchLesson = NonNullable<ReturnType<typeof getLaunchV3Lesson>>

export type LaunchV3Step = {
  id: string
  title: string
  instruction: string
  voiceover: string
  allowedBlocks: string[]
  requiredBlockTypes: string[]
}

/** 各关（id / 标题 / 指导 / 语音，一一对应，原文照抄）。 */
export function launchV3Steps(lessonId: string): LaunchV3Step[] {
  const lesson = getLaunchV3Lesson(lessonId)
  if (!lesson) return []
  const voiceovers = foundationVoiceovers[lessonId] ?? []
  return lesson.steps.map((step, index) => ({
    id: step.id,
    title: step.title,
    instruction: step.instruction,
    voiceover: voiceovers[index] ?? '',
    allowedBlocks: [...step.allowedBlocks],
    requiredBlockTypes: [...step.requiredBlockTypes],
  }))
}

export function launchV3RewardCardId(lessonId: string): string | null {
  return getLaunchV3Lesson(lessonId)?.rewardCardId ?? null
}

/** 本课是否为点击课（任一关以“被点击时”开头）。 */
export function launchV3IsClickLesson(lessonId: string): boolean {
  return (getLaunchV3Lesson(lessonId)?.steps ?? []).some(
    (step) => step.requiredBlockTypes[0] === 'when_clicked',
  )
}

function stepText(lesson: LaunchLesson): string {
  return `走完 ${lesson.steps.length} 关：${lesson.steps.map((step) => step.title).join('、')}。`
}

/** “和上节课的联系”：上一节启蒙课按 sortOrder 取，单元序号按 foundation-units 取。 */
function relationLine(lesson: LaunchLesson): string {
  const unit = foundationUnits.find((item) => item.lessonIds.includes(lesson.id))
  const previous = launchLessons.find((item) => item.sortOrder === lesson.sortOrder - 1)
  const unitPart = unit
    ? `本课是《${unit.title}》单元的第 ${unit.lessonIds.indexOf(lesson.id) + 1} 课（共 ${unit.lessonIds.length} 课）`
    : '本课未登记单元'
  return previous
    ? `和上节课的联系：上一课《${previous.title}》的目标是“${previous.goal}”；${unitPart}。`
    : `和上节课的联系：无前置课节；${unitPart}。`
}

/**
 * goal5（学什么 / 解决问题 / 学完能做什么 / 和上节课的联系 / 当前步骤）：
 * 1. lesson.goal 原文；2. 第 1 关标题与指导原文；3. 所属单元 summary 原文；
 * 4. 上一节启蒙课（sortOrder - 1）标题与目标 + 单元序号；5. 全部关标题。
 */
export function buildLaunchGoal5(lessonId: string): [string, string, string, string, string] {
  const lesson = getLaunchV3Lesson(lessonId)
  if (!lesson) return ['', '', '', '', '']
  const unit = foundationUnits.find((item) => item.lessonIds.includes(lesson.id))
  const first = lesson.steps[0]
  return [
    `今天学什么：${lesson.goal}`,
    `要解决什么问题：${first ? `第 1 关“${first.title}”——${first.instruction}` : lesson.goal}`,
    `学完能做什么：${unit?.summary ?? lesson.goal}`,
    relationLine(lesson),
    `当前要完成哪一步：${stepText(lesson)}`,
  ]
}

/** 三级提示：hintLayers 三级 copy 原文；标题与 forest-hello 同一分工。 */
export function buildLaunchHints(lessonId: string): { level: 1 | 2 | 3; title: string; text: string }[] {
  return (getLaunchV3Lesson(lessonId)?.hintLayers ?? []).slice(0, 3).map((layer, index) => ({
    level: (index + 1) as 1 | 2 | 3,
    title: LAUNCH_HINT_TITLES[index],
    text: layer.copy,
  }))
}

/** 方法步骤：每关标题 + 指导原文。 */
export function buildLaunchMethodSteps(lessonId: string): string[] {
  return launchV3Steps(lessonId).map(
    (step, index) => `第 ${index + 1} 关 ${step.title}：${step.instruction}`,
  )
}

/** 活动分层：只按课程数据里真实存在的关型分组（预测练习 / 主线搭建 / 错误实验），缺则省略。 */
export function buildLaunchActivities(lessonId: string): { level: 1 | 2 | 3; title: string; text: string }[] {
  const lesson = getLaunchV3Lesson(lessonId)
  if (!lesson) return []
  const duo = launchV3DuoMode(lessonId)
  const practiceIds = new Set(
    practiceSteps.filter((item) => item.lessonId === lessonId).map((item) => item.stepId),
  )
  const mistakeIds = new Set(
    lesson.steps.filter((step) => getMistakeStep(lessonId, step.id)).map((step) => step.id),
  )
  // 双角色课的错误实验在第 4 关、预测在第 1 关（与旧课堂 DuoStage 一致）。
  if (duo) {
    lesson.steps.forEach((step, index) => {
      if (index === 0) practiceIds.add(step.id)
      if (index === 3) mistakeIds.add(step.id)
    })
  }
  const titlesOf = (ids: Set<string>) =>
    lesson.steps.filter((step) => ids.has(step.id)).map((step) => step.title).join('、')
  const main = new Set(
    lesson.steps.filter((step) => !practiceIds.has(step.id) && !mistakeIds.has(step.id)).map((step) => step.id),
  )
  const activities: { level: 1 | 2 | 3; title: string; text: string }[] = []
  if (practiceIds.size > 0) {
    activities.push({
      level: 1,
      title: '探索预测：先猜再运行',
      text: `${titlesOf(practiceIds)}：先猜一猜会发生什么，再运行看真实结果。`,
    })
  }
  if (main.size > 0) {
    activities.push({
      level: 2,
      title: '独立解决：自己搭建并验收',
      text: `${titlesOf(main)}：自己拼好本关积木并运行验证。`,
    })
  }
  if (mistakeIds.size > 0) {
    activities.push({
      level: 3,
      title: '迁移创作：找错再修好',
      text: `${titlesOf(mistakeIds)}：先原样运行看到错误，再把程序修好。`,
    })
  }
  return activities
}

export function buildLaunchScopeGap(lessonId: string): string {
  const lesson = getLaunchV3Lesson(lessonId)
  const where = lesson?.phase === 'trial' ? '这是试学课（trial），' : '这是启蒙正式课，'
  return `${where}进度保存在本机并尝试同步云端；通过只表示本次运行合格，不等于完全掌握“${lesson?.goal ?? ''}”。`
}

function judgingFor(lessonId: string): LessonContract['judging'] {
  const hints = buildLaunchHints(lessonId)
  const duo = launchV3DuoMode(lessonId)
  const click = launchV3IsClickLesson(lessonId)
  const stageRule = duo
    ? '运行后小狐狸和小熊各自按积木走到本关目标位置、说出本关对白；毕业课两个目标都到位才找到礼物。'
    : click
      ? '先启动点击程序，再亲自点角色：角色被点到后才按积木做出本关目标动作（位置、场景、对白都对上）。'
      : '运行后角色按积木真的做出本关目标动作（位置、场景、对白都对上本关目标）。'
  return {
    stageRule,
    taskRule: '在当前关拼出本关要求的积木并运行成功；错误实验关须先原样运行看到错误，再修好。',
    knowledgeRule: `本课知识点：${hints[1]?.text ?? getLaunchV3Lesson(lessonId)?.goal ?? ''}`,
    scopeLabel: '教学定向',
  }
}

/** 课程契约（不含 studio 路由附加字段）；未登记课节返回 null（fail-closed）。 */
export function buildLaunchContract(lessonId: string): LessonContract | null {
  const lesson = getLaunchV3Lesson(lessonId)
  if (!lesson) return null
  const hints = buildLaunchHints(lessonId)
  return {
    lessonId: lesson.id,
    title: lesson.title,
    goal5: buildLaunchGoal5(lessonId),
    brief: `目标：${lesson.goal}`,
    step: stepText(lesson),
    hints: [0, 1, 2].map((index) =>
      hints[index] ? `${hints[index].title}：${hints[index].text}` : '',
    ) as [string, string, string],
    engine: 'slot',
    judging: judgingFor(lessonId),
    draftKey: draftKeyFor(lesson.id),
    structuredHints: hints,
    methodSteps: buildLaunchMethodSteps(lessonId),
    scopeGap: buildLaunchScopeGap(lessonId),
    activities: buildLaunchActivities(lessonId),
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
export function buildLaunchHelp(lessonId: string): { title: string; body: string[] } {
  const lesson = getLaunchV3Lesson(lessonId)
  const click = launchV3IsClickLesson(lessonId)
  const duo = launchV3DuoMode(lessonId)
  const template = getLaunchV3Template(lessonId)
  const play = click
    ? '玩法：把积木从左边的工具箱拖到画布上，接在“被点击时”下面，按运行启动程序，再在舞台上亲自点一下角色。'
    : duo
      ? '玩法：把积木接在“开始时”下面；“切换角色”后面的动作只交给小熊。按运行看两位朋友各走到哪里。'
      : '玩法：把积木从左边的工具箱拖到画布上，接在“开始时”下面，再按运行。'
  return {
    title: `${lesson?.title ?? lessonId}${template ? ` · ${template.name}` : ''} · 玩法帮助`,
    body: [play, ...buildLaunchMethodSteps(lessonId)],
  }
}
