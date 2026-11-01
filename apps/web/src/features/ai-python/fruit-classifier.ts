/**
 * A1-U1 fruit-classifier pilot: the L01→L05 longitudinal line, local plane only.
 *
 * The 30-row synthetic dataset is copied verbatim from the chief-reviewed U1
 * detailed-plan draft (appendix table): 24 training rows + 6 test rows,
 * stratified 8/2 per fruit. It is lesson-distributed static data, never
 * student-typed source: the trial page sends it as a separate lesson-static
 * block, and the student source limit (5000 chars) applies to the editable
 * rule code alone. The sandbox itself still caps the whole transmitted
 * string at 5000 chars, so the page measures and displays all three lengths
 * (rule code / lesson-static data / transmitted total) and refuses to run
 * when either cap would be exceeded.
 *
 * Rules are pure Python stdlib (no imports at all, no ML libraries) and are
 * mirrored here in TypeScript for Vitest. The trial page never hand-fills a
 * matrix: it parses the sandbox's per-row printed judgments and computes
 * the confusion matrices from those program outputs.
 */

export type FruitName = '苹果' | '香蕉' | '橙子'
export type FruitSet = 'train' | 'test'

export type FruitRow = {
  id: string
  fruit: FruitName
  color: string
  weight: number
  diameter: number
  set: FruitSet
}

export const MATRIX_LABELS: FruitName[] = ['苹果', '香蕉', '橙子']

/** U1 draft appendix, verbatim. Training rows first (A/B/O 1–8), then test rows (T1–T6). */
export const FRUIT_DATASET: FruitRow[] = [
  { id: 'A1', fruit: '苹果', color: '红', weight: 182, diameter: 7.6, set: 'train' },
  { id: 'A2', fruit: '苹果', color: '红', weight: 175, diameter: 7.4, set: 'train' },
  { id: 'A3', fruit: '苹果', color: '红', weight: 190, diameter: 7.8, set: 'train' },
  { id: 'A4', fruit: '苹果', color: '红', weight: 165, diameter: 7.1, set: 'train' },
  { id: 'A5', fruit: '苹果', color: '红', weight: 178, diameter: 7.5, set: 'train' },
  { id: 'A6', fruit: '苹果', color: '红', weight: 188, diameter: 7.7, set: 'train' },
  { id: 'A7', fruit: '苹果', color: '绿', weight: 170, diameter: 7.2, set: 'train' },
  { id: 'A8', fruit: '苹果', color: '绿', weight: 160, diameter: 7.0, set: 'train' },
  { id: 'B1', fruit: '香蕉', color: '黄', weight: 118, diameter: 3.4, set: 'train' },
  { id: 'B2', fruit: '香蕉', color: '黄', weight: 125, diameter: 3.6, set: 'train' },
  { id: 'B3', fruit: '香蕉', color: '黄', weight: 110, diameter: 3.2, set: 'train' },
  { id: 'B4', fruit: '香蕉', color: '黄', weight: 132, diameter: 3.8, set: 'train' },
  { id: 'B5', fruit: '香蕉', color: '黄', weight: 121, diameter: 3.5, set: 'train' },
  { id: 'B6', fruit: '香蕉', color: '黄', weight: 115, diameter: 3.3, set: 'train' },
  { id: 'B7', fruit: '香蕉', color: '黄', weight: 128, diameter: 3.7, set: 'train' },
  { id: 'B8', fruit: '香蕉', color: '黄', weight: 122, diameter: 3.5, set: 'train' },
  { id: 'O1', fruit: '橙子', color: '橙', weight: 152, diameter: 7.3, set: 'train' },
  { id: 'O2', fruit: '橙子', color: '橙', weight: 145, diameter: 7.0, set: 'train' },
  { id: 'O3', fruit: '橙子', color: '橙', weight: 160, diameter: 7.5, set: 'train' },
  { id: 'O4', fruit: '橙子', color: '橙', weight: 138, diameter: 6.9, set: 'train' },
  { id: 'O5', fruit: '橙子', color: '橙', weight: 155, diameter: 7.4, set: 'train' },
  { id: 'O6', fruit: '橙子', color: '橙', weight: 148, diameter: 7.1, set: 'train' },
  { id: 'O7', fruit: '橙子', color: '橙', weight: 162, diameter: 7.6, set: 'train' },
  { id: 'O8', fruit: '橙子', color: '橙', weight: 141, diameter: 6.8, set: 'train' },
  { id: 'T1', fruit: '苹果', color: '红', weight: 180, diameter: 7.5, set: 'test' },
  { id: 'T2', fruit: '苹果', color: '黄', weight: 168, diameter: 7.1, set: 'test' },
  { id: 'T3', fruit: '香蕉', color: '黄', weight: 120, diameter: 3.5, set: 'test' },
  { id: 'T4', fruit: '香蕉', color: '黄', weight: 112, diameter: 3.3, set: 'test' },
  { id: 'T5', fruit: '橙子', color: '橙', weight: 150, diameter: 7.2, set: 'test' },
  { id: 'T6', fruit: '橙子', color: '橙', weight: 135, diameter: 6.9, set: 'test' },
]

export const TRAIN_ROWS = FRUIT_DATASET.filter((row) => row.set === 'train')
export const TEST_ROWS = FRUIT_DATASET.filter((row) => row.set === 'test')

/** Rule v1 (color rule, U1-L04): yellow → banana, orange → orange, otherwise apple. */
export function classifyV1(color: string): FruitName {
  if (color === '黄') return '香蕉'
  if (color === '橙') return '橙子'
  return '苹果'
}

/** Rule v2 (U1-L05): v1 plus the weight branch — yellow and ≥150 g → apple. */
export function classifyV2(color: string, weight: number): FruitName {
  if (color === '黄' && weight >= 150) return '苹果'
  if (color === '黄') return '香蕉'
  if (color === '橙') return '橙子'
  return '苹果'
}

export type RuleId = 'v1' | 'v2'

export function classifyWith(rule: RuleId, color: string, weight: number): FruitName {
  return rule === 'v1' ? classifyV1(color) : classifyV2(color, weight)
}

export type Judgment = {
  set: FruitSet
  id: string
  actual: FruitName
  predicted: FruitName
}

/** TypeScript mirror of the sandbox driver: one judgment per dataset row. */
export function judgeAll(rule: RuleId): Judgment[] {
  return FRUIT_DATASET.map((row) => ({
    set: row.set,
    id: row.id,
    actual: row.fruit,
    predicted: classifyWith(rule, row.color, row.weight),
  }))
}

export type ConfusionMatrix = {
  labels: FruitName[]
  /** counts[true index][predicted index]; label order is MATRIX_LABELS. */
  counts: number[][]
  correct: number
  total: number
}

export function confusionMatrix(judgments: Judgment[], set: FruitSet): ConfusionMatrix {
  const counts = MATRIX_LABELS.map(() => MATRIX_LABELS.map(() => 0))
  let correct = 0
  const subset = judgments.filter((judgment) => judgment.set === set)
  for (const judgment of subset) {
    counts[MATRIX_LABELS.indexOf(judgment.actual)][MATRIX_LABELS.indexOf(judgment.predicted)] += 1
    if (judgment.actual === judgment.predicted) correct += 1
  }
  return { labels: MATRIX_LABELS, counts, correct, total: subset.length }
}

/** Python rule code sent to the sandbox. Pure stdlib: no imports at all. */
export const RULE_V1_PYTHON = [
  'def classify(color, weight):',
  '    if color == "黄":',
  '        return "香蕉"',
  '    if color == "橙":',
  '        return "橙子"',
  '    return "苹果"',
].join('\n')

export const RULE_V2_PYTHON = [
  'def classify(color, weight):',
  '    if color == "黄" and weight >= 150:',
  '        return "苹果"',
  '    if color == "黄":',
  '        return "香蕉"',
  '    if color == "橙":',
  '        return "橙子"',
  '    return "苹果"',
].join('\n')

export function rulePython(rule: RuleId): string {
  return rule === 'v1' ? RULE_V1_PYTHON : RULE_V2_PYTHON
}

/** Driver loop appended after the rule: prints one judgment line per row. */
export const DRIVER_PYTHON = [
  'for row in TRAIN:',
  '    print("TRAIN " + row[0] + " " + row[1] + " " + classify(row[2], row[3]))',
  'for row in TEST:',
  '    print("TEST " + row[0] + " " + row[1] + " " + classify(row[2], row[3]))',
].join('\n')

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`
}

function rowLiteral(row: FruitRow): string {
  return `(${JSON.stringify(row.id)},${JSON.stringify(row.fruit)},${JSON.stringify(row.color)},${row.weight},${formatNumber(row.diameter)})`
}

/** The lesson-static dataset block, generated from FRUIT_DATASET (single source of truth). */
export function buildDatasetLiteral(): string {
  const train = TRAIN_ROWS.map(rowLiteral).join(',')
  const test = TEST_ROWS.map(rowLiteral).join(',')
  return `TRAIN=[${train}]\nTEST=[${test}]`
}

export type SandboxSource = {
  /** The editable rule code: the only part that counts against the student source limit. */
  studentCode: string
  /** Dataset literal + driver: lesson-static bytes, not student source. */
  lessonStaticLength: number
  /** The full string the sandbox checks against its 5000-char cap. */
  transmitted: string
}

export function buildSandboxSource(rulePythonCode: string): SandboxSource {
  const datasetLiteral = buildDatasetLiteral()
  const transmitted = `${datasetLiteral}\n${rulePythonCode}\n${DRIVER_PYTHON}`
  return {
    studentCode: rulePythonCode,
    lessonStaticLength: transmitted.length - rulePythonCode.length,
    transmitted,
  }
}

/** Existing sandbox caps (enforced inside python-lab-sandbox.html). */
export const STUDENT_SOURCE_LIMIT = 5000
export const SANDBOX_OUTPUT_LIMIT = 4000

/**
 * Strictly parse sandbox output into judgments. Any unparsable line, unknown
 * sample, mismatched true label, unknown prediction, duplicate, or wrong row
 * count is an error — the page then shows no matrix at all (fail closed,
 * never a hand-filled matrix).
 */
export function parseSandboxJudgments(output: string): { judgments: Judgment[]; error: string | null } {
  const byId = new Map(FRUIT_DATASET.map((row) => [row.id, row]))
  const judgments: Judgment[] = []
  const seen = new Set<string>()
  for (const rawLine of output.split(/\r\n?|\n/)) {
    const line = rawLine.trim()
    if (line === '') continue
    const match = /^(TRAIN|TEST) (\S+) (\S+) (\S+)$/.exec(line)
    if (!match) return { judgments: [], error: `沙箱输出无法解析：${line}` }
    const set: FruitSet = match[1] === 'TRAIN' ? 'train' : 'test'
    const row = byId.get(match[2])
    if (!row || row.set !== set) return { judgments: [], error: `沙箱输出含未知样本：${line}` }
    if (match[3] !== row.fruit) return { judgments: [], error: `沙箱输出真实标签与数据集不符：${line}` }
    if (!(MATRIX_LABELS as string[]).includes(match[4])) return { judgments: [], error: `沙箱输出含未知预测：${line}` }
    if (seen.has(row.id)) return { judgments: [], error: `沙箱输出重复样本：${line}` }
    seen.add(row.id)
    judgments.push({ set, id: row.id, actual: row.fruit, predicted: match[4] as FruitName })
  }
  if (judgments.length !== FRUIT_DATASET.length) {
    return { judgments: [], error: `沙箱输出行数不对：共 ${judgments.length} 条，应为 ${FRUIT_DATASET.length} 条` }
  }
  return { judgments, error: null }
}

/** Test-set misses, program-derived (used for the L05 error note, never hand-written). */
export function testMisses(judgments: Judgment[]): Judgment[] {
  return judgments.filter((judgment) => judgment.set === 'test' && judgment.actual !== judgment.predicted)
}
