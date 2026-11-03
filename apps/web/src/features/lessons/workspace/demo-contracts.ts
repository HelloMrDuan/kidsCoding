/**
 * DEMO FIXTURES ONLY — never formal lesson data.
 *
 * Every contract here has `demo: true` and the shell renders a 演示 badge.
 * The fruit/threshold values below are the spec-published prototype demo
 * values (fruit x=200, threshold 80 for demo-a). They are NOT formal
 * G2-U3-L02 or A1-U3-L02 teaching parameters, and no G2/A1 lesson data is
 * written anywhere in this file. Formal parameters require chief approval.
 */

import { draftKeyFor, type LessonContract } from './lesson-contract'
import type { DemoBlock } from './blockly-adapter'

export type DemoContractWithScript = {
  contract: LessonContract
  /** Starter script shown when no saved draft exists (never a full solution). */
  initialScript: DemoBlock[] | null
}

/** 演示 A：接住掉落水果（blockly 演示，水果 x=200，阈值 80）。 */
export const DEMO_A: DemoContractWithScript = {
  contract: {
    lessonId: 'demo-a',
    title: '演示：接住掉落水果',
    goal5: [
      '今天学什么：重复积木与接住判定',
      '要解决什么问题：让篮子接住落下的水果',
      '学完能做什么：用循环移动篮子接住不同位置的水果',
      '和上节课的联系：上节用方向键改坐标，本节改用脚本控制移动',
      '当前要完成哪一步：搭脚本并运行一次',
    ],
    brief: '演示任务：搭一个脚本，让篮子接住水果。',
    step: '当前步骤：搭脚本并运行一次',
    hints: [
      '1 级：先看水果 x，再想篮子往哪边走',
      '2 级：运动积木移动，重复块重复下一块',
      '3 级：先右移一个大步，再用重复块走几小步，具体数字自己算',
    ],
    engine: 'blockly',
    judging: {
      stageRule: '舞台结果：篮子坐标与水果坐标的差值在阈值内即接住',
      taskRule: '任务判定：篮子真实移动并接住',
      knowledgeRule: '知识证据：循环确实移动了篮子',
      scopeLabel: '教学定向',
      target: { fruitX: 200, threshold: 80 },
    },
    draftKey: draftKeyFor('demo-a'),
    demo: true,
  },
  initialScript: [
    { type: 'when_start' },
    { type: 'ws_move_right', steps: 30 },
  ],
}

/** 演示 B：送篮子到果园（blockly 演示，不同目标、不同水果位置、不同步骤）。 */
export const DEMO_B: DemoContractWithScript = {
  contract: {
    lessonId: 'demo-b',
    title: '演示：送篮子到果园',
    goal5: [
      '今天学什么：用重复积木走更远的路',
      '要解决什么问题：把篮子送到果园门口',
      '学完能做什么：用循环一次走完一段长路',
      '和上节课的联系：上节练了循环移动，本节把篮子送到指定位置',
      '当前要完成哪一步：搭脚本并运行一次',
    ],
    brief: '演示任务：搭一个脚本，把篮子送到果园门口。',
    step: '当前步骤：搭脚本并运行一次',
    hints: [
      '1 级：先看果园门口的位置，再想篮子要走多远',
      '2 级：一次走不完就用重复块分几次走',
      '3 级：先估一个大步数，再用重复补齐剩下的路',
    ],
    engine: 'blockly',
    judging: {
      stageRule: '舞台结果：篮子坐标与果园门口坐标的差值在阈值内即到达',
      taskRule: '任务判定：篮子真实移动并到达果园门口',
      knowledgeRule: '知识证据：循环确实移动了篮子',
      scopeLabel: '教学定向',
      target: { fruitX: 240, threshold: 60 },
    },
    draftKey: draftKeyFor('demo-b'),
    demo: true,
  },
  initialScript: [
    { type: 'when_start' },
    { type: 'ws_move_right', steps: 100 },
  ],
}

/** 演示 C：Scratch 沙箱演示（scratch-vm 演示，不含任何课程教学参数）。 */
export const DEMO_SCRATCH: DemoContractWithScript = {
  contract: {
    lessonId: 'demo-scratch',
    title: '演示：Scratch 沙箱',
    goal5: [
      '今天看什么：Scratch VM 沙箱如何挂载与运行',
      '要解决什么问题：确认沙箱握手、加载与停止是否诚实反馈',
      '看完能做什么：判断沙箱是否就绪、是否加载了工程',
      '和上节课的联系：无课程联系，这只是引擎演示',
      '当前要完成哪一步：导入一个 .sb3 工程并运行',
    ],
    brief: '演示任务：导入一个 .sb3 工程，观察沙箱运行与停止。',
    step: '当前步骤：导入工程并运行一次',
    hints: [
      '1 级：先看沙箱是否显示已就绪',
      '2 级：未加载工程时运行会诚实报错，不会假装运行',
      '3 级：导入后运行，停止会保留工程与当前状态',
    ],
    engine: 'scratch-vm',
    judging: {
      stageRule: '舞台结果：沙箱快照中的第一个角色坐标',
      taskRule: '任务判定：演示不做行为判定（沙箱行为判定尚未接入）',
      knowledgeRule: '知识证据：演示不做知识判定（沙箱行为判定尚未接入）',
      scopeLabel: '教学定向',
    },
    draftKey: draftKeyFor('demo-scratch'),
    demo: true,
  },
  initialScript: null,
}

export const DEMO_CONTRACTS: Record<string, DemoContractWithScript> = {
  'demo-a': DEMO_A,
  'demo-b': DEMO_B,
  'demo-scratch': DEMO_SCRATCH,
}

export function getDemoContract(lessonId: string): DemoContractWithScript | null {
  return DEMO_CONTRACTS[lessonId] ?? null
}
