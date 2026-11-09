/**
 * A1-U3-L04 课程内容契约（Lesson Content Contract，脚手架 OPS-030 生成）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、结果、
 * 总结六方全部来自本课契约。
 *
 * 诚实口径（TODO：按本课教研填写）：
 * - 本课不调用外部模型、不接网关（如确需外部能力，须另立架构任务）。
 * - scopeLabel 为教学定向：一次全过只表示本次合格，不等于完全掌握；
 *   页面任何位置不写表示完全掌握的字样。
 *
 * 引擎：通用引擎值 'slot'（#491 OPS-026 已并入主线 WorkspaceEngine）。
 * 不得填 'summary' 冒充，不得用 'json' 冒充。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './a1-u3-l04'

export const L04_LESSON_ID = 'A1-U3-L04'
export const L04_LESSON_TITLE = '检索可信资料'
export const L04_ROUTE = '/learn/ai-python-lab-u3-l04/A1-U3-L04'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const L04_DRAFT_KEY = 'kidscoding-draft:A1-U3-L04'

export type L04Contract = {
  lessonId: string
  title: string
  goal5: [string, string, string, string, string]
  brief: string
  step: string
  hints: { level: 1 | 2 | 3; title: string; text: string }[]
  draftKey: string
  scopeLabel: '教学定向' | '开放创作'
  scopeGap: string
  methodSteps: string[]
}

export const L04_CONTRACT: L04Contract = {
  lessonId: L04_LESSON_ID,
  title: L04_LESSON_TITLE,
  goal5: [
    // TODO(课程作者)：首屏五要素——今天学什么 / 要解决什么问题 /
    // 学完能做什么 / 和上节课的联系 / 当前要完成哪一步。
    '今天学什么：TODO。',
    '要解决什么问题：TODO。',
    '学完能做什么：TODO。',
    '和上节课的联系：TODO。',
    '当前要完成哪一步：TODO。',
  ],
  brief: '目标：TODO。',
  step: 'TODO。',
  hints: HINTS,
  draftKey: L04_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    // TODO(课程作者)：写明本课评测边界（行为化多解法评测尚未建成；
    // 一次全过只表示本次合格，不等于完全掌握）。
    '行为化多解法评测尚未建成；一次全过只表示本次合格，不等于完全掌握。',
  methodSteps: LESSON_STEPS,
}

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三步教学活动；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 */
export const L04_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: L04_CONTRACT.lessonId,
  title: L04_CONTRACT.title,
  goal5: L04_CONTRACT.goal5,
  brief: L04_CONTRACT.brief,
  step: L04_CONTRACT.step,
  hints: L04_CONTRACT.hints.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  judging: {
    // TODO(课程作者)：按本课语义书写三规则（规则文本，无演示数字目标）。
    stageRule: '检查结果：TODO。',
    taskRule: '任务判定：TODO。',
    knowledgeRule: '知识证据：TODO。',
    scopeLabel: L04_CONTRACT.scopeLabel,
  },
  draftKey: L04_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L04_CONTRACT.hints,
  methodSteps: L04_CONTRACT.methodSteps,
  scopeGap: L04_CONTRACT.scopeGap,
  activities: [
    // TODO(课程作者)：三步教学活动（探索预测 / 独立解决 / 迁移创作）。
    { level: 1, title: 'TODO', text: 'TODO。' },
    { level: 2, title: 'TODO', text: 'TODO。' },
    { level: 3, title: 'TODO', text: 'TODO。' },
  ],
  fileCapabilities: {
    canNew: true,
    canSave: true,
    canExport: true,
    canImport: true,
    canReset: true,
  },
  hasStage: false,
}

/**
 * 完整工作区契约：FIELDS + 通用插槽引擎 'slot'，供路由传入统一
 * LessonWorkspace。不得填 'summary' 冒充，不得用 'json' 冒充。
 */
export const L04_WORKSPACE_CONTRACT: LessonContract = {
  ...L04_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
}
