import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import { gridDraftKey, parseGridDraft } from '@/features/lessons/grid/grid-draft'
import { countBlocks } from '@/features/lessons/blockly/program-tree'
import type { PortfolioWork } from './portfolio-works'

export function collectGridWorks(storage: Storage, owner?: string | null): PortfolioWork[] {
  return Object.values(g0u3LoopLessons).flatMap(lesson => {
    const project = lesson.project
    if (!project?.showInPortfolio || (lesson.layoutMode === 'golden' && !owner)) return []
    const draft = parseGridDraft(lesson, storage.getItem(gridDraftKey(lesson.id, lesson.layoutMode === 'golden' ? owner! : undefined)))
    const blocks = draft?.programs[project.stepId]
    if (!draft?.savedAt || !blocks?.length || !draft.creative?.[project.stepId]) return []
    return [{
      id: `grid:${lesson.id}`, kind: 'blockly', lessonId: lesson.id, title: project.title,
      meta: `网格编程 · ${countBlocks(blocks)} 块积木`, updatedAt: draft.savedAt, source: 'local',
      href: `/learn/grid-lab/${lesson.id}`, localPassed: draft.passed.includes(project.stepId),
      cover: { type: 'scene', scene: 'forest', characters: ['fox'] },
    }]
  })
}

export function removeGridWork(storage: Storage, lessonId: string, owner?: string | null) {
  const lesson = g0u3LoopLessons[lessonId]
  const project = lesson?.project
  if (!project?.showInPortfolio || (lesson.layoutMode === 'golden' && !owner)) return
  const key = gridDraftKey(lessonId, lesson.layoutMode === 'golden' ? owner! : undefined)
  const draft = parseGridDraft(lesson, storage.getItem(key))
  if (!draft) return
  delete draft.programs[project.stepId]
  delete draft.creative?.[project.stepId]
  draft.passed = draft.passed.filter(id => id !== project.stepId)
  storage.setItem(key, JSON.stringify(draft))
}
