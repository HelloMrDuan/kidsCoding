/**
 * Shared workspace slot interfaces (OPS-020, three-engine extension).
 *
 * This module holds TYPE-ONLY shared contracts plus tiny pure helpers. It
 * contains no course business logic, no thresholds, no lesson copy, and no
 * judgment wording. Course adapters own their own rules; the shell only
 * displays what adapters return through these shapes.
 *
 * Rules the shell enforces for every engine:
 * - Adapters NEVER mount React content themselves. The shell owns mounting;
 *   adapters that need a React editor expose it as an EditorSlot component
 *   and the shell renders it. `createRoot` inside an adapter is forbidden.
 * - The generic judgment display shape never carries demo/course fields
 *   (no didMove / usedRepeat / x / score). Adapters that need those values
 *   keep them inside their own trace type and render their own conclusion.
 * - Judgment results are NEVER written into drafts. Drafts hold student
 *   work only; a restored draft is always re-judged before any pass is
 *   shown again.
 * - Save failure is never reported as success, and a restore prompt is
 *   never silently overwritten by an autosave success (see
 *   `shouldAutosavePreservePrompt`).
 */

import type { ComponentType } from 'react'

/** One structured hint level. Cumulative reveal: revealing level N shows 1..N. */
export interface StructuredHint {
  level: 1 | 2 | 3
  title: string
  text: string
}

/** One row of a generic judgment result, rendered by the shell. */
export interface JudgmentLayer {
  /** Stable id. Demo layers use 'stage' | 'task' | 'knowledge'. */
  id: string
  label: string
  passed: boolean
  detail: string
}

/**
 * Generic judgment result display shape. The conclusion wording belongs
 * entirely to the adapter that produced it; the shell must never write
 * "已掌握" or any other course conclusion on an adapter's behalf.
 */
export interface JudgmentResult {
  layers: JudgmentLayer[]
  passed: boolean
  conclusion: string
  /** Optional method evidence (e.g. summary checks), adapter-defined. */
  methodEvidence?: string
}

/** One frame of a generic run trace. `inLoop` marks loop-body frames. */
export interface RunFrame {
  frame: number
  /** True when this frame ran inside a loop body; false/undefined otherwise. */
  inLoop?: boolean
  event: string
}

/**
 * Generic run trace. Deliberately free of course fields: adapters that run
 * Scratch carry their own landing frame and frame events here, and adapters
 * that run Blockly map their own structure onto `inLoop`. No didMove,
 * usedRepeat, x, or score field exists on this type.
 */
export interface RunTrace {
  runId: number
  lessonId: string
  levelId?: string
  landingFrame?: number
  frames: RunFrame[]
}

/** Run session identity: the shell assigns an incrementing runId per run. */
export interface RunSession {
  runId: number
  fingerprint: string
  levelId?: string
}

/** Adapter-owned judgment: the shell displays, never computes, the result. */
export interface JudgmentAdapter {
  judge(trace: RunTrace, script: unknown): JudgmentResult
}

/** File operations an adapter actually supports. Absent = show (demo default). */
export interface FileCapabilities {
  canNew?: boolean
  canSave?: boolean
  canExport?: boolean
  canImport?: boolean
  canReset?: boolean
}

/** Props the shell passes to a React editor slot component. */
export interface EditorSlotProps {
  lessonId: string
  /** Draft or initial content, opaque to the shell. */
  initial: unknown
  /** Called on every edit with the slot's current data. */
  onChange: (data: unknown) => void
  /** Optional selection reporting (block id, text range, etc.). */
  onSelectionChange?: (selection: unknown) => void
  editable: boolean
}

export type EditorSlotComponent = ComponentType<EditorSlotProps>

/** Props the shell passes to a course-provided stage component. */
export interface StageSlotProps {
  lessonId: string
  /** Current engine state snapshot (x/score/running/frames), if any. */
  state: { x: number; score: number; running: boolean; frames?: number }
  running: boolean
}

export type StageSlotComponent = ComponentType<StageSlotProps>

/** Optional course-info extension: rendered ONLY inside the task drawer. */
export interface CourseInfoExtension {
  /** Teaching method steps, shown as an ordered list in the drawer. */
  methodSteps?: string[]
  /** Scope gap / applicability note, shown as a drawer note. */
  scopeGap?: string
  /** Course progress line, e.g. { label: '本单元进度', current: 2, total: 6 }. */
  progress?: { label: string; current: number; total: number }
  /** Three-layer teaching activities (level/title/text), all visible. */
  activities?: { level: 1 | 2 | 3; title: string; text: string }[]
}

/**
 * Stable fingerprint for a script value: JSON with object keys sorted, so
 * the same program always fingerprints identically regardless of key order.
 * Used to bind a judgment to the exact program it judged.
 */
export function stableFingerprint(script: unknown): string {
  const sort = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sort)
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        out[key] = sort((value as Record<string, unknown>)[key])
      }
      return out
    }
    return value
  }
  try {
    return JSON.stringify(sort(script)) ?? 'null'
  } catch {
    return 'unserializable'
  }
}

/** True when a displayed judgment still applies to the current program. */
export function judgmentAppliesTo(judgedFingerprint: string, currentFingerprint: string): boolean {
  return judgedFingerprint === currentFingerprint
}

/**
 * Autosave prompt rule (R4): an autosave success must NOT overwrite a
 * restore prompt. The restore confirmation stays visible until the next
 * explicit save; an autosave failure is urgent and always overwrites.
 */
export function shouldAutosavePreservePrompt(message: string | null): boolean {
  return message === '已恢复草稿'
}
