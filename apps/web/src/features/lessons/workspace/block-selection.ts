/**
 * Blockly selection tracking (R1).
 *
 * Blockly 12's own `getSelected()` is focus-fragile: clicking shell toolbar
 * buttons can make it return null even though the user never deselected
 * anything, so shell controls (number edit, move up/down, delete) would
 * silently act on nothing. The shell therefore keeps its OWN selection id,
 * updated only by explicit Blockly selection events:
 *
 * - `selected` with a non-empty new id: select it, but only if the block
 *   still exists in the workspace (a stale id is never trusted).
 * - `selected` with a null/empty id: KEEP the current selection. A null
 *   selected event is usually just focus loss, not a user deselect.
 * - `click` on the workspace background: the user explicitly clicked empty
 *   canvas, so CLEAR the selection. This rule wins over a neighbouring
 *   null-selected event regardless of which fires first: the blank-click
 *   flag is consumed by the next null-selected event, and a blank click
 *   after a null-selected event clears directly.
 * - `click` on a block: select that block, if it exists.
 * - The tracked block disappearing from the workspace clears the selection
 *   (checked by the adapter whenever it reads the tracked id).
 *
 * This module is pure and fully unit-tested; the adapter only feeds it
 * events and an `exists` predicate. It never touches Blockly directly, so
 * it runs in jsdom without SVG APIs.
 */

export type SelectionEvent =
  | { kind: 'selected'; newElementId: string | null | undefined }
  | { kind: 'click'; targetType: 'block' | 'workspace' | 'zoom_controls' | undefined; blockId?: string | null }
  | { kind: 'blockGone' }

export interface SelectionState {
  selectedId: string | null
  /** Set by a workspace-background click; consumed by the next null-selected. */
  blankClicked: boolean
}

export function emptySelectionState(): SelectionState {
  return { selectedId: null, blankClicked: false }
}

/**
 * Pure selection transition. `exists` answers whether a block id is still
 * present in the workspace; it is consulted for every id this function
 * would newly trust, never for ids it only keeps.
 */
export function updateBlockSelection(
  state: SelectionState,
  event: SelectionEvent,
  exists: (id: string) => boolean,
): SelectionState {
  switch (event.kind) {
    case 'selected': {
      if (event.newElementId) {
        // A real selection: trust it only if the block still exists.
        if (exists(event.newElementId)) {
          return { selectedId: event.newElementId, blankClicked: false }
        }
        return state
      }
      // Null selected: focus loss keeps the selection, unless the user
      // just clicked the empty canvas (blank-click flag wins either way).
      if (state.blankClicked) {
        return { selectedId: null, blankClicked: false }
      }
      return state
    }
    case 'click': {
      if (event.targetType === 'workspace') {
        return { selectedId: null, blankClicked: true }
      }
      if (event.targetType === 'block' && event.blockId) {
        if (exists(event.blockId)) {
          return { selectedId: event.blockId, blankClicked: false }
        }
        return state
      }
      return state
    }
    case 'blockGone': {
      if (state.selectedId && !exists(state.selectedId)) {
        return { selectedId: null, blankClicked: false }
      }
      return state
    }
  }
}
