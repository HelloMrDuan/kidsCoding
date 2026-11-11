/**
 * A1-U3-L05 课程内容契约（Lesson Content Contract）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、
 * 结果、总结六方全部来自本课契约。
 *
 * 诚实口径：
 * - 本课全部资料是本地课堂示例资料，不调用外部模型、不接网关、不做
 *   真实联网搜索；资料卡与 AI 回答里的数字、日期、名称全是编的，只
 *   用来练核对，不能当真去查、去引用。
 * - 前置 A1-U3-L04《检索可信资料》教找可信资料；本课用本课资料册核对
 *   AI 的回答，方法从规则卡从零教起，不依赖 L04 的任何文件。
 * - 后续 A1-U3-L06《制作学习问答助手》用同一方法核对助手的回答；
 *   L06 不依赖本课的任何 API 技能。
 * - scopeLabel 为教学定向：八项全过只表示本次核对合格，不等于完全
 *   掌握；页面任何位置不写表示完全掌握的字样。
 *
 * 引擎（首席裁定 2026-11-06，见 L03）：通用引擎值为 'slot'，#491 OPS-026
 *   已把 'slot' 并入主线 WorkspaceEngine（校验接受、演示路由与
 *   单测已覆盖）；本文件直接导出含 engine: 'slot' 的完整工作区契约
 *   L05_WORKSPACE_CONTRACT，供路由传入统一 LessonWorkspace；不得填
 *   'summary'，不得用 'json' 冒充。
 * - 适配器与插槽不依赖 engine 值：核对、判定、草稿逻辑已完整实现并
 *   有单测覆盖；路由与 E2E 移植见 L03 的既有模式。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './a1-u3-l05'

export const L05_LESSON_ID = 'A1-U3-L05'
export const L05_LESSON_TITLE = '引用与幻觉核对'
export const L05_ROUTE = '/learn/ai-python-lab-u3-l05/A1-U3-L05'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const L05_DRAFT_KEY = 'kidscoding-draft:A1-U3-L05'

export type L05Contract = {
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

export const L05_CONTRACT: L05Contract = {
  lessonId: L05_LESSON_ID,
  title: L05_LESSON_TITLE,
  goal5: [
    '今天学什么：核对 AI 回答里的引用、数字和结论，认出编造和证据不足。',
    '今天学什么的问题：AI 的回答什么时候可信、什么时候是编造、什么时候必须拒绝下结论。',
    '学完能做什么：逐字核对引用、指出编造数字与编造来源、证据不足时拒绝下结论。',
    '和上节课的联系：前置 A1-U3-L04《检索可信资料》教找可信资料；本课用本课资料册核对 AI 的回答。',
    '当前要完成哪一步：先读规则卡，再预测、核对八项，最后用新资料迁移验证。',
  ],
  brief:
    '目标：核对 AI 回答里的引用、数字和结论，认出编造和证据不足。先读规则卡，再预测、核对八项，最后用新资料迁移验证。',
  step: '先读规则卡，再预测、核对八项，最后用新资料迁移验证。',
  hints: HINTS,
  draftKey: L05_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '八项全过只表示本次核对合格，不等于完全掌握；最终核验须用新资料新回答——旧题重复做是练习记录，不作最终成绩；资料全部是课堂示例，不是真实联网搜索结果。',
  methodSteps: LESSON_STEPS,
}

/* ------------------------------------------------------------------ */
/* 统一工作区契约字段（除 engine 外）：翻译规则与 L03 一致               */
/* ------------------------------------------------------------------ */

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三步教学活动（先猜再核对 / 自己核对四条 / 新资料新回答）；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - 课节进度是动态的（核对状态），外壳 progress 是静态值，
 *   故不填 progress；进度明细保留在插槽总结区。
 * 完整工作区契约 L05_WORKSPACE_CONTRACT 在文件末尾导出：通用引擎值
 *   'slot' 已并入主线 WorkspaceEngine（#491 OPS-026），路由直接
 *   传入统一 LessonWorkspace；不得填 'summary'，不得用 'json' 冒充。
 */
export const L05_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: L05_CONTRACT.lessonId,
  title: L05_CONTRACT.title,
  goal5: L05_CONTRACT.goal5,
  brief: L05_CONTRACT.brief,
  step: L05_CONTRACT.step,
  hints: L05_CONTRACT.hints.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  judging: {
    stageRule: '检查结果：八项逐项判定——每条 AI 回答的 verdict 是否选对。',
    taskRule: '任务判定：八项全部通过为合格，否则为未合格并列出未通过项号。',
    knowledgeRule: '知识证据：方法证据——各 verdict 类型的判定计数与迁移项完成计数（只记计数，不记原文）。',
    scopeLabel: L05_CONTRACT.scopeLabel,
  },
  draftKey: L05_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L05_CONTRACT.hints,
  methodSteps: L05_CONTRACT.methodSteps,
  scopeGap: L05_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '先猜再核对', text: 'E1/E2 各猜一次 verdict 再核对。' },
    { level: 2, title: '自己核对四条', text: 'P1–P4 各选一次 verdict，含无引用边界。' },
    { level: 3, title: '新资料新回答', text: '用资料 E 核对 T1/T2 迁移验证。' },
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
 * LessonWorkspace。'slot' 已并入主线 WorkspaceEngine（#491 OPS-026，
 * 校验接受、演示路由与单测已覆盖）；不得填 'summary'，不得用 'json' 冒充。
 */
export const L05_WORKSPACE_CONTRACT: LessonContract = {
  ...L05_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
}
