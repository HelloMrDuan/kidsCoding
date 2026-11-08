// 通过本关之后才出现的“别的做法”。
// 完整参考做法属于“事后节点”（LESSON-CONTRACT / DESIGN §四）：学生在没有通过本关之前，
// 界面不得调用或渲染本模块的输出。这里按真实判定条件枚举，不是一份写死的标准答案。

import { L02_PARAMS, framesToLand, type LevelParams } from './params'
import type { Block, Program } from './program'

export type Alternative = { times: number; step: number; total: number }

/**
 * 枚举“重复 N 次 × 每次 S”的合法做法：
 *  - 重复在水果落地前全部执行完（N ≤ 落地帧数）；
 *  - 总位移落在容差内。
 * 为了每个组合都能被孩子看懂，只列出 N≥2 且 S 不为 0 的前几种。
 */
export function alternativeSolutions(level: LevelParams, limit = 4): Alternative[] {
  const out: Alternative[] = []
  const maxTimes = Math.min(L02_PARAMS.maxRepeatTimes, framesToLand(level))
  for (let times: number = 2; times <= maxTimes && out.length < limit; times += 1) {
    for (let step: number = L02_PARAMS.minMoveDx; step <= L02_PARAMS.maxMoveDx; step += 1) {
      if (step === 0) continue
      const total = times * step
      if (Math.abs(L02_PARAMS.basketStartX + total - level.fruitX) <= L02_PARAMS.catchTolerance && Math.abs(step) >= 10) {
        out.push({ times, step, total })
        break
      }
    }
  }
  return out
}

/** 用孩子能读懂的话描述一个程序里发生的事（根据孩子自己的脚本生成，不是标准答案）。 */
export function describeProgram(program: Program): string {
  const lines: string[] = []
  const describe = (blocks: Block[], indent: string) => {
    for (const b of blocks) {
      if (b.t === 'move') lines.push(`${indent}将 x 坐标增加 ${b.dx}`)
      else {
        lines.push(`${indent}重复执行 ${b.times} 次`)
        describe(b.body, `${indent}　`)
      }
    }
  }
  for (const s of program.scripts) {
    lines.push(s.hat === 'flag' ? '当绿旗被点击' : '（没有接在绿旗下面的积木）')
    describe(s.body, '　')
  }
  return lines.join('\n')
}
