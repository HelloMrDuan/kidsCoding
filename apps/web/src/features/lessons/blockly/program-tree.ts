/**
 * SYS-107: a lesson program is a list of blocks; a “重复 N 次” block carries its
 * own body (the blocks inside its mouth). Flat programs from older drafts have no
 * body field and keep working unchanged.
 *
 * Pure module (no Blockly import) so engines, drafts and tests share it.
 */
export type ProgramBlock = {
  type: string
  disconnected?: boolean
  /** TQ-008: preset line id chosen on a say block. */
  line?: string
  /** SYS-107: repeat count on a `repeat_times` block. */
  times?: number
  /** SYS-107: blocks inside a `repeat_times` block, in order. */
  body?: ProgramBlock[]
}

export const REPEAT_BLOCK = 'repeat_times'
/** Counts a child may pick on the repeat block (kept small for 5–7 year olds). */
export const REPEAT_TIMES_OPTIONS = [2, 3, 4, 5, 6, 8] as const
export const DEFAULT_REPEAT_TIMES = 2
/** A repeat inside a repeat is allowed once (two levels), never deeper. */
export const MAX_REPEAT_DEPTH = 2

export function isRepeat(block: ProgramBlock) {
  return block.type === REPEAT_BLOCK
}

export function repeatTimes(block: ProgramBlock) {
  const n = Number(block.times)
  return (REPEAT_TIMES_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_REPEAT_TIMES
}

/** Every block in the program, bodies included (for counting and allow-lists). */
export function walkProgram(blocks: ProgramBlock[], visit: (block: ProgramBlock, depth: number) => void, depth = 0) {
  for (const block of blocks) {
    visit(block, depth)
    if (block.body) walkProgram(block.body, visit, depth + 1)
  }
}

export function countBlocks(blocks: ProgramBlock[]) {
  let n = 0
  walkProgram(blocks, () => { n += 1 })
  return n
}

export function programDepth(blocks: ProgramBlock[]) {
  let max = 0
  walkProgram(blocks, (block, depth) => { if (isRepeat(block)) max = Math.max(max, depth + 1) })
  return max
}

export type ExpandedStep = {
  block: ProgramBlock
  /** Index of the top-level block this action came from (stage highlights it). */
  topIndex: number
  /** 1-based round of each enclosing repeat, outermost first (empty outside a repeat). */
  rounds: number[]
}

export type ExpandResult =
  | { ok: true; steps: ExpandedStep[] }
  | { ok: false; reason: 'empty_repeat' | 'too_deep' | 'too_many' }

/**
 * Unroll repeats into the actions that actually run. Stops early (too_many) once
 * the unrolled length passes `limit`, so a 8×8 loop cannot freeze the stage.
 */
export function expandProgram(blocks: ProgramBlock[], limit: number): ExpandResult {
  if (programDepth(blocks) > MAX_REPEAT_DEPTH) return { ok: false, reason: 'too_deep' }
  let empty = false
  walkProgram(blocks, block => { if (isRepeat(block) && !(block.body && block.body.length > 0)) empty = true })
  if (empty) return { ok: false, reason: 'empty_repeat' }
  const steps: ExpandedStep[] = []
  const visit = (list: ProgramBlock[], topIndex: number | null, rounds: number[]): boolean => {
    for (let i = 0; i < list.length; i++) {
      const block = list[i]
      const top = topIndex ?? i
      if (isRepeat(block)) {
        const n = repeatTimes(block)
        for (let r = 1; r <= n; r++) if (!visit(block.body ?? [], top, [...rounds, r])) return false
      } else {
        steps.push({ block, topIndex: top, rounds })
        if (steps.length > limit) return false
      }
    }
    return true
  }
  if (!visit(blocks, null, [])) return { ok: false, reason: 'too_many' }
  return { ok: true, steps }
}

/**
 * Parse a stored program defensively (local drafts are editable by anyone):
 * unknown blocks are dropped, repeat counts are clamped to the offered options,
 * bodies deeper than MAX_REPEAT_DEPTH are cut. Older flat drafts parse unchanged.
 */
export function sanitizeProgram(raw: unknown, known: ReadonlySet<string>, maxBlocks: number): ProgramBlock[] {
  let budget = maxBlocks
  const parse = (list: unknown, depth: number, top: boolean): ProgramBlock[] => {
    if (!Array.isArray(list)) return []
    const out: ProgramBlock[] = []
    for (const item of list) {
      if (budget <= 0) break
      const b = item as { type?: unknown; disconnected?: unknown; times?: unknown; body?: unknown }
      if (!b || typeof b.type !== 'string' || !known.has(b.type)) continue
      budget -= 1
      const block: ProgramBlock = { type: b.type }
      if (top && b.disconnected === true) block.disconnected = true
      if (b.type === REPEAT_BLOCK) {
        block.times = repeatTimes({ type: b.type, times: b.times as number })
        block.body = depth + 1 < MAX_REPEAT_DEPTH + 1 ? parse(b.body, depth + 1, false) : []
      }
      out.push(block)
    }
    return out
  }
  return parse(raw, 0, true)
}
