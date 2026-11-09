// 通过本关之后才出现的“你的做法 / 别的做法”。
// 完整参考做法属于“事后节点”（LESSON-CONTRACT / DESIGN §四）：学生在没有通过本关之前，
// 界面不得调用或渲染本模块的输出。这里按真实判定条件枚举，不是一份写死的标准答案。

import { allowedWidth, L03_PARAMS, type LevelParams } from './params'
import type { Block, Program } from './program'

export type Alternative = { from: number; to: number }

/**
 * 枚举合法的“上下界”：都在本关要求范围内，宽度不小于要求宽度的一半（minSpreadShare）。
 * 第一个是最宽的（正好等于要求范围），后面依次从两边各收窄一点，最多 limit 个。
 */
export function alternativeBounds(level: LevelParams, limit = 4): Alternative[] {
  const minSpread = Math.ceil(allowedWidth(level) * L03_PARAMS.minSpreadShare)
  const out: Alternative[] = []
  const step = Math.max(1, Math.floor(allowedWidth(level) / 12))
  for (let shrink = 0; out.length < limit; shrink += step) {
    const from = level.allowedMin + shrink
    const to = level.allowedMax - shrink
    if (to - from < minSpread) break
    out.push({ from, to })
  }
  return out
}

function describeBlock(block: Block, depth: number): string[] {
  const pad = '  '.repeat(depth)
  if (block.t === 'randomx') return [`${pad}将 x 设为（在 ${block.from} 到 ${block.to} 之间取随机数）`]
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
