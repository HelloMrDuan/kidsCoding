// 学生的倒计时脚本：数据模型、校验、指纹。
// 模型只描述 Scratch 积木本身，真正执行靠 compile.ts 生成的 Scratch 工程交给真实 Scratch VM。
// 概念边界：本课只有一个变量 timeLeft（课程提供）；没有随机数、没有克隆、没有碰撞（那是别的课）。

import { L05_PARAMS } from './params'

/** 将 timeLeft 设为 value。 */
export type SetTimeBlock = { t: 'setTime'; value: number }
/** 等待 secs 秒。 */
export type WaitBlock = { t: 'wait'; secs: number }
/** 将 timeLeft 增加 -by（界面上写“减少 by”）。 */
export type DecreaseBlock = { t: 'decrease'; by: number }
/** 广播“游戏结束”。 */
export type BroadcastBlock = { t: 'broadcast' }
export type LeafBlock = WaitBlock | DecreaseBlock
/** 重复执行直到〈timeLeft < 1〉{ body }。条件固定为“timeLeft 小于 1”。 */
export type UntilZeroBlock = { t: 'untilZero'; body: LeafBlock[] }
/** 重复执行 times 次 { body }。 */
export type RepeatBlock = { t: 'repeat'; times: number; body: LeafBlock[] }
export type Block = SetTimeBlock | UntilZeroBlock | RepeatBlock | BroadcastBlock | LeafBlock

/** hat 为 null 表示没有接在“当绿旗被点击”下面的散积木：Scratch 不会运行它。 */
export type Script = { hat: 'flag' | null; body: Block[] }
export type Program = { scripts: Script[] }

export const EMPTY_PROGRAM: Program = { scripts: [] }

export function countBlocks(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + 1 + (b.t === 'untilZero' || b.t === 'repeat' ? countBlocks(b.body) : 0), 0)
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)
const inRange = (n: unknown, min: number, max: number) => isInt(n) && n >= min && n <= max

type Slot = 'top' | 'loop'

function checkBlocks(blocks: unknown, errors: string[], path: string, slot: Slot): void {
  if (!Array.isArray(blocks)) {
    errors.push(`${path} 不是积木列表`)
    return
  }
  blocks.forEach((raw, i) => {
    const at = `${path}[${i}]`
    const b = raw as { t?: unknown; [k: string]: unknown } | null
    if (!b || typeof b !== 'object') {
      errors.push(`${at} 不是积木`)
      return
    }
    switch (b.t) {
      case 'wait':
        if (!inRange(b.secs, L05_PARAMS.minWait, L05_PARAMS.maxWait)) errors.push(`${at} 的等待秒数必须是 ${L05_PARAMS.minWait}～${L05_PARAMS.maxWait} 的整数`)
        break
      case 'decrease':
        if (!inRange(b.by, L05_PARAMS.minDecrease, L05_PARAMS.maxDecrease)) errors.push(`${at} 的减少量必须是 ${L05_PARAMS.minDecrease}～${L05_PARAMS.maxDecrease} 的整数`)
        break
      case 'setTime':
        if (slot !== 'top') errors.push(`${at} “将 timeLeft 设为”只能放在最外层`)
        if (!inRange(b.value, L05_PARAMS.minStart, L05_PARAMS.maxStart)) errors.push(`${at} 的起始秒数必须是 ${L05_PARAMS.minStart}～${L05_PARAMS.maxStart} 的整数`)
        break
      case 'broadcast':
        if (slot !== 'top') errors.push(`${at} “广播”只能放在最外层`)
        break
      case 'untilZero':
      case 'repeat':
        if (slot !== 'top') errors.push(`${at} “重复执行”只能放在最外层`)
        if (b.t === 'repeat' && !inRange(b.times, L05_PARAMS.minRepeatTimes, L05_PARAMS.maxRepeatTimes)) {
          errors.push(`${at} 的重复次数必须是 ${L05_PARAMS.minRepeatTimes}～${L05_PARAMS.maxRepeatTimes} 的整数`)
        }
        checkBlocks(b.body, errors, `${at}.body`, 'loop')
        break
      default:
        errors.push(`${at} 的积木类型不在本课范围内`)
    }
  })
}

/** 返回问题列表；空列表表示程序合法。用于编辑器、草稿恢复和送进沙箱之前。 */
export function validateProgram(program: unknown): string[] {
  const errors: string[] = []
  const p = program as Partial<Program> | null
  if (!p || typeof p !== 'object' || !Array.isArray(p.scripts)) return ['程序格式不对']
  if (p.scripts.length > L05_PARAMS.maxScripts) errors.push(`最多 ${L05_PARAMS.maxScripts} 条脚本`)
  let total = 0
  p.scripts.forEach((script, i) => {
    const s = script as Partial<Script> | null
    if (!s || typeof s !== 'object' || (s.hat !== 'flag' && s.hat !== null)) {
      errors.push(`scripts[${i}] 的开头积木不对`)
      return
    }
    const before = errors.length
    checkBlocks(s.body, errors, `scripts[${i}].body`, 'top')
    // 结构有问题时不再数积木：countBlocks 假定每一块都是合法对象
    if (errors.length === before && Array.isArray(s.body)) total += countBlocks(s.body as Block[])
  })
  if (total > L05_PARAMS.maxBlocks) errors.push(`积木最多 ${L05_PARAMS.maxBlocks} 块`)
  return errors
}

/** 会运行的脚本：只有接在“当绿旗被点击”下面的才会被 Scratch 执行。 */
export function runnableScripts(program: Program): Script[] {
  return program.scripts.filter(s => s.hat === 'flag')
}

/** 程序指纹：整个程序（含散落积木）的稳定文本。任何编辑都会改变它；不用于判断“行为是否相同”。 */
export function programFingerprint(program: Program): string {
  return JSON.stringify(program)
}
