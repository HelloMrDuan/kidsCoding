// Pure helpers for the G2 restricted Blockly adapter. They read the learner's
// block stacks and turn them into Scratch VM parameter values; the sandbox
// re-validates everything again before touching the VM.
import type {G2BlockSpec, G2Slot, G2TargetSpec} from '@/content/curriculum/g2-u1-scratch-lessons'

export type G2Values = Record<string, number | string>
export type G2Program =
  | {kind: 'sprite'; values: G2Values}
  | {kind: 'stage-move'; x: number; y: number}
  | {kind: 'stage-costume'; costume: string}
  | {kind: 'stage-empty'}

export type BlockLike = {
  type: string
  getNextBlock: () => BlockLike | null
  getFieldValue: (name: string) => unknown
  getInputTargetBlock?: (name: string) => BlockLike | null
}
export type WorkspaceLike = { getTopBlocks: (ordered: boolean) => BlockLike[] }

export function checkSlotValue(slot: G2Slot, raw: unknown): number | string | null {
  if (slot.field === 'MESSAGE') {
    const text = String(raw ?? '')
    const max = slot.maxLength ?? 20
    if (text.length < 1 || text.length > max || /[\u0000-\u001f\u007f<>]/.test(text)) return null
    return text
  }
  if (slot.field === 'COSTUME' || slot.field === 'BACKDROP' || slot.field === 'SOUND_MENU' || slot.field === 'DIRECTION' || slot.field === 'BROADCAST_OPTION') {
    const name = String(raw ?? '')
    return slot.options?.includes(name) ? name : null
  }
  const value = Number(raw)
  if (slot.tenths) {
    if (!Number.isFinite(value) || Math.abs(value * 10 - Math.round(value * 10)) > 1e-9) return null
    if (slot.min !== undefined && value < slot.min - 1e-9) return null
    if (slot.max !== undefined && value > slot.max + 1e-9) return null
    return Math.round(value * 10) / 10
  }
  if (!Number.isInteger(value)) return null
  if (slot.min !== undefined && value < slot.min) return null
  if (slot.max !== undefined && value > slot.max) return null
  return value
}

function chainFrom(first: BlockLike | null): BlockLike[] {
  const out: BlockLike[] = []
  let current = first
  while (current && out.length < 20) {
    out.push(current)
    current = current.getNextBlock()
  }
  return out
}
function chain(top: BlockLike): BlockLike[] {
  return chainFrom(top.getNextBlock())
}

/** Match a block sequence against its spec (recursing into C-block children); collect slot values. */
function readSequence(blocks: BlockLike[], specs: G2BlockSpec[], values: G2Values): boolean {
  if (blocks.length !== specs.length) return false
  for (let i = 0; i < blocks.length; i += 1) {
    const spec = specs[i]
    const actual = blocks[i]
    if (actual.type !== spec.type) return false
    for (const slot of spec.slots) {
      const value = checkSlotValue(slot, actual.getFieldValue(slot.field))
      if (value === null) return false
      values[slot.key] = value
    }
    if (spec.children) {
      const inner = actual.getInputTargetBlock?.('DO') ?? null
      if (!readSequence(chainFrom(inner), spec.children, values)) return false
    }
  }
  return true
}

/**
 * Sprites: every hat of the target must appear exactly once with exactly its
 * body blocks in order. Stage: only a green-flag hat; a "go to x y" under it is
 * the deliberate error case, which the lab sends to the VM as a stage move.
 */
export function readG2Program(workspace: WorkspaceLike, target: G2TargetSpec): G2Program | null {
  const tops = workspace.getTopBlocks(false)
  // A stage without lesson scripts only hosts the "wrong object" error cases;
  // a stage with scripts (backdrops, sounds) is read like any sprite.
  if (target.kind === 'stage' && target.scripts.every(s => s.body.length === 0)) {
    if (tops.length !== 1 || tops[0].type !== 'kc2_flag') return null
    const body = chain(tops[0])
    if (body.length === 0) return {kind: 'stage-empty'}
    if (body.length !== 1) return null
    if (body[0].type === 'kc2_switch_costume') {
      const costume = String(body[0].getFieldValue('COSTUME') ?? '')
      return costume ? {kind: 'stage-costume', costume} : null
    }
    if (body[0].type !== 'kc2_goto') return null
    const x = Number(body[0].getFieldValue('X'))
    const y = Number(body[0].getFieldValue('Y'))
    if (!Number.isInteger(x) || !Number.isInteger(y)) return null
    return {kind: 'stage-move', x, y}
  }
  if (tops.length !== target.scripts.length) return null
  const values: G2Values = {}
  const usedHats = new Set<string>()
  for (const top of tops) {
    const script = target.scripts.find(s => s.hat === top.type)
    if (!script || usedHats.has(top.type)) return null
    usedHats.add(top.type)
    for (const slot of script.hatSlots ?? []) {
      const value = checkSlotValue(slot, top.getFieldValue(slot.field))
      if (value === null) return null
      values[slot.key] = value
    }
    if (!readSequence(chain(top), script.body, values)) return null
  }
  return {kind: 'sprite', values}
}

/** Only the values that differ from what the VM already runs. */
export function changedValues(next: G2Values, applied: G2Values): G2Values {
  const out: G2Values = {}
  for (const [key, value] of Object.entries(next)) if (String(applied[key]) !== String(value)) out[key] = value
  return out
}

export function valuesForTarget(all: G2Values, target: string): G2Values {
  const out: G2Values = {}
  for (const [key, value] of Object.entries(all)) if (key.startsWith(`${target}|`)) out[key] = value
  return out
}

/** Quick-edit fields that hold text or a menu choice; every other quick-edit field is a number. */
export const G2_TEXT_FIELDS = new Set(['MESSAGE', 'COSTUME', 'BACKDROP', 'SOUND_MENU', 'DIRECTION', 'BROADCAST_OPTION'])

/**
 * What a quick-edit box shows for one field, given what the learner typed (if they are editing it)
 * and the value Blockly actually stored. Blockly clamps and rounds number fields synchronously
 * (repeat 25 → 20, wait 0.25 → 0.3) but reports the change asynchronously; the box must show the
 * stored value in the same render as the keystroke, never later, or the late re-render rewrites the
 * box while the next edit is being typed and garbles it ("20" + "8" → "208", "0.3" + "0.5" → "0.305").
 * Text the learner typed is kept while it means the same number ("1.0", "0.50"), and an emptied
 * number box stays empty (Blockly keeps the last number) until the box loses focus.
 */
export function quickEditValue(typed: string | undefined, stored: string, numeric: boolean): string {
  if (typed === undefined) return stored
  if (!numeric) return typed === stored ? typed : stored
  if (typed.trim() === '') return typed
  return Number(typed) === Number(stored) ? typed : stored
}
