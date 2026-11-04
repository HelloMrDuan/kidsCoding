/**
 * EngineAdapter interface — WORKSPACE-API.md §2 (p0-kitten-workspace-v1.0).
 *
 * Every adapter implements the same surface so the shell never depends on which
 * engine is mounted. Adapters may add engine-specific extensions (e.g. Blockly
 * change listeners, Scratch project export), but the shell only relies on this
 * interface plus duck-typed optional extensions it probes for explicitly.
 *
 * Three-engine extensions (OPS-020, all optional, probed never required):
 * - `getSelectedBlockId` / `selectBlockById`: shell-owned selection tracking
 *   (see block-selection.ts). The shell never trusts Blockly's focus-fragile
 *   getSelected() directly.
 * - `validateDraft`: adapter-owned draft data validation, applied on
 *   restore. An invalid draft falls back to the initial script and never
 *   overwrites a good draft.
 * - `getFileCapabilities`: file operations the adapter actually supports.
 *   Unsupported operations are hidden, never rendered as fake buttons.
 * - `getJudgmentResult`: adapter-owned generic judgment (see
 *   workspace-slots.ts). When present, the shell displays it instead of the
 *   demo three-layer builder; the shell never invents a conclusion.
 */

import type { FileCapabilities, JudgmentResult } from './workspace-slots'

export type EngineState = {
  /** Stage x of the demo player character (0 = start). */
  x: number
  /** Caught/score count for the current run. Never accumulates across runs: run() resets first. */
  score: number
  running: boolean
  /** Frames already played in the current run (playback progress). */
  frames?: number
}

export type RunEvent = {
  kind: 'frame' | 'stopped' | 'finished'
  state: EngineState
}

/**
 * RunHandle concept: the live playback a run() started. stop() cancels pending
 * playback and pending events, keeps the script and the current stage state, and
 * never awards a score for an unfinished run. Adapters hold at most one live
 * handle; starting a new run replaces (and stops) the previous one.
 */
export type RunHandle = {
  stop: () => void
  readonly stopped: boolean
}

export type EngineAdapter = {
  mount: (el: HTMLElement) => void
  unmount: () => void
  loadScript: (script: unknown) => void
  getScript: () => unknown
  run: (onEvent: (e: RunEvent) => void) => void
  stop: () => void
  getState: () => EngineState
  /** Optional extensions, probed by the shell with `?.` — never required. */
  getSelectedBlockId?: () => string | null
  selectBlockById?: (id: string) => void
  validateDraft?: (script: unknown) => boolean
  getFileCapabilities?: () => FileCapabilities
  getJudgmentResult?: () => JudgmentResult | null
}
