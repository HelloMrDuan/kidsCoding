/**
 * lesson-01-forest-hello《小狐狸出场》课程契约（OPS-041，G0 正式课）。
 *
 * 全部内容机械派生自已合并的课程数据原文，不得编新教学点（首席裁定 1）：
 * - lessonId / title / goal / steps / hintLayers：`launch-lessons.ts`
 *   lesson-01 条目（id lesson-01-forest-hello，sortOrder 1）。
 * - 单元名：《森林见面会》，`foundation-units.ts` unit-1-forest-meetup，
 *   lessonIds[0] 即本课（sortOrder 1，第一课）。
 * - 每步语音：`foundation-voiceovers.ts` lesson-01 四句（与 steps 一一对应）。
 * - hints 三条：hintLayers 三级 copy 原文（tier1 方向 / tier2 知识点与
 *   积木 / tier3 局部示范与调试线索，标题取契约规范对三级的分工）。
 * - judging 三层：plan.md §6 阻塞 2 拟稿，首席已批准 exact 文案与
 *   scopeLabel='教学定向'（裁定 2）。
 * - engine='slot'：通用插槽引擎（OPS-026，#491 已合并）。不得填
 *   'blockly'（BlocklyAdapter 是演示专用，会拒掉本课真实的 move_right），
 *   不得填 'summary'，不得用 'json' 冒充。
 * - draftKey 须与 lessonId 一致（validateLessonContract 校验）：
 *   `kidscoding-draft:lesson-01-forest-hello`，单键、64KB fail-closed。
 * - progress 不填：4 关进度是动态的，外壳 progress 是静态值，活进度
 *   （第 X / 4 关）由插槽渲染；StudioShell 无 progress 时显示 step 字段。
 * - fileCapabilities 全开：外壳对插槽课已实现新建/保存/导出/导入/
 *   恢复初始，全部真实可用，不隐藏。
 * - hasStage 不填（默认有舞台，本课有狐狸舞台）。
 * - scopeGap：试学课（trial）的诚实范围说明——进度保存在本机并尝试
 *   同步云端，通过只表示本次运行合格，不等于完全掌握“开始时”。
 * - FOREST_HELP：玩法帮助（抽屉 help），由四步标题与指导拼成，供插槽
 *   渲染；不是 LessonContract 字段（契约无 help 字段）。
 */
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { foundationUnits } from '@/content/curriculum/foundation-units'
import { foundationVoiceovers } from '@/content/curriculum/foundation-voiceovers'
import {
  FOREST_HELLO_LESSON_ID,
  FOREST_HELLO_LEGACY_ROUTE,
  FOREST_HELLO_STUDIO_ROUTE,
} from '../launch-lesson-routes'
import type { LessonContract } from '../workspace/lesson-contract'

export const FOREST_LESSON_ID = FOREST_HELLO_LESSON_ID
export const FOREST_LESSON_TITLE = '小狐狸出场'
export const FOREST_ROUTE = FOREST_HELLO_STUDIO_ROUTE
export const FOREST_OLD_ROUTE = FOREST_HELLO_LEGACY_ROUTE
export const FOREST_REWARD_CARD_ID = 'theme-forest-fox'

/** 课程数据源（launch-lessons.ts lesson-01 条目）；缺失即 fail-closed。 */
export const FOREST_SOURCE_LESSON = launchLessons.find(
  (lesson) => lesson.id === FOREST_LESSON_ID,
)

export const FOREST_SOURCE_UNIT = foundationUnits.find((unit) =>
  unit.lessonIds.includes(FOREST_LESSON_ID),
)

export const FOREST_VOICEOVERS: string[] =
  foundationVoiceovers[FOREST_LESSON_ID] ?? []

/** 四步教学（id / 标题 / 指导 / 语音，一一对应，原文照抄）。 */
export const FOREST_STEPS = (FOREST_SOURCE_LESSON?.steps ?? []).map((step, index) => ({
  id: step.id,
  title: step.title,
  instruction: step.instruction,
  voiceover: FOREST_VOICEOVERS[index] ?? '',
  allowedBlocks: step.allowedBlocks,
  requiredBlockTypes: step.requiredBlockTypes,
}))

/**
 * goal5（契约顺序：学什么 / 解决问题 / 学完能做什么 / 和上节课的联系 /
 * 当前步骤），逐条注明来源：
 * 1. lesson.goal 原文。
 * 2. step-1 指导末句的问题原文（“只有‘开始时’，小狐狸会走吗？”）。
 * 3. step-2 指导（“让小狐狸向右走 100 步、走上舞台”）+ step-3 标题
 *    （“走到小兔子身边”）。
 * 4. sortOrder 1（无前置课节）+ 单元名《森林见面会》+ 课程标题
 *    （“让小狐狸出场”）。
 * 5. 四步标题原文（step-3 标题含“新练习：”前缀，照抄不删）。
 */
export const FOREST_GOAL5: [string, string, string, string, string] = [
  `今天学什么：${FOREST_SOURCE_LESSON?.goal ?? ''}`,
  '要解决什么问题：只有“开始时”，小狐狸会走吗？',
  '学完能做什么：把“开始时”和“向右走 100 步”接好，让小狐狸走上舞台、走到小兔子身边。',
  '和上节课的联系：无前置课节，本课是《森林见面会》单元的第一节；先学会让小狐狸出场。',
  `当前要完成哪一步：走完 4 关：${FOREST_STEPS.map((step) => step.title).join('、')}。`,
]

export const FOREST_BRIEF =
  '目标：让小狐狸向右走 100 步，完成第一次出场。先认识开始积木，再接移动积木走上舞台，猜一猜两块移动积木会停在哪里，最后找错再修好。'

export const FOREST_STEP_TEXT = `走完 4 关：${FOREST_STEPS.map((step) => step.title).join('、')}。`

/** 三级提示：hintLayers 三级 copy 原文；标题取契约规范对三级的分工。 */
export const FOREST_HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = (
  FOREST_SOURCE_LESSON?.hintLayers ?? []
)
  .slice(0, 3)
  .map((layer, index) => ({
    level: (index + 1) as 1 | 2 | 3,
    title: ['一级提示：方向', '二级提示：知识点与积木', '三级提示：局部示范与调试线索'][index],
    text: layer.copy,
  }))

/** 方法步骤：四步标题 + 指导原文（供抽屉渲染）。 */
export const FOREST_METHOD_STEPS: string[] = FOREST_STEPS.map(
  (step) => `${step.title}：${step.instruction}`,
)

/** 玩法帮助（抽屉 help）：四步标题与指导拼成，供插槽渲染。 */
export const FOREST_HELP = [
  '玩法：把积木从左边的工具箱拖到画布上，接在“开始时”下面，再按运行。',
  ...FOREST_METHOD_STEPS,
].join('\n')

export const FOREST_SCOPE_GAP =
  '这是试学课（trial），进度保存在本机并尝试同步云端；通过只表示本次运行合格，不等于完全掌握“开始时”。'

export const FOREST_WORKSPACE_CONTRACT: LessonContract = {
  lessonId: FOREST_LESSON_ID,
  title: FOREST_LESSON_TITLE,
  goal5: FOREST_GOAL5,
  brief: FOREST_BRIEF,
  step: FOREST_STEP_TEXT,
  hints: FOREST_HINTS.map((hint) => `${hint.title}：${hint.text}`) as [
    string,
    string,
    string,
  ],
  engine: 'slot',
  judging: {
    stageRule: '运行后小狐狸向右走 100 步（第三关 200 步）走到舞台/兔子身边。',
    taskRule: '程序为“开始时 → 移动”且运行成功。',
    knowledgeRule: '“开始时”必须在最前，移动接在后面；缺开始则狐狸不动。',
    scopeLabel: '教学定向',
  },
  draftKey: 'kidscoding-draft:lesson-01-forest-hello',
  structuredHints: FOREST_HINTS,
  methodSteps: FOREST_METHOD_STEPS,
  scopeGap: FOREST_SCOPE_GAP,
  activities: [
    {
      level: 1,
      title: '探索预测：先猜再运行',
      text: '第 1 关猜只有“开始时”小狐狸会不会走，第 3 关猜两块移动积木会停在哪里。',
    },
    {
      level: 2,
      title: '独立解决：自己搭建并验收',
      text: '第 2 关自己接“开始时”和“向右走 100 步”并运行验证。',
    },
    {
      level: 3,
      title: '迁移创作：找错再修好',
      text: '第 4 关先运行少了“开始时”的程序，再把“开始时”放到移动上面修好它。',
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
