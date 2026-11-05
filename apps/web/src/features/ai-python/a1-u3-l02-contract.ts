/**
 * A1-U3-L02 课程内容契约（Lesson Content Contract，P0 样板 B 整改）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md
 * （p0-kitten-workspace-v1.0）。外壳只渲染契约内容，不编造课程内容；
 * 标题、目标、任务、提示、结果、总结六方全部来自本课契约。
 *
 * 诚实口径（与旧台账 API 模板残留的断裂处）：
 * - 本课是本地规则抽取式摘要，不调用外部模型、不接网关；生成式摘要
 *   在本课只有一句话方向，不实现。台账 focusConcept / 学习目标里的
 *   API 表述是旧规划模板残留，随本 PR 订正本课一行（只动本课一行）。
 * - 前置 A1-U3-L01《建立安全的模型调用》尚未建成（生成式等批）：
 *   它是顺序上的前置课，不是本课本地方法学的知识前置——本课方法
 *   （找主题句、删重复、按要点重组）从零教起，不依赖 L01 的任何
 *   技能。goal5 第 4 条按规范样板如实写明这一点；台账
 *   prerequisiteLessonIds 字段是否改动，留待首席裁定（见 PR 正文），
 *   本 PR 不擅自改动课程链字段。
 * - scopeLabel 为教学定向：五项检查是规则检查，一次全过只表示
 *   本次摘要合格，不等于完全掌握摘要能力；页面任何位置不写“已掌握”。
 */

import type { LessonContract } from '../lessons/workspace/lesson-contract'
import type { SummaryParagraph, SummaryPoint } from './u3-local-engines'

export const L02_LESSON_ID = 'A1-U3-L02'
export const L02_LESSON_TITLE = '实现文本摘要'
export const L02_ROUTE = '/learn/ai-python-lab-u3-l02/A1-U3-L02'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const L02_DRAFT_KEY = 'kidscoding-draft:A1-U3-L02'

export type L02Contract = {
  lessonId: string
  title: string
  goal5: [string, string, string, string, string]
  brief: string
  step: string
  hints: { level: 1 | 2 | 3; title: string; text: string }[]
  engine: 'summary'
  draftKey: string
  scopeLabel: '教学定向' | '开放创作'
  scopeGap: string
  methodSteps: string[]
}

export const L02_CONTRACT: L02Contract = {
  lessonId: L02_LESSON_ID,
  title: L02_LESSON_TITLE,
  goal5: [
    '今天学什么：忠实摘要（只写原文有的要点，不添不改）。',
    '要解决什么问题：从短文里挑出 3 句要点，写出忠实摘要。',
    '学完能做什么：判断一句摘要是否忠实（要点齐全、无重复、无离题）。',
    '和上节课的联系：前置 A1-U3-L01《建立安全的模型调用》尚未建成（生成式等批），本课用本地规则抽取，不调用外部模型。',
    '当前要完成哪一步：先预测，再独立写摘要，最后在新课文里迁移方法。',
  ],
  brief: '目标：从短文里挑出要点，写出忠实摘要。先预测，再选，再核对，最后迁移。',
  step: '先预测三份候选摘要的结果，再独立写自己的摘要，最后在新课文里用同样的方法写摘要。',
  hints: [
    { level: 1, title: '一级提示：方向', text: '先读每段第一句找要点。' },
    { level: 2, title: '二级提示：方法', text: '同一要点只留第一次出现的那句。' },
    { level: 3, title: '三级提示：对照', text: '对照清单（三项要点齐全、无重复、无离题）。' },
  ],
  engine: 'summary',
  draftKey: L02_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '行为化多解法评测尚未建成；五项检查全过只表示本次摘要合格，不等于完全掌握摘要能力。',
  methodSteps: [
    '第一步：找主题句——每段第一句就是主题句。',
    '第二步：删重复——同一要点只留第一次出现的那句。',
    '第三步：按要点重组——按 A → B → C 的顺序排成 3 句（本课 3 个要点）。',
  ],
}

/* ------------------------------------------------------------------ */
/* 迁移课文：新课文、新条件，同一方法                                    */
/* ------------------------------------------------------------------ */

/**
 * 迁移用新课文（合成数据，非真实教材）：主题是“整理书包”，与主课文
 * “水果分类实验”完全不同，但结构相同——3 段、每段 2 句、每段第一句
 * 是主题句、要点仍为 A / B / C（含义换成本课文自己的三点）。
 * 迁移任务只给课文、目标与五项检查，不给参考答案；学生须把
 * “找主题句、删重复、按要点重组”搬到新课文上。
 */
export const TRANSFER_PASSAGE: SummaryParagraph[] = [
  {
    id: 'T1',
    point: 'A',
    sentences: [
      '整理书包先分三类：课本、作业本和文具。',
      '课本放底层，作业本放中层，文具放在顶层口袋。',
    ],
  },
  {
    id: 'T2',
    point: 'B',
    sentences: [
      '每天放学先把作业本拿出来，再把第二天要用的书装进去。',
      '装完拉上拉链，把书包立在门口。',
    ],
  },
  {
    id: 'T3',
    point: 'C',
    sentences: [
      '出门前对照课程表检查一遍，缺了就补上。',
      '检查完在门口贴一张小纸条，写上明天要带的东西。',
    ],
  },
]

export const TRANSFER_POINTS: Record<SummaryPoint, string> = {
  A: '先分类',
  B: '按顺序装',
  C: '出门前检查',
}

/* ------------------------------------------------------------------ */
/* 预测候选：三份比较材料，全部避开主课文主题句三元组                    */
/* ------------------------------------------------------------------ */

/**
 * 第一层“探索预测”的比较材料。三份候选全部由本地引擎实算，学生
 * 先预测“合格 / 未合格 + 最先违反哪一项”，再揭示真实检查结果。
 *
 * 刻意设计：三份候选没有一份是主课文主题句三元组（P1-1、P3-1、P4-1），
 * 因此预测活动不会提前泄露独立摘要的完整参考答案；其中候选甲全部
 * 用细节句仍能合格，正是要学生发现的结论——摘要不只有一种选法，
 * 只要要点齐全、无重复、无离题就合格。
 */
export type PredictionCandidate = {
  id: string
  label: string
  selectedIds: string[]
  customTexts: string[]
}

export const PREDICTION_CANDIDATES: PredictionCandidate[] = [
  {
    id: 'pred-a',
    label: '候选甲：三句细节句',
    selectedIds: ['P1-2', 'P3-2', 'P4-2'],
    customTexts: [],
  },
  {
    id: 'pred-b',
    label: '候选乙：同段两句加一段主题句',
    selectedIds: ['P2-1', 'P2-2', 'P3-1'],
    customTexts: [],
  },
  {
    id: 'pred-c',
    label: '候选丙：三句原文句加一句自己的话',
    selectedIds: ['P2-1', 'P3-2', 'P4-2'],
    customTexts: ['黄苹果最甜。'],
  },
]

/* ------------------------------------------------------------------ */
/* 统一工作区契约翻译：L02Contract → 共享 LessonContract              */
/* ------------------------------------------------------------------ */

/**
 * 正式集成用的共享工作区契约。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / engine / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string] 满足外壳必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三层教学活动（预测 / 独立 / 迁移），事实核对与总结
 *   仍在插槽内，不占 activities 名额；
 * - hasStage: false：本课无舞台与角色列，外壳渲染宽摘要布局；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - 课节进度是动态的（揭示数、检查状态），外壳 progress 是静态值，
 *   故不填 progress；进度明细保留在插槽总结页。
 * 翻译结果必须通过共享 validateLessonContract（单测锁定）。
 */
export const L02_WORKSPACE_CONTRACT: LessonContract = {
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
  engine: 'summary',
  judging: {
    stageRule: '检查结果：五项检查逐项判定——漏要点、添内容、改原意、抽取规范、来源核验。',
    taskRule: '任务判定：五项全部通过为合格，否则为未合格并列出未通过项名。',
    knowledgeRule: '知识证据：方法证据——要点覆盖与来源构成（独立完成不在此项的核验范围内，不宣称已核验）。',
    scopeLabel: L02_CONTRACT.scopeLabel,
  },
  draftKey: L02_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: L02_CONTRACT.hints,
  methodSteps: L02_CONTRACT.methodSteps,
  scopeGap: L02_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '探索预测', text: '比较三份候选摘要，先预测合格与否及最先违反项，再揭示真实检查结果。' },
    { level: 2, title: '独立摘要', text: '只给课文、目标和工具，自己选句、组织、自加句实验并检查。' },
    { level: 3, title: '迁移创作', text: '换一篇新课文《整理书包》，用同样方法写摘要并接受同一套五项检查。' },
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
