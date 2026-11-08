/**
 * Demo slot adapter (OPS-026 example adapter, NOT a formal slot course).
 *
 * The data owner for the demo-slot lesson: the adapter holds the slot's
 * checklist data and validates stored drafts strictly, exactly like
 * JsonAdapter does for A1-U3-L03. It mounts nothing — the shell never
 * calls mount() for a slot-engine course — and it runs nothing: run()
 * finishes immediately with zero state and the adapter reports no
 * judgment at all (no getJudgmentResult). The demo's own check result
 * lives inside DemoSlotEditor and is never reported to the shell's
 * feedback card, so nothing here can fabricate a pass.
 */

import type { EngineAdapter, EngineState } from './workspace-adapters'
import type { FileCapabilities } from './workspace-slots'

/** Demo-slot data: three checklist items. Strict shape, versioned. */
export type SlotDemoData = {
  version: 1
  items: [boolean, boolean, boolean]
}

export function emptySlotDemoData(): SlotDemoData {
  return { version: 1, items: [false, false, false] }
}

/** Strict shape check (no coercion): anything else is an invalid draft. */
export function isValidSlotDemoData(data: unknown): data is SlotDemoData {
  if (data === null || typeof data !== 'object') return false
  const d = data as Partial<SlotDemoData>
  if (d.version !== 1) return false
  if (!Array.isArray(d.items) || d.items.length !== 3) return false
  return d.items.every((item) => typeof item === 'boolean')
}

export class SlotDemoAdapter implements EngineAdapter {
  private data: SlotDemoData

  constructor(initial?: unknown) {
    this.data = isValidSlotDemoData(initial) ? initial : emptySlotDemoData()
  }

  mount(): void {
    // Slot courses mount no imperative adapter; the shell never calls this.
  }

  unmount(): void {
    // No mount side effect, nothing to clean up.
  }

  loadScript(script: unknown): void {
    // Invalid input is ignored, never coerced: the slot keeps its data.
    if (isValidSlotDemoData(script)) this.data = script
  }

  getScript(): unknown {
    return this.data
  }

  /**
   * Slot courses have no run target, so the shell never calls run().
   * Implemented only for interface completeness, mirroring JsonAdapter:
   * finishes immediately with zero state and no judgment.
   */
  run(onEvent: (event: { kind: 'finished'; state: EngineState }) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: nothing is playing to cancel.
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }

  /** Restore validation: strict shape; invalid drafts fall back to initial. */
  validateDraft(script: unknown): boolean {
    return isValidSlotDemoData(script)
  }

  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }
}
