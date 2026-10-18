/**
 * TQ-001 — per-lesson teaching-quality review sheet and scoring tool.
 *
 * Implements docs/roadmap/09-TEACHING-QUALITY-GATE.md §2 (single lesson = 100 points, six
 * dimensions, nine hard vetoes) and the report template of 10-TEACHING-QUALITY-EXEMPLARS.md.
 * Filled reviews live in docs/roadmap/teaching-reviews/<lessonId>.json and are validated by
 * teaching-review.test.ts, so every score is reproducible from the recorded evidence.
 *
 * Rules enforced here (never relax):
 * - A score above 0 needs at least one evidence reference (file path, E2E name, URL, log).
 * - An AI or self review can never make a lesson a quality candidate (09: 禁止仅由 AI 自评分).
 * - Any hard veto that failed — or that nobody checked — blocks the candidate verdict.
 * - Teaching quality and page/visual quality are scored separately (no cross-subsidy).
 * - A review never promotes a lesson to L5; publication still needs the owner's approval.
 */

export const reviewDimensions = [
  { key: 'knowledge', label: '知识设计与递进', max: 20 },
  { key: 'story', label: '教学故事与思维激活', max: 15 },
  { key: 'practice', label: '实际操作与能力形成', max: 25 },
  { key: 'feedback', label: '纠错与个性化反馈', max: 15 },
  { key: 'creation', label: '创造/迁移/项目成果', max: 15 },
  { key: 'assessment', label: '评价、复盘与可信度', max: 10 },
] as const

export type DimensionKey = (typeof reviewDimensions)[number]['key']

export const hardVetoes = [
  { key: 'fake-execution', label: '使用假的 Blockly/Scratch/Python 执行或已知错误教学知识' },
  { key: 'no-hands-on', label: '没有学生本人可操作的活动，全部是一键播放/选择题' },
  { key: 'no-failure-test', label: '缺失正常执行与至少一个真实错误或边界测试' },
  { key: 'rigid-answer', label: '只能用唯一答案拼块却声称允许自由创作，或合理程序不能通过' },
  { key: 'fake-project', label: '不存在项目成果，却展示“课程项目已完成”' },
  { key: 'unlicensed-assets', label: '未经授权搬运商用课程/角色/课件/肖像/音频' },
  { key: 'minor-privacy-risk', label: '未成年人隐私、认证、云端隔离或公开作品存在未解决高风险' },
  { key: 'broken-or-false-success', label: '关键按钮无响应、断线假成功、保存失败却提示已保存' },
  { key: 'id-status-mismatch', label: '课程 ID 与引擎/发布状态不一致，或把大纲课视为正式发布' },
] as const

export type VetoKey = (typeof hardVetoes)[number]['key']
/** pass = checked and not triggered; fail = triggered; unchecked = nobody verified yet. */
export type VetoStatus = 'pass' | 'fail' | 'unchecked'

export type DimensionScore = { score: number; evidence: string[]; defects?: string[] }

export type RunEvidence = {
  /** 正常执行：做了什么、观察到什么、证据位置。 */
  normalRun: string | null
  /** 真实错误或边界：输入/积木/场景 + 实际现象。 */
  failureCase: string | null
  /** 三层提示的原文或其源码位置（按顺序）。 */
  hintLayers: string[]
  /** 两项目标不同的亲手练习。 */
  practiceA: string | null
  practiceB: string | null
  /** 不同正确作品：方案 A/B 及都通过的结果断言（引擎不支持时写 null 并在 blockers 说明）。 */
  equivalentSolutions: string[]
  /** 保存 → 关闭 → 重开 → 运行 → 修改 → 再运行的步骤与结果。 */
  saveReopen: string | null
  e2eSpecs: string[]
  screenshots: string[]
}

export type TeachingReview = {
  schemaVersion: 1
  lessonId: string
  /** 被审代码的 commit SHA，复查时以此为准。 */
  reviewedCommit: string
  reviewedAt: string
  reviewer: string
  reviewerKind: 'human' | 'ai'
  /** 审核人不是本课实现者。 */
  independent: boolean
  ageBand: string
  prerequisites: string[]
  newConcepts: string[]
  /** 参考的官网方法：来源 URL、日期、保留/舍弃理由。 */
  references: string[]
  scores: Record<DimensionKey, DimensionScore>
  vetoes: Record<VetoKey, { status: VetoStatus; note?: string }>
  runEvidence: RunEvidence
  /** 当前登记的成熟度（lesson-maturity.ts 的 L0–L5）。 */
  maturityLevel: 0 | 1 | 2 | 3 | 4 | 5
  childTrial: 'none' | 'internal-simulation' | 'authorized-child-trial'
  blockers: string[]
  notes?: string
}

export type ReviewBand = 'candidate' | 'polish' | 'redo'

export type ReviewVerdict = {
  valid: boolean
  /** Schema/consistency problems; a review with problems is not a usable record. */
  problems: string[]
  total: number
  band: ReviewBand
  failedVetoes: VetoKey[]
  uncheckedVetoes: VetoKey[]
  runEvidenceComplete: boolean
  /** 优质课程候选：≥90 + 无硬否决（全部已核）+ 独立人工复核 + 运行证据齐全。 */
  qualityCandidate: boolean
  /** Highest maturity this review can justify; never 5 (owner approval is separate). */
  maxMaturitySupported: 3 | 4
  reasons: string[]
}

export function bandFor(total: number): ReviewBand {
  if (total >= 90) return 'candidate'
  if (total >= 80) return 'polish'
  return 'redo'
}

export function missingRunEvidence(run: RunEvidence): string[] {
  const missing: string[] = []
  if (!run.normalRun) missing.push('正常执行')
  if (!run.failureCase) missing.push('真实错误或边界测试')
  if (run.hintLayers.length < 3) missing.push('三层提示')
  if (!run.practiceA || !run.practiceB) missing.push('两项目标不同的亲手练习')
  if (run.equivalentSolutions.length < 2) missing.push('两种不同的正确方案')
  if (!run.saveReopen) missing.push('保存重开验证')
  if (run.e2eSpecs.length === 0) missing.push('真实浏览器 E2E')
  return missing
}

export function evaluateReview(review: TeachingReview): ReviewVerdict {
  const problems: string[] = []
  if (review.schemaVersion !== 1) problems.push('schemaVersion 必须为 1')
  if (!review.lessonId) problems.push('缺少 lessonId')
  if (!/^[0-9a-f]{7,40}$/.test(review.reviewedCommit ?? '')) problems.push('reviewedCommit 必须是被审代码的 commit SHA')
  if (!/^\d{4}-\d{2}-\d{2}/.test(review.reviewedAt ?? '')) problems.push('reviewedAt 必须是 YYYY-MM-DD 日期')
  if (!review.reviewer) problems.push('缺少审核人')

  let total = 0
  for (const dimension of reviewDimensions) {
    const entry = review.scores?.[dimension.key]
    if (!entry) {
      problems.push(`缺少维度「${dimension.label}」`)
      continue
    }
    if (!Number.isInteger(entry.score) || entry.score < 0 || entry.score > dimension.max) {
      problems.push(`「${dimension.label}」分数必须是 0–${dimension.max} 的整数`)
      continue
    }
    if (entry.score > 0 && (!entry.evidence || entry.evidence.filter(Boolean).length === 0)) {
      problems.push(`「${dimension.label}」给了 ${entry.score} 分但没有证据`)
    }
    total += entry.score
  }

  const failedVetoes: VetoKey[] = []
  const uncheckedVetoes: VetoKey[] = []
  for (const veto of hardVetoes) {
    const entry = review.vetoes?.[veto.key]
    if (!entry) {
      problems.push(`缺少硬否决项「${veto.label}」`)
      uncheckedVetoes.push(veto.key)
      continue
    }
    if (entry.status === 'fail') {
      failedVetoes.push(veto.key)
      if (!entry.note) problems.push(`硬否决「${veto.label}」被触发但没有写明原因`)
    } else if (entry.status === 'unchecked') {
      uncheckedVetoes.push(veto.key)
    } else if (entry.status !== 'pass') {
      problems.push(`硬否决「${veto.label}」状态只能是 pass/fail/unchecked`)
    }
  }

  const missing = review.runEvidence ? missingRunEvidence(review.runEvidence) : ['运行证据']
  const runEvidenceComplete = missing.length === 0
  const band = bandFor(total)

  const reasons: string[] = []
  if (band !== 'candidate') reasons.push(band === 'polish' ? `总分 ${total}，80–89 需打磨` : `总分 ${total}，低于 80 退回重做`)
  if (failedVetoes.length) reasons.push(`触发硬否决：${failedVetoes.join('、')}`)
  if (uncheckedVetoes.length) reasons.push(`硬否决未核查：${uncheckedVetoes.join('、')}`)
  if (review.reviewerKind !== 'human') reasons.push('AI 评分只能作参考，不能认定优质')
  if (!review.independent) reasons.push('审核人不独立（是实现者本人）')
  if (!runEvidenceComplete) reasons.push(`运行证据缺少：${missing.join('、')}`)
  if (problems.length) reasons.push('审核表本身有问题，需要先修正')

  const qualityCandidate = reasons.length === 0
  return {
    valid: problems.length === 0,
    problems,
    total,
    band,
    failedVetoes,
    uncheckedVetoes,
    runEvidenceComplete,
    qualityCandidate,
    maxMaturitySupported: qualityCandidate ? 4 : 3,
    reasons,
  }
}

/** Empty, fillable review for a lesson (every veto unchecked, every score 0). */
export function createReviewTemplate(lessonId: string): TeachingReview {
  const scores = Object.fromEntries(reviewDimensions.map((d) => [d.key, { score: 0, evidence: [], defects: [] }])) as unknown as Record<DimensionKey, DimensionScore>
  const vetoes = Object.fromEntries(hardVetoes.map((v) => [v.key, { status: 'unchecked' as VetoStatus, note: '' }])) as Record<VetoKey, { status: VetoStatus; note?: string }>
  return {
    schemaVersion: 1,
    lessonId,
    reviewedCommit: '',
    reviewedAt: '',
    reviewer: '',
    reviewerKind: 'human',
    independent: false,
    ageBand: '',
    prerequisites: [],
    newConcepts: [],
    references: [],
    scores,
    vetoes,
    runEvidence: { normalRun: null, failureCase: null, hintLayers: [], practiceA: null, practiceB: null, equivalentSolutions: [], saveReopen: null, e2eSpecs: [], screenshots: [] },
    maturityLevel: 0,
    childTrial: 'none',
    blockers: [],
  }
}

const bandLabel: Record<ReviewBand, string> = { candidate: '≥90 优质候选分段', polish: '80–89 需打磨', redo: '<80 退回重做' }

/** Markdown report to paste into a lesson PR (10 §样板评审报告模板). */
export function renderReviewMarkdown(review: TeachingReview): string {
  const verdict = evaluateReview(review)
  const lines = [
    `## 课程质量审核：${review.lessonId}`,
    '',
    `- 被审 commit：\`${review.reviewedCommit || '未填'}\`；审核日期：${review.reviewedAt || '未填'}`,
    `- 审核人：${review.reviewer || '未填'}（${review.reviewerKind === 'human' ? '人工' : 'AI 参考'}${review.independent ? '，独立' : '，非独立'}）`,
    `- 年龄段：${review.ageBand || '未填'}；先修：${review.prerequisites.join('、') || '无'}；新知识：${review.newConcepts.join('、') || '未填'}`,
    `- 成熟度：L${review.maturityLevel}；儿童试学：${review.childTrial}`,
    '',
    '| 维度 | 得分 | 证据 | 缺陷 |',
    '| --- | ---: | --- | --- |',
    ...reviewDimensions.map((d) => {
      const s = review.scores[d.key]
      return `| ${d.label} | ${s.score}/${d.max} | ${s.evidence.join('<br>') || '—'} | ${(s.defects ?? []).join('<br>') || '—'} |`
    }),
    `| **总计** | **${verdict.total}/100** | ${bandLabel[verdict.band]} | |`,
    '',
    '| 硬否决项 | 结果 | 说明 |',
    '| --- | --- | --- |',
    ...hardVetoes.map((v) => `| ${v.label} | ${review.vetoes[v.key].status} | ${review.vetoes[v.key].note || '—'} |`),
    '',
    '| 运行证据 | 记录 |',
    '| --- | --- |',
    `| 正常执行 | ${review.runEvidence.normalRun ?? '缺'} |`,
    `| 错误/边界 | ${review.runEvidence.failureCase ?? '缺'} |`,
    `| 三层提示 | ${review.runEvidence.hintLayers.join(' → ') || '缺'} |`,
    `| 练习 A / B | ${review.runEvidence.practiceA ?? '缺'} / ${review.runEvidence.practiceB ?? '缺'} |`,
    `| 不同正确方案 | ${review.runEvidence.equivalentSolutions.join('；') || '缺'} |`,
    `| 保存重开 | ${review.runEvidence.saveReopen ?? '缺'} |`,
    `| E2E | ${review.runEvidence.e2eSpecs.join('、') || '缺'} |`,
    '',
    `**结论**：${verdict.qualityCandidate ? '优质课程候选（仍需负责人批准才能发布 L5）' : `不是优质候选 — ${verdict.reasons.join('；')}`}`,
  ]
  if (review.blockers.length) lines.push('', `**阻塞**：${review.blockers.join('；')}`)
  return lines.join('\n')
}
