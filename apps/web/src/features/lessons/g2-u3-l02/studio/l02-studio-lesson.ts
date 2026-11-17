/**
 * OPS-042：《接住掉落水果》的 StudioShell 课堂契约。
 *
 * 内容全部来自本课既有教学资产，不新编：
 * - 目标、简介、判定口径：contract.ts 的 L02_CONTRACT（goal5 /
 *   brief / judging 三层口径原文）；
 * - 关卡、任务、步骤、提示：contract.ts 的 L02_CONTENT（四关：
 *   先猜一猜 / 自己搭程序 / 水果换到左边 / 水果掉得更快）；
 * - 参数全部取自 params.ts（pilot-approved，不改数值）。
 *
 * 与受限模型版的差异（如实记录）：真实 GUI 里积木完全可编辑，
 * 第一关“只能看不能改”无法靠界面强制，只能靠任务文案引导孩子
 * 先预测再运行；预测环节保留在关卡面板里（先选，再运行对照）。
 */

import type { StudioLesson } from '@/features/lessons/studio/studio-lesson'

import { L02_CONTENT, L02_CONTRACT } from '../contract'
import { L02_LEVEL_ORDER, type LevelId } from '../params'

export const L02_STUDIO_LESSON_ID = 'g2-u3-l02'
export const L02_STUDIO_TITLE = '接住掉落水果'
export const L02_STUDIO_HREF = '/studio/scratch/g2-u3-l02'

/** 关卡在面板里的简短标题（完整任务文案在 contract.ts）。 */
export const L02_LEVEL_TITLES: Record<LevelId, string> = {
  explore: '先猜一猜',
  solve: '自己搭程序',
  transferLeft: '水果换到了左边',
  transferFast: '水果掉得更快',
}

/** 由当前关卡构建课堂契约（progress 显示“关卡 x / 4”）。 */
export function buildL02StudioLesson(currentLevel: LevelId): StudioLesson {
  const content = L02_CONTENT[currentLevel]
  const index = L02_LEVEL_ORDER.indexOf(currentLevel)
  return {
    lessonId: L02_STUDIO_LESSON_ID,
    title: L02_CONTRACT.title,
    goal5: L02_CONTRACT.goal5,
    brief: L02_CONTRACT.brief,
    step: `第 ${index + 1} 关「${content.title}」：${content.step}`,
    hints: [...content.hints],
    engine: 'slot',
    judging: { ...L02_CONTRACT.judging },
    // StudioShell 校验要求 draftKey 与本契约的 lessonId 一致；
    // L02_CONTRACT.draftKey 用的是课程编号（G2-U3-L02），属于旧
    // 工作区口径，这里按 studio 口径单独给。
    draftKey: 'kidscoding-draft:g2-u3-l02',
    backHref: '/studio',
    methodSteps: L02_LEVEL_ORDER.map(
      (id, i) => `第 ${i + 1} 关「${L02_CONTENT[id].title}」：${L02_CONTENT[id].step}`,
    ),
    progress: {
      label: '关卡',
      current: index + 1,
      total: L02_LEVEL_ORDER.length,
    },
    help: {
      title: '帮助与验收说明',
      body: [
        '怎么上课：点顶栏“关卡”打开面板选关，中间是真正的 Scratch 编辑器——积木可以拖、可以改数字、可以删。先看任务，再动手搭；点顶栏的“检查我的作品”，系统会真的把你的程序运行一遍，再告诉你接没接住、哪一层还没过。',
        '保存在哪里：点“检查我的作品”时会先把当前作品保存到这台设备的浏览器里，每一关各存一份。顶栏会写明最后保存的时间；保存失败会明确显示“未能保存”，不会假装存好了。在编辑器里改了积木之后，要再点一次检查才会保存新版本。也可以从顶栏“文件”里把作品导入，或恢复本关的初始作品；导出 .sb3 请用编辑器自己的文件菜单。',
        '第一关为什么先猜：第一关的程序已经搭好（重复 2 次，每次 x 增加 20）。先在面板里写下你的预测——篮子会停在哪里、能不能接住，再点检查对照真实结果。猜错没关系，看清差在哪里才是这一关要学的。',
        '判定是怎么做的（给大人看）：检查时先经桥接直读编辑器里的当前作品，再在本机用真正的 Scratch 虚拟机完整运行一遍，记录篮子每一次真实移动和水果落地的瞬间，按三层给出结果：舞台结果（接没接住）、任务结果（篮子动没动、停得对不对）、知识证据（“重复执行”里的移动是不是真的运行并承担了主要距离）。只看真实运行，不数积木个数——摆着没接上的积木、空转的循环都不会算数。系统只能判断这一次运行的行为，看不出孩子是否理解原因，面板里会固定显示这条说明。',
        '手机和平板：小屏幕上 Scratch 编辑器自己的文件菜单点不到（这是 Scratch 本身的限制），请用大屏幕完成搭建；顶栏的检查、关卡切换和指引在小屏幕上可以正常用。',
      ],
    },
  }
}
