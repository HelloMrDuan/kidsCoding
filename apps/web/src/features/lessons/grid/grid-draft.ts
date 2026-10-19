import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { GRID_BLOCK_TYPES, GRID_MAX_ACTIONS } from './grid-engine'

export const GRID_DRAFT_PREFIX = 'kids-grid-lesson-v1:'
export const gridDraftKey = (lessonId: string) => GRID_DRAFT_PREFIX + lessonId

export type GridDraft = {
  stepIndex: number
  programs: Record<string, Array<{ type: string; disconnected?: boolean }>>
  /** Steps that really ran to the goal on this device. Editable in storage: not a trusted grade. */
  passed: string[]
  savedAt: string | null
}

const KNOWN = new Set<string>(['when_start', ...GRID_BLOCK_TYPES])

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
        const blocks = list.filter((b): b is { type: string; disconnected?: boolean } => !!b && typeof (b as { type?: unknown }).type === 'string' && KNOWN.has((b as { type: string }).type))
        programs[id] = blocks.map(b => (b.disconnected ? { type: b.type, disconnected: true } : { type: b.type }))
      }
    }
    const passed = Array.isArray(value.passed) ? (value.passed as unknown[]).filter((id): id is string => typeof id === 'string' && stepIds.includes(id)) : []
    const savedAt = typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt)) ? value.savedAt : null
    return { stepIndex, programs, passed: [...new Set(passed)], savedAt }
  } catch {
    return null
  }
}
