import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { GET } from '@/app/api/curriculum/catalog/route'
import { curriculumTracks, getLessonContentStage } from './full-catalog-access'
import { g2u1ScratchLessons } from '@/content/curriculum/g2-u1-scratch-lessons'
import { getLessonMaturity, maturityLevels, summarizeMaturity, trialIntegrations } from './lesson-maturity'

const allCatalogIds = curriculumTracks.flatMap((t) => t.units.flatMap((u) => u.lessons.map((l) => l.id)))
// G2 Scratch lab lessons are counted from their own registry (Hark B), so other teams' count edits never collide with them.
const g2LabLessons = Object.keys(g2u1ScratchLessons).length
const webRoot = path.resolve(__dirname, '../../..')

describe('SYS-102 single L0–L5 maturity source', () => {
  it('defines exactly six ordered levels', () => {
    expect(maturityLevels.map((m) => m.level)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('classifies every catalog lesson and all 12 launch lessons; unknown IDs are null', () => {
    expect(allCatalogIds).toHaveLength(432)
    for (const id of [...allCatalogIds, ...launchLessons.map((l) => l.id)]) expect(getLessonMaturity(id)).not.toBeNull()
    expect(getLessonMaturity('NOPE-U1-L01')).toBeNull()
  })

  it('outline lessons stay L0 and detailed lessons without a runner stay L1', () => {
    for (const id of allCatalogIds) {
      const m = getLessonMaturity(id)!
      if (getLessonContentStage(id) === 'outline') expect(m.level).toBe(0)
      else if (!trialIntegrations[id]) expect(m.level).toBe(1)
    }
  })

  it('nothing is published: no lesson reaches L4/L5 without release evidence', () => {
    const s = summarizeMaturity([...allCatalogIds, ...launchLessons.map((l) => l.id)])
    expect(s.counts[4]).toBe(0)
    expect(s.counts[5]).toBe(0)
    expect(s.publishedCount).toBe(0)
  })

  it('L3 trial lessons point at a real route and an existing e2e spec, and are not published', () => {
    const trials = [...allCatalogIds, ...launchLessons.map((l) => l.id)].filter((id) => getLessonMaturity(id)!.trialAvailable)
    expect(trials.sort()).toEqual(Object.keys(trialIntegrations).sort())
    expect(trials).toHaveLength(28 + g2LabLessons) // 7 lab pilots + 6 G0-U1 grid lessons + G0-U2 event lessons + 12 launch lessons, plus every G2 Scratch lab lesson
    for (const id of trials) {
      const m = getLessonMaturity(id)!
      expect(m.level).toBe(3)
      expect(m.published).toBe(false)
      expect(m.trialRoute).toBe(trialIntegrations[id].route)
      const spec = trialIntegrations[id].e2eSpec
      if (!spec.includes('*')) expect(existsSync(path.join(webRoot, spec))).toBe(true)
    }
  })

  it('API reads the same source: unpublished lessons are never playable', async () => {
    for (const id of ['P0-U1-L02', 'G3-U1-L02', 'G0-U1-L01']) {
      const body = await (await GET(new Request(`http://x/api/curriculum/catalog?lessonId=${id}`))).json()
      const m = getLessonMaturity(id)!
      expect(body.maturity.level).toBe(m.level)
      expect(body.playable).toBe(false)
      expect(body.trialAvailable).toBe(m.trialAvailable)
    }
    const track = await (await GET(new Request('http://x/api/curriculum/catalog?trackId=P0'))).json()
    const lessons = track.units.flatMap((u: { lessons: { id: string; maturity: { level: number }; playable: boolean }[] }) => u.lessons)
    for (const lesson of lessons) {
      expect(lesson.maturity.level).toBe(getLessonMaturity(lesson.id)!.level)
      expect(lesson.playable).toBe(false)
    }
  })
})
