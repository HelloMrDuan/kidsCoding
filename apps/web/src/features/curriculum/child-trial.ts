// RELEASE-103: consented, age-appropriate child trial records.
// A trial only counts with guardian consent recorded before the session, an
// anonymised child code (no names, schools, phones, photos), an age band that
// fits the lesson, a named human observer and a non-AI reviewer. Without a
// valid trial nobody may claim a lesson was "tested with children".
import trialFile from '@/content/curriculum/child-trials-v1.json'

export const CONSENT_FORM = 'docs/roadmap/child-trials/consent-v1.md'
export const OBSERVATION_SHEET = 'docs/roadmap/child-trials/observation-sheet-v1.md'

export type ChildTrialLesson = {
  lessonId: string
  completed: boolean
  minutes: number
  hintsUsed: number
  stuckPoints: string[]
  /** Child's own words, paraphrased, no identifying details. */
  childFeedback?: string
}

export type ChildTrialRecord = {
  trialId: string
  date: string
  childCode: string
  /** Child's age in whole years at the session. */
  age: number
  setting: 'home' | 'classroom' | 'online'
  device: string
  consent: { guardianConsent: boolean; consentDate: string; form: string; recordingAllowed: boolean }
  observer: { name: string; role: 'owner' | 'teacher' | 'parent' | 'researcher' }
  lessons: ChildTrialLesson[]
  issues: string[]
  reviewer: { name: string; role: 'owner' | 'independent' | 'implementer' | 'ai'; date: string }
}

export type TrialProblem = { trialId: string; detail: string }

/** Age ranges a lesson may be trialled at (from the catalog tracks; launch lessons map to G0/G1). */
export const TRIAL_AGE_RANGES: Array<{ match: RegExp; min: number; max: number }> = [
  { match: /^G0-/, min: 5, max: 7 },
  { match: /^G1-/, min: 6, max: 9 },
  { match: /^G2-/, min: 7, max: 11 },
  { match: /^(G3|P0)-/, min: 9, max: 13 },
  { match: /^lesson-\d{2}-/, min: 5, max: 9 },
]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const CHILD_CODE = /^C\d{2,4}$/
/** Keys that would carry personal data; a record containing any of them is rejected. */
const FORBIDDEN_KEYS = ['name', 'childName', 'realName', 'school', 'className', 'phone', 'email', 'address', 'photo', 'video', 'audio', 'idCard', 'birthday']

function findForbiddenKeys(value: unknown, path = ''): string[] {
  if (!value || typeof value !== 'object') return []
  const hits: string[] = []
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    const here = path ? `${path}.${key}` : key
    // observer.name and reviewer.name are adults' names and allowed.
    if (FORBIDDEN_KEYS.includes(key) && !/^(observer|reviewer)\.name$/.test(here)) hits.push(here)
    hits.push(...findForbiddenKeys(inner, here))
  }
  return hits
}

export function ageRangeFor(lessonId: string) {
  return TRIAL_AGE_RANGES.find(r => r.match.test(lessonId)) ?? null
}

export function validateChildTrial(record: ChildTrialRecord, knownTrialLessons: readonly string[]): TrialProblem[] {
  const problems: string[] = []
  const r = record
  if (!r.trialId?.trim()) problems.push('缺试学编号')
  if (!ISO_DATE.test(r.date ?? '')) problems.push('试学日期无效')
  if (!CHILD_CODE.test(r.childCode ?? '')) problems.push('儿童编号必须是匿名代码，如 C01')
  for (const key of findForbiddenKeys(r)) problems.push(`记录含个人信息字段：${key}`)
  if (!r.consent?.guardianConsent) problems.push('缺监护人同意')
  if (!ISO_DATE.test(r.consent?.consentDate ?? '')) problems.push('缺同意日期')
  else if (ISO_DATE.test(r.date ?? '') && r.consent.consentDate > r.date) problems.push('同意日期晚于试学日期')
  if (r.consent?.form !== CONSENT_FORM) problems.push('未使用登记的同意书版本')
  if (!Number.isInteger(r.age) || r.age < 4 || r.age > 18) problems.push('年龄无效')
  if (!r.observer?.name?.trim()) problems.push('缺现场观察人')
  if (!r.lessons?.length) problems.push('没有试学课程')
  for (const lesson of r.lessons ?? []) {
    if (!knownTrialLessons.includes(lesson.lessonId)) problems.push(`${lesson.lessonId} 不是可试玩课程`)
    const range = ageRangeFor(lesson.lessonId)
    if (!range) problems.push(`${lesson.lessonId} 没有登记适龄范围`)
    else if (r.age < range.min || r.age > range.max) problems.push(`${lesson.lessonId} 适龄 ${range.min}～${range.max} 岁，试学儿童 ${r.age} 岁`)
    if (!(lesson.minutes > 0 && lesson.minutes <= 60)) problems.push(`${lesson.lessonId} 时长需在 1～60 分钟`)
    if (!(Number.isInteger(lesson.hintsUsed) && lesson.hintsUsed >= 0)) problems.push(`${lesson.lessonId} 提示次数无效`)
  }
  if (!r.reviewer?.name?.trim() || !ISO_DATE.test(r.reviewer?.date ?? '')) problems.push('缺人工审阅人或审阅日期')
  if (r.reviewer?.role === 'ai' || r.reviewer?.role === 'implementer') problems.push('试学记录须由负责人或独立审阅人审阅')
  return problems.map(detail => ({ trialId: r.trialId ?? '(无编号)', detail }))
}

type TrialFile = { version: number; trials: ChildTrialRecord[] }
export const childTrials = (trialFile as unknown as TrialFile).trials

/** Valid trials covering a lesson. */
export function validTrialsFor(lessonId: string, knownTrialLessons: readonly string[]) {
  return childTrials.filter(t => t.lessons.some(l => l.lessonId === lessonId) && validateChildTrial(t, knownTrialLessons).length === 0)
}

/** Phrases that claim child testing; forbidden anywhere in product copy until a valid trial exists. */
export const CHILD_TESTING_CLAIMS = /儿童实测|孩子实测|经儿童测试|已获儿童验证|儿童验证通过|真实儿童试学通过|试学验证通过/
