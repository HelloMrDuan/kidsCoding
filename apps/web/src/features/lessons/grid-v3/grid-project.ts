/**
 * OPS-057：网格 / 事件作品的独立作品模式数据层。
 *
 * 作品中心的网格作品原来直接指向课程工作台（`/studio/blockly/grid/<id>`），
 * 编辑会写课程草稿 `kidscoding-draft:<id>`。作品模式改为自己的路由与自己的
 * 信封键（`kidscoding-project:<id>`，按 owner 分键），只读写这件作品：
 * - 读取顺序：作品信封 → 当前 owner 的课程 V3 草稿（只读沿用）→ 旧网格草稿。
 *   回退只为打开“已经存在的作品”，保存时只写作品信封，绝不覆盖课程草稿。
 * - 没有真实作品 / 数据损坏时由路由如实提示，不用默认程序冒充。
 * - 删除作品只删作品信封并写 owner 隔离的删除标记；课程草稿与旧网格草稿
 *   一律不动（删除前后逐字节一致），标记负责挡住旧数据重新出现。
 *
 * 只登记课程数据里 `project.showInPortfolio === true` 的网格课：没有作品的
 * 课程不强行新增作品入口。
 */
import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import type { GridLesson } from '@/content/curriculum/g0-u1-grid-lessons'
import { gridDraftKey, parseGridDraft } from '@/features/lessons/grid/grid-draft'
import { gridV3Route, isGridV3LessonId } from '@/features/lessons/grid-v3/grid-v3-lessons'
import { scopedLessonDraftKey } from '@/features/lessons/scoped-draft-key'
import { loadDraft, type LoadResult, type SaveResult } from '@/features/lessons/workspace/workspace-draft'
import { isValidGridDraft, type GridSlotData } from './grid-v3-draft'

export const GRID_PROJECT_ROUTE_PREFIX = '/studio/blockly/project/grid/'
const PROJECT_KEY_PREFIX = 'kidscoding-project:'
const PROJECT_DELETED_PREFIX = 'kidscoding-project-deleted:'

export function gridProjectRoute(lessonId: string): string {
  return `${GRID_PROJECT_ROUTE_PREFIX}${lessonId}`
}

export type GridPortfolioProject = {
  lesson: GridLesson
  title: string
  stepId: string
  stepIndex: number
}

/** 课程数据里登记为作品、且已迁入 V3 的网格课；其它 id 返回 null（路由 404）。 */
export function getGridPortfolioProject(lessonId: string): GridPortfolioProject | null {
  const lesson = g0u3LoopLessons[lessonId]
  const project = lesson?.project
  if (!lesson || !project?.showInPortfolio || !isGridV3LessonId(lessonId)) return null
  const stepIndex = lesson.steps.findIndex((step) => step.id === project.stepId)
  if (stepIndex < 0) return null
  return { lesson, title: project.title, stepId: project.stepId, stepIndex }
}

/** 课程工作台入口（非作品模式）；作品中心只在作品模式不可用时使用。 */
export function gridLessonRoute(lessonId: string): string {
  return gridV3Route(lessonId)
}

type GridProjectEnvelope = {
  lessonId: string
  savedAt: string
  version: 1
  kind: 'grid-project'
  draft: GridSlotData
}

function storage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

function projectKey(lessonId: string, owner: string): string {
  return scopedLessonDraftKey(owner, `${PROJECT_KEY_PREFIX}${lessonId}`)
}

/** 删除标记（按 owner 分键）：作品删除后阻止旧课程草稿/旧课堂草稿重新冒充作品。 */
function projectDeletedKey(lessonId: string, owner: string): string {
  return scopedLessonDraftKey(owner, `${PROJECT_DELETED_PREFIX}${lessonId}`)
}

export function isGridProjectDeleted(
  lessonId: string,
  owner?: string | null,
): boolean {
  const store = storage()
  if (!store || typeof owner !== 'string' || owner.length === 0) return false
  try {
    return store.getItem(projectDeletedKey(lessonId, owner)) !== null
  } catch {
    return false
  }
}

function clearGridProjectDeleted(lessonId: string, owner: string): void {
  try {
    storage()?.removeItem(projectDeletedKey(lessonId, owner))
  } catch {
    // 清理失败只会让旧数据继续被删除标记挡住，不会让已删除作品复活。
  }
}

/** 真正保存过的作品：作品关有可运行程序；创意关还必须保存过目标格。 */
function hasRealWork(project: GridPortfolioProject, draft: GridSlotData): boolean {
  const step = project.lesson.steps[project.stepIndex]
  if (!step) return false
  const blocks = draft.programs[project.stepId]
  if (!Array.isArray(blocks) || blocks.length === 0) return false
  return step.creative ? draft.creative?.[project.stepId] !== undefined : true
}

function fromLegacyGridDraft(
  lesson: GridLesson,
  draft: NonNullable<ReturnType<typeof parseGridDraft>>,
  stepIndex: number,
): GridSlotData {
  return {
    version: 1,
    lessonId: lesson.id,
    stepIndex,
    programs: draft.programs,
    passed: draft.passed,
    failures: 0,
    ...(draft.reflection === undefined ? {} : { reflection: draft.reflection }),
    ...(draft.observed?.length ? { observed: draft.observed } : {}),
    ...(draft.creative ? { creative: draft.creative } : {}),
    ...(draft.mistakes?.length ? { mistakes: draft.mistakes } : {}),
  }
}

/** 读取作品：独立信封优先；其次当前 owner 的 V3 课程草稿；最后旧网格草稿。 */
export function loadGridProjectDraft(
  lessonId: string,
  owner?: string | null,
): LoadResult {
  const store = storage()
  const project = getGridPortfolioProject(lessonId)
  if (!store) return { data: null, reason: '本机存储不可用' }
  if (!project) return { data: null, reason: '作品课节未登记' }
  if (typeof owner !== 'string' || owner.length === 0) {
    return { data: null, reason: '作品归属未确认，已拒绝读取' }
  }

  let raw: string | null = null
  try {
    raw = store.getItem(projectKey(lessonId, owner))
  } catch {
    return { data: null, reason: '读取本机存储失败' }
  }
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as Partial<GridProjectEnvelope> | null
      if (
        parsed &&
        parsed.lessonId === lessonId &&
        parsed.kind === 'grid-project' &&
        isValidGridDraft(project.lesson, parsed.draft)
      ) {
        return {
          data: { ...(parsed.draft as GridSlotData), stepIndex: project.stepIndex },
          reason: null,
        }
      }
      return { data: null, reason: '作品草稿格式无效，已拒绝恢复' }
    } catch {
      return { data: null, reason: '作品草稿已损坏，已拒绝恢复' }
    }
  }

  // OPS-057 复审：删除过的作品不得再从课程草稿/旧课堂草稿里“复活”。
  if (isGridProjectDeleted(lessonId, owner)) return { data: null, reason: null }

  // 只读沿用当前 owner 的 V3 课程草稿：打开已有作品，但保存会写到作品信封。
  // 必须是真实作品（作品关有程序，创意关有目标格），普通课程进度不当作品。
  const v3 = loadDraft(store, lessonId, owner)
  if (isValidGridDraft(project.lesson, v3.data) && hasRealWork(project, v3.data)) {
    return {
      data: { ...(v3.data as GridSlotData), stepIndex: project.stepIndex },
      reason: null,
    }
  }

  const legacy = parseGridDraft(
    project.lesson,
    store.getItem(gridDraftKey(lessonId, project.lesson.layoutMode === 'golden' ? owner : undefined)),
  )
  if (legacy?.savedAt) {
    const legacyDraft = fromLegacyGridDraft(project.lesson, legacy, project.stepIndex)
    if (hasRealWork(project, legacyDraft)) return { data: legacyDraft, reason: null }
  }

  return { data: null, reason: null }
}

/** 保存作品：只写独立信封，绝不写课程草稿键。 */
export function saveGridProjectDraft(
  lessonId: string,
  value: unknown,
  owner?: string | null,
): SaveResult {
  const store = storage()
  const project = getGridPortfolioProject(lessonId)
  if (!store) return { ok: false, reason: '本机存储不可用，未能保存' }
  if (!project) return { ok: false, reason: '作品课节未登记，未能保存' }
  if (typeof owner !== 'string' || owner.length === 0) {
    return { ok: false, reason: '作品归属未确认，未能保存' }
  }
  if (!isValidGridDraft(project.lesson, value)) {
    return { ok: false, reason: '作品数据不合法，未能保存' }
  }
  const envelope: GridProjectEnvelope = {
    lessonId,
    savedAt: new Date().toISOString(),
    version: 1,
    kind: 'grid-project',
    // 作品模式只拥有作品关；保存时把当前关固定到该项目关。
    draft: { ...(value as GridSlotData), stepIndex: project.stepIndex },
  }
  try {
    store.setItem(projectKey(lessonId, owner), JSON.stringify(envelope))
    // 重新保存一件真实作品即解除删除标记。
    clearGridProjectDeleted(lessonId, owner)
    return { ok: true }
  } catch {
    return { ok: false, reason: '写入本机存储失败，未能保存' }
  }
}

/** 删除当前 owner 的作品信封；课程草稿与旧草稿不动，由删除标记挡住回退。 */
export function removeGridProjectDraft(
  lessonId: string,
  owner?: string | null,
): SaveResult {
  const store = storage()
  if (!store) return { ok: false, reason: '本机存储不可用，未能删除' }
  if (typeof owner !== 'string' || owner.length === 0) {
    return { ok: false, reason: '作品归属未确认，未能删除' }
  }
  try {
    store.removeItem(projectKey(lessonId, owner))
    return { ok: true }
  } catch {
    return { ok: false, reason: '删除本机作品失败' }
  }
}

/**
 * 记录“当前 owner 删除过这件作品”。课程草稿与旧课堂草稿一律不改
 * （删除前后逐字节一致），只用这个按 owner 隔离的标记挡住回退读取。
 */
export function markGridProjectDeleted(
  lessonId: string,
  owner?: string | null,
): SaveResult {
  const store = storage()
  if (!store) return { ok: false, reason: '本机存储不可用，未能记录删除' }
  if (typeof owner !== 'string' || owner.length === 0) {
    return { ok: false, reason: '作品归属未确认，未能记录删除' }
  }
  try {
    store.setItem(
      projectDeletedKey(lessonId, owner),
      JSON.stringify({ lessonId, deletedAt: new Date().toISOString() }),
    )
    return { ok: true }
  } catch {
    return { ok: false, reason: '记录作品删除失败' }
  }
}

/** 外壳可注入的草稿读写口（LessonWorkspace.draftStore）。 */
export const gridProjectDraftStore = {
  load: (lessonId: string, owner?: string | null) => loadGridProjectDraft(lessonId, owner),
  save: (lessonId: string, script: unknown, owner?: string | null) =>
    saveGridProjectDraft(lessonId, script, owner),
}
