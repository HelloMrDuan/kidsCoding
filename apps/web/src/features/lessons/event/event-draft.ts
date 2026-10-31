import type { EventLesson } from '@/content/curriculum/g0-u2-event-lessons'
import { REPEAT_BLOCK, repeatTimes } from '../blockly/program-tree'
import type { EventActorId, EventBlock, EventFailure } from './event-engine'

/** What the event lab keeps on this device (no names, nothing uploaded). */
export type EventDraft = {
  stepIndex: number
  /** stepId → character → its script. */
  programs: Record<string, Partial<Record<EventActorId, EventBlock[]>>>
  passed: string[]
  /** Error-lab steps whose planned mistake the child really ran and saw. */
  observed?: string[]
  mistakes?: EventFailure[]
  /** creative stepId → the character the child picked. */
  creative?: Record<string, { target: string }>
  reflection?: number
  savedAt: string | null
}

export const eventDraftKey = (lessonId: string) => `kids-event-lesson-v1:${lessonId}`

const FAILURES: EventFailure[] = ['no_hat', 'hat_not_on_top', 'disconnected', 'unknown_block', 'cannot_do', 'loop', 'too_early', 'nothing_happened', 'wrong_actor', 'wrong_order', 'missing_effect', 'extra_effect', 'wrong_trigger', 'empty_repeat', 'out_of_sync', 'left_glowing']

/** Keeps allowed blocks only; a repeat keeps an allowed, flat body and a count from the options (G0-U3-L04). */
function cleanBlocks(list: unknown[], allowed: string[], depth: number): EventBlock[] {
  return list
    .filter((b): b is EventBlock => !!b && typeof b === 'object' && typeof (b as EventBlock).type === 'string' && allowed.includes((b as EventBlock).type))
    .filter(b => depth === 0 || b.type !== REPEAT_BLOCK)
    .map(b => {
      const base: EventBlock = b.disconnected ? { type: b.type, disconnected: true } : { type: b.type }
      if (b.type !== REPEAT_BLOCK) return base
      return { ...base, times: repeatTimes(b), body: Array.isArray(b.body) ? cleanBlocks(b.body.slice(0, 12), allowed, depth + 1) : [] }
    })
}

/** Reads a saved draft defensively: unknown steps, characters, blocks, picks and forged passes are dropped. */
export function parseEventDraft(lesson: EventLesson, raw: string | null): EventDraft | null {
  if (!raw) return null
  let data: unknown
  try { data = JSON.parse(raw) } catch { return null }
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const steps = new Map(lesson.steps.map(s => [s.id, s]))
  const programs: EventDraft['programs'] = {}
  if (d.programs && typeof d.programs === 'object') {
    for (const [stepId, perActor] of Object.entries(d.programs as Record<string, unknown>)) {
      const step = steps.get(stepId)
      if (!step || !perActor || typeof perActor !== 'object') continue
      const kept: Partial<Record<EventActorId, EventBlock[]>> = {}
      for (const [actor, list] of Object.entries(perActor as Record<string, unknown>)) {
        if (!step.editable.includes(actor as EventActorId) || !Array.isArray(list)) continue
        kept[actor as EventActorId] = cleanBlocks(list, step.allowedBlocks, 0)
      }
      programs[stepId] = kept
    }
  }
  const creative: NonNullable<EventDraft['creative']> = {}
  if (d.creative && typeof d.creative === 'object') {
    for (const [stepId, pick] of Object.entries(d.creative as Record<string, unknown>)) {
      const target = (pick as { target?: unknown })?.target
      const step = steps.get(stepId)
      if (step?.creative && typeof target === 'string' && step.creative.choices.includes(target)) creative[stepId] = { target }
    }
  }
  const observed = Array.isArray(d.observed) ? d.observed.filter((id): id is string => typeof id === 'string' && !!steps.get(id)?.errorLab) : []
  // A pass counts only for a known step, an error lab the child really observed, and a creative step with a valid pick.
  const passed = Array.isArray(d.passed)
    ? [...new Set(d.passed.filter((id): id is string => typeof id === 'string' && steps.has(id)
      && (!steps.get(id)!.errorLab || observed.includes(id))
      && (!steps.get(id)!.creative || !!creative[id])))]
    : []
  const mistakes = Array.isArray(d.mistakes) ? [...new Set(d.mistakes.filter((m): m is EventFailure => FAILURES.includes(m as EventFailure)))] : []
  const stepIndex = typeof d.stepIndex === 'number' && Number.isInteger(d.stepIndex) ? Math.max(0, Math.min(d.stepIndex, lesson.steps.length - 1)) : 0
  const reflection = typeof d.reflection === 'number' && d.reflection >= 0 && d.reflection < lesson.reflectionCheck.options.length ? d.reflection : undefined
  return {
    stepIndex,
    programs,
    passed,
    observed,
    mistakes,
    creative,
    ...(reflection === undefined ? {} : { reflection }),
    savedAt: typeof d.savedAt === 'string' ? d.savedAt : null,
  }
}
