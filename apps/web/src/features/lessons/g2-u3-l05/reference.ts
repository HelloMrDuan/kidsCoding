// 通过本关之后才出现的“你的做法 / 别的做法”。
// 完整参考做法属于“事后节点”（LESSON-CONTRACT / DESIGN §四）：学生在没有通过本关之前，
// 界面不得调用或渲染本模块的输出。
//
// “别的做法”不是写死的标准答案，而是几个**确实能通过本关**的不同写法。它们的有效性由真实 VM 验证
// （g2-u3-l05.test.ts 用 Node 里的真实 scratch-vm 逐个跑过并通过三层判定；tests/e2e/g2-u3-l05-vm.spec.ts
// 在真实浏览器里再跑一遍），不靠推断。
//
// 注意一个真实 VM 的时序事实：每一帧先执行一遍线程再读变量，所以“先减少再等待”的写法第一帧读到的
// 就已经是减少后的值，判定会认为倒计时没有从本关起点开始——那种顺序不在别的做法里。

import type { LevelParams } from './params'
import type { Block, Program } from './program'

export type Alternative = { title: string; program: Program }

const until = (...body: Array<{ t: 'wait'; secs: number } | { t: 'decrease'; by: number }>): Block => ({ t: 'untilZero', body })
const program = (start: number, ...body: Block[]): Program => ({
  scripts: [{ hat: 'flag', body: [{ t: 'setTime', value: start }, ...body, { t: 'broadcast' }] }],
})

/** 枚举几个确实能通过本关的写法；起点秒数来自本关要求。 */
export function alternatives(level: LevelParams): Alternative[] {
  const start = level.startSeconds
  return [
    {
      title: '每次多减一点：等待 1 秒，timeLeft 减少 2（数得更快，结束得更早）',
      program: program(start, until({ t: 'wait', secs: 1 }, { t: 'decrease', by: 2 })),
    },
    {
      title: '等久一点、减多一点：等待 2 秒，timeLeft 减少 2（总时间差不多）',
      program: program(start, until({ t: 'wait', secs: 2 }, { t: 'decrease', by: 2 })),
    },
  ]
}

function describeBlock(block: Block, depth: number): string[] {
  const pad = '  '.repeat(depth)
  switch (block.t) {
    case 'setTime': return [`${pad}将 timeLeft 设为 ${block.value}`]
    case 'wait': return [`${pad}等待 ${block.secs} 秒`]
    case 'decrease': return [`${pad}将 timeLeft 减少 ${block.by}`]
    case 'broadcast': return [`${pad}广播“游戏结束”`]
    case 'repeat': return [`${pad}重复执行 ${block.times} 次`, ...block.body.flatMap(b => describeBlock(b, depth + 1))]
    case 'untilZero': return [`${pad}重复执行直到〈timeLeft < 1〉`, ...block.body.flatMap(b => describeBlock(b, depth + 1))]
  }
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
