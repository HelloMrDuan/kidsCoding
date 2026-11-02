import { describe, expect, it } from 'vitest'
import {
  buildL06SandboxSource,
  parseL06SandboxJudgments,
  scorePredictions,
  secondBatchJudgments,
  secondBatchMatrix,
  secondBatchMisses,
  SECOND_BATCH_ROWS,
} from './a1-u1-l06'
import {
  confusionMatrix,
  FRUIT_DATASET,
} from './fruit-classifier'

describe('A1-U1-L06 second batch', () => {
  it('has 6 rows, 2 per fruit, with unique ids', () => {
    expect(SECOND_BATCH_ROWS).toHaveLength(6)
    expect(new Set(SECOND_BATCH_ROWS.map((row) => row.id)).size).toBe(6)
    for (const fruit of ['苹果', '香蕉', '橙子'] as const) {
      expect(SECOND_BATCH_ROWS.filter((row) => row.fruit === fruit)).toHaveLength(2)
    }
  })

  it('is disjoint from all 30 original rows, so it is a clean re-verification set', () => {
    const original = new Set(
      FRUIT_DATASET.map((row) => `${row.fruit}|${row.color}|${row.weight}|${row.diameter}`),
    )
    for (const row of SECOND_BATCH_ROWS) {
      expect(original.has(`${row.fruit}|${row.color}|${row.weight}|${row.diameter}`)).toBe(false)
    }
  })

  it('v1 scores 4/6 on the second batch: both yellow apples miss', () => {
    const judgments = secondBatchJudgments('v1')
    const misses = secondBatchMisses('v1')
    expect(judgments.filter((j) => j.actual === j.predicted)).toHaveLength(4)
    expect(misses.map((j) => j.id).sort()).toEqual(['S1', 'S2'])
    expect(secondBatchMatrix('v1').counts).toEqual([
      [0, 2, 0],
      [0, 2, 0],
      [0, 0, 2],
    ])
  })

  it('v2 scores 5/6 on the second batch: only the light yellow apple misses', () => {
    const judgments = secondBatchJudgments('v2')
    const misses = secondBatchMisses('v2')
    expect(judgments.filter((j) => j.actual === j.predicted)).toHaveLength(5)
    expect(misses.map((j) => j.id)).toEqual(['S2'])
    expect(secondBatchMatrix('v2').counts).toEqual([
      [1, 1, 0],
      [0, 2, 0],
      [0, 0, 2],
    ])
  })

  it('builds a sandbox source with an empty train set and the second batch as test', () => {
    const source = buildL06SandboxSource('def classify(color, weight):\n    return "苹果"')
    expect(source.transmitted).toContain('TRAIN=[]')
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']) {
      expect(source.transmitted).toContain(id)
    }
    expect(source.transmitted).not.toContain('T1')
    expect(source.transmitted.length).toBeLessThanOrEqual(5000)
  })

  it('parses a valid v2 sandbox output into judgments and the 5/6 matrix', () => {
    const output = [
      'TEST S1 苹果 苹果',
      'TEST S2 苹果 香蕉',
      'TEST S3 香蕉 香蕉',
      'TEST S4 香蕉 香蕉',
      'TEST S5 橙子 橙子',
      'TEST S6 橙子 橙子',
    ].join('\n')
    const parsed = parseL06SandboxJudgments(output)
    expect(parsed.error).toBeNull()
    expect(parsed.judgments).toHaveLength(6)
    const matrix = confusionMatrix(parsed.judgments, 'test')
    expect(matrix.correct).toBe(5)
    expect(matrix.total).toBe(6)
  })

  it('fails closed on unknown samples, wrong labels, duplicates, and wrong row counts', () => {
    const base = [
      'TEST S1 苹果 苹果',
      'TEST S2 苹果 香蕉',
      'TEST S3 香蕉 香蕉',
      'TEST S4 香蕉 香蕉',
      'TEST S5 橙子 橙子',
      'TEST S6 橙子 橙子',
    ]
    expect(parseL06SandboxJudgments(base.join('\n').replace('S1', 'T2')).error).not.toBeNull()
    expect(parseL06SandboxJudgments(base.join('\n').replace('S1 苹果', 'S1 橙子')).error).not.toBeNull()
    expect(parseL06SandboxJudgments([...base, base[0]].join('\n')).error).not.toBeNull()
    expect(parseL06SandboxJudgments(base.slice(0, 5).join('\n')).error).not.toBeNull()
    expect(parseL06SandboxJudgments('not a judgment line').error).not.toBeNull()
  })

  it('scores predictions against the fixed taught rule', () => {
    const allRight = scorePredictions(
      { S1: '香蕉', S2: '香蕉', S3: '香蕉', S4: '香蕉', S5: '橙子', S6: '橙子' },
      'v1',
    )
    expect(allRight.correct).toBe(6)
    const oneWrong = scorePredictions(
      { S1: '苹果', S2: '香蕉', S3: '香蕉', S4: '香蕉', S5: '橙子', S6: '橙子' },
      'v1',
    )
    expect(oneWrong.correct).toBe(5)
    expect(oneWrong.checks.find((c) => c.id === 'S1')?.ok).toBe(false)
  })
})
