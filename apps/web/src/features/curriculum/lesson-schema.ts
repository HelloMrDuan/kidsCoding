// SYS-105: curriculum content schema gate. Pure checks over a snapshot of the
// course content; lesson-schema.test.ts feeds it the real repository and a set
// of broken copies. Any duplicate ID, playable lesson without a real runner,
// unlicensed asset, or step without right AND wrong examples fails CI.

export type SchemaErrorCode =
  | 'duplicate_id'
  | 'unknown_lesson'
  | 'no_runner'
  | 'missing_engine_capability'
  | 'missing_route'
  | 'missing_e2e'
  | 'unlicensed_asset'
  | 'license_entry_without_file'
  | 'publish_with_unlicensed_asset'
  | 'missing_examples'
  | 'example_debt_changed'

export type SchemaError = { code: SchemaErrorCode; id: string; detail: string }

export type SchemaLesson = { id: string; trackId: string; engine: string; playable: boolean; requiredEngineCapabilities: string[] }
export type SchemaTrial = { id: string; engine: string; route: string; e2eSpec: string }
export type SchemaStep = { lessonId: string; stepId: string; positiveExamples: number; negativeExamples: number }

export type CurriculumSnapshot = {
  catalogLessonIds: string[]
  detailedLessons: SchemaLesson[]
  launchLessonIds: string[]
  trials: SchemaTrial[]
  engineCapabilities: string[]
  /** App route folders under src/app (e.g. "learn/grid-lab"). */
  routes: string[]
  /** e2e spec paths that exist, relative to apps/web. */
  e2eSpecs: string[]
  /** Asset files under public/ (sandbox html excluded). */
  publicAssets: string[]
  assetLicenses: Array<{ path: string; license: string; source: string }>
  /** Required-before-publish assets per lesson from the asset requirement lists. */
  lessonAssets: Array<{ assetId: string; lessonId: string; requiredBeforePublish: boolean; licenseStatus: string }>
  /** Lessons published (maturity L5). */
  publishedLessonIds: string[]
  /** Structured step examples for lessons whose content carries them. */
  steps: SchemaStep[]
  /** Trial lessons that predate this gate and have no structured examples yet. */
  exampleDebt: string[]
}

const ALLOWED_LICENSES = new Set(['original', 'authorized'])
const ACQUIRED = new Set(['original', 'authorized', 'acquired', 'licensed'])

/**
 * Frozen list of trial lessons that ran before SYS-105 without structured
 * right/wrong examples. It may only shrink: adding a lesson here fails.
 */
export const EXAMPLE_DEBT_BASELINE: readonly string[] = [
  'G3-U1-L02',
  'P0-U1-L01', 'P0-U1-L02', 'P0-U1-L03', 'P0-U1-L04', 'P0-U1-L05', 'P0-U1-L06',
  'lesson-01-forest-hello', 'lesson-02-forest-greeting', 'lesson-03-forest-story', 'lesson-04-meadow-scene',
  'lesson-05-meadow-order', 'lesson-06-meadow-story', 'lesson-07-garden-click', 'lesson-08-garden-dialogue',
  'lesson-09-garden-story', 'lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show',
]

function duplicates(ids: string[]) {
  const seen = new Set<string>()
  const dup = new Set<string>()
  for (const id of ids) (seen.has(id) ? dup : seen).add(id)
  return [...dup]
}

function specExists(spec: string, specs: string[]) {
  if (!spec.includes('*')) return specs.includes(spec)
  const re = new RegExp('^' + spec.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$')
  return specs.some(s => re.test(s))
}

export function validateCurriculumSnapshot(s: CurriculumSnapshot): SchemaError[] {
  const errors: SchemaError[] = []
  const push = (code: SchemaErrorCode, id: string, detail: string) => errors.push({ code, id, detail })

  // 1. IDs are unique and every trial points at a real lesson.
  for (const id of duplicates(s.catalogLessonIds)) push('duplicate_id', id, '课程目录里出现重复课程 ID')
  for (const id of duplicates(s.detailedLessons.map(l => l.id))) push('duplicate_id', id, '逐课详案里出现重复课程 ID')
  for (const id of duplicates(s.launchLessonIds)) push('duplicate_id', id, '启蒙课里出现重复课程 ID')
  for (const id of duplicates(s.trials.map(t => t.id))) push('duplicate_id', id, '试玩登记里出现重复课程 ID')
  for (const id of duplicates(s.steps.map(st => `${st.lessonId}/${st.stepId}`))) push('duplicate_id', id, '同一课里出现重复关卡 ID')
  const catalog = new Set(s.catalogLessonIds)
  for (const l of s.detailedLessons) if (!catalog.has(l.id)) push('unknown_lesson', l.id, '详案课程不在课程目录里')
  const known = new Set([...s.catalogLessonIds, ...s.launchLessonIds])
  for (const t of s.trials) if (!known.has(t.id)) push('unknown_lesson', t.id, '试玩登记指向不存在的课程')

  // 2. Anything playable needs a real runner: registered trial, existing route, e2e spec, engine capabilities.
  const trialById = new Map(s.trials.map(t => [t.id, t]))
  const caps = new Set(s.engineCapabilities)
  for (const l of s.detailedLessons) {
    const trial = trialById.get(l.id)
    if (l.playable && !trial) push('no_runner', l.id, '标记为可玩，但没有登记真实运行器')
    if (trial && trial.engine === 'blockly') {
      const missing = l.requiredEngineCapabilities.filter(c => !caps.has(c))
      if (missing.length) push('missing_engine_capability', l.id, `引擎还不支持：${missing.join('、')}`)
    }
  }
  const routes = new Set(s.routes)
  for (const t of s.trials) {
    const folder = t.route.replace(/^\//, '').split('/').slice(0, 2).join('/')
    if (!routes.has(folder)) push('missing_route', t.id, `试玩路由 ${t.route} 在 app 里不存在`)
    if (!specExists(t.e2eSpec, s.e2eSpecs)) push('missing_e2e', t.id, `E2E 文件 ${t.e2eSpec} 不存在`)
  }

  // 3. Every shipped asset is original or authorized; no lesson publishes with an unacquired required asset.
  const licensed = new Map(s.assetLicenses.map(a => [a.path, a]))
  for (const path of s.publicAssets) {
    const entry = licensed.get(path)
    if (!entry || !ALLOWED_LICENSES.has(entry.license) || !entry.source.trim()) push('unlicensed_asset', path, '素材没有登记原创或授权来源')
  }
  const files = new Set(s.publicAssets)
  for (const a of s.assetLicenses) if (!files.has(a.path)) push('license_entry_without_file', a.path, '授权登记里的文件不存在')
  const published = new Set(s.publishedLessonIds)
  for (const a of s.lessonAssets) {
    if (a.requiredBeforePublish && published.has(a.lessonId) && !ACQUIRED.has(a.licenseStatus)) {
      push('publish_with_unlicensed_asset', a.lessonId, `素材 ${a.assetId} 未取得授权，课程不能正式发布`)
    }
  }

  // 4. Right and wrong examples: every structured step has both; every other trial lesson is frozen debt.
  for (const st of s.steps) {
    if (st.positiveExamples < 1 || st.negativeExamples < 1) push('missing_examples', `${st.lessonId}/${st.stepId}`, '每一关至少要有一个正确示例和一个错误示例')
  }
  const withSteps = new Set(s.steps.map(st => st.lessonId))
  const debt = new Set(s.exampleDebt)
  for (const t of s.trials) {
    if (!withSteps.has(t.id) && !debt.has(t.id)) push('missing_examples', t.id, '可试玩课程缺少正反例，且不在历史欠账名单里')
    if (debt.has(t.id) && published.has(t.id)) push('missing_examples', t.id, '历史欠账课程补齐正反例前不能正式发布')
  }
  const baseline = new Set(EXAMPLE_DEBT_BASELINE)
  for (const id of s.exampleDebt) if (!baseline.has(id)) push('example_debt_changed', id, '历史欠账名单只能减少，不能新增')

  return errors
}
