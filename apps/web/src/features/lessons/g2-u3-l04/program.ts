// 学生的球脚本：数据模型、校验、指纹。
// 模型只描述 Scratch 积木本身（绿旗、重复执行、如果〈碰到 篮子？〉、将 得分 增加、隐藏），
// 真正执行靠 compile.ts 生成的 Scratch 工程交给真实 Scratch VM（带真实渲染器）。

import { L04_PARAMS } from './params'

/** 将“得分”增加 by。 */
export type ScoreBlock = { t: 'score'; by: number }
/** 隐藏当前角色（球）。 */
export type HideBlock = { t: 'hide' }
/** 如果〈碰到 篮子？〉那么 { body }。条件固定为“碰到篮子”；body 里只能放叶子积木。 */
export type IfTouchBlock = { t: 'iftouch'; body: LeafBlock[] }
export type RepeatBlock = { t: 'repeat'; times: number; body: Array<LeafBlock | IfTouchBlock> }
export type LeafBlock = ScoreBlock | HideBlock
export type Block = LeafBlock | IfTouchBlock | RepeatBlock

/** hat 为 null 表示没有接在“当绿旗被点击”下面的散积木：Scratch 不会运行它。 */
export type Script = { hat: 'flag' | null; body: Block[] }
export type Program = { scripts: Script[] }

export const EMPTY_PROGRAM: Program = { scripts: [] }

export function countBlocks(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + 1 + (b.t === 'repeat' || b.t === 'iftouch' ? countBlocks(b.body as Block[]) : 0), 0)
}

function nestingOf(blocks: Block[]): number {
  return blocks.reduce((max, b) => Math.max(max, b.t === 'repeat' || b.t === 'iftouch' ? 1 + nestingOf(b.body as Block[]) : 0), 0)
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

/** 一个位置允许放哪些积木：顶层和重复里可以放全部可放的；如果里只放叶子；重复里不能再放重复。 */
type Slot = 'top' | 'repeat' | 'iftouch'

function checkBlocks(blocks: unknown, errors: string[], path: string, slot: Slot): void {
  if (!Array.isArray(blocks)) {
    errors.push(`${path} 不是积木列表`)
    return
  }
  blocks.forEach((raw, i) => {
    const at = `${path}[${i}]`
    const b = raw as Partial<Block> | null
    if (!b || typeof b !== 'object') {
      errors.push(`${at} 不是积木`)
    } else if (b.t === 'score') {
      const by = (b as ScoreBlock).by
      if (!isInt(by) || by < L04_PARAMS.minScoreStep || by > L04_PARAMS.maxScoreStep) {
        errors.push(`${at} 的得分增量必须是 ${L04_PARAMS.minScoreStep}～${L04_PARAMS.maxScoreStep} 的整数`)
      }
    } else if (b.t === 'hide') {
      // 没有参数，无需检查
    } else if (b.t === 'iftouch') {
      if (slot === 'iftouch') errors.push(`${at} “如果”里面不能再放“如果”`)
      checkBlocks((b as IfTouchBlock).body, errors, `${at}.body`, 'iftouch')
    } else if (b.t === 'repeat') {
      if (slot !== 'top') errors.push(`${at} “重复执行”只能放在最外层`)
      const times = (b as RepeatBlock).times
      if (!isInt(times) || times < L04_PARAMS.minRepeatTimes || times > L04_PARAMS.maxRepeatTimes) {
        errors.push(`${at} 的重复次数必须是 ${L04_PARAMS.minRepeatTimes}～${L04_PARAMS.maxRepeatTimes} 的整数`)
      }
      checkBlocks((b as RepeatBlock).body, errors, `${at}.body`, 'repeat')
    } else {
      errors.push(`${at} 的积木类型不在本课范围内`)
    }
  })
}

/** 返回问题列表；空列表表示程序合法。用于编辑器、草稿恢复和送进沙箱之前。 */
export function validateProgram(program: unknown): string[] {
  const errors: string[] = []
  const p = program as Partial<Program> | null
  if (!p || typeof p !== 'object' || !Array.isArray(p.scripts)) return ['程序格式不对']
  if (p.scripts.length > L04_PARAMS.maxScripts) errors.push(`最多 ${L04_PARAMS.maxScripts} 条脚本`)
  let total = 0
  p.scripts.forEach((script, i) => {
    const s = script as Partial<Script> | null
    if (!s || typeof s !== 'object' || (s.hat !== 'flag' && s.hat !== null)) {
      errors.push(`scripts[${i}] 的开头积木不对`)
      return
    }
    checkBlocks(s.body, errors, `scripts[${i}].body`, 'top')
    if (Array.isArray(s.body)) {
      total += countBlocks(s.body as Block[])
      if (nestingOf(s.body as Block[]) > L04_PARAMS.maxNesting) errors.push(`嵌套不能超过 ${L04_PARAMS.maxNesting} 层`)
    }
  })
  if (total > L04_PARAMS.maxBlocks) errors.push(`积木最多 ${L04_PARAMS.maxBlocks} 块`)
  return errors
}

/** 会运行的脚本：只有接在“当绿旗被点击”下面的才会被 Scratch 执行，散落的积木不会运行。 */
export function runnableScripts(program: Program): Script[] {
  return program.scripts.filter(s => s.hat === 'flag')
}

/**
 * 程序指纹：整个程序（含散落积木）的稳定文本。任何编辑都会改变它，从严处理：
 * 宁可让旧判定失效，也不让旧判定留在已改过的程序上。不用于判断“行为是否相同”。
 */
export function programFingerprint(program: Program): string {
  return JSON.stringify(program)
}
