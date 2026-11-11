/**
 * A1-U4-L02 课程内容契约（Lesson Content Contract）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、
 * 结果、总结六方全部来自本课契约。
 *
 * 诚实口径：
 * - 本课不调用外部模型、不接网关；学生填的是许可清单，不是真实许可状态。
 * - 前置 A1-U4-L01《提出校园真实问题》教的是“提出值得用 AI 试试的
 *   真实问题”；本课给 L01 选出的问题做许可清单——L01 的三例都是聚合计数，
 *   本课要给它们逐项确认许可状态；个人记录类题目 L01 已拒答，本课再确认
 *   一次：缺许可即停。
 * - 设计包 §5 同意范围四条一字不改复述；其中“监护人同意如何映射到某个
 *   儿童档案”在仓内无对应设计、未核实，映射机制为待填 stub，本节只教
 *   清单写法与默认拒绝的纪律，不假装机制已经存在。
 * - scopeLabel 为教学定向：清单全过只表示本次课堂练习合格，不等于
 *   能直接做真实校园项目；页面任何位置不写表示完全掌握的字样。
 *
 * 引擎（首席裁定 2026-11-06，见 L03）：通用引擎值为 'slot'，#491 OPS-026
 *   已把 'slot' 并入主线 WorkspaceEngine（校验接受、演示路由与
 *   单测已覆盖）；本文件直接导出含 engine: 'slot' 的完整工作区契约
 *   L02_WORKSPACE_CONTRACT，供路由传入统一 LessonWorkspace；不得填
 *   'summary'，不得用 'json' 冒充。
 * - 适配器与插槽不依赖 engine 值：核对、判定、草稿逻辑已完整实现并
 *   有单测覆盖；路由与 E2E 移植见 L01 的既有模式。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './a1-u4-l02'

export const L02_LESSON_ID = 'A1-U4-L02'
export const L02_LESSON_TITLE = '建立数据使用许可'
export const L02_ROUTE = '/learn/ai-python-lab-u4-l02/A1-U4-L02'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const L02_DRAFT_KEY = 'kidscoding-draft:A1-U4-L02'

export type L02Contract = {
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

export const L02_CONTRACT: L02Contract = {
  lessonId: L02_LESSON_ID,
  title: L02_LESSON_TITLE,
  goal5: [
    '今天学什么：建立数据使用许可——给 L01 的问题列一张许可清单，学会“默认拒绝”。',
    '要解决什么问题：数据看起来能用、其实许可没过；清单缺一列、许可没说清，题就不能开。',
    '学完能做什么：填一张五列许可清单，对混有个人记录的合成数据表说不，说清 scope 分离。',
    '和上节课的联系：前置 A1-U4-L01《提出校园真实问题》教的是提出值得用 AI 试试的真实问题；本课给 L01 选出的问题做许可清单——L01 的三例都是聚合计数，本课要给它们逐项确认许可状态；个人记录类题目 L01 已拒答，本课再确认一次：缺许可即停。',
    '当前要完成哪一步：先分类六项数据，再填许可清单，最后做否决题与 scope 题。',
  ],
  brief: '目标：给 L01 的问题填一张五列许可清单，对混有个人记录的合成数据表说不，再说清 scope 分离与五条不覆盖事项。',
  step: '先分类六项数据，再填许可清单，最后做否决题与 scope 题。',
  hints: HINTS,
  draftKey: L02_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '许可清单全过只表示本次课堂练习合格，不等于系统里的许可映射已经存在；“监护人同意如何映射到某个儿童档案”在仓内无对应设计、未核实，映射机制为待填 stub，本节只教清单写法与默认拒绝的纪律；本课不收集、不上传任何真实校园数据，清单是课堂文档，不改变任何系统许可状态。',
  methodSteps: LESSON_STEPS,
}

/* ------------------------------------------------------------------ */
/* 统一工作区契约字段（除 engine 外）：翻译规则与 L01 一致               */
/* ------------------------------------------------------------------ */

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三步教学活动（探索分类 / 独立练习填许可清单 / 迁移否决题与 scope 题）；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - 课节进度是动态的（核对状态），外壳 progress 是静态值，
 *   故不填 progress；进度明细保留在插槽总结区。
 * 完整工作区契约 L02_WORKSPACE_CONTRACT 在文件末尾导出：通用引擎值
 *   'slot' 已并入主线 WorkspaceEngine（#491 OPS-026），路由直接
 *   传入统一 LessonWorkspace；不得填 'summary'，不得用 'json' 冒充。
 */
export const L02_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: L02_CONTRACT.lessonId,
  title: L02_CONTRACT.title,
  goal5: L02_CONTRACT.goal5,
  brief: L02_CONTRACT.brief,
  step: L02_CONTRACT.step,
  hints: L02_CONTRACT.hints.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  judging: {
    stageRule: '检查结果：六项数据分类——聚合可用 3、缺许可即停 3，逐项判定。',
    taskRule: '任务判定：许可清单与迁移均完成为合格，否则为未合格并列出未完成项。',
    knowledgeRule: '知识证据：方法证据——分类计数、许可清单完成情况、否决题计数、scope 题与不覆盖事项计数（只记计数，不记学生原文）。',
    scopeLabel: L02_CONTRACT.scopeLabel,
  },
  draftKey: L02_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L02_CONTRACT.hints,
  methodSteps: L02_CONTRACT.methodSteps,
  scopeGap: L02_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '探索分类', text: '比较聚合数据与个人记录，识别缺许可即停的数据项。' },
    { level: 2, title: '独立练习：填许可清单', text: '给 L01 的问题填一张五列许可清单，缺许可即停。' },
    { level: 3, title: '迁移：否决题与 scope 题', text: '对混有个人记录的合成数据表说不，再答 scope 分离题。' },
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
export const L02_WORKSPACE_CONTRACT: LessonContract = {
  ...L02_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
}
