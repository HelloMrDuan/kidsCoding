import { cleanup, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AdminCatalogPage from '@/app/admin/catalog/page'
import { GET as catalogApiGet } from '@/app/api/curriculum/catalog/route'
import LearnCatalogPage from './page'
import LearnDetailPage from './[lessonId]/page'
import {
  curriculumTracks,
  getLessonContentStage,
} from '@/features/curriculum/full-catalog-access'
import {
  getLessonMaturity,
  getLessonRelease,
  maturityLevels,
  trialIntegrations,
} from '@/features/curriculum/lesson-maturity'
import { launchLessons } from '@/content/curriculum/launch-lessons'

vi.mock('@/features/admin/require-curriculum-admin', () => ({
  requireCurriculumAdmin: async () => undefined,
}))

// SYS-104: admin catalog, learn catalog, learn detail and the public API must
// agree on the same four markers (detailed / trial / trialAvailable /
// published) for every lesson, and a lesson without release evidence must
// never be open as formally published.
const allCatalogIds = curriculumTracks.flatMap((t) =>
  t.units.flatMap((u) => u.lessons.map((l) => l.id)),
)
const outlineId = allCatalogIds.find(
  (id) => getLessonContentStage(id) === 'outline',
)!
const detailedId = allCatalogIds.find(
  (id) =>
    getLessonContentStage(id) !== 'outline' && !trialIntegrations[id],
)!
const trialId = 'G0-U1-L01'
const launchId = launchLessons[0].id

function locate(id: string) {
  for (const track of curriculumTracks) {
    for (let i = 0; i < track.units.length; i++) {
      if (track.units[i].lessons.some((l) => l.id === id)) {
        return { trackId: track.id, unitIndex: i + 1 }
      }
    }
  }
  throw new Error(`lesson not in any track: ${id}`)
}

function labelFor(id: string) {
  const m = getLessonMaturity(id)!
  return { m, label: `L${m.level} ${maturityLevels[m.level].label}` }
}

describe('catalog status sync (SYS-104)', () => {
  it('admin catalog, learn catalog and learn detail agree on each sample lesson', async () => {
    for (const id of [outlineId, detailedId, trialId]) {
      const { m, label } = labelFor(id)
      const { trackId, unitIndex } = locate(id)

      render(
        await AdminCatalogPage({
          searchParams: Promise.resolve({ track: trackId }),
        }),
      )
      const adminRow = screen.getByTestId(`admin-catalog-lesson-${id}`)
      expect(
        within(adminRow).getByTestId(`admin-lesson-maturity-${id}`)
          .textContent,
      ).toContain(label)
      cleanup()

      render(
        await LearnCatalogPage({
          searchParams: Promise.resolve({
            track: trackId,
            unit: String(unitIndex),
          }),
        }),
      )
      expect(
        within(screen.getByTestId(`catalog-lesson-${id}`)).getByText(label),
      ).toBeTruthy()
      cleanup()

      render(
        await LearnDetailPage({
          params: Promise.resolve({ lessonId: id }),
        }),
      )
      const maturityLine = screen.getByTestId('catalog-lesson-maturity')
      expect(maturityLine.getAttribute('data-level')).toBe(String(m.level))
      expect(maturityLine.textContent).toContain(label)
      if (m.trialAvailable) {
        expect(screen.getByText(/实验入口，可以试玩/)).toBeTruthy()
      } else {
        expect(screen.getByText(/暂不开放直接闯关/)).toBeTruthy()
      }
      cleanup()

      const response = catalogApiGet(
        new Request(
          `http://localhost/api/curriculum/catalog?lessonId=${id}`,
        ),
      )
      const body = (await response.json()) as {
        maturity: { level: number }
        playable: boolean
        trialAvailable: boolean
      }
      expect(body.maturity.level).toBe(m.level)
      expect(body.playable).toBe(m.published)
      expect(body.trialAvailable).toBe(m.trialAvailable)
    }
  })

  it('launch lessons keep the same maturity marker on the admin side', async () => {
    const { m, label } = labelFor(launchId)
    expect(m.trialAvailable).toBe(true)
    expect(m.published).toBe(false)
    render(await AdminCatalogPage({ searchParams: Promise.resolve({}) }))
    const launch = launchLessons[0]
    expect(
      screen.getByText(`${launch.title} · L${m.level} →`),
    ).toBeTruthy()
    expect(label).toContain('实验可试玩')
    cleanup()
  })

  it('no lesson without release evidence is open as formally published', () => {
    for (const id of [...allCatalogIds, ...launchLessons.map((l) => l.id)]) {
      const m = getLessonMaturity(id)!
      expect(m.published).toBe(m.level === 5)
      expect(m.trialAvailable).toBe(m.level >= 3)
      expect(m.trialAvailable ? !!m.trialRoute : !m.trialRoute).toBe(true)
      if (!getLessonRelease(id).ready) {
        expect(m.published).toBe(false)
      }
    }
  })
})
