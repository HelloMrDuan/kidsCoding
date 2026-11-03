// 课堂状态、草稿与结果失效规则（纯函数，可单元测试）。
//
// 草稿（localStorage，键 kidscoding-draft:G2-U3-L02，外层 {lessonId, savedAt, script}，
// 与共享 workspace-draft 同一信封）只含本课数据：各关脚本、当前关卡、预测。
// “通过”只能由真实运行产生，不写进草稿：刷新后程序和预测都在，重新运行一次即可恢复通过状态，
// 因此草稿里无法伪造通过。运行中的状态（位置、帧、最近一次判定）同样不入草稿。

import { L02_CONTRACT } from './contract'
import { judgeRun, type RunTrace } from './judge'
import { L02_LEVEL_ORDER, L02_LEVELS, L02_LESSON_ID, type LevelId } from './params'
import { EMPTY_PROGRAM, programFingerprint, validateProgram, type Program } from './program'

export type Predictions = { explore?: { x?: string; caught?: string } }

export type LessonState = {
  levelId: LevelId
  /** 每关一份脚本；探索关是固定演示，不可编辑，所以不存。 */
  programs: Record<Exclude<LevelId, 'explore'>, Program>
  predictions: Predictions
  /** 某关“通过时”的程序指纹。只有该关当前程序的指纹与它一致，这一关才算通过。 */
  passedAt: Partial<Record<LevelId, string>>
}

export const DEMO_PROGRAM: Program = {
  scripts: [{ hat: 'flag', body: [{ t: 'repeat', times: 2, body: [{ t: 'move', dx: 20 }] }] }],
}

export function initialState(): LessonState {
  return {
    levelId: 'explore',
    programs: { solve: EMPTY_PROGRAM, transferLeft: EMPTY_PROGRAM, transferFast: EMPTY_PROGRAM },
    predictions: {},
    passedAt: {},
  }
}

export function programFor(state: LessonState, levelId: LevelId): Program {
  return levelId === 'explore' ? DEMO_PROGRAM : state.programs[levelId]
}

/** 一关是否通过：必须有通过记录，且记录的程序与现在的程序完全一致。编辑过就失效。 */
export function isLevelPassed(state: LessonState, levelId: LevelId): boolean {
  const mark = state.passedAt[levelId]
  return mark !== undefined && mark === programFingerprint(programFor(state, levelId))
}

/** 探索关的完成条件：写过预测，并且运行并观察过（观察由 passedAt 以“已观察”记录）。 */
export function exploreDone(state: LessonState): boolean {
  const p = state.predictions.explore
  return !!p && !!p.x && !!p.caught && isLevelPassed(state, 'explore')
}

export function editProgram(state: LessonState, levelId: LevelId, program: Program): LessonState {
  if (levelId === 'explore') return state
  return { ...state, programs: { ...state.programs, [levelId]: program } }
}

/**
 * 运行结果落账。只有当 trace 与“当前程序、当前关卡”都对得上才有效（过期的结果直接丢弃）。
 * 探索关：只要运行并正常落地就算“观察过”；其他关：任务与知识同时通过才算通过。
 */
export function recordRun(state: LessonState, trace: RunTrace): LessonState {
  const levelId = trace.levelId as LevelId
  if (!(levelId in L02_LEVELS)) return state
  if (trace.fingerprint !== programFingerprint(programFor(state, levelId))) return state
  const judgment = judgeRun(trace, L02_LEVELS[levelId])
  if (judgment.status !== 'judged') return state
  const ok = levelId === 'explore' ? true : judgment.passed
  const passedAt = { ...state.passedAt }
  if (ok) passedAt[levelId] = trace.fingerprint
  else delete passedAt[levelId]
  return { ...state, passedAt }
}

export function nextLevel(levelId: LevelId): LevelId | null {
  const i = L02_LEVEL_ORDER.indexOf(levelId)
  return i >= 0 && i < L02_LEVEL_ORDER.length - 1 ? L02_LEVEL_ORDER[i + 1] : null
}

// ---- 草稿 ----------------------------------------------------------------

export type DraftScript = {
  version: 1
  levelId: LevelId
  programs: LessonState['programs']
  predictions: Predictions
}

export function toDraft(state: LessonState): DraftScript {
  return { version: 1, levelId: state.levelId, programs: state.programs, predictions: state.predictions }
}

function cleanString(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v.length <= max ? v : undefined
}

/** 草稿内容损坏或不合法时返回 null，调用方保留原来的状态（不覆盖好草稿）。 */
export function fromDraft(raw: unknown): LessonState | null {
  const d = raw as Partial<DraftScript> | null
  if (!d || typeof d !== 'object' || d.version !== 1) return null
  if (typeof d.levelId !== 'string' || !(d.levelId in L02_LEVELS)) return null
  const programs = d.programs as Partial<LessonState['programs']> | undefined
  if (!programs || typeof programs !== 'object') return null
  const clean = initialState()
  for (const key of ['solve', 'transferLeft', 'transferFast'] as const) {
    const p = programs[key]
    if (p === undefined) continue
    if (validateProgram(p).length > 0) return null
    clean.programs[key] = p
  }
  const pe = d.predictions?.explore
  if (pe && typeof pe === 'object') {
    const x = cleanString(pe.x, 8)
    const caught = cleanString(pe.caught, 8)
    clean.predictions = { explore: { ...(x !== undefined ? { x } : {}), ...(caught !== undefined ? { caught } : {}) } }
  }
  clean.levelId = d.levelId as LevelId
  return clean
}

// ---- 草稿存取（与共享 workspace-draft 同一信封，失败一律 fail-closed）-------------

export const DRAFT_MAX_BYTES = 64 * 1024

export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}
export type SaveResult = { ok: true } | { ok: false; reason: string }
export type LoadResult = { state: LessonState | null; reason: string | null }

export function saveDraft(storage: StorageLike | null, state: LessonState): SaveResult {
  if (!storage) return { ok: false, reason: '本机存储不可用，未能保存' }
  let text: string
  try {
    text = JSON.stringify({ lessonId: L02_LESSON_ID, savedAt: new Date().toISOString(), script: toDraft(state) })
  } catch {
    return { ok: false, reason: '作品无法保存，未能保存' }
  }
  if (new TextEncoder().encode(text).length > DRAFT_MAX_BYTES) return { ok: false, reason: '作品太大，未能保存' }
  try {
    storage.setItem(L02_CONTRACT.draftKey, text)
  } catch {
    return { ok: false, reason: '写入本机存储失败，未能保存' }
  }
  return { ok: true }
}

export function loadDraft(storage: StorageLike | null): LoadResult {
  if (!storage) return { state: null, reason: '本机存储不可用' }
  let raw: string | null
  try {
    raw = storage.getItem(L02_CONTRACT.draftKey)
  } catch {
    return { state: null, reason: '读取本机存储失败' }
  }
  if (raw === null) return { state: null, reason: null }
  if (new TextEncoder().encode(raw).length > DRAFT_MAX_BYTES) return { state: null, reason: '草稿太大，已拒绝恢复' }
  let parsed: { lessonId?: unknown; script?: unknown } | null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { state: null, reason: '草稿已损坏，已拒绝恢复' }
  }
  if (!parsed || typeof parsed !== 'object' || !('script' in parsed)) return { state: null, reason: '草稿格式无效，已拒绝恢复' }
  if (parsed.lessonId !== L02_LESSON_ID) return { state: null, reason: '草稿属于其他课节，已拒绝恢复' }
  const state = fromDraft(parsed.script)
  if (!state) return { state: null, reason: '草稿内容不合法，已拒绝恢复' }
  return { state, reason: null }
}
