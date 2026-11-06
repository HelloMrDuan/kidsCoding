// 学生的篮子脚本：数据模型、校验、指纹、草稿序列化。
// 模型只描述 Scratch 积木本身（绿旗帽子、将 x 坐标增加、重复执行），
// 真正执行靠 compile.ts 生成的 Scratch 工程交给真实 Scratch VM。

import { L02_PARAMS } from './params'

export type MoveBlock = { t: 'move'; dx: number }
export type RepeatBlock = { t: 'repeat'; times: number; body: Block[] }
export type Block = MoveBlock | RepeatBlock

/** hat 为 null 表示没有接在“当绿旗被点击”下面的散积木：Scratch 不会运行它。 */
export type Script = { hat: 'flag' | null; body: Block[] }
export type Program = { scripts: Script[] }

export const EMPTY_PROGRAM: Program = { scripts: [] }

export function countBlocks(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + 1 + (b.t === 'repeat' ? countBlocks(b.body) : 0), 0)
}

function nestingOf(blocks: Block[]): number {
  return blocks.reduce((max, b) => Math.max(max, b.t === 'repeat' ? 1 + nestingOf(b.body) : 0), 0)
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

function checkBlocks(blocks: unknown, errors: string[], path: string): void {
  if (!Array.isArray(blocks)) {
    errors.push(`${path} 不是积木列表`)
    return
  }
  blocks.forEach((raw, i) => {
    const at = `${path}[${i}]`
    const b = raw as Partial<Block> | null
    if (!b || typeof b !== 'object') {
      errors.push(`${at} 不是积木`)
    } else if (b.t === 'move') {
      const dx = (b as MoveBlock).dx
      if (!isInt(dx) || dx < L02_PARAMS.minMoveDx || dx > L02_PARAMS.maxMoveDx) {
        errors.push(`${at} 的 x 增加量必须是 ${L02_PARAMS.minMoveDx}～${L02_PARAMS.maxMoveDx} 的整数`)
      }
    } else if (b.t === 'repeat') {
      const times = (b as RepeatBlock).times
      if (!isInt(times) || times < L02_PARAMS.minRepeatTimes || times > L02_PARAMS.maxRepeatTimes) {
        errors.push(`${at} 的重复次数必须是 ${L02_PARAMS.minRepeatTimes}～${L02_PARAMS.maxRepeatTimes} 的整数`)
      }
      checkBlocks((b as RepeatBlock).body, errors, `${at}.body`)
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
  if (p.scripts.length > L02_PARAMS.maxScripts) errors.push(`最多 ${L02_PARAMS.maxScripts} 条脚本`)
  let total = 0
  p.scripts.forEach((script, i) => {
    const s = script as Partial<Script> | null
    if (!s || typeof s !== 'object' || (s.hat !== 'flag' && s.hat !== null)) {
      errors.push(`scripts[${i}] 的开头积木不对`)
      return
    }
    checkBlocks(s.body, errors, `scripts[${i}].body`)
    if (Array.isArray(s.body)) {
      total += countBlocks(s.body as Block[])
      if (nestingOf(s.body as Block[]) > L02_PARAMS.maxNesting) errors.push(`重复嵌套不能超过 ${L02_PARAMS.maxNesting} 层`)
    }
  })
  if (total > L02_PARAMS.maxBlocks) errors.push(`积木最多 ${L02_PARAMS.maxBlocks} 块`)
  return errors
}

/** 会运行的脚本：只有接在“当绿旗被点击”下面的才会被 Scratch 执行，散落的积木不会运行。 */
export function runnableScripts(program: Program): Script[] {
  return program.scripts.filter(s => s.hat === 'flag')
}

/**
 * 程序指纹：整个程序（含散落积木）的稳定文本。
 * 任何编辑（包括移动散积木）都会改变它，从严处理：宁可让旧判定失效，也不让旧判定留在已改过的程序上。
 * 不用于判断“行为是否相同”。
 */
export function programFingerprint(program: Program): string {
  return JSON.stringify(program)
}
