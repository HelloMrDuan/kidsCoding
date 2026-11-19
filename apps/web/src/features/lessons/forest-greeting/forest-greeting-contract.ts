/**
 * lesson-02-forest-greeting《小狐狸打招呼》课程契约（OPS-047，G0 正式课）。
 *
 * 全部内容机械派生自已合并的课程数据原文，不得编新教学点：
 * - lessonId / title / goal / steps / hintLayers：`launch-lessons.ts`
 *   lesson-02 条目（id lesson-02-forest-greeting，sortOrder 2）。
 * - 单元名：《森林见面会》，`foundation-units.ts` unit-1-forest-meetup，
 *   lessonIds[1] 即本课（sortOrder 2，第二课，前置 lesson-01）。
 * - 每步语音：`foundation-voiceovers.ts` lesson-02 四句（与 steps 一一对应）。
 * - hints 三条：hintLayers 三级 copy 原文（tier1 方向 / tier2 知识点与
 *   积木 / tier3 局部示范与调试线索，标题取契约规范对三级的分工）。
 * - engine='slot'：通用插槽引擎（OPS-026，#491 已合并）。不得填
 *   'blockly'（BlocklyAdapter 是演示专用，会拒掉本课真实的 move_right），
 *   不得填 'summary'，不得用 'json' 冒充。
 * - draftKey 须与 lessonId 一致（validateLessonContract 校验）：
 *   `kidscoding-draft:lesson-02-forest-greeting`，单键、64KB fail-closed。
 * - progress 不填：4 关进度是动态的，外壳 progress 是静态值，活进度
 *   （第 X / 4 关）由插槽渲染；StudioShell 无 progress 时显示 step 字段。
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - hasStage 不填（默认有舞台，本课有狐狸舞台）。
 * - scopeGap：试学课（trial）的诚实范围说明——进度保存在本机并尝试
 *   同步云端，通过只表示本次运行合格，不等于完全掌握“说一句话”的顺序。
 * - GREETING_HELP：玩法帮助（抽屉 help），由四步标题与指导拼成，供插槽
 *   渲染；不是 LessonContract 字段（契约无 help 字段）。
 */
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { foundationUnits } from '@/content/curriculum/foundation-units'
import { foundationVoiceovers } from '@/content/curriculum/foundation-voiceovers'
import type { LessonContract } from '../workspace/lesson-contract'

export const GREETING_LESSON_ID = 'lesson-02-forest-greeting'
export const GREETING_LESSON_TITLE = '小狐狸打招呼'
export const GREETING_ROUTE = '/studio/blockly/lesson-02-forest-greeting'
export const GREETING_OLD_ROUTE = '/learn/lesson/lesson-02-forest-greeting'
export const GREETING_REWARD_CARD_ID = 'theme-forest-rabbit'

/** 课程数据源（launch-lessons.ts lesson-02 条目）；缺失即 fail-closed。 */
export const GREETING_SOURCE_LESSON = launchLessons.find(
  (lesson) => lesson.id === GREETING_LESSON_ID,
)

export const GREETING_SOURCE_UNIT = foundationUnits.find((unit) =>
  unit.lessonIds.includes(GREETING_LESSON_ID),
)

export const GREETING_VOICEOVERS: string[] =
  foundationVoiceovers[GREETING_LESSON_ID] ?? []

/** 四步教学（id / 标题 / 指导 / 语音，一一对应，原文照抄）。 */
export const GREETING_STEPS = (GREETING_SOURCE_LESSON?.steps ?? []).map((step, index) => ({
  id: step.id,
  title: step.title,
  instruction: step.instruction,
  voiceover: GREETING_VOICEOVERS[index] ?? '',
  allowedBlocks: step.allowedBlocks,
  requiredBlockTypes: step.requiredBlockTypes,
}))

/**
 * goal5（契约顺序：学什么 / 解决问题 / 学完能做什么 / 和上节课的联系 /
 * 当前步骤），逐条注明来源：
 * 1. lesson.goal 原文。
 * 2. step-3 指导与练习设计的问题原文（“它会在哪里说话”——先猜再运行）。
 * 3. step-2 指导（“把‘说一句话’接在移动后面……小狐狸先出场，再说出
 *    你选的那句”）+ step-4 标题（“先说后走？找错再修好”）。
 * 4. sortOrder 2（前置 lesson-01《小狐狸出场》）+ 单元名《森林见面会》。
 * 5. 四步标题原文（step-3 标题含“新练习：”前缀，照抄不删）。
 */
export const GREETING_GOAL5: [string, string, string, string, string] = [
  `今天学什么：${GREETING_SOURCE_LESSON?.goal ?? ''}`,
  '要解决什么问题：小狐狸先出场还是先说话？没有移动积木时，它会在哪里说话？',
  '学完能做什么：把“说一句话”接在移动后面，从预设对白里选一句，让小狐狸先出场、再打招呼；顺序反了也能修好。',
  '和上节课的联系：上节课学会了“开始时 → 向右走 100 步”让小狐狸出场；这节课在出场后接上“说一句话”。',
  `当前要完成哪一步：走完 4 关：${GREETING_STEPS.map((step) => step.title).join('、')}。`,
]

export const GREETING_BRIEF =
  '目标：让小狐狸出场后说一句欢迎的话。先复习出场，再接“说一句话”选一句对白，猜一猜不走路时它在哪里说话，最后把先说后走的顺序修好。'

export const GREETING_STEP_TEXT = `走完 4 关：${GREETING_STEPS.map((step) => step.title).join('、')}。`

/** 三级提示：hintLayers 三级 copy 原文；标题取契约规范对三级的分工。 */
export const GREETING_HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = (
  GREETING_SOURCE_LESSON?.hintLayers ?? []
)
  .slice(0, 3)
  .map((layer, index) => ({
    level: (index + 1) as 1 | 2 | 3,
    title: ['一级提示：方向', '二级提示：知识点与积木', '三级提示：局部示范与调试线索'][index],
    text: layer.copy,
  }))

/** 方法步骤：四步标题 + 指导原文（供抽屉渲染）。 */
export const GREETING_METHOD_STEPS: string[] = GREETING_STEPS.map(
  (step) => `${step.title}：${step.instruction}`,
)

/** 玩法帮助（抽屉 help）：四步标题与指导拼成，供插槽渲染。 */
export const GREETING_HELP = [
  '玩法：把积木从左边的工具箱拖到画布上，接在“开始时”下面，再按运行。“说一句话”可以在“选一句对白”里换一句。',
  ...GREETING_METHOD_STEPS,
].join('\n')

export const GREETING_SCOPE_GAP =
  '这是试学课（trial），进度保存在本机并尝试同步云端；通过只表示本次运行合格，不等于完全掌握“先出场、再说话”的顺序。'

export const GREETING_WORKSPACE_CONTRACT: LessonContract = {
  lessonId: GREETING_LESSON_ID,
  title: GREETING_LESSON_TITLE,
  goal5: GREETING_GOAL5,
  brief: GREETING_BRIEF,
  step: GREETING_STEP_TEXT,
  hints: GREETING_HINTS.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  engine: 'slot',
  judging: {
    stageRule: '运行后小狐狸先向右走 100 步，再说出所选对白（第三关不走路，在原地说话）。',
    taskRule: '程序顺序与本关目标一致（开始时 → 移动 → 说话；第三关为开始时 → 说话）且运行成功。',
    knowledgeRule: '动作与对白按积木顺序发生：先出场、再说话；说话排在移动前面就是顺序反了。',
    scopeLabel: '教学定向',
  },
  draftKey: 'kidscoding-draft:lesson-02-forest-greeting',
  structuredHints: GREETING_HINTS,
  methodSteps: GREETING_METHOD_STEPS,
  scopeGap: GREETING_SCOPE_GAP,
  activities: [
    {
      level: 1,
      title: '探索预测：先猜再运行',
      text: '第 3 关先猜没有移动积木时小狐狸会在哪里说话，再运行验证。',
    },
    {
      level: 2,
      title: '独立解决：自己搭建并验收',
      text: '第 2 关自己接“开始时 → 向右走 100 步 → 说一句话”，在“选一句对白”里挑一句并运行验证。',
    },
    {
      level: 3,
      title: '迁移创作：找错再修好',
      text: '第 4 关先运行“先说话、再出场”的错误程序，再把“说一句话”挪到移动后面修好它。',
    },
  ],
  fileCapabilities: {
    canNew: true,
    canSave: true,
    canExport: true,
    canImport: true,
    canReset: true,
  },
}
