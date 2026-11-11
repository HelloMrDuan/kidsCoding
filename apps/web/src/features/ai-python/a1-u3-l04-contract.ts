/**
 * A1-U3-L04 课程内容契约（Lesson Content Contract）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、
 * 结果、总结六方全部来自本课契约。
 *
 * 诚实口径：
 * - 本课是本地规则资料检索，不调用外部模型、不接网关；学生改的是
 *   合成语料上的关键词与四问判断，不是真实数据；命中数只是线索，
 *   可信度是门禁；规则说明只做字面检查，不做语义理解。
 * - 前置 A1-U3-L03《结构化JSON输出》是顺序上的前置课：L03 教“对照规则
 *   动手、看反馈、修到通过”，L04 用同一方法做资料检索与可信度判断，
 *   不依赖 L03 的任何 JSON 技能，方法从四问从零教起。
 * - scopeLabel 为教学定向：五项全过只表示本次检索合格，不等于完全
 *   掌握检索与可信度判断；页面任何位置不写表示完全掌握的字样。
 *
 * 引擎（首席裁定 2026-11-06）：通用引擎值为 'slot'，#491 OPS-026
 *   已把 'slot' 并入主线 WorkspaceEngine（校验接受、演示路由与
 *   单测已覆盖）；本文件直接导出含 engine: 'slot' 的完整工作区契约
 *   L04_WORKSPACE_CONTRACT，供路由传入统一 LessonWorkspace；不得填
 *   'summary'，不得用 'json' 冒充。课程本地的 'json' 标签已删除。
 * - 适配器与插槽不依赖 engine 值：校验、判定、草稿逻辑已完整实现并
 *   有单测覆盖。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './a1-u3-l04'

export const L04_LESSON_ID = 'A1-U3-L04'
export const L04_LESSON_TITLE = '检索可信资料'
export const L04_ROUTE = '/learn/ai-python-lab-u3-l04/A1-U3-L04'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课分键。 */
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
    '今天学什么：检索可信资料（用提示词规则在本地语料里找资料，再用四个可信度问题判断能不能用）。',
    '要解决什么问题：模型给的资料能不能直接信——来源可不可信、时间新不新、有没有证据、和任务有没有关系。',
    '学完能做什么：写出检索关键词，判断一张资料可不可用，并说清你的提示词规则。',
    '和上节课的联系：前置 A1-U3-L03《结构化JSON输出》教的是对照规则动手、看反馈、修到通过；本课用同一方法做资料检索与可信度判断，不依赖 L03 的任何 JSON 技能，方法从四问从零教起。',
    '当前要完成哪一步：先写关键词点检索，再逐卡回答四问、勾选可用清单，最后写规则说明、点校验修到通过。',
  ],
  brief: '目标：写关键词检索本地语料，用四个可信度问题挑出可用资料（A、B），说清提示词规则。先写词，再答四问、勾清单、写规则、点校验。',
  step: '先写关键词点检索，再逐卡回答四问、勾选可用清单，最后写规则说明、点校验修到通过。',
  hints: HINTS,
  draftKey: L04_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '行为化多解法评测尚未建成；五项全过只表示本次检索合格，不等于完全掌握检索与可信度判断；校验只管四问是否答对，不管资料在真实世界里对不对。',
  methodSteps: LESSON_STEPS,
}

/* ------------------------------------------------------------------ */
/* 统一工作区契约字段（除 engine 外）：翻译规则与 L02/L03 一致           */
/* ------------------------------------------------------------------ */

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三步教学活动（预测 / 独立解决 / 迁移创作）；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - 课节进度是动态的（校验状态），外壳 progress 是静态值，
 *   故不填 progress；进度明细保留在插槽总结区。
 * 完整工作区契约 L04_WORKSPACE_CONTRACT 在文件末尾导出：通用引擎值
 *   'slot' 已并入主线 WorkspaceEngine（#491 OPS-026），路由直接
 *   传入统一 LessonWorkspace；不得填 'summary'，不得用 'json' 冒充。
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
    stageRule: '检查结果：关键词与检索结果逐项判定——关键词有效、四问答完、四问答对、可用清单、规则说明。',
    taskRule: '任务判定：五项全部通过为合格，否则为未合格并列出未通过项名。',
    knowledgeRule: '知识证据：方法证据——提示词构成、检索结果与四问判断过程（不核验资料真假，只核验四问是否答对）。',
    scopeLabel: L04_CONTRACT.scopeLabel,
  },
  draftKey: L04_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L04_CONTRACT.hints,
  methodSteps: L04_CONTRACT.methodSteps,
  scopeGap: L04_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '预测：先猜再检索', text: '读任务句，先写下你预测的 2–3 个关键词，再猜哪几张卡会被检索到、哪几张最后可用；写完再点检索对照。' },
    { level: 2, title: '独立解决：检索并判断', text: '写关键词、点检索；逐卡回答四问；勾选可用清单；写规则说明；点校验，看反馈修到五项全过。' },
    { level: 3, title: '迁移创作：换词再检索', text: '换一组关键词再检索一次（例如只写「金帅」「香蕉」），看检索结果怎么变、可用清单为什么不变；把你的提示词规则写成一句话。' },
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
export const L04_WORKSPACE_CONTRACT: LessonContract = {
  ...L04_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
}
