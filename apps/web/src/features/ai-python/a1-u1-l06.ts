/**
 * A1-U1-L06: second-batch re-verification for the fruit classifier.
 * Local plane only. No external model calls. No changes to fruit-classifier.ts:
 * the 30-row dataset, the v1/v2 rules and the sandbox driver are reused by import.
 *
 * The second batch below is NEW synthetic data, authored for this lesson:
 * none of its six (fruit, color, weight, diameter) rows appears in the original
 * 30-row table. The original test set (T1-T6) is contaminated for v2 (v2 was
 * tuned after seeing the T2 miss), so the second batch is the fixed synthetic
 * re-verification set: it was never used to tune the rules, but it is NOT a
 * strict blind test and NOT a generalization estimate — students can see the
 * samples, and six fixed rows cannot measure true generalization accuracy.
 * Untuned means: the rule run is the taught rule, untouched for this batch.
 * Once a rule is edited for this batch, later runs are practice records,
 * never final scores.
 *
 * This module alone is not a completed or published lesson: the ledger entry
 * stays out of the playable catalog until merge plus independent review.
 */

import {
  classifyWith,
  confusionMatrix,
  DRIVER_PYTHON,
  MATRIX_LABELS,
  type ConfusionMatrix,
  type FruitName,
  type FruitRow,
  type Judgment,
  type RuleId,
} from './fruit-classifier'

export const SECOND_BATCH_IDS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const

/** Second batch: 2 per fruit, in-distribution, disjoint from all 30 original rows. */
export const SECOND_BATCH_ROWS: FruitRow[] = [
  { id: 'S1', fruit: '苹果', color: '黄', weight: 172, diameter: 7.3, set: 'test' },
  { id: 'S2', fruit: '苹果', color: '黄', weight: 142, diameter: 7.0, set: 'test' },
  { id: 'S3', fruit: '香蕉', color: '黄', weight: 126, diameter: 3.6, set: 'test' },
  { id: 'S4', fruit: '香蕉', color: '黄', weight: 116, diameter: 3.4, set: 'test' },
  { id: 'S5', fruit: '橙子', color: '橙', weight: 158, diameter: 7.4, set: 'test' },
  { id: 'S6', fruit: '橙子', color: '橙', weight: 144, diameter: 7.0, set: 'test' },
]

export function secondBatchJudgments(rule: RuleId): Judgment[] {
  return SECOND_BATCH_ROWS.map((row) => ({
    set: row.set,
    id: row.id,
    actual: row.fruit,
    predicted: classifyWith(rule, row.color, row.weight),
  }))
}

export function secondBatchMatrix(rule: RuleId): ConfusionMatrix {
  return confusionMatrix(secondBatchJudgments(rule), 'test')
}

export function secondBatchMisses(rule: RuleId): Judgment[] {
  return secondBatchJudgments(rule).filter((judgment) => judgment.actual !== judgment.predicted)
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : `${value}`
}

function rowLiteral(row: FruitRow): string {
  return `(${JSON.stringify(row.id)},${JSON.stringify(row.fruit)},${JSON.stringify(row.color)},${row.weight},${formatNumber(row.diameter)})`
}

/** Dataset block for the L06 sandbox run: empty train, second batch as test. */
export function buildL06DatasetLiteral(): string {
  const test = SECOND_BATCH_ROWS.map(rowLiteral).join(',')
  return `TRAIN=[]\nTEST=[${test}]`
}

export type L06SandboxSource = {
  /** The editable rule code: the only part that counts against the student source limit. */
  studentCode: string
  /** Dataset literal + driver: lesson-static bytes, not student source. */
  lessonStaticLength: number
  /** The full string the sandbox checks against its 5000-char cap. */
  transmitted: string
}

export function buildL06SandboxSource(rulePythonCode: string): L06SandboxSource {
  const datasetLiteral = buildL06DatasetLiteral()
  const transmitted = `${datasetLiteral}\n${rulePythonCode}\n${DRIVER_PYTHON}`
  return {
    studentCode: rulePythonCode,
    lessonStaticLength: transmitted.length - rulePythonCode.length,
    transmitted,
  }
}

/**
 * Strictly parse L06 sandbox output into judgments. Any unparsable line,
 * unknown sample, mismatched true label, unknown prediction, duplicate, or
 * wrong row count is an error — the page then shows no matrix at all
 * (fail closed, never a hand-filled matrix).
 */
export function parseL06SandboxJudgments(output: string): { judgments: Judgment[]; error: string | null } {
  const byId = new Map(SECOND_BATCH_ROWS.map((row) => [row.id, row]))
  const judgments: Judgment[] = []
  const seen = new Set<string>()
  for (const rawLine of output.split(/\r\n?|\n/)) {
    const line = rawLine.trim()
    if (line === '') continue
    const match = /^(TEST) (\S+) (\S+) (\S+)$/.exec(line)
    if (!match) return { judgments: [], error: `沙箱输出无法解析：${line}` }
    const row = byId.get(match[2])
    if (!row) return { judgments: [], error: `沙箱输出含未知样本：${line}` }
    if (match[3] !== row.fruit) return { judgments: [], error: `沙箱输出真实标签与第二批样本不符：${line}` }
    if (!(MATRIX_LABELS as string[]).includes(match[4])) return { judgments: [], error: `沙箱输出含未知预测：${line}` }
    if (seen.has(row.id)) return { judgments: [], error: `沙箱输出重复样本：${line}` }
    seen.add(row.id)
    judgments.push({ set: 'test', id: row.id, actual: row.fruit, predicted: match[4] as FruitName })
  }
  if (judgments.length !== SECOND_BATCH_ROWS.length) {
    return { judgments: [], error: `沙箱输出行数不对：共 ${judgments.length} 条，应为 ${SECOND_BATCH_ROWS.length} 条` }
  }
  return { judgments, error: null }
}

export type PredictionCheck = {
  id: string
  actual: FruitName
  expected: FruitName
  predicted: FruitName | undefined
  ok: boolean
}

/** Score a student's per-sample predictions against a fixed taught rule. */
export function scorePredictions(
  predictions: Record<string, FruitName | undefined>,
  rule: RuleId,
): { correct: number; total: number; checks: PredictionCheck[] } {
  const checks = SECOND_BATCH_ROWS.map((row) => {
    const expected = classifyWith(rule, row.color, row.weight)
    const predicted = predictions[row.id]
    return { id: row.id, actual: row.fruit, expected, predicted, ok: predicted === expected }
  })
  return { correct: checks.filter((check) => check.ok).length, total: checks.length, checks }
}
