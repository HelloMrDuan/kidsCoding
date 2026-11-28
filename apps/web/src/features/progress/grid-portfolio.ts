import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { gridDraftKey, parseGridDraft } from '@/features/lessons/grid/grid-draft'
import { countBlocks, type ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { scopedLessonDraftKey } from '@/features/lessons/scoped-draft-key'
import { isValidGridDraft, type GridSlotData } from '@/features/lessons/grid-v3/grid-v3-draft'
import { gridV3Route, isGridV3LessonId } from '@/features/lessons/grid-v3/grid-v3-lessons'
import { draftKeyFor } from '@/features/lessons/workspace/lesson-contract'
import { loadDraft, saveDraft } from '@/features/lessons/workspace/workspace-draft'
import type { PortfolioWork } from './portfolio-works'

/**
 * OPS-054：已迁入 V3 的课节（如 G0-U3-L05），作品优先读 V3 工作台草稿
 * （`kidscoding-draft:<id>`，按 owner 分键，外壳信封带 savedAt）；V3 里还没有
 * 这份作品时，回退读旧课堂草稿（只读当前 owner 的分键旧键，与迁移前一致）。
 * 没有 owner 不读；入口一律指向当前真实服务该课的页面。
 */
type FoundWork = { blocks: ProgramBlock[]; passed: string[]; savedAt: string }

function readV3Work(storage: Storage, lesson: GridLesson, stepId: string, owner: string): FoundWork | null {
  if (!isGridV3LessonId(lesson.id)) return null
  const raw = storage.getItem(scopedLessonDraftKey(owner, draftKeyFor(lesson.id)))
  if (!raw) return null
  let savedAt: unknown
  try {
    savedAt = (JSON.parse(raw) as { savedAt?: unknown } | null)?.savedAt
  } catch {
    return null
  }
  const { data } = loadDraft(storage, lesson.id, owner)
  if (typeof savedAt !== 'string' || !isValidGridDraft(lesson, data)) return null
  const blocks = data.programs[stepId]
  if (!blocks?.length || !data.creative?.[stepId]) return null
  return { blocks, passed: data.passed, savedAt }
}

function readLegacyWork(storage: Storage, lesson: GridLesson, stepId: string, owner: string | null | undefined): FoundWork | null {
  if (lesson.layoutMode === 'golden' && !owner) return null
  const draft = parseGridDraft(lesson, storage.getItem(gridDraftKey(lesson.id, lesson.layoutMode === 'golden' ? owner! : undefined)))
  const blocks = draft?.programs[stepId]
  if (!draft?.savedAt || !blocks?.length || !draft.creative?.[stepId]) return null
  return { blocks, passed: draft.passed, savedAt: draft.savedAt }
}

export function collectGridWorks(storage: Storage, owner?: string | null): PortfolioWork[] {
  return Object.values(g0u3LoopLessons).flatMap(lesson => {
    const project = lesson.project
    if (!project?.showInPortfolio || (lesson.layoutMode === 'golden' && !owner)) return []
    const found = (owner ? readV3Work(storage, lesson, project.stepId, owner) : null)
      ?? readLegacyWork(storage, lesson, project.stepId, owner)
    if (!found) return []
    return [{
      id: `grid:${lesson.id}`, kind: 'blockly', lessonId: lesson.id, title: project.title,
      meta: `网格编程 · ${countBlocks(found.blocks)} 块积木`, updatedAt: found.savedAt, source: 'local',
      href: isGridV3LessonId(lesson.id) ? gridV3Route(lesson.id) : `/learn/grid-lab/${lesson.id}`,
      localPassed: found.passed.includes(project.stepId),
      cover: { type: 'scene', scene: 'forest', characters: ['fox'] },
    }]
  })
}

/** 删除作品：只删作品那一关（程序、创意选择、通过记录），V3 草稿与旧草稿都处理；其余关保留。 */
export function removeGridWork(storage: Storage, lessonId: string, owner?: string | null) {
  const lesson = g0u3LoopLessons[lessonId]
  const project = lesson?.project
  if (!project?.showInPortfolio || (lesson.layoutMode === 'golden' && !owner)) return
  const stepId = project.stepId

  if (owner && isGridV3LessonId(lessonId)) {
    const { data } = loadDraft(storage, lessonId, owner)
    if (isValidGridDraft(lesson, data)) {
      const next: GridSlotData = {
        ...data,
        programs: Object.fromEntries(Object.entries(data.programs).filter(([id]) => id !== stepId)),
        passed: data.passed.filter(id => id !== stepId),
        ...(data.creative ? { creative: Object.fromEntries(Object.entries(data.creative).filter(([id]) => id !== stepId)) } : {}),
        ...(data.finished ? { finished: false } : {}),
      }
      saveDraft(storage, lessonId, next, owner)
    }
  }

  const key = gridDraftKey(lessonId, lesson.layoutMode === 'golden' ? owner! : undefined)
  const draft = parseGridDraft(lesson, storage.getItem(key))
  if (!draft) return
  delete draft.programs[stepId]
  delete draft.creative?.[stepId]
  draft.passed = draft.passed.filter(id => id !== stepId)
  storage.setItem(key, JSON.stringify(draft))
}
