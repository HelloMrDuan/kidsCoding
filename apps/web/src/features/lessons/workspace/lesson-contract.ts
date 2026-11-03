/**
 * Lesson Content Contract — TypeScript types for docs/product/p0-kitten-workspace/LESSON-CONTRACT.md v1.0.
 *
 * The shell only renders contract content; it never invents lesson titles, tasks, hints or answers.
 * Demo contracts (demo-contracts.ts) are the only contracts this shell serves in this branch,
 * and every one of them is labelled 演示 in UI copy and in code comments.
 */

export type WorkspaceEngine = 'blockly' | 'scratch-vm' | 'summary'

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
}

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
  if (c.engine !== 'blockly' && c.engine !== 'scratch-vm' && c.engine !== 'summary') {
    errors.push('engine 必须是 blockly、scratch-vm 或 summary')
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
  return errors
}

/** Throwing variant for call sites that must not proceed with a bad contract. */
export function assertLessonContract(contract: unknown): asserts contract is LessonContract {
  const errors = validateLessonContract(contract)
  if (errors.length > 0) {
    throw new Error(`课程契约无效：${errors.join('；')}`)
  }
}
