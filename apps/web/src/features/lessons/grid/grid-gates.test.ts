import { describe, expect, it } from 'vitest'
import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'

/**
 * D1/D3 regression: every grid lesson is a five-gate lesson (guided,
 * practice-a, practice-b, error-lab, creative) with exactly one error-lab
 * step that carries its errorLab record. The catalog copy says "五关" and
 * the classroom reports local-only saving; if a lesson ever loses a gate,
 * this test fails before the copy drifts again.
 */
const FIVE_KINDS = ['guided', 'practice-a', 'practice-b', 'error-lab', 'creative'] as const

const DATASETS = [
  {
    name: 'G0-U1',
    lessons: g0u1GridLessons,
    ids: ['G0-U1-L01', 'G0-U1-L02', 'G0-U1-L03', 'G0-U1-L04', 'G0-U1-L05', 'G0-U1-L06'],
  },
  {
    name: 'G0-U3 loop',
    lessons: g0u3LoopLessons,
    ids: ['G0-U3-L01', 'G0-U3-L02', 'G0-U3-L03'],
  },
]

describe('grid lessons have five gates (D1/D3 regression)', () => {
  for (const dataset of DATASETS) {
    it(`${dataset.name} covers exactly its ${dataset.ids.length} lessons`, () => {
      expect(Object.keys(dataset.lessons).sort()).toEqual([...dataset.ids].sort())
    })

    for (const id of dataset.ids) {
      it(`${id} has all five step kinds and exactly one error-lab step`, () => {
        const lesson = dataset.lessons[id]
        expect(lesson).toBeDefined()
        const kinds = new Set(lesson.steps.map(step => step.kind))
        for (const kind of FIVE_KINDS) {
          expect(kinds.has(kind)).toBe(true)
        }
        const errorLabs = lesson.steps.filter(step => step.kind === 'error-lab')
        expect(errorLabs).toHaveLength(1)
        expect(errorLabs[0].errorLab).toBeDefined()
        expect(errorLabs[0].errorLab!.expect).toBeTruthy()
      })
    }
  }
})
