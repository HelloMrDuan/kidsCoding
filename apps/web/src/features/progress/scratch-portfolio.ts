import { SCRATCH_DRAFT_LESSON_ID, type ScratchDraftMeta } from '@/features/scratch-vm/scratch-local-draft'
import type { PortfolioWork } from './portfolio-works'

/** Display title of the single Scratch lab lesson (same title the lab page shows). */
export const SCRATCH_PORTFOLIO_LESSON_TITLE = '流星分身雨'

/**
 * UX-302: a locally saved real Scratch .sb3 draft becomes a portfolio card.
 * The card links back to the Scratch lab, which restores the draft from IndexedDB.
 * localPassed stays false: the trial has no graded completion, only an editable work.
 */
export function buildScratchWork(meta: ScratchDraftMeta): PortfolioWork {
  return {
    id: `scratch:${SCRATCH_DRAFT_LESSON_ID}`,
    kind: 'scratch',
    lessonId: SCRATCH_DRAFT_LESSON_ID,
    title: `Scratch 作品 · ${SCRATCH_PORTFOLIO_LESSON_TITLE}`,
    meta: `Scratch .sb3 项目 · ${(meta.bytes / 1024).toFixed(1)} KB`,
    updatedAt: meta.savedAt,
    source: 'local',
    href: `/learn/scratch-lab/${SCRATCH_DRAFT_LESSON_ID}`,
    cover: { type: 'code', lines: ['Scratch .sb3 项目', '真实 VM · 可完整编辑'] },
    localPassed: false,
  }
}
