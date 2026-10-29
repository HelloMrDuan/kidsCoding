import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { REPEAT_BLOCK, sanitizeProgram, type ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { GRID_BLOCK_TYPES, GRID_MAX_ACTIONS, type Cell, type GridFailure } from './grid-engine'

export const GRID_DRAFT_PREFIX = 'kids-grid-lesson-v1:'
export const gridDraftKey = (lessonId: string) => GRID_DRAFT_PREFIX + lessonId

export type GridDraft = {
  stepIndex: number
  programs: Record<string, ProgramBlock[]>
  /** Steps that really ran to the goal on this device. Editable in storage: not a trusted grade. */
  passed: string[]
  savedAt: string | null
  /** EDU-105: index of the reflection option the child tapped. */
  reflection?: number
  /** error-lab steps where the child ran the planned mistake and saw the expected failure. */
  observed?: string[]
  /** creative steps: the cell the child moved the goal to. */
  creative?: Record<string, { goal: Cell }>
  /** Distinct engine failures the child really met in this lesson (for 复盘). */
  mistakes?: GridFailure[]
}

const FAILURES = new Set<string>(['no_start', 'disconnected', 'empty_repeat', 'too_deep', 'unknown_block', 'too_many', 'out_of_bounds', 'hit_rock', 'fell_in_water', 'door_locked', 'no_key_here', 'not_at_door', 'need_key', 'not_at_goal'])

const KNOWN = new Set<string>(['when_start', REPEAT_BLOCK, ...GRID_BLOCK_TYPES])

/** Parse a saved draft defensively; anything malformed is dropped, never trusted. */
export function parseGridDraft(lesson: GridLesson, raw: string | null): GridDraft | null {
  if (!raw || raw.length > 20000) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (!value || typeof value !== 'object') return null
    const stepIds = lesson.steps.map(s => s.id)
    const stepIndex = Number.isInteger(value.stepIndex) ? Math.max(0, Math.min(stepIds.length - 1, value.stepIndex as number)) : 0
    const programs: GridDraft['programs'] = {}
    if (value.programs && typeof value.programs === 'object') {
      for (const [id, list] of Object.entries(value.programs as Record<string, unknown>)) {
        if (!stepIds.includes(id) || !Array.isArray(list) || list.length > GRID_MAX_ACTIONS + 1) continue
        // SYS-107: programs may nest blocks inside “重复 N 次”.
        programs[id] = sanitizeProgram(list, KNOWN, GRID_MAX_ACTIONS + 1)
      }
    }
    const passed = Array.isArray(value.passed) ? (value.passed as unknown[]).filter((id): id is string => typeof id === 'string' && stepIds.includes(id)) : []
    const savedAt = typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt)) ? value.savedAt : null
    const options = lesson.reflectionCheck?.options.length ?? 0
    const reflection = Number.isInteger(value.reflection) && (value.reflection as number) >= 0 && (value.reflection as number) < options ? (value.reflection as number) : undefined
    const errorLabIds = lesson.steps.filter(s => s.kind === 'error-lab').map(s => s.id)
    const observed = Array.isArray(value.observed) ? [...new Set((value.observed as unknown[]).filter((id): id is string => typeof id === 'string' && errorLabIds.includes(id)))] : []
    const creative: NonNullable<GridDraft['creative']> = {}
    if (value.creative && typeof value.creative === 'object') {
      for (const step of lesson.steps) {
        const entry = (value.creative as Record<string, unknown>)[step.id] as { goal?: { x?: unknown; y?: unknown } } | undefined
        const goal = entry?.goal
        if (!step.creative || !goal) continue
        const match = step.creative.goalChoices.find(c => c.x === goal.x && c.y === goal.y)
        if (match) creative[step.id] = { goal: { x: match.x, y: match.y } }
      }
    }
    const mistakes = Array.isArray(value.mistakes) ? [...new Set((value.mistakes as unknown[]).filter((m): m is GridFailure => typeof m === 'string' && FAILURES.has(m)))] : []
    // A passed creative step without its chosen goal can't be replayed: don't trust it.
    const trusted = [...new Set(passed)].filter(id => !lesson.steps.find(s => s.id === id)?.creative || creative[id])
    return {
      stepIndex, programs, passed: trusted, savedAt,
      ...(reflection === undefined ? {} : { reflection }),
      ...(observed.length ? { observed } : {}),
      ...(Object.keys(creative).length ? { creative } : {}),
      ...(mistakes.length ? { mistakes } : {}),
    }
  } catch {
    return null
  }
}
