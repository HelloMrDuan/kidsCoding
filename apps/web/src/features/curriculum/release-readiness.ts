// RELEASE-102: seven traceable release gates. A gate passes only with a
// positive, auditable record (status "pass", at least one evidence reference,
// a named reviewer and an ISO date). Booleans alone are never accepted.
// Content != publication: L5 needs all seven, and owner approval comes last.
import releaseEvidenceFile from '@/content/curriculum/release-evidence-v1.json'

export const releaseRequirements = [
  { key: 'contentReviewed', label: '详细教案和学习目标完成独立审阅', short: '内容' },
  { key: 'engineProductionReady', label: '对应运行引擎在目标浏览器和真实设备完成验收', short: '引擎' },
  { key: 'assessmentE2EPassed', label: '多组正反测评和课程E2E均已验证', short: 'E2E' },
  { key: 'licensedAssetsReady', label: '需要的插画音效配音均完成并清理授权', short: '授权' },
  { key: 'progressVerified', label: '正式登录态的作品保存和跨设备进度已验证', short: '进度' },
  { key: 'minorPrivacyApproved', label: '儿童隐私、输入和沙箱安全完成审核', short: '隐私' },
  { key: 'humanApproved', label: '负责人逐课批准正式发布', short: '人审' },
] as const

export type ReleaseRequirement = (typeof releaseRequirements)[number]['key']
export type ReleaseRequirementMeta = (typeof releaseRequirements)[number]

export type EvidenceKind = 'file' | 'ci' | 'pr' | 'review'
export type EvidenceRef = { kind: EvidenceKind; ref: string }
export type GateStatus = 'pass' | 'fail' | 'unchecked'
export type GateRecord = {
  status: GateStatus
  evidence?: EvidenceRef[]
  reviewer?: string
  /** "owner" | "independent" | "implementer" | "ai" */
  reviewerRole?: string
  date?: string
  note?: string
}
export type LessonReleaseRecord = Partial<Record<ReleaseRequirement, GateRecord>>

/** Facts derived from the repository (schema, trials, assets); records cannot override them. */
export type ReleaseContext = {
  hasTrial?: boolean
  hasE2E?: boolean
  inExampleDebt?: boolean
  hasUnlicensedRequiredAsset?: boolean
  /** When given, file evidence must be one of these existing repo paths. */
  fileExists?: (path: string) => boolean
}

export type GateDecision = { key: ReleaseRequirement; label: string; short: string; passed: boolean; status: GateStatus; reasons: string[]; evidence: EvidenceRef[]; reviewer: string | null; date: string | null; note: string | null }

const CI_URL = /^https:\/\/github\.com\/HelloMrDuan\/kidsCoding\/actions\/runs\/\d+$/
const PR_URL = /^https:\/\/github\.com\/HelloMrDuan\/kidsCoding\/pull\/\d+$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SAFE_PATH = /^(docs|apps|examples|scripts)\/[\w./-]+$/

export function evidenceRefProblem(item: EvidenceRef, ctx: ReleaseContext = {}): string | null {
  switch (item.kind) {
    case 'ci':
      return CI_URL.test(item.ref) ? null : `CI 证据不是本仓库 Actions 运行链接：${item.ref}`
    case 'pr':
      return PR_URL.test(item.ref) ? null : `PR 证据不是本仓库 PR 链接：${item.ref}`
    case 'file':
    case 'review':
      if (!SAFE_PATH.test(item.ref) || item.ref.includes('..')) return `证据文件路径无效：${item.ref}`
      if (ctx.fileExists && !ctx.fileExists(item.ref)) return `证据文件不存在：${item.ref}`
      return null
    default:
      return `未知证据类型`
  }
}

function judgeGate(meta: ReleaseRequirementMeta, record: GateRecord | undefined, ctx: ReleaseContext, earlierPassed: boolean): GateDecision {
  const reasons: string[] = []
  const evidence = record?.evidence ?? []
  const status: GateStatus = record?.status ?? 'unchecked'
  if (status !== 'pass') reasons.push(status === 'fail' ? '审核未通过' : '尚未提交证据')
  if (status === 'pass') {
    if (evidence.length === 0) reasons.push('标记通过但没有证据')
    for (const item of evidence) {
      const problem = evidenceRefProblem(item, ctx)
      if (problem) reasons.push(problem)
    }
    if (!record?.reviewer?.trim()) reasons.push('缺审阅人')
    if (!record?.date || !ISO_DATE.test(record.date)) reasons.push('缺审阅日期')
    if (record?.reviewerRole === 'ai') reasons.push('AI 评分不能作为发布证据')
  }
  // Repository facts the record cannot override.
  switch (meta.key) {
    case 'contentReviewed':
      if (status === 'pass' && record?.reviewerRole === 'implementer') reasons.push('实现者不能独立审阅自己的教案')
      if (status === 'pass' && !evidence.some(e => e.kind === 'review')) reasons.push('缺教学审阅记录文件')
      break
    case 'engineProductionReady':
      if (!ctx.hasTrial) reasons.push('没有接入真实运行引擎')
      break
    case 'assessmentE2EPassed':
      if (!ctx.hasE2E) reasons.push('没有课程 E2E')
      if (ctx.inExampleDebt) reasons.push('仍在正反例欠账名单中')
      if (status === 'pass' && !evidence.some(e => e.kind === 'ci')) reasons.push('缺 CI 运行证据')
      break
    case 'licensedAssetsReady':
      if (ctx.hasUnlicensedRequiredAsset) reasons.push('有必需素材未授权')
      break
    case 'humanApproved':
      if (status === 'pass' && record?.reviewerRole !== 'owner') reasons.push('只有负责人可以批准正式发布')
      if (!earlierPassed) reasons.push('前六道门禁未全部通过，不能批准')
      break
  }
  return {
    key: meta.key, label: meta.label, short: meta.short,
    passed: reasons.length === 0, status, reasons: [...new Set(reasons)], evidence,
    reviewer: record?.reviewer ?? null, date: record?.date ?? null, note: record?.note ?? null,
  }
}

export function evaluateLessonRelease(record: LessonReleaseRecord, ctx: ReleaseContext = {}) {
  const gates: GateDecision[] = []
  for (const meta of releaseRequirements) {
    const earlierPassed = gates.every(g => g.passed)
    gates.push(judgeGate(meta, record[meta.key], ctx, earlierPassed))
  }
  const missing = gates.filter(g => !g.passed)
  return {
    ready: missing.length === 0,
    /** Every gate except owner approval holds (L4). */
    verified: missing.length === 1 && missing[0].key === 'humanApproved',
    passedCount: gates.length - missing.length,
    gates,
    missing,
  }
}

type EvidenceFile = { version: number; lessons: Record<string, LessonReleaseRecord> }
export const releaseEvidence = (releaseEvidenceFile as EvidenceFile).lessons

/** Recorded release evidence for a lesson; absent = every gate unchecked. */
export function getLessonReleaseRecord(id: string): LessonReleaseRecord {
  return releaseEvidence[id] ?? {}
}
