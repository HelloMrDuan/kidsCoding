// 通过本关之后才出现的“你的做法 / 别的做法”，以及探索关演示程序与迁移关的毛病程序。
// 完整参考做法属于“事后节点”（LESSON-CONTRACT / DESIGN §四）：学生在没有通过本关之前，
// 界面不得调用或渲染本模块的“别的做法”输出。演示程序与毛病程序是关卡内容本身，不受此限。
//
// “别的做法”不是写死的标准答案，而是几个**确实能通过本关**的不同写法。它们的有效性由真实 VM 验证
// （tests/e2e/g2-u3-l06-vm.spec.ts 的“参考做法”用例：每个写法都真的跑过一遍并通过三层判定），不靠推断。

import { fallFrames, type LevelParams } from './params'
import type { Block, IfTouchBlock, LeafBlock, Program, RepeatBlock } from './program'

export type Alternative = { title: string; program: Program }

/** 一颗水果完整的一生：重复下落，每一步检查一次“碰到篮子？”，碰到就记分并隐藏；落完隐藏（接住的已隐藏）。 */
function oneFruit(level: LevelParams, extraFrames = 0): Array<LeafBlock | IfTouchBlock | RepeatBlock> {
  return [
    { t: 'spawn' },
    {
      t: 'repeat', times: fallFrames(level) + extraFrames,
      body: [{ t: 'fall' }, { t: 'iftouch', body: [{ t: 'score', by: 1 }, { t: 'hide' }] }],
    },
    { t: 'hide' },
  ]
}

/** 参考做法：一直重复“一颗水果的一生”，直到接到 5 颗或倒计时结束（结束由舞台规则收尾）。 */
export function referenceProgram(level: LevelParams): Program {
  return { scripts: [{ hat: 'flag', body: [{ t: 'forever', body: oneFruit(level) }] }] }
}

/**
 * 探索关的固定演示程序 = 参考做法（完整正确的游戏）。
 * 孩子在这一关移动篮子亲自接水果，观察随机出生与两种结束方式。
 */
export const DEMO_PROGRAM_LEVEL = 'explore'

/**
 * 迁移关 A 的毛病程序：出生与接力都对，但“将得分增加”放在“如果”外面、且没有“隐藏”——
 * 下落的每一步都会记分（没碰到篮子也记），一颗水果会被记很多次分。判定层会逐项指出。
 */
export function buggyProgram(level: LevelParams): Program {
  return {
    scripts: [{
      hat: 'flag',
      body: [{
        t: 'forever',
        body: [
          { t: 'spawn' },
          { t: 'repeat', times: fallFrames(level), body: [{ t: 'fall' }, { t: 'score', by: 1 }] },
        ],
      }],
    }],
  }
}

/** 枚举几个确实能通过本关的写法（与关卡速度无关的部分保持一致，次数按本关重算）。 */
export function alternatives(level: LevelParams): Alternative[] {
  return [
    {
      title: '参考做法：一直重复“一颗水果的一生”',
      program: referenceProgram(level),
    },
    {
      title: '先隐藏、再记分（如果里的顺序换一换，结果一样）',
      program: {
        scripts: [{
          hat: 'flag',
          body: [{
            t: 'forever',
            body: [
              { t: 'spawn' },
              { t: 'repeat', times: fallFrames(level), body: [{ t: 'fall' }, { t: 'iftouch', body: [{ t: 'hide' }, { t: 'score', by: 1 }] }] },
              { t: 'hide' },
            ],
          }],
        }],
      },
    },
    {
      title: '下落次数多留几步余量（检查更稳妥）',
      program: {
        scripts: [{
          hat: 'flag',
          body: [{ t: 'forever', body: oneFruit(level, 5) }],
        }],
      },
    },
    {
      title: '先检查、再下落（每一步先看碰没碰到，再往下落）',
      program: {
        scripts: [{
          hat: 'flag',
          body: [{
            t: 'forever',
            body: [
              { t: 'spawn' },
              { t: 'repeat', times: fallFrames(level), body: [{ t: 'iftouch', body: [{ t: 'score', by: 1 }, { t: 'hide' }] }, { t: 'fall' }] },
              { t: 'hide' },
            ],
          }],
        }],
      },
    },
  ]
}

function describeBlock(block: Block, depth: number): string[] {
  const pad = '  '.repeat(depth)
  if (block.t === 'spawn') return [`${pad}随机出生（x 随机，回到顶部）`]
  if (block.t === 'fall') return [`${pad}下落一步`]
  if (block.t === 'score') return [`${pad}将 得分 增加 ${block.by}`]
  if (block.t === 'hide') return [`${pad}隐藏`]
  if (block.t === 'iftouch') return [`${pad}如果〈碰到 篮子？〉那么`, ...block.body.flatMap(b => describeBlock(b, depth + 1))]
  if (block.t === 'repeat') return [`${pad}重复执行 ${block.times} 次`, ...block.body.flatMap(b => describeBlock(b, depth + 1))]
  return [`${pad}一直重复`, ...block.body.flatMap(b => describeBlock(b, depth + 1))]
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
