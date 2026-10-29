import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import AdminCatalogPage from './page'

vi.mock('@/features/admin/require-curriculum-admin', () => ({
  requireCurriculumAdmin: async () => undefined,
}))

// UX-504: the review backend must show every gate's evidence itself, not just
// a count, so a publish decision can be traced to its CI run, PR or file.
// G0-U1-L01 carries real recorded evidence on two still-unpassed gates.
describe('admin catalog release evidence traceability (UX-504)', () => {
  it('lists the recorded evidence refs for unpassed gates', async () => {
    render(
      await AdminCatalogPage({ searchParams: Promise.resolve({}) }),
    )

    const contentGate = screen.getByTestId(
      'release-gate-G0-U1-L01-contentReviewed',
    )
    expect(contentGate.getAttribute('data-passed')).toBe('false')
    const contentEvidence = screen.getByTestId(
      'release-evidence-G0-U1-L01-contentReviewed',
    )
    const reviewLink = within(contentEvidence).getByText(
      'review：docs/roadmap/teaching-reviews/G0-U1-L01.json',
    )
    expect(reviewLink.getAttribute('href')).toBe(
      'https://github.com/HelloMrDuan/kidsCoding/blob/main/docs/roadmap/teaching-reviews/G0-U1-L01.json',
    )

    const e2eEvidence = screen.getByTestId(
      'release-evidence-G0-U1-L01-assessmentE2EPassed',
    )
    const fileLink = within(e2eEvidence).getByText(
      'file：apps/web/tests/e2e/grid-lab.spec.ts',
    )
    expect(fileLink.getAttribute('href')).toBe(
      'https://github.com/HelloMrDuan/kidsCoding/blob/main/apps/web/tests/e2e/grid-lab.spec.ts',
    )
  })

  it('renders no evidence list for gates without recorded evidence', async () => {
    render(
      await AdminCatalogPage({ searchParams: Promise.resolve({}) }),
    )

    expect(
      screen.queryByTestId('release-evidence-G0-U1-L01-engineProductionReady'),
    ).toBeNull()
  })
})
