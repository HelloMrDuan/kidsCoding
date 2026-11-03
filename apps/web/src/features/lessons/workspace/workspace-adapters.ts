/**
 * EngineAdapter interface — WORKSPACE-API.md §2 (p0-kitten-workspace-v1.0).
 *
 * Every adapter implements the same surface so the shell never depends on which
 * engine is mounted. Adapters may add engine-specific extensions (e.g. Blockly
 * change listeners, Scratch project export), but the shell only relies on this
 * interface plus duck-typed optional extensions it probes for explicitly.
 */

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
}
