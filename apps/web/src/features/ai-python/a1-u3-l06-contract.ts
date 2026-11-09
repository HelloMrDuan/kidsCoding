/**
 * A1-U3-L06 课程内容契约（Lesson Content Contract）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、
 * 结果、总结六方全部来自本课契约。
 *
 * 诚实口径：
 * - 本课是本地关键词匹配问答助手，不调用外部模型、不接网关；学生问的是
 *   合成问题，不是真实数据；助手按关键词命中回答或固定拒答，不管问题
 *   在课节外真不真实。
 * - 前置 A1-U3-L05《引用与幻觉核对》是顺序上的前置课：L05 教“逐字核对引用、
 *   指出编造数字与编造来源”，L06 用同一方法核对助手的回答；L06 不依赖
 *   L05 的任何 API 技能，方法从规则卡从零教起。
 * - scopeLabel 为教学定向：八问全过只表示本次问答合格，不等于完全
 *   掌握；页面任何位置不写“已掌握”。
 *
 * 引擎（首席裁定 2026-11-06，见 L03）：通用引擎值为 'slot'，#491 OPS-026
 *   已把 'slot' 并入主线 WorkspaceEngine（校验接受、演示路由与
 *   单测已覆盖）；本文件直接导出含 engine: 'slot' 的完整工作区契约
 *   L06_WORKSPACE_CONTRACT，供路由传入统一 LessonWorkspace；不得填
 *   'summary'，不得用 'json' 冒充。
 * - 适配器与插槽不依赖 engine 值：核对、判定、草稿逻辑已完整实现并
 *   有单测覆盖；路由与 E2E 移植见 L03 的既有模式。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './a1-u3-l06'

export const L06_LESSON_ID = 'A1-U3-L06'
export const L06_LESSON_TITLE = '制作学习问答助手'
export const L06_ROUTE = '/learn/ai-python-lab-u3-l06/A1-U3-L06'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const L06_DRAFT_KEY = 'kidscoding-draft:A1-U3-L06'

export type L06Contract = {
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

export const L06_CONTRACT: L06Contract = {
  lessonId: L06_LESSON_ID,
  title: L06_LESSON_TITLE,
  goal5: [
    '今天学什么：制作学习问答助手（本地关键词匹配 + 固定安全拒答）。',
    '要解决什么问题：助手什么时候该回答、什么时候必须拒绝——只答课节内的事，超范围一律拒答。',
    '学完能做什么：先预测助手会回答还是拒绝，再提问核对；写得出新问题并验证助手按规则答/拒。',
    '和上节课的联系：前置 A1-U3-L05《引用与幻觉核对》教的是逐字核对引用；本课用同一方法核对助手的回答，数字或来源编造一律指出。',
    '当前要完成哪一步：先读规则卡，再逐个预测、提问、核对八问，最后写新问题迁移验证。',
  ],
  brief: '目标：做一个只答课节内问题的学习问答助手。先预测、再提问、核对八问，最后写新问题验证。',
  step: '先读规则卡，再逐个预测、提问、核对八问，最后写新问题迁移验证。',
  hints: HINTS,
  draftKey: L06_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '八问全过只表示本次问答合格，不等于完全掌握；最终核验须用新问题——旧问题重复问是练习记录，不作最终成绩；助手是本地关键词匹配，不调用外部模型。',
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
 * - activities 为三步教学活动（先预测再提问 / 问完八问核对答案 / 写新问题迁移验证）；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - 课节进度是动态的（核对状态），外壳 progress 是静态值，
 *   故不填 progress；进度明细保留在插槽总结区。
 * 完整工作区契约 L06_WORKSPACE_CONTRACT 在文件末尾导出：通用引擎值
 *   'slot' 已并入主线 WorkspaceEngine（#491 OPS-026），路由直接
 *   传入统一 LessonWorkspace；不得填 'summary'，不得用 'json' 冒充。
 */
export const L06_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: L06_CONTRACT.lessonId,
  title: L06_CONTRACT.title,
  goal5: L06_CONTRACT.goal5,
  brief: L06_CONTRACT.brief,
  step: L06_CONTRACT.step,
  hints: L06_CONTRACT.hints.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  judging: {
    stageRule: '检查结果：八问逐项判定——问题是否问过、预测的答/拒与助手实际是否一致。',
    taskRule: '任务判定：八问全部通过为合格，否则为未合格并列出未通过问号。',
    knowledgeRule: '知识证据：方法证据——提问分布计数与迁移提问计数（只记计数，不记问题原文）。',
    scopeLabel: L06_CONTRACT.scopeLabel,
  },
  draftKey: L06_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L06_CONTRACT.hints,
  methodSteps: L06_CONTRACT.methodSteps,
  scopeGap: L06_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '先预测再提问', text: '八问各猜一次能答还是拒答，再点问核对。' },
    { level: 2, title: '问完八问，核对答案', text: '八问全问、预测全对；识别两个错误示例；试空问题与库外问题。' },
    { level: 3, title: '写新问题迁移验证', text: '各写一个能答与一个拒答的新问题，先预测再问，助手按规则答/拒。' },
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
export const L06_WORKSPACE_CONTRACT: LessonContract = {
  ...L06_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
}
