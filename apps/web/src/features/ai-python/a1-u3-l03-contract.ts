/**
 * A1-U3-L03 课程内容契约（Lesson Content Contract）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、
 * 结果、总结六方全部来自本课契约。
 *
 * 诚实口径：
 * - 本课是本地规则 JSON 校验，不调用外部模型、不接网关；学生改的是
 *   合成水果记录，不是真实称重数据；校验只管格式与范围，不管水果
 *   真不真实；多余字段校验器忽略，直径可选。
 * - 前置 A1-U3-L02《实现文本摘要》是顺序上的前置课：L02 教“对照规则
 *   动手、看反馈、修到通过”，L03 用同一方法做结构化记录；L03 不依赖
 *   L02 的任何 API 技能，方法从字段表从零教起。
 * - scopeLabel 为教学定向：五项全过只表示本次记录合格，不等于完全
 *   掌握结构化输出；页面任何位置不写“已掌握”。
 *
 * 引擎待定（首席裁定，未擅自填值）：
 * - 共享 LessonContract 的 engine 只允许 blockly / scratch-vm / summary
 *  （规范 LESSON-CONTRACT.md 第一节与 lesson-contract.ts 的
 *   validateLessonContract 一致）；本课是 JSON 校验，没有对应引擎值，
 *   不能冒用 'summary'（那是摘要编辑）。因此本文件只提供除 engine 外
 *   的全部工作区契约字段（L03_WORKSPACE_CONTRACT_FIELDS），路由接入
 *   待引擎值裁定后补一行 engine（见 Issue，待首席定夺）。
 * - 适配器与插槽不依赖 engine 值：校验、判定、草稿逻辑已完整实现并
 *   有单测覆盖；路由与 E2E 移植待引擎值落定后接线。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import { HINTS, LESSON_STEPS } from './a1-u3-l03'

export const L03_LESSON_ID = 'A1-U3-L03'
export const L03_LESSON_TITLE = '结构化JSON输出'
export const L03_ROUTE = '/learn/ai-python-lab-u3-l03/A1-U3-L03'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const L03_DRAFT_KEY = 'kidscoding-draft:A1-U3-L03'

export type L03Contract = {
  lessonId: string
  title: string
  goal5: [string, string, string, string, string]
  brief: string
  step: string
  hints: { level: 1 | 2 | 3; title: string; text: string }[]
  engine: 'json'
  draftKey: string
  scopeLabel: '教学定向' | '开放创作'
  scopeGap: string
  methodSteps: string[]
}

export const L03_CONTRACT: L03Contract = {
  lessonId: L03_LESSON_ID,
  title: L03_LESSON_TITLE,
  goal5: [
    '今天学什么：结构化 JSON 输出（按字段表写一条能通过校验的水果记录）。',
    '要解决什么问题：模型输出的 JSON 能不能直接用——字段齐不齐、类型对不对、值在不在范围。',
    '学完能做什么：判断一条 JSON 记录是否合规，并按字段级报错把它修到五项全过。',
    '和上节课的联系：前置 A1-U3-L02《实现文本摘要》教的是对照规则动手、看反馈、修到通过；本课用同一方法做结构化记录，不依赖 L02 的任何 API 技能。',
    '当前要完成哪一步：先读字段表，再改记录、点校验，最后修到五项全过。',
  ],
  brief: '目标：按字段表写一条能通过五项校验的水果记录 JSON。先读表，再改记录、点校验、修错误。',
  step: '先读字段表，再改记录、点校验、按字段级报错修到五项全过。',
  hints: HINTS,
  engine: 'json',
  draftKey: L03_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '行为化多解法评测尚未建成；五项全过只表示本次记录合格，不等于完全掌握结构化输出；校验只管格式与范围，不管水果真不真实。',
  methodSteps: LESSON_STEPS,
}

/* ------------------------------------------------------------------ */
/* 统一工作区契约字段（除 engine 外）：翻译规则与 L02 一致               */
/* ------------------------------------------------------------------ */

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三步教学活动（读字段表 / 改记录点校验 / 修到五项全过）；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - 课节进度是动态的（校验状态），外壳 progress 是静态值，
 *   故不填 progress；进度明细保留在插槽总结区。
 * engine 缺失是故意的：共享壳尚无 JSON 校验引擎值，待首席裁定后
 *   由路由以 `{ ...L03_WORKSPACE_CONTRACT_FIELDS, engine }` 补齐。
 */
export const L03_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: L03_CONTRACT.lessonId,
  title: L03_CONTRACT.title,
  goal5: L03_CONTRACT.goal5,
  brief: L03_CONTRACT.brief,
  step: L03_CONTRACT.step,
  hints: L03_CONTRACT.hints.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  judging: {
    stageRule: '检查结果：五项检查逐项判定——字段齐全、必填非空、类型正确、枚举内、数值范围。',
    taskRule: '任务判定：五项全部通过为合格，否则为未合格并列出未通过项名。',
    knowledgeRule: '知识证据：方法证据——字段构成与修错过程（不核验记录真假，多余字段校验器忽略）。',
    scopeLabel: L03_CONTRACT.scopeLabel,
  },
  draftKey: L03_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L03_CONTRACT.hints,
  methodSteps: L03_CONTRACT.methodSteps,
  scopeGap: L03_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '读字段表', text: '4 个字段：哪个必填、哪种类型、哪个范围；直径可选，名称、颜色、重量缺一不可。' },
    { level: 2, title: '改记录点校验', text: '改 JSON 文本、点校验，看字段级报错：错在哪个字段、为什么错、如何修改。' },
    { level: 3, title: '修到五项全过', text: '按报错逐条修，修完再点校验；五项全过的记录就是你的作品。' },
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
