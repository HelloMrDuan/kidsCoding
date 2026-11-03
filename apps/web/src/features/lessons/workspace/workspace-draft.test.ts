import { describe, expect, it } from 'vitest'

import { draftKeyFor } from './lesson-contract'
import {
  DRAFT_MAX_BYTES,
  loadDraft,
  loadDraftForSwitch,
  saveDraft,
  saveDraftForSwitch,
  type StorageLike,
} from './workspace-draft'

function mapStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

describe('workspace drafts (spec key kidscoding-draft:{lessonId})', () => {
  it('round-trips save then load under the spec key', () => {
    const storage = mapStorage()
    const script = [{ type: 'when_start' }, { type: 'ws_move_right', steps: 100 }]
    expect(saveDraft(storage, 'demo-a', script)).toEqual({ ok: true })
    expect(storage.map.has(draftKeyFor('demo-a'))).toBe(true)
    const loaded = loadDraft(storage, 'demo-a')
    expect(loaded.reason).toBeNull()
    expect(loaded.data).toEqual(script)
  })

  it('rejects corrupt JSON without overwriting the good draft', () => {
    const storage = mapStorage()
    const script = [{ type: 'when_start' }]
    saveDraft(storage, 'demo-a', script)
    storage.map.set(draftKeyFor('demo-a'), '{bad json')
    const loaded = loadDraft(storage, 'demo-a')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toMatch('损坏')
  })

  it('refuses over-cap saves and never silently truncates', () => {
    const storage = mapStorage()
    const big = 'x'.repeat(DRAFT_MAX_BYTES + 1)
    const result = saveDraft(storage, 'demo-a', big)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch('64KB')
    expect(storage.map.has(draftKeyFor('demo-a'))).toBe(false)
  })

  it('rejects oversized stored payloads on load', () => {
    const storage = mapStorage()
    storage.map.set(draftKeyFor('demo-a'), `"${'x'.repeat(DRAFT_MAX_BYTES + 1)}"`)
    const loaded = loadDraft(storage, 'demo-a')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toMatch('64KB')
  })

  it('rejects wrong-lesson envelopes', () => {
    const storage = mapStorage()
    storage.map.set(
      draftKeyFor('demo-a'),
      JSON.stringify({ lessonId: 'demo-b', savedAt: '2026-01-01', script: [] }),
    )
    const loaded = loadDraft(storage, 'demo-a')
    expect(loaded.data).toBeNull()
    expect(loaded.reason).toMatch('其他课节')
  })

  it('reports save failure when storage throws (fail-closed, no fake saved state)', () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {},
    }
    const result = saveDraft(throwing, 'demo-a', [{ type: 'when_start' }])
    expect(result.ok).toBe(false)
  })

  it('keeps lessons isolated across switches: save A, save B, load A intact', () => {
    const storage = mapStorage()
    const scriptA = [{ type: 'when_start' }, { type: 'ws_move_right', steps: 100 }]
    const scriptB = [{ type: 'when_start' }, { type: 'ws_move_left', steps: 20 }]
    expect(saveDraftForSwitch(storage, 'demo-a', scriptA)).toEqual({ ok: true })
    expect(saveDraftForSwitch(storage, 'demo-b', scriptB)).toEqual({ ok: true })
    expect(loadDraftForSwitch(storage, 'demo-a').data).toEqual(scriptA)
    expect(loadDraftForSwitch(storage, 'demo-b').data).toEqual(scriptB)
    // Switching back to A after B still yields A, with no B residue.
    expect(loadDraftForSwitch(storage, 'demo-a').data).toEqual(scriptA)
  })
})
