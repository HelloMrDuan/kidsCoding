import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { gridDraftKey, parseGridDraft } from '@/features/lessons/grid/grid-draft'
import { countBlocks, type ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { scopedLessonDraftKey } from '@/features/lessons/scoped-draft-key'
import { isValidGridDraft, type GridSlotData } from '@/features/lessons/grid-v3/grid-v3-draft'
import { isGridV3LessonId } from '@/features/lessons/grid-v3/grid-v3-lessons'
import {
  gridProjectRoute,
  isGridProjectDeleted,
  markGridProjectDeleted,
  removeGridProjectDraft,
} from '@/features/lessons/grid-v3/grid-project'
import { draftKeyFor } from '@/features/lessons/workspace/lesson-contract'
import { loadDraft } from '@/features/lessons/workspace/workspace-draft'
import type { PortfolioWork } from './portfolio-works'

/**
 * OPS-054：已迁入 V3 的课节（如 G0-U3-L05），作品优先读 V3 工作台草稿
 * （`kidscoding-draft:<id>`，按 owner 分键，外壳信封带 savedAt）；V3 里还没有
 * 这份作品时，回退读旧课堂草稿（只读当前 owner 的分键旧键，与迁移前一致）。
 * 没有 owner 不读；入口一律指向当前真实服务该课的页面。
 */
type FoundWork = { blocks: ProgramBlock[]; passed: string[]; savedAt: string }

/**
 * OPS-057：作品模式保存的独立信封（`kidscoding-project:<id>`，按 owner 分键）。
 * 存在时优先于课程 V3 草稿，因为作品模式里的修改不会写回课程草稿。
 */
function readProjectWork(storage: Storage, lesson: GridLesson, stepId: string, owner: string): FoundWork | null {
  const raw = storage.getItem(scopedLessonDraftKey(owner, `kidscoding-project:${lesson.id}`))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { lessonId?: unknown; savedAt?: unknown; kind?: unknown; draft?: unknown } | null
    if (
      !parsed ||
      parsed.lessonId !== lesson.id ||
      parsed.kind !== 'grid-project' ||
      typeof parsed.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(parsed.savedAt)) ||
      !isValidGridDraft(lesson, parsed.draft)
    ) {
      return null
    }
    const draft = parsed.draft as GridSlotData
    const blocks = draft.programs[stepId]
    if (!blocks?.length || !draft.creative?.[stepId]) return null
    return { blocks, passed: draft.passed, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

function readV3Work(storage: Storage, lesson: GridLesson, stepId: string, owner: string): FoundWork | null {  if (!isGridV3LessonId(lesson.id)) return null
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
    const deleted = !!owner && isGridProjectDeleted(lesson.id, owner)
    const found = (owner ? readProjectWork(storage, lesson, project.stepId, owner) : null)
      ?? (owner && !deleted ? readV3Work(storage, lesson, project.stepId, owner) : null)
      ?? (!deleted ? readLegacyWork(storage, lesson, project.stepId, owner) : null)
    if (!found) return []
    return [{
      id: `grid:${lesson.id}`, kind: 'blockly', lessonId: lesson.id, title: project.title,
      meta: `网格编程 · ${countBlocks(found.blocks)} 块积木`, updatedAt: found.savedAt, source: 'local',
      href: gridProjectRoute(lesson.id),
      localPassed: found.passed.includes(project.stepId),
      cover: { type: 'scene', scene: 'forest', characters: ['fox'] },
    }]
  })
}

/**
 * OPS-057 复审：删除作品只删独立作品信封并记录按 owner 的删除标记。
 * 课程 V3 草稿与旧课堂草稿一律不改（程序、创意、passed、finished 原样，
 * 删除前后逐字节一致）；取消“删作品=改课堂进度”的旧行为。
 */
export function removeGridWork(storage: Storage, lessonId: string, owner?: string | null) {
  const lesson = g0u3LoopLessons[lessonId]
  const project = lesson?.project
  if (!project?.showInPortfolio || (lesson.layoutMode === 'golden' && !owner)) return
  if (typeof owner !== 'string' || owner.length === 0) return

  removeGridProjectDraft(lessonId, owner)
  markGridProjectDeleted(lessonId, owner)
}
