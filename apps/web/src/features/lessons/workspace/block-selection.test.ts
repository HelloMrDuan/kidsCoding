import { describe, expect, it } from 'vitest'

import {
  emptySelectionState,
  updateBlockSelection,
  type SelectionState,
} from './block-selection'

/**
 * R1 regression tests: the shared selection rule (#470's selection problem,
 * abstracted — no course code, no course test names copied). #470 itself has
 * no dedicated unit tests for these rules; these are the shared layer's own.
 * `exists` simulates a workspace holding blocks 'a' and 'b' only.
 */
const exists = (id: string) => id === 'a' || id === 'b'

describe('block selection (R1)', () => {
  it('selects a block on a non-empty selected event', () => {
    const next = updateBlockSelection(emptySelectionState(), { kind: 'selected', newElementId: 'a' }, exists)
    expect(next.selectedId).toBe('a')
  })

  it('keeps the current selection on a null selected event (focus loss)', () => {
    const state: SelectionState = { selectedId: 'a', blankClicked: false }
    const next = updateBlockSelection(state, { kind: 'selected', newElementId: null }, exists)
    expect(next.selectedId).toBe('a')
  })

  it('never trusts a selected id that no longer exists', () => {
    const next = updateBlockSelection(emptySelectionState(), { kind: 'selected', newElementId: 'gone' }, exists)
    expect(next.selectedId).toBeNull()
    const kept: SelectionState = { selectedId: 'a', blankClicked: false }
    const after = updateBlockSelection(kept, { kind: 'selected', newElementId: 'gone' }, exists)
    expect(after.selectedId).toBe('a')
  })

  it('clears on a workspace-background click, whichever order the events arrive', () => {
    // Order 1: selected(null) first (kept), then workspace click (clears).
    const state: SelectionState = { selectedId: 'a', blankClicked: false }
    const afterNull = updateBlockSelection(state, { kind: 'selected', newElementId: null }, exists)
    expect(afterNull.selectedId).toBe('a')
    const afterClick = updateBlockSelection(afterNull, { kind: 'click', targetType: 'workspace' }, exists)
    expect(afterClick.selectedId).toBeNull()
    // Order 2: workspace click first (clears + flag), then selected(null)
    // consumes the flag and stays cleared.
    const afterClickFirst = updateBlockSelection(state, { kind: 'click', targetType: 'workspace' }, exists)
    expect(afterClickFirst.selectedId).toBeNull()
    const afterNullSecond = updateBlockSelection(afterClickFirst, { kind: 'selected', newElementId: null }, exists)
    expect(afterNullSecond.selectedId).toBeNull()
  })

  it('selects on a block click and ignores zoom-control clicks', () => {
    const next = updateBlockSelection(emptySelectionState(), { kind: 'click', targetType: 'block', blockId: 'b' }, exists)
    expect(next.selectedId).toBe('b')
    const zoom = updateBlockSelection(next, { kind: 'click', targetType: 'zoom_controls' }, exists)
    expect(zoom.selectedId).toBe('b')
  })

  it('clears when the tracked block disappears from the workspace', () => {
    const state: SelectionState = { selectedId: 'a', blankClicked: false }
    const goneExists = (id: string) => id === 'b'
    const next = updateBlockSelection(state, { kind: 'blockGone' }, goneExists)
    expect(next.selectedId).toBeNull()
    const stillThere = updateBlockSelection(state, { kind: 'blockGone' }, exists)
    expect(stillThere.selectedId).toBe('a')
  })

  it('a fresh selection after a blank click replaces the cleared state', () => {
    const cleared: SelectionState = { selectedId: null, blankClicked: true }
    const next = updateBlockSelection(cleared, { kind: 'selected', newElementId: 'b' }, exists)
    expect(next).toEqual({ selectedId: 'b', blankClicked: false })
  })
})
