/**
 * Lesson Content Contract — TypeScript types for docs/product/p0-kitten-workspace/LESSON-CONTRACT.md v1.1.
 *
 * The shell only renders contract content; it never invents lesson titles, tasks, hints or answers.
 * Demo contracts (demo-contracts.ts) are the only contracts this shell serves in this branch,
 * and every one of them is labelled 演示 in UI copy and in code comments.
 */

import type {
  CourseInfoExtension,
  FileCapabilities,
  StructuredHint,
} from './workspace-slots'

/**
 * Engine values (OPS-026, Issue #482 chief ruling option ②): 'slot' is the
 * generic slot-lesson engine — a course-owned EditorSlot with no forced
 * Blockly/Scratch mount. 'json' is deliberately NOT an engine value: a JSON
 * course must use 'slot', never masquerade as 'summary'. 'summary' stays
 * the summary-editing engine only.
 */
export type WorkspaceEngine = 'blockly' | 'scratch-vm' | 'summary' | 'slot'

export type ScopeLabel = '教学定向' | '开放创作'

/**
 * Three-layer judging rules. stageRule/taskRule/knowledgeRule are the human-readable
 * rule texts from the contract; `target` is an optional DEMO-ONLY numeric target
 * (fruit position + catch threshold) used by the demo stage runner and the demo
 * judging builder. Formal lessons must carry chief-approved parameters here instead
 * of demo values; nothing in the shell hardcodes a formal lesson's numbers.
 */
export type JudgingRules = {
  stageRule: string
  taskRule: string
  knowledgeRule: string
  scopeLabel: ScopeLabel
  target?: {
    fruitX: number
    threshold: number
  }
}

export type LessonContract = {
  lessonId: string
  title: string
  /** Exactly 5 strings: 学什么 / 解决问题 / 学完能做什么 / 和上节课的联系 / 当前步骤. */
  goal5: [string, string, string, string, string]
  brief: string
  step: string
  /** Exactly 3 tiers: 方向 / 知识点与积木 / 局部示范与调试线索. */
  hints: [string, string, string]
  engine: WorkspaceEngine
  judging: JudgingRules
  draftKey: `kidscoding-draft:${string}`
  /** True only for demo fixtures. Demo contracts are never formal lesson data. */
  demo?: boolean
  /**
   * Engine extension fields (all optional, purely additive).
   * `structuredHints` renders level/title/text with the same cumulative
   * reveal; without it the shell renders the plain `hints` strings.
   * `methodSteps` / `scopeGap` / `progress` / `activities` render ONLY
   * inside the task drawer, never in the permanent editing area.
   * `hasStage: false` renders no stage area at all (stage-less courses,
   * e.g. summary and slot lessons).
   * `fileCapabilities` hides file operations the adapter does not support;
   * absent capabilities keep the demo default (all shown). Adopting the
   * structured hint form in the frozen spec text is a chief decision (C2);
   * this code only makes the form available.
   */
  structuredHints?: StructuredHint[]
  methodSteps?: string[]
  scopeGap?: string
  progress?: { label: string; current: number; total: number }
  activities?: { level: 1 | 2 | 3; title: string; text: string }[]
  fileCapabilities?: FileCapabilities
  hasStage?: boolean
}

/** Course-info extension view of a contract (drawer-only fields). */
export type ContractCourseInfo = CourseInfoExtension

export function draftKeyFor(lessonId: string): `kidscoding-draft:${string}` {
  return `kidscoding-draft:${lessonId}`
}

/**
 * Validate a contract without throwing. Returns one human-readable error per problem;
 * an empty list means the contract is well-formed. The shell refuses to render a
 * contract with errors (fail-closed) instead of guessing missing content.
 */
export function validateLessonContract(contract: unknown): string[] {
  const errors: string[] = []
  if (!contract || typeof contract !== 'object') {
    return ['契约不是对象']
  }
  const c = contract as Partial<LessonContract>
  if (typeof c.lessonId !== 'string' || c.lessonId.length === 0) {
    errors.push('lessonId 缺失或不是字符串')
  }
  if (typeof c.title !== 'string' || c.title.length === 0) {
    errors.push('title 缺失或不是字符串')
  }
  if (!Array.isArray(c.goal5) || c.goal5.length !== 5 || c.goal5.some((g) => typeof g !== 'string' || g.length === 0)) {
    errors.push('goal5 必须恰好是 5 条非空字符串')
  }
  if (typeof c.brief !== 'string' || c.brief.length === 0) {
    errors.push('brief 缺失或不是字符串')
  }
  if (typeof c.step !== 'string' || c.step.length === 0) {
    errors.push('step 缺失或不是字符串')
  }
  if (!Array.isArray(c.hints) || c.hints.length !== 3 || c.hints.some((h) => typeof h !== 'string' || h.length === 0)) {
    errors.push('hints 必须恰好是 3 条非空字符串')
  }
  if (c.engine !== 'blockly' && c.engine !== 'scratch-vm' && c.engine !== 'summary' && c.engine !== 'slot') {
    errors.push('engine 必须是 blockly、scratch-vm、summary 或 slot')
  }
  if (!c.judging || typeof c.judging !== 'object') {
    errors.push('judging 缺失')
  } else {
    const j = c.judging as Partial<JudgingRules>
    if (typeof j.stageRule !== 'string' || j.stageRule.length === 0) errors.push('judging.stageRule 缺失')
    if (typeof j.taskRule !== 'string' || j.taskRule.length === 0) errors.push('judging.taskRule 缺失')
    if (typeof j.knowledgeRule !== 'string' || j.knowledgeRule.length === 0) errors.push('judging.knowledgeRule 缺失')
    if (j.scopeLabel !== '教学定向' && j.scopeLabel !== '开放创作') errors.push('judging.scopeLabel 必须是教学定向或开放创作')
    if (j.target !== undefined) {
      if (
        typeof j.target.fruitX !== 'number' ||
        !Number.isFinite(j.target.fruitX) ||
        typeof j.target.threshold !== 'number' ||
        !Number.isFinite(j.target.threshold) ||
        j.target.threshold < 0
      ) {
        errors.push('judging.target 必须是有限数字 fruitX 与非负 threshold')
      }
    }
  }
  if (typeof c.draftKey !== 'string' || !c.draftKey.startsWith('kidscoding-draft:') || c.draftKey.length <= 'kidscoding-draft:'.length) {
    errors.push('draftKey 必须形如 kidscoding-draft:{lessonId}')
  } else if (typeof c.lessonId === 'string' && c.lessonId.length > 0 && c.draftKey !== draftKeyFor(c.lessonId)) {
    errors.push('draftKey 与 lessonId 不一致')
  }
  // Optional extension fields: validated only when present, never required.
  if (c.structuredHints !== undefined) {
    const ok =
      Array.isArray(c.structuredHints) &&
      c.structuredHints.every(
        (h) =>
          h !== null &&
          typeof h === 'object' &&
          (h.level === 1 || h.level === 2 || h.level === 3) &&
          typeof h.title === 'string' &&
          h.title.length > 0 &&
          typeof h.text === 'string' &&
          h.text.length > 0,
      )
    if (!ok) errors.push('structuredHints 每项必须是 level 1|2|3 且 title/text 非空')
  }
  if (c.methodSteps !== undefined) {
    const ok = Array.isArray(c.methodSteps) && c.methodSteps.every((s) => typeof s === 'string' && s.length > 0)
    if (!ok) errors.push('methodSteps 必须是非空字符串数组')
  }
  if (c.scopeGap !== undefined && typeof c.scopeGap !== 'string') {
    errors.push('scopeGap 必须是字符串')
  }
  if (c.progress !== undefined) {
    const p = c.progress as Partial<{ label: string; current: number; total: number }>
    const ok =
      p !== null &&
      typeof p === 'object' &&
      typeof p.label === 'string' &&
      typeof p.current === 'number' &&
      Number.isFinite(p.current) &&
      typeof p.total === 'number' &&
      Number.isFinite(p.total) &&
      p.total > 0
    if (!ok) errors.push('progress 必须是 label 字符串与有限 current/total，且 total > 0')
  }
  if (c.activities !== undefined) {
    const ok =
      Array.isArray(c.activities) &&
      c.activities.every(
        (a) =>
          a !== null &&
          typeof a === 'object' &&
          (a.level === 1 || a.level === 2 || a.level === 3) &&
          typeof a.title === 'string' &&
          a.title.length > 0 &&
          typeof a.text === 'string' &&
          a.text.length > 0,
      )
    if (!ok) errors.push('activities 每项必须是 level 1|2|3 且 title/text 非空')
  }
  if (c.fileCapabilities !== undefined) {
    const f = c.fileCapabilities as Partial<FileCapabilities>
    const ok =
      f !== null &&
      typeof f === 'object' &&
      (['canNew', 'canSave', 'canExport', 'canImport', 'canReset'] as const).every(
        (k) => f[k] === undefined || typeof f[k] === 'boolean',
      )
    if (!ok) errors.push('fileCapabilities 各项必须是布尔值')
  }
  if (c.hasStage !== undefined && typeof c.hasStage !== 'boolean') {
    errors.push('hasStage 必须是布尔值')
  }
  return errors
}

/** Throwing variant for call sites that must not proceed with a bad contract. */
export function assertLessonContract(contract: unknown): asserts contract is LessonContract {
  const errors = validateLessonContract(contract)
  if (errors.length > 0) {
    throw new Error(`课程契约无效：${errors.join('；')}`)
  }
}
