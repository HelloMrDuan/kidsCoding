/**
 * OPS-040《我的舞蹈秀》StudioLesson 契约（供 StudioShell 渲染）。
 *
 * 内容全部来自既有课程数据（dance-show-steps.ts 的 9 步与课程目标），
 * 不新编课程文案：
 * - goal5 是 9 步目标的归纳（认识作品 / 打开与保存 / 看懂脚本 /
 *   动手修改 / 独立创作与展示），与各步 goal 原文对应；
 * - brief 是课程总目标原文（DANCE_SHOW_LESSON_GOAL）；
 * - step / hints 随当前步动态取该步的 goal 与三级提示——外壳抽屉
 *   每次只展示当前步的任务、操作要点与预期，提示按需逐级展开；
 * - methodSteps 是 9 步的标题与目标清单（抽屉内通览）；
 * - progress 是当前步位置（第几步 / 共 9 步）——顶栏只显示当前步，
 *   不常驻长篇课程目标（OPS-040 产品整改）；已通过步数在步骤面板
 *   与检查结果里呈现，不在顶栏冒充进度。
 *
 * engine 取 'slot'：本课的编辑器是外壳 children 里直接挂载的官方
 * Scratch GUI iframe（外接编辑面），不是 LessonWorkspace 的
 * scratch-vm 受限沙箱分支，也没有走 LessonWorkspace 挂载，
 * 故不冒称 'scratch-vm'。draftKey 仅为契约形式字段：本课作品的
 * 持久化走 IndexedDB project-store（OPS-038），不走草稿键。
 * judging 三条规则是对既有逐步评价引擎（evaluate-project.ts）的
 * 人读说明：评价读 GUI 里真实作品的 project.json，不在此另立标准。
 */

import {
  DANCE_SHOW_LESSON_GOAL,
  DANCE_SHOW_LESSON_TITLE,
  DANCE_SHOW_STEPS,
} from './dance-show-steps'
import type { StudioLesson } from '../studio/studio-lesson'

export const DANCE_SHOW_LESSON_ID = 'dance-show'

const GOAL5: [string, string, string, string, string] = [
  '认识你的作品：说出作品里有什么——舞者、造型、音乐、脚本',
  '会打开和保存作品：载入 .sb3、保存到本机、关掉再打开能恢复',
  '看懂舞蹈脚本：理解换造型、循环和等待怎样让舞者跳起舞来',
  '会动手改作品：加循环、调等待节奏、加音乐积木、换舞台背景',
  '独立创作与展示：自己编一支舞，保存好，再讲给别人听',
]

export function buildDanceShowStudioLesson(input: {
  currentStep: number
}): StudioLesson {
  const stepIndex = Math.min(
    Math.max(input.currentStep, 0),
    DANCE_SHOW_STEPS.length - 1,
  )
  const step = DANCE_SHOW_STEPS[stepIndex]
  return {
    lessonId: DANCE_SHOW_LESSON_ID,
    title: DANCE_SHOW_LESSON_TITLE,
    goal5: GOAL5,
    brief: DANCE_SHOW_LESSON_GOAL,
    step:
      `第 ${stepIndex + 1} 步「${step.title}」：${step.goal}` +
      ` 做的时候看右边编辑器，按这一步的操作一步一步来；预期结果：${step.checkHint}`,
    hints: [...step.hints],
    engine: 'slot',
    judging: {
      stageRule:
        '舞台结果：评价读编辑器里真实作品的 project.json——舞者、造型、背景、声音、脚本是否齐全，以作品实际内容为准',
      taskRule:
        '任务结果：9 个学习步骤逐步核对（认识作品、打开作品、看懂换造型、加循环、调节奏、加音乐、换背景、独立挑战、保存展示），每步以该步的检查要点判定通过与否',
      knowledgeRule:
        '知识证据：循环、等待节奏、音乐脚本等知识只认作品里真实存在的脚本结构与真实的保存→关闭→重新打开恢复流程，不认口头说明',
      scopeLabel: '开放创作',
    },
    draftKey: 'kidscoding-draft:dance-show',
    backHref: '/studio',
    methodSteps: DANCE_SHOW_STEPS.map(
      (s, i) => `第 ${i + 1} 步「${s.title}」：${s.goal}`,
    ),
    progress: {
      label: '步骤',
      current: stepIndex + 1,
      total: DANCE_SHOW_STEPS.length,
    },
    help: {
      title: '帮助与验收说明',
      body: [
        '检查作品：在编辑器里改好后，点顶栏“检查我的作品”，课程层会经桥接直接读编辑器里正在改的作品并逐步核对，不用先导出文件。备用通道：先在编辑器里“文件 → 保存到你的电脑”导出 .sb3，再点顶栏“文件 → 导入”选那个文件。',
        '保存与恢复：每次检查都会把作品存入本机浏览器（IndexedDB）；顶栏保存状态会显示最后保存时间——只有真的写进本机库才算已保存，写入失败会明确显示“未能保存”，不会假装成功。下次打开本页时会自动恢复上次保存的作品，恢复完成前检查按钮会保持禁用，以免覆盖。',
        '音乐验收：待真人听音验收。电脑只能证明音乐播放被触发，不能证明真的听到了——请在真实设备上确认能听到 Dance Space 音乐、点红色停止后音乐能停、保存再打开后音乐还正常。这三件要由真人听过才算通过，本页不会自动打勾。',
        '窄屏说明：编辑器在宽度不足时（约 1000px 以下）会隐藏自己的“文件”菜单，手机和平板窄屏上无法在编辑器内导入/导出 .sb3；请用大屏幕完成导入/导出，窄屏可以先看指引、步骤和舞台。',
        '作品传递（给大人看）：主通道是受控桥接消息——学习层经桥接向 GUI 宿主页面请求当前作品（get-project），直接读 project.json 并评价；桥接只接受来源白名单里的回复（严格相等且必须来自该 iframe），单条载荷上限 5MB。作品取回后存入本机 IndexedDB，页面加载时经桥接载入恢复。',
        '编辑器是官方 Scratch GUI（AGPL-3.0-only，standalone 独立部署）；学习引导层由 KidsCoding 提供。初始作品素材来自官方 Scratch 素材库，许可证版本待法律复核。正式对外发布前须完成 AGPL 合规审查。',
      ],
    },
  }
}
