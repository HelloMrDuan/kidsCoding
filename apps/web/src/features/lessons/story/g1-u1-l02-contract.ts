/**
 * G1-U1-L02 课程内容契约（Lesson Content Contract）。
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
 * - 演示值：无。本课无演示数字目标；最多 20 块是实现选择（与 L01 同口
 *   径，沿用第一阶段执行器上限），已在判定文件注释中标明。
 *
 * 引擎：通用引擎值 'slot'（OPS-026 #491 已并入主线 WorkspaceEngine）；
 * 本课是第二个带真实运行过程的 slot 课：课程自有 EditorSlot（内嵌真实
 * BlocklyWorkspace）+ 课程自有 SlotRunAdapter（第二阶段）。备选路线
 * engine='blockly' + 课程自有 EngineAdapter 已考虑不取用：壳挂载的
 * BlocklyAdapter 是演示积木模型（DemoBlock，无 line 字段；运行是演示
 * 播放器），承载不了本课的 say_line / switch_character 与轮流判定，
 * 且会启用外壳演示脚本列表 / 演示抽屉等 blockly 分支行为；把轮流语义
 * 塞进共享 BlocklyAdapter 是共享文件改动，须另立产品任务裁定。
 *
 * 期望对白注入：G1_EXPECTED_LINES（即课程数据的 L02_REQUIRED_LINES）
 * 由第二阶段的插槽运行适配器传给 judgeTurnTakingProgram(blocks,
 * expected)，判定逻辑本身不写死标准答案。
 */
import { G1_U1_L02_STORY_LESSON, L02_REQUIRED_LINES } from '@/content/curriculum/g1-u1-story-lessons'
import type { LessonContract } from '@/features/lessons/workspace/lesson-contract'

import { STORY_DRAFT_KEY } from './g1-u1-l02-draft'
import type { TurnTakingExpectedLine } from './g1-u1-l02-judging'

export const G1_LESSON_ID = 'G1-U1-L02'
export const G1_LESSON_TITLE = '与兔子轮流说话'
export const G1_ROUTE = '/learn/story-lab/G1-U1-L02'

/** 契约草稿键：规范格式 kidscoding-draft:{lessonId}，按课节分键。 */
export const G1_DRAFT_KEY = STORY_DRAFT_KEY

/** 期望对白（注入判定用）：狐狸先说“你好”，兔子再回应“很高兴见到你”。 */
export const G1_EXPECTED_LINES: readonly TurnTakingExpectedLine[] = L02_REQUIRED_LINES

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
  G1_U1_L02_STORY_LESSON.steps[0].hints as readonly [string, string, string]
).map((text, index) => ({
  level: (index + 1) as 1 | 2 | 3,
  title: ['一级提示：方向', '二级提示：知识点与积木', '三级提示：局部示范与调试线索'][index],
  text,
}))

/**
 * 方法步骤：详细稿 learningSteps 五步的 learnerAction 原文，逐字取自
 * track-g1-detailed-lessons-v1.json 中 G1-U1-L02，不得现写（单测逐字对照）。
 */
export const G1_METHOD_STEPS: string[] = [
  '观察「与兔子轮流说话」的初始状态，写下目标：两句对白按狐狸→兔子的顺序出现。',
  '画出或写出操作顺序，并说出关键步骤：安排狐狸说“你好”，兔子再回应“很高兴见到你”。',
  '安排狐狸说“你好”，兔子再回应“很高兴见到你”。',
  '在「图形化故事编辑工作台」执行，并确认：两句对白按狐狸→兔子的顺序出现。',
  '尝试重现错误，利用提示改正：拆开两个角色的说话时机，逐句运行对照。',
]

export const G1_CONTRACT: G1Contract = {
  lessonId: G1_LESSON_ID,
  title: G1_LESSON_TITLE,
  goal5: [
    '今天学什么：理解并能解释对白。',
    '要解决什么问题：兔子和狐狸第一次见面，要轮流介绍自己的名字。',
    '学完能做什么：在「与兔子轮流说话」完成具体任务：安排狐狸说“你好”，兔子再回应“很高兴见到你”。',
    '和上节课的联系：上节课（G1-U1-L01）学会了让狐狸先打招呼再移动；这节课把一句话变成两句轮流说——狐狸先说“你好”，兔子再回应“很高兴见到你”。',
    '当前要完成哪一步：走完 7 关——引导、设计、搭建、运行验收、错误实验、创意拓展、复盘。',
  ],
  brief:
    '目标：两句对白按狐狸→兔子的顺序出现。先预测，再搭建四块积木的程序，运行验证，修好顺序颠倒的错误程序，最后加第三句告别台词。',
  step: '走完 7 关：引导、设计、搭建、运行验收、错误实验、创意拓展、复盘。',
  hints: G1_HINTS,
  draftKey: G1_DRAFT_KEY,
  scopeLabel: '教学定向',
  scopeGap:
    '这是实验课，成绩只保存在本机，不是正式课程成绩；通过只表示本次运行合格，不等于完全掌握对白。',
  methodSteps: G1_METHOD_STEPS,
}

/* ------------------------------------------------------------------ */
/* 统一工作区契约字段（除 engine 外）：翻译规则与 L01 一致               */
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
 * - hasStage 不填（默认有舞台，本课有狐狸与兔子舞台）；
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
    stageRule: '舞台结果：狐狸先说“你好”的气泡在前、兔子回应“很高兴见到你”的气泡在后，两句按序出现才算舞台结果正确。',
    taskRule: '任务判定：两句对白按狐狸→兔子的顺序出现才算通过；缺少对白、顺序颠倒、两句同属一人、说错话、同时说话造成重叠均为未通过；第三句追加台词不破坏通过。',
    knowledgeRule: '知识证据：顺序、文本、分开说三者皆对——狐狸先说“你好”，切换角色后兔子再说“很高兴见到你”，两句分开说，才算对白知识被真实使用。',
    scopeLabel: G1_CONTRACT.scopeLabel,
  },
  draftKey: G1_CONTRACT.draftKey as `kidscoding-draft:${string}`,
  structuredHints: G1_CONTRACT.hints,
  methodSteps: G1_CONTRACT.methodSteps,
  scopeGap: G1_CONTRACT.scopeGap,
  activities: [
    { level: 1, title: '探索预测：先猜再运行', text: '第 1 关预测谁先说话，第 5 关预测兔子先说算不算完成。' },
    { level: 2, title: '独立解决：自己搭建并验收', text: '第 2–4 关自己定顺序、拼四块积木程序并运行验证。' },
    { level: 3, title: '迁移创作：加第三句告别', text: '第 6 关在两句正确对白后追加第三句台词，第 7 关说出为什么必须按狐狸→兔子的顺序、分开说。' },
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
