/**
 * OPS-057：Blockly V3 作品编辑模式（启蒙课 lesson-01～lesson-12 共用）。
 *
 * 复用 V3 工作台（StudioShell + LessonWorkspace + docked Blockly + 舞台 + 运行适配器），
 * 不复制组件、不做第二套工作台；本模块只提供“作品”数据与规则：
 * - 作品规格（标题 / 创作说明 / 可用积木 / 起始程序 / 对白预设 / 模板）：lesson-01～09
 *   取已合并的 unit-projects.ts 原文，lesson-10～12 取 launch-lessons.ts + 旧 DuoProject
 *   的可用积木，均不另编课程内容。
 * - 作品草稿（LaunchProjectDraft）：与课程草稿完全分开的键 `kidscoding-project:<lessonId>`
 *   （按 owner 再加前缀）；保存时镜像到既有 `progress.projectSnapshots`，只改作品快照，
 *   不动 completedLessonIds / stars / badgeIds / cardIds / currentLessonId。
 * - 打开顺序：作品草稿 → 旧作品快照（兼容 TQ-012 的 `{type,line?}` 与更早的 `{type}`）
 *   → 规格起始程序。读取绝不改写课程草稿键。
 * - 运行：作品模式不按教学标准答案判定，只如实播放程序；运行不写进度、不发奖励。
 */
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { getUnitProject, getUnitProjectStartBlocks } from '@/content/curriculum/unit-projects'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { isKnownSayLine, type SayLinePreset } from '@/features/lessons/blockly/say-line-presets'
import type { DuoMode } from '@/features/lessons/playable-stage/duo-judge'
import { readGuestProgress, writeGuestProgress } from '@/features/progress/local-progress'
import { sanitizeSnapshotBlocks, type SnapshotBlock } from '@/features/progress/project-snapshot'

import { scopedLessonDraftKey } from '../scoped-draft-key'
import type { StudioLesson } from '../studio/studio-lesson'
import { draftKeyFor, type LessonContract } from '../workspace/lesson-contract'
import { DRAFT_MAX_BYTES, type LoadResult, type SaveResult } from '../workspace/workspace-draft'
import { buildLaunchProjectJudgment, judgeLaunchProject } from './launch-v3-judging'
import {
  getLaunchV3Lesson,
  getLaunchV3Template,
  LAUNCH_V3_LESSON_IDS,
  launchV3DuoMode,
} from './launch-v3-lessons'
import type { LaunchRunSource } from './launch-v3-run-adapter'

export const LAUNCH_PROJECT_LESSON_IDS = [
  'lesson-01-forest-hello',
  ...LAUNCH_V3_LESSON_IDS,
] as const

export type LaunchProjectLessonId = (typeof LAUNCH_PROJECT_LESSON_IDS)[number]

export const LAUNCH_PROJECT_ROUTE_PREFIX = '/studio/blockly/project/'

export function launchProjectRoute(lessonId: string): string {
  return `${LAUNCH_PROJECT_ROUTE_PREFIX}${lessonId}`
}

export function isLaunchProjectLessonId(value: unknown): value is LaunchProjectLessonId {
  return typeof value === 'string' && (LAUNCH_PROJECT_LESSON_IDS as readonly string[]).includes(value)
}

/** 作品草稿信封（与课程草稿同一外壳键形状，但键与 kind 都不同，互不覆盖）。 */
export type LaunchProjectDraft = {
  version: 1
  kind: 'project'
  lessonId: string
  program: ProgramBlock[]
}

export type LaunchProjectSpec = {
  lessonId: string
  title: string
  prompt: string
  choiceHint?: string
  templateId: string | null
  allowedBlocks: string[]
  starterProgram: ProgramBlock[]
  sayLineChoices?: readonly SayLinePreset[]
  duoMode: DuoMode | null
}

/** 旧 DuoProject（TQ-012）的可用积木原文：L12 额外开放重复积木。 */
const DUO_ALLOWED = ['when_start', 'move_right', 'switch_character', 'say_line'] as const

/** 双人作品起始程序（狐狸先走 100 步，再交给小熊；与旧作品页开场一致）。 */
const DUO_STARTERS: Partial<Record<string, ProgramBlock[]>> = {
  'lesson-10-second-friend': [
    { type: 'when_start' },
    { type: 'move_right' },
    { type: 'switch_character' },
    { type: 'move_right' },
  ],
  'lesson-11-duo-rehearsal': [
    { type: 'when_start' },
    { type: 'move_right' },
    { type: 'switch_character' },
    { type: 'say_line', line: 'hello' },
  ],
  'lesson-12-graduation-show': [
    { type: 'when_start' },
    { type: 'move_right' },
    { type: 'switch_character' },
    { type: 'repeat_twice' },
  ],
}

function cleanBlock(block: SnapshotBlock | ProgramBlock): ProgramBlock {
  const clean: ProgramBlock = { type: block.type }
  if (typeof block.line === 'string' && block.line !== '') clean.line = block.line
  if ('disconnected' in block && block.disconnected === true) clean.disconnected = true
  return clean
}

function normalizeSayLines(
  blocks: ProgramBlock[],
  choices: readonly SayLinePreset[] | undefined,
): ProgramBlock[] {
  if (!choices || choices.length === 0) return blocks
  return blocks.map((block) => {
    if (block.type !== 'say_line' || choices.some((choice) => choice.id === block.line)) return block
    return { ...block, line: choices[0].id }
  })
}

/** 作品规格；未登记课节返回 null（fail-closed）。 */
export function getLaunchProjectSpec(lessonId: string): LaunchProjectSpec | null {
  if (!isLaunchProjectLessonId(lessonId)) return null
  const lesson = launchLessons.find((item) => item.id === lessonId)
  if (!lesson) return null
  const unit = getUnitProject(lessonId)
  if (unit) {
    const starter = getUnitProjectStartBlocks(lessonId).map(cleanBlock)
    return {
      lessonId,
      title: unit.title,
      prompt: unit.prompt,
      choiceHint: unit.choiceHint,
      templateId: lesson.templateId ?? null,
      allowedBlocks: [...unit.allowedBlocks],
      starterProgram: normalizeSayLines(starter, unit.sayLineChoices),
      sayLineChoices: unit.sayLineChoices,
      duoMode: null,
    }
  }
  const duoMode = launchV3DuoMode(lessonId)
  if (!duoMode) return null
  const repeat = lessonId === 'lesson-12-graduation-show'
  return {
    lessonId,
    title: lesson.title,
    prompt: '这是你完成的双人作品：可以继续改积木、运行和保存。',
    templateId: lesson.templateId ?? null,
    allowedBlocks: repeat ? [...DUO_ALLOWED, 'repeat_twice'] : [...DUO_ALLOWED],
    starterProgram: (DUO_STARTERS[lessonId] ?? []).map(cleanBlock),
    duoMode,
  }
}

/** 作品路由用：只接受 lesson-01～12；未登记 id 一律 null（页面 notFound）。 */
export function getLaunchProjectLesson(lessonId: string) {
  if (!isLaunchProjectLessonId(lessonId)) return null
  return getLaunchV3Lesson(lessonId) ?? launchLessons.find((item) => item.id === lessonId) ?? null
}

export function emptyLaunchProjectDraft(lessonId: string): LaunchProjectDraft {
  const spec = getLaunchProjectSpec(lessonId)
  return {
    version: 1,
    kind: 'project',
    lessonId,
    program: spec ? spec.starterProgram.map((block) => ({ ...block })) : [],
  }
}

function knownBlocks(spec: LaunchProjectSpec): string[] {
  return [...new Set([...spec.allowedBlocks, 'when_start', 'when_clicked'])]
}

function isValidBlock(known: readonly string[], value: unknown): value is ProgramBlock {
  if (!value || typeof value !== 'object') return false
  const block = value as Partial<ProgramBlock>
  if (typeof block.type !== 'string' || !known.includes(block.type)) return false
  if (block.line !== undefined && (typeof block.line !== 'string' || !isKnownSayLine(block.line))) {
    return false
  }
  if (block.disconnected !== undefined && typeof block.disconnected !== 'boolean') return false
  return true
}

export function isValidLaunchProjectDraft(
  lessonId: string,
  value: unknown,
): value is LaunchProjectDraft {
  const spec = getLaunchProjectSpec(lessonId)
  if (!spec || !value || typeof value !== 'object') return false
  const draft = value as Partial<LaunchProjectDraft>
  if (draft.version !== 1 || draft.kind !== 'project' || draft.lessonId !== lessonId) return false
  if (!Array.isArray(draft.program)) return false
  const known = knownBlocks(spec)
  return draft.program.every((block) => isValidBlock(known, block))
}

function coerceProgram(
  spec: LaunchProjectSpec,
  value: unknown,
  fallback: ProgramBlock[],
): ProgramBlock[] {
  if (!Array.isArray(value)) return fallback.map((block) => ({ ...block }))
  const known = knownBlocks(spec)
  const out: ProgramBlock[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const block = item as Partial<ProgramBlock>
    if (typeof block.type !== 'string' || !known.includes(block.type)) continue
    const clean: ProgramBlock = { type: block.type }
    if (typeof block.line === 'string' && isKnownSayLine(block.line)) clean.line = block.line
    if (block.disconnected === true) clean.disconnected = true
    out.push(clean)
  }
  return out
}

/** 整形：只保留作品允许的积木；不是合法信封时回退到规格起始程序。 */
export function coerceLaunchProjectDraft(lessonId: string, value: unknown): LaunchProjectDraft {
  const spec = getLaunchProjectSpec(lessonId)
  if (!spec) return { version: 1, kind: 'project', lessonId, program: [] }
  const fallback = spec.starterProgram.map((block) => ({ ...block }))
  if (!value || typeof value !== 'object') {
    return { version: 1, kind: 'project', lessonId, program: fallback }
  }
  const raw = value as Partial<LaunchProjectDraft>
  if (raw.version !== 1 || raw.kind !== 'project' || raw.lessonId !== lessonId) {
    return { version: 1, kind: 'project', lessonId, program: fallback }
  }
  return { version: 1, kind: 'project', lessonId, program: coerceProgram(spec, raw.program, fallback) }
}

/** 作品 → 旧快照形状（只存 type 与所选对白，不带 editor-only 标记）。 */
export function toProjectSnapshotBlocks(program: ProgramBlock[]): SnapshotBlock[] {
  return program.map((block) =>
    block.line ? { type: block.type, line: block.line } : { type: block.type },
  )
}

/* ------------------------------------------------------------------ *
 * 作品数据：独立于课程草稿；保存时镜像到既有 projectSnapshots。
 * ------------------------------------------------------------------ */

const PROJECT_KEY_PREFIX = 'kidscoding-project:'

export function launchProjectDraftKey(lessonId: string): string {
  return `${PROJECT_KEY_PREFIX}${lessonId}`
}

function projectStorageKey(lessonId: string, owner: string): string {
  return scopedLessonDraftKey(owner, launchProjectDraftKey(lessonId))
}

function byteLength(text: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length
  return text.length
}

type ProjectEnvelope = {
  lessonId: string
  savedAt: string
  script: LaunchProjectDraft
  version: 1
}

function storage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

/** 读取已保存作品：作品草稿 → 旧作品快照 → null（外壳再用规格起始程序）。 */
export function loadLaunchProjectDraft(
  lessonId: string,
  owner?: string | null,
): LoadResult {
  const store = storage()
  if (!store) return { data: null, reason: '本机存储不可用' }
  if (typeof owner !== 'string' || owner.length === 0) {
    return { data: null, reason: '作品归属未确认，已拒绝读取' }
  }
  let raw: string | null = null
  try {
    raw = store.getItem(projectStorageKey(lessonId, owner))
  } catch {
    return { data: null, reason: '读取本机存储失败' }
  }
  if (raw !== null) {
    if (byteLength(raw) > DRAFT_MAX_BYTES) {
      return { data: null, reason: '作品超过 64KB 上限，已拒绝恢复' }
    }
    try {
      const parsed = JSON.parse(raw) as Partial<ProjectEnvelope> | null
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.lessonId === lessonId &&
        parsed.script !== undefined &&
        isValidLaunchProjectDraft(lessonId, parsed.script)
      ) {
        return { data: parsed.script, reason: null }
      }
      return { data: null, reason: '作品草稿格式无效，已拒绝恢复' }
    } catch {
      return { data: null, reason: '作品草稿已损坏，已拒绝恢复' }
    }
  }
  // 兼容旧作品：TQ-012 的 projectSnapshots（{type,line?} 或更早的 {type}）。
  try {
    const progress = readGuestProgress(owner)
    const snapshot = progress.projectSnapshots.find((item) => item.lessonId === lessonId)
    if (snapshot) {
      const blocks = sanitizeSnapshotBlocks(snapshot.blocks)
      const spec = getLaunchProjectSpec(lessonId)
      if (blocks.length > 0 && spec) {
        return {
          data: {
            version: 1,
            kind: 'project',
            lessonId,
            program: coerceProgram(spec, blocks, []),
          } satisfies LaunchProjectDraft,
          reason: null,
        }
      }
    }
  } catch {
    // 旧进度读取失败不阻断作品页：回退到起始程序。
  }
  return { data: null, reason: null }
}

function mirrorToProjectSnapshot(lessonId: string, program: ProgramBlock[], owner: string): void {
  try {
    const progress = readGuestProgress(owner)
    const blocks = toProjectSnapshotBlocks(program)
    writeGuestProgress(
      {
        ...progress,
        // 只替换本节作品快照；进度、星星、卡片与已完成课节原样保留。
        projectSnapshots: [
          ...progress.projectSnapshots.filter((snapshot) => snapshot.lessonId !== lessonId),
          { lessonId, blocks, updatedAt: new Date().toISOString() },
        ],
      },
      owner,
    )
  } catch {
    // 镜像失败不影响作品草稿已保存的事实。
  }
}

/** 保存作品：先写独立作品草稿，再镜像旧作品快照；绝不写课程草稿键。 */
export function saveLaunchProjectDraft(
  lessonId: string,
  value: unknown,
  owner?: string | null,
): SaveResult {
  const store = storage()
  if (!store) return { ok: false, reason: '本机存储不可用，未能保存' }
  if (typeof owner !== 'string' || owner.length === 0) {
    return { ok: false, reason: '作品归属未确认，未能保存' }
  }
  const spec = getLaunchProjectSpec(lessonId)
  if (!spec) return { ok: false, reason: '作品课节未登记，未能保存' }
  const draft = coerceLaunchProjectDraft(lessonId, value)
  const envelope: ProjectEnvelope = {
    lessonId,
    savedAt: new Date().toISOString(),
    script: draft,
    version: 1,
  }
  let text: string
  try {
    text = JSON.stringify(envelope)
  } catch {
    return { ok: false, reason: '作品无法序列化，未能保存' }
  }
  if (byteLength(text) > DRAFT_MAX_BYTES) {
    return { ok: false, reason: `作品超过 64KB 上限（${DRAFT_MAX_BYTES} 字节），未能保存` }
  }
  try {
    store.setItem(projectStorageKey(lessonId, owner), text)
  } catch {
    return { ok: false, reason: '写入本机存储失败，未能保存' }
  }
  mirrorToProjectSnapshot(lessonId, draft.program, owner)
  return { ok: true }
}

/**
 * 删除当前 owner 的独立作品信封（作品中心“删除作品”用）。
 * 旧快照由调用方一并删除，保证删除后作品不会从任何一份数据里重新出现。
 */
export function removeLaunchProjectDraft(
  lessonId: string,
  owner?: string | null,
): SaveResult {
  const store = storage()
  if (!store) return { ok: false, reason: '本机存储不可用，未能删除' }
  if (typeof owner !== 'string' || owner.length === 0) {
    return { ok: false, reason: '作品归属未确认，未能删除' }
  }
  try {
    store.removeItem(projectStorageKey(lessonId, owner))
    return { ok: true }
  } catch {
    return { ok: false, reason: '删除本机作品失败' }
  }
}

/** 外壳可注入的草稿读写口（LessonWorkspace.draftStore）。 */
export const launchProjectDraftStore = {
  load: (lessonId: string, owner?: string | null) => loadLaunchProjectDraft(lessonId, owner),
  save: (lessonId: string, script: unknown, owner?: string | null) =>
    saveLaunchProjectDraft(lessonId, script, owner),
}

/* ------------------------------------------------------------------ *
 * 运行：作品模式只如实播放，不按教学标准答案判定。
 * ------------------------------------------------------------------ */

export function launchProjectRunSource(lessonId: string): LaunchRunSource {
  return {
    coerce: (value) => {
      const draft = coerceLaunchProjectDraft(lessonId, value)
      return { stepIndex: 0, stepId: 'project', program: draft.program }
    },
    validate: (value) => isValidLaunchProjectDraft(lessonId, value),
    judge: (data) => judgeLaunchProject(lessonId, data.program),
    toJudgment: (result) => buildLaunchProjectJudgment(result),
  }
}

/* ------------------------------------------------------------------ *
 * 路由合同：同一套 StudioShell / LessonWorkspace，scopeLabel=开放创作。
 * ------------------------------------------------------------------ */

function projectGoal5(spec: LaunchProjectSpec): [string, string, string, string, string] {
  return [
    `这是什么作品：${spec.title}`,
    `可以怎么改：${spec.prompt}`,
    '学完能做什么：打开自己保存过的作品，改积木、运行、保存，再回来继续改。',
    '和课堂的关系：课堂草稿、课程进度和奖励保持原样；这里的修改只属于这件作品。',
    '现在做什么：改一改积木，按运行看看舞台，满意就保存。',
  ]
}

function projectHints(lessonId: string): { level: 1 | 2 | 3; title: string; text: string }[] {
  const lesson =
    getLaunchV3Lesson(lessonId) ?? launchLessons.find((item) => item.id === lessonId)
  const layers = lesson?.hintLayers ?? []
  return [
    { level: 1, title: '一级提示：先运行看看', text: '先按运行，看看现在的作品在舞台上是什么样子。' },
    {
      level: 2,
      title: '二级提示：改一块再运行',
      text: layers[1]?.copy ?? '一次只改一块积木，改完再按运行，看看舞台哪里变了。',
    },
    {
      level: 3,
      title: '三级提示：保存后重开',
      text: '满意就保存；重新打开这件作品，积木应该和保存时一样。',
    },
  ]
}

export function buildLaunchProjectContract(lessonId: string): LessonContract | null {
  const spec = getLaunchProjectSpec(lessonId)
  if (!spec) return null
  const hints = projectHints(lessonId)
  return {
    lessonId,
    title: `${spec.title} · 我的作品`,
    goal5: projectGoal5(spec),
    brief: spec.prompt,
    step: '作品模式：打开、修改、运行、保存，再重新打开。',
    hints: [hints[0].text, hints[1].text, hints[2].text],
    engine: 'slot',
    judging: {
      stageRule: '按运行后舞台如实播放当前积木；作品模式不按教学标准答案判分。',
      taskRule: '修改作品并保存；保存后重新打开应与保存时一致。',
      knowledgeRule: '作品模式不评教学知识点，只记录孩子自己的创作。',
      scopeLabel: '开放创作',
    },
    draftKey: draftKeyFor(lessonId),
    structuredHints: hints,
    methodSteps: [
      '第 1 步：按运行，看看现在的作品。',
      '第 2 步：改一改积木，再按运行。',
      '第 3 步：点保存，重新打开确认作品还在。',
    ],
    scopeGap: '作品模式只保存这件作品本身，不改变课程草稿、课程进度与奖励。',
    fileCapabilities: {
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    },
  }
}

export function buildLaunchProjectStudioLesson(lessonId: string): StudioLesson | null {
  const contract = buildLaunchProjectContract(lessonId)
  const spec = getLaunchProjectSpec(lessonId)
  if (!contract || !spec) return null
  return {
    ...contract,
    backHref: '/learn/portfolio',
    help: {
      title: `${spec.title} · 作品模式`,
      body: [
        '玩法：左边改积木，右边按运行看舞台；停止可以随时停下，重来把舞台放回起点。',
        '保存后重新打开这件作品，积木和保存时一样；课堂草稿和课程奖励不会被改动。',
        '作品模式不要求教学标准答案，孩子自己的作品怎么改都可以。',
      ],
    },
  }
}

export function launchProjectTemplate(lessonId: string) {
  return getLaunchV3Template(lessonId)
}
