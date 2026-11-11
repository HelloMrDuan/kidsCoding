/**
 * A1-U4-L01 课程内容契约（Lesson Content Contract）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、
 * 结果、总结六方全部来自本课契约。
 *
 * 诚实口径：
 * - 本课不调用外部模型、不接网关；学生写的是校园问题陈述，不是真实数据。
 * - 前置 A1-U3-L06《制作学习问答助手》教的是“助手什么时候该回答、
 *   什么时候必须拒绝”；本课用同样的边界判断筛题目——个人记录类题目
 *   一律拒答、不开题。
 * - scopeLabel 为教学定向：问题卡全过只表示本次课堂练习合格，不等于
 *   能直接做真实校园项目；页面任何位置不写表示完全掌握的字样。
 *
 * 引擎（首席裁定 2026-11-06，见 L03）：通用引擎值为 'slot'，#491 OPS-026
 *   已把 'slot' 并入主线 WorkspaceEngine（校验接受、演示路由与
 *   单测已覆盖）；本文件直接导出含 engine: 'slot' 的完整工作区契约
 *   L01_WORKSPACE_CONTRACT，供路由传入统一 LessonWorkspace；不得填
 *   'summary'，不得用 'json' 冒充。
 * - 适配器与插槽不依赖 engine 值：核对、判定、草稿逻辑已完整实现并
 *   有单测覆盖；路由与 E2E 移植见 L06 的既有模式。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './a1-u4-l01'

export const L01_LESSON_ID = 'A1-U4-L01'
export const L01_LESSON_TITLE = '提出校园真实问题'
export const L01_ROUTE = '/learn/ai-python-lab-u4-l01/A1-U4-L01'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const L01_DRAFT_KEY = 'kidscoding-draft:A1-U4-L01'

export type L01Contract = {
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

export const L01_CONTRACT: L01Contract = {
  lessonId: L01_LESSON_ID,
  title: L01_LESSON_TITLE,
  goal5: [
    '今天学什么：提出校园真实问题——把校园生活里的问题写成“要判断什么、用什么数据、做到什么样算有用”三句话。',
    '要解决什么问题：问题太模糊、数据拿不到、许可过不了的题不能开题；先筛题，再做题。',
    '学完能做什么：选一例写出三句问题陈述，做完四问可行性检查，再换一个场景重新分析。',
    '和上节课的联系：前置 A1-U3-L06《制作学习问答助手》教的是“助手什么时候该回答、什么时候必须拒绝”；本课用同样的边界判断筛题目——个人记录类题目一律拒答、不开题。',
    '当前要完成哪一步：先分类六条问题描述，再填问题卡，最后换场景迁移验证。',
  ],
  brief: '目标：从校园生活中发现真实问题，写成三句问题陈述，做完四问可行性检查，再换一个场景重新分析。',
  step: '先分类六条问题描述，再填问题卡，最后换场景迁移验证。',
  hints: HINTS,
  draftKey: L01_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '问题卡全过只表示本次课堂练习合格，不等于能直接做真实校园项目；真实项目还须过 L02 许可清单与教师确认；本课不收集、不上传任何真实校园数据。',
  methodSteps: LESSON_STEPS,
}

/* ------------------------------------------------------------------ */
/* 统一工作区契约字段（除 engine 外）：翻译规则与 L06 一致               */
/* ------------------------------------------------------------------ */

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三步教学活动（探索分类 / 独立练习填问题卡 / 迁移换场景）；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - 课节进度是动态的（核对状态），外壳 progress 是静态值，
 *   故不填 progress；进度明细保留在插槽总结区。
 * 完整工作区契约 L01_WORKSPACE_CONTRACT 在文件末尾导出：通用引擎值
 *   'slot' 已并入主线 WorkspaceEngine（#491 OPS-026），路由直接
 *   传入统一 LessonWorkspace；不得填 'summary'，不得用 'json' 冒充。
 */
export const L01_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: L01_CONTRACT.lessonId,
  title: L01_CONTRACT.title,
  goal5: L01_CONTRACT.goal5,
  brief: L01_CONTRACT.brief,
  step: L01_CONTRACT.step,
  hints: L01_CONTRACT.hints.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  judging: {
    stageRule: '检查结果：六条问题描述分类——有效 3、模糊 3，逐条判定。',
    taskRule: '任务判定：问题卡与迁移均完成为合格，否则为未合格并列出未完成项。',
    knowledgeRule: '知识证据：方法证据——分类计数、问题卡完成情况、可行性检查计数与迁移场景计数（只记计数，不记学生原文）。',
    scopeLabel: L01_CONTRACT.scopeLabel,
  },
  draftKey: L01_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L01_CONTRACT.hints,
  methodSteps: L01_CONTRACT.methodSteps,
  scopeGap: L01_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '探索分类', text: '比较具体问题与模糊需求，识别有效问题描述。' },
    { level: 2, title: '独立练习：填问题卡', text: '选一例写三句问题陈述，做完四问可行性检查。' },
    { level: 3, title: '迁移：换场景再分析', text: '换一个校园场景，重新分析需求与 AI 的适用边界。' },
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
export const L01_WORKSPACE_CONTRACT: LessonContract = {
  ...L01_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
}
