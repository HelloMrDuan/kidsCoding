import { describe, expect, it } from 'vitest'
import { buildScratchWork, SCRATCH_PORTFOLIO_LESSON_TITLE } from './scratch-portfolio'

describe('UX-302 Scratch portfolio card', () => {
  it('builds a real local Scratch card linking back to the lab', () => {
    const work = buildScratchWork({ savedAt: '2026-10-27T09:00:00.000Z', bytes: 20480 })
    expect(work.kind).toBe('scratch')
    expect(work.id).toBe('scratch:G3-U1-L02')
    expect(work.lessonId).toBe('G3-U1-L02')
    expect(work.title).toContain(SCRATCH_PORTFOLIO_LESSON_TITLE)
    expect(work.href).toBe('/learn/scratch-lab/G3-U1-L02')
    expect(work.source).toBe('local')
    expect(work.updatedAt).toBe('2026-10-27T09:00:00.000Z')
    expect(work.meta).toContain('.sb3')
    expect(work.meta).toContain('20.0 KB')
    expect(work.localPassed).toBe(false)
  })

  it('labels the cover as a real .sb3 file, not a graded result', () => {
    const work = buildScratchWork({ savedAt: '2026-10-27T09:00:00.000Z', bytes: 300 })
    expect(work.cover.type).toBe('code')
    if (work.cover.type === 'code') {
      expect(work.cover.lines.join(' ')).toContain('.sb3')
    }
  })
})
