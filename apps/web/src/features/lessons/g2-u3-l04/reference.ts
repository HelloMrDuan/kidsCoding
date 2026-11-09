// 通过本关之后才出现的“你的做法 / 别的做法”。
// 完整参考做法属于“事后节点”（LESSON-CONTRACT / DESIGN §四）：学生在没有通过本关之前，
// 界面不得调用或渲染本模块的输出。
//
// “别的做法”不是写死的标准答案，而是几个**确实能通过本关**的不同写法。它们的有效性由真实 VM 验证
// （tests/e2e/g2-u3-l04-vm.spec.ts 的“参考做法”用例：每个别的做法都真的跑过一遍并通过三层判定），不靠推断。

import { fallFrames, type LevelParams } from './params'
import type { Block, Program } from './program'

export type Alternative = { title: string; program: Program }

const iftouch = (...body: Array<{ t: 'score'; by: number } | { t: 'hide' }>): Block => ({ t: 'iftouch', body })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body: body as never })

/**
 * 球第一次碰到篮子的帧数（来自真实 VM 的实测，见 TEACHING-PLAN）：速度 10 → 第 25 帧，速度 20 → 第 13 帧。
 * 这里不重新推导，只列出课程里出现过的速度；遇到没实测过的速度就返回 null，调用方不给“别的做法”（宁可少给，不给没验证过的）。
 */
const FIRST_TOUCH_FRAME: Record<number, number> = { 10: 25, 20: 13 }

/** 枚举几个确实能通过本关的写法；`points` 来自本关要求。 */
export function alternatives(level: LevelParams): Alternative[] {
  const first = FIRST_TOUCH_FRAME[level.ballSpeed]
  if (first === undefined) return []
  const by = level.points
  return [
    {
      title: '先隐藏、再加分（顺序换一换，结果一样）',
      program: { scripts: [{ hat: 'flag', body: [repeat(first + 15, iftouch({ t: 'hide' }, { t: 'score', by }))] }] },
    },
    {
      title: `检查次数刚好够（重复 ${first} 次）`,
      program: { scripts: [{ hat: 'flag', body: [repeat(first, iftouch({ t: 'score', by }, { t: 'hide' }))] }] },
    },
    {
      title: `检查次数多一些也可以（重复 ${Math.min(100, fallFrames(level))} 次，球落到底才结束）`,
      program: { scripts: [{ hat: 'flag', body: [repeat(Math.min(100, fallFrames(level)), iftouch({ t: 'score', by }, { t: 'hide' }))] }] },
    },
  ]
}

function describeBlock(block: Block, depth: number): string[] {
  const pad = '  '.repeat(depth)
  if (block.t === 'score') return [`${pad}将 得分 增加 ${block.by}`]
  if (block.t === 'hide') return [`${pad}隐藏`]
  if (block.t === 'iftouch') return [`${pad}如果〈碰到 篮子？〉那么`, ...block.body.flatMap(b => describeBlock(b, depth + 1))]
  return [`${pad}重复执行 ${block.times} 次`, ...block.body.flatMap(b => describeBlock(b, depth + 1))]
}

/** 把孩子自己的程序写成几行文字，供“你的做法”显示。 */
export function describeProgram(program: Program): string {
  const lines: string[] = []
  for (const script of program.scripts) {
    if (script.hat !== 'flag') continue
    lines.push('当绿旗被点击')
    for (const block of script.body) lines.push(...describeBlock(block, 1))
  }
  return lines.length > 0 ? lines.join('\n') : '（还没有搭脚本）'
}
