import { quoteBlock } from '../blockly/block-labels'
import type { ProgramBlock } from '../blockly/observable-run'

/**
 * TQ-015: the single source of truth for duo-lesson verdicts (lessons 10–12).
 * Pure simulation of the exact program the child built — the executor animates
 * the same blocks, but every pass/fail decision and every failure reason comes
 * from here, written as short sentences a 5–7 year old can read.
 */
export type DuoMode = 'independent' | 'dialogue' | 'graduation'

export type DuoFailureCode =
  | 'not-connected'
  | 'no-start'
  | 'switch-twice'
  | 'switch-early'
  | 'repeat-misplaced'
  | 'say-not-now'
  | 'say-wrong-actor'
  | 'say-missing'
  | 'unsupported'
  | 'no-switch'
  | 'wrong-actor'
  | 'wrong-distance'

export interface DuoVerdict {
  passed: boolean
  code: DuoFailureCode | null
  /** Kid-short failure sentence; null when passed. */
  reason: string | null
  /** Index into `blocks` where the run stops, or null for pre-run/final checks. */
  failIndex: number | null
  fox: number
  bear: number
  foxMessage: string | null
  bearMessage: string | null
  switched: boolean
}

const BEAR_LINE = '我们一起出发吧！'

export function judgeDuoProgram(blocks: ProgramBlock[], mode: DuoMode, stepIndex: number): DuoVerdict {
  let fox = 0
  let bear = 0
  let foxMessage: string | null = null
  let bearMessage: string | null = null
  let switched = false

  const state = () => ({ fox, bear, foxMessage, bearMessage, switched })
  const fail = (code: DuoFailureCode, reason: string, failIndex: number | null): DuoVerdict => ({
    passed: false, code, reason, failIndex, ...state(),
  })

  if (blocks[0]?.type !== 'when_start') {
    return fail('no-start', '先放好“开始时”，朋友才出发。', null)
  }
  if (blocks.some((block) => block.disconnected)) {
    return fail('not-connected', '有积木没接好，先连成一条再运行。', null)
  }

  let actor: 'main' | 'partner' = 'main'
  for (let i = 1; i < blocks.length; i++) {
    const type = blocks[i].type
    if (type === 'move_right') {
      if (actor === 'main') fox += 100
      else bear += 100
    } else if (type === 'switch_character') {
      if (actor === 'partner') {
        return fail('switch-twice', '已经切换过啦，重复切换没有用。', i)
      }
      if (fox !== 100) {
        return fail('switch-early', '先让小狐狸走 100 步，再切换。', i)
      }
      actor = 'partner'
      switched = true
    } else if (type === 'repeat_twice' && mode === 'graduation') {
      if (blocks[i - 1]?.type !== 'move_right') {
        return fail('repeat-misplaced', `${quoteBlock('repeat_twice')}要跟在移动后面。`, i)
      }
      if (actor === 'main') fox += 100
      else bear += 100
    } else if (type === 'say_line') {
      if (mode === 'dialogue') {
        if (actor === 'main') foxMessage = '你好！'
        else bearMessage = BEAR_LINE
      } else if (mode === 'graduation' && stepIndex === 4) {
        if (actor === 'main') foxMessage = '你好！'
        else bearMessage = '找到礼物啦！'
      } else if (mode === 'independent' && stepIndex === 4 && actor === 'main') {
        foxMessage = '你好！'
      } else if (stepIndex === 4) {
        return fail('say-wrong-actor', '问候是小狐狸的，放在切换之前。', i)
      } else {
        return fail('say-not-now', '这一关先不用说话积木。', i)
      }
    } else {
      return fail('unsupported', '这块积木这一课用不到。', i)
    }
  }

  const expectedFox = stepIndex === 0 ? 0 : 100
  const expectedBear = mode === 'graduation'
    ? (stepIndex < 2 ? 0 : 200)
    : mode === 'dialogue'
      ? (stepIndex === 0 ? 0 : 100)
      : (stepIndex < 2 ? 0 : 100)

  if (fox !== expectedFox || bear !== expectedBear) {
    if (!switched && bear === 0 && expectedBear > 0) {
      return fail('no-switch', '还没切换角色，小熊还没动。', null)
    }
    if (switched && bear === 0 && expectedBear > 0) {
      return fail('wrong-actor', '动错角色啦，切换后要让小熊走。', null)
    }
    if (fox !== expectedFox) {
      return fail('wrong-distance', fox > expectedFox ? '小狐狸走多了，距离不对。' : '小狐狸还没走到，距离不对。', null)
    }
    return fail(
      'wrong-distance',
      bear > expectedBear
        ? '小熊走多了，距离不对。'
        : mode === 'graduation'
          ? '小熊要走到 200 步，还差 100 步。'
          : '小熊还没走到，距离不对。',
      null,
    )
  }

  if (mode === 'dialogue') {
    if (stepIndex < 2 && (foxMessage !== null || bearMessage !== null)) {
      return fail('say-not-now', '这一关先不用说话积木。', null)
    }
    if (foxMessage !== null && stepIndex >= 2 && stepIndex < 4) {
      return fail('say-wrong-actor', '对白给错人啦，这句要小熊说。', null)
    }
    if (stepIndex >= 2 && bearMessage !== BEAR_LINE) {
      return fail('say-missing', '小熊还没说出发对白。', null)
    }
  }

  return { passed: true, code: null, reason: null, failIndex: null, ...state() }
}

/**
 * TQ-015: the step-4 (index 3) designed mistake of each duo lesson — the run the
 * child is told to make on purpose and observe. It matches the stage's own
 * observation condition, so that run is the experiment, not a failed attempt.
 */
export function isDuoDesignedMistakeRun(verdict: DuoVerdict, mode: DuoMode): boolean {
  if (verdict.passed) return false
  if (mode === 'graduation') return verdict.fox === 100 && verdict.bear === 100
  if (mode === 'dialogue') {
    return verdict.foxMessage === '你好！' && verdict.bearMessage === null && verdict.fox === 100 && verdict.bear === 100
  }
  return verdict.fox === 200 && verdict.bear === 0
}
