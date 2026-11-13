/**
 * G1-U1-L01 课程内容契约（Lesson Content Contract）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md。
 * 外壳只渲染契约内容，不编造课程内容；标题、目标、任务、提示、
 * 结果、总结六方全部来自本课契约。
 *
 * 课程专用内容一律取自 features/lessons/story/g1-u1-story-lessons.ts
 * （教学数据）与 track-g1-detailed-lessons-v1.json（详细稿五步原文），
 * 本文件只做翻译，不复制/改写教学数据、不硬编码课程文案。
 *
 * 诚实口径：
 * - 这是实验课，成绩只保存在本机，不是正式课程成绩；通过只表示本次
 *   运行合格，不等于完全掌握对白。
 * - 演示值：无。本课无演示数字目标；一次移动 100 步、最多 20 块是实现
 *   选择（详细稿只要求“再移动”，不规定步数），已在判定文件注释中标明。
 *
 * 引擎：通用引擎值 'slot'（OPS-026 #491 已并入主线 WorkspaceEngine）；
 * 本课是首个带真实运行过程的 slot 课：课程自有 EditorSlot（内嵌真实
 * BlocklyWorkspace）+ 课程自有 SlotRunAdapter。备选路线
 * engine='blockly' + 课程自有 EngineAdapter 已考虑不取用：壳挂载的
 * BlocklyAdapter 是演示积木模型（DemoBlock，无 line 字段；运行是演示
 * 播放器），承载不了本课的 say_line / switch_character 与故事判定，
 * 且会启用外壳演示脚本列表 / 演示抽屉等 blockly 分支行为；把故事语义
 * 塞进共享 BlocklyAdapter 是共享文件改动，须另立产品任务裁定。
 */
import { G1_U1_L01_STORY_LESSON } from '@/content/curriculum/g1-u1-story-lessons'
import type { LessonContract } from '@/features/lessons/workspace/lesson-contract'

import { STORY_DRAFT_KEY } from './g1-u1-l01-draft'

export const G1_LESSON_ID = 'G1-U1-L01'
export const G1_LESSON_TITLE = '给狐狸一个开场'
export const G1_ROUTE = '/learn/story-lab/G1-U1-L01'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const G1_DRAFT_KEY = STORY_DRAFT_KEY

export type G1Contract = {
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

/**
 * 三层提示原文：照抄详细稿 feedback.tieredHints（与七关 steps[].hints
 * 同一份）；标题取契约规范对三级提示的分工（方向 / 知识点与积木 /
 * 局部示范与调试线索），不另写答案性标题。
 */
export const G1_HINTS: G1Contract['hints'] = (
  G1_U1_L01_STORY_LESSON.steps[0].hints as readonly [string, string, string]
).map((text, index) => ({
  level: (index + 1) as 1 | 2 | 3,
  title: ['一级提示：方向', '二级提示：知识点与积木', '三级提示：局部示范与调试线索'][index],
  text,
}))

/**
 * 方法步骤：详细稿 learningSteps 五步的 learnerAction 原文，逐字取自
 * track-g1-detailed-lessons-v1.json 中 G1-U1-L01，不得现写（单测逐字对照）。
 */
export const G1_METHOD_STEPS: string[] = [
  '观察「给狐狸一个开场」的初始状态，写下目标：点击开始后狐狸先打招呼再移动。',
  '画出或写出操作顺序，并说出关键步骤：把开场对白设为“欢迎来到森林剧场”，放在开始事件后。',
  '把开场对白设为“欢迎来到森林剧场”，放在开始事件后。',
  '在「图形化故事编辑工作台」执行，并确认：点击开始后狐狸先打招呼再移动。',
  '尝试重现错误，利用提示改正：检查对白积木是否接在事件之后，且属于狐狸。',
]

export const G1_CONTRACT: G1Contract = {
  lessonId: G1_LESSON_ID,
  title: G1_LESSON_TITLE,
  goal5: [
    '今天学什么：理解并能解释对白。',
    '要解决什么问题：狐狸被选作森林主持人，可它总在故事开头沉默。',
    '学完能做什么：在「给狐狸一个开场」完成具体任务：把开场对白设为“欢迎来到森林剧场”，放在开始事件后。',
    '和上节课的联系：无前置课节，本课是 G1 第一单元的第一节；先学会让角色开口说话。',
    '当前要完成哪一步：走完 7 关——引导、设计、搭建、运行验收、错误实验、创意拓展、复盘。',
  ],
  brief:
    '目标：点击开始后狐狸先打招呼再移动。先预测，再搭建三块积木的程序，运行验证，修好只有移动的错误程序，最后向观众提问。',
  step: '走完 7 关：引导、设计、搭建、运行验收、错误实验、创意拓展、复盘。',
  hints: G1_HINTS,
  draftKey: G1_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '这是实验课，成绩只保存在本机，不是正式课程成绩；通过只表示本次运行合格，不等于完全掌握对白。',
  methodSteps: G1_METHOD_STEPS,
}

/* ------------------------------------------------------------------ */
/* 统一工作区契约字段（除 engine 外）：翻译规则与 L05 一致               */
/* ------------------------------------------------------------------ */

/**
 * 除 engine 外的全部工作区契约字段。翻译规则（外壳只渲染契约内容）：
 * - goal5 / brief / step / draftKey 直通；
 * - hints（结构化 { level, title, text }）→ 外壳 structuredHints 直通，
 *   同时压平为 [string, string, string]（`${title}：${text}`）满足外壳
 *   必填 hints 校验；
 * - judging 三规则由本课语义书写（规则文本，无演示数字目标）；
 * - methodSteps / scopeGap 进外壳抽屉（仅抽屉渲染，不进编辑区）；
 * - activities 为三层教学活动（探索预测 / 独立解决 / 迁移创作，对应
 *   7 关分组）；
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏；
 * - hasStage 不填（默认有舞台，本课有狐狸舞台）；
 * - progress 不填：7 关进度是动态的，外壳 progress 是静态值，活进度
 *   （第 X / 7 关）由插槽渲染（Q1）。
 * 完整工作区契约 G1_WORKSPACE_CONTRACT 在文件末尾导出：通用引擎值
 *   'slot' 已并入主线 WorkspaceEngine（#491 OPS-026），路由直接
 *   传入统一 LessonWorkspace；不得填 'blockly'（见文件头备选路线说明），
 *   不得填 'summary'，不得用 'json' 冒充。
 */
export const G1_WORKSPACE_CONTRACT_FIELDS: Omit<LessonContract, 'engine'> = {
  lessonId: G1_CONTRACT.lessonId,
  title: G1_CONTRACT.title,
  goal5: G1_CONTRACT.goal5,
  brief: G1_CONTRACT.brief,
  step: G1_CONTRACT.step,
  hints: G1_CONTRACT.hints.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  judging: {
    stageRule: '舞台结果：狐狸位置大于 0 表示舞台上狐狸真的移动了；气泡显示最近一句对白。',
    taskRule: '任务判定：点击开始后狐狸先打招呼再移动才算通过；只有移动没有对白、缺少移动、开场对白给错人或说错话均为未通过。',
    knowledgeRule: '知识证据：开场对白“欢迎来到森林剧场”属于狐狸，在开始事件后、移动前说出，才算对白知识被真实使用。',
    scopeLabel: G1_CONTRACT.scopeLabel,
  },
  draftKey: G1_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: G1_CONTRACT.hints,
  methodSteps: G1_CONTRACT.methodSteps,
  scopeGap: G1_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '探索预测：先猜再运行', text: '第 1 关预测狐狸先做什么，第 5 关预测只有移动算不算完成。' },
    { level: 2, title: '独立解决：自己搭建并验收', text: '第 2–4 关自己定顺序、拼三块积木程序并运行验证。' },
    { level: 3, title: '迁移创作：向观众提问', text: '第 6 关在移动后追加一句提问对白，第 7 关说出为什么对白必须在移动前、属于狐狸。' },
  ],
  fileCapabilities: {
    canNew: true,
    canSave: true,
    canExport: true,
    canImport: true,
    canReset: true,
  },
}

/**
 * 完整工作区契约：FIELDS + 通用插槽引擎 'slot'，供路由传入统一
 * LessonWorkspace。'slot' 已并入主线 WorkspaceEngine（#491 OPS-026，
 * 校验接受、演示路由与单测已覆盖）；不得填 'blockly'，不得填
 * 'summary'，不得用 'json' 冒充。
 */
export const G1_WORKSPACE_CONTRACT: LessonContract = {
  ...G1_WORKSPACE_CONTRACT_FIELDS,
  engine: 'slot',
}
