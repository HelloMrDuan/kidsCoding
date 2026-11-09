/**
 * EngineAdapter interface — WORKSPACE-API.md §2 (p0-kitten-workspace-v1.0).
 *
 * Every adapter implements the same surface so the shell never depends on which
 * engine is mounted. Adapters may add engine-specific extensions (e.g. Blockly
 * change listeners, Scratch project export), but the shell only relies on this
 * interface plus duck-typed optional extensions it probes for explicitly.
 *
 * Engine extensions (OPS-020, all optional, probed never required):
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
 * - `getBlockCategories` / `selectCategory`: data-driven icon rail. The
 *   shell renders one icon per category and drives selection through the
 *   adapter; adapters without them get no rail and no fake categories.
 * - `getBlockInventory` / `insertBlock`: block search. The shell filters
 *   the adapter's own inventory and inserts through the adapter's real
 *   editor API; adapters without them get no search box.
 * - `zoomIn` / `zoomOut` / `zoomReset`: editor zoom. The shell renders
 *   zoom controls only when the adapter exposes them.
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

/** One block category, as exposed to the shell's icon rail. */
export interface BlockCategory {
  id: string
  label: string
  color: string
}

/** One block in an adapter's inventory, as exposed to the shell's search. */
export interface BlockInventoryItem {
  type: string
  label: string
  categoryId: string
}

/**
 * Independent run adapter (OPS-022, contract §2): lets a React editor-slot
 * course run without mounting an imperative adapter. The shell passes the
 * slot's current data (the same value save/judgment use) as `program`, so
 * a run can never execute a stale program while saving a newer one.
 * No DOM mount is involved; the shell owns the editor surface, the
 * adapter owns execution only. Plain EngineAdapter instances are NOT
 * accepted here: their run() reads their own editor, which a slot course
 * does not have.
 */
export type SlotRunAdapter = {
  /**
   * Execute the shell's current script data. Pure execution: never writes
   * drafts, never writes judgments, never touches shell state. At most
   * one live run; a new run replaces (and stops) the previous one.
   */
  runProgram: (program: unknown, onEvent: (e: RunEvent) => void) => void
  /** Synchronously cancel pending playback and pending events. */
  stop: () => void
  /** Same shape as EngineState. Must not throw (the shell keeps the last state on error). */
  getState: () => EngineState
  /**
   * OPS-028 (3d): optional draft validation, owned by the run adapter.
   * A SlotRunAdapter that owns independent program data may validate the
   * slot's stored/imported data; the shell consults it BEFORE the mounted
   * adapter (validation authority follows the real data owner), so a
   * mounted adapter that does not own the slot data can never veto a
   * draft the owner accepts. Absent = no validation (accept), same as
   * EngineAdapter.validateDraft. A throwing validator counts as invalid.
   */
  validateDraft?: (data: unknown) => boolean
  /** Adapter-owned judgment; absent = run state alone, never an invented conclusion. */
  getJudgmentResult?: () => JudgmentResult | null
  /** Course multi-object stage state, passed through untouched to the stageSlot. */
  getStageState?: () => Record<string, number | string | boolean>
  /** Error text only; absent = no extra error on stop. */
  getLastRunError?: () => string | null
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
  getBlockCategories?: () => BlockCategory[]
  /**
   * Select a category (toggles: selecting the active one deselects it).
   * Returns the newly selected category id, or null when nothing is
   * selected afterwards. Returns null when the id is unknown.
   */
  selectCategory?: (id: string) => string | null
  getBlockInventory?: () => BlockInventoryItem[]
  /** Insert one block through the adapter's real editor API. */
  insertBlock?: (type: string) => boolean
  zoomIn?: () => void
  zoomOut?: () => void
  zoomReset?: () => void
  /**
   * §9 extension (round 3): course-owned multi-object stage state, passed
   * through untouched to the stageSlot (see StageSlotProps.stageState).
   * Plain data only (numbers, strings, booleans). Absent = the adapter
   * has no extra stage objects; the shell renders run state only.
   */
  getStageState?: () => Record<string, number | string | boolean>
}
