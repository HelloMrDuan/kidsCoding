import { describe, expect, it } from 'vitest'

import {
  AI_PYTHON_ENGINE_ID,
  AI_PYTHON_PILOT_E2E_SPEC,
  AI_PYTHON_PILOT_LESSON_IDS,
  aiPythonPilotRoute,
  EXISTING_ENGINE_IDS,
} from './ai-python-engine'
import {
  buildDatasetLiteral,
  buildSandboxSource,
  classifyV1,
  classifyV2,
  confusionMatrix,
  DRIVER_PYTHON,
  FRUIT_DATASET,
  judgeAll,
  MATRIX_LABELS,
  parseSandboxJudgments,
  RULE_V1_PYTHON,
  RULE_V2_PYTHON,
  SANDBOX_OUTPUT_LIMIT,
  STUDENT_SOURCE_LIMIT,
  TEST_ROWS,
  testMisses,
  TRAIN_ROWS,
} from './fruit-classifier'

describe('A1-U1 fruit dataset (U1 draft appendix, verbatim)', () => {
  it('has 30 rows: 24 training + 6 test, stratified 8/2 per fruit', () => {
    expect(FRUIT_DATASET).toHaveLength(30)
    expect(TRAIN_ROWS).toHaveLength(24)
    expect(TEST_ROWS).toHaveLength(6)
    for (const fruit of MATRIX_LABELS) {
      expect(TRAIN_ROWS.filter((row) => row.fruit === fruit)).toHaveLength(8)
      expect(TEST_ROWS.filter((row) => row.fruit === fruit)).toHaveLength(2)
    }
    expect(new Set(FRUIT_DATASET.map((row) => row.id)).size).toBe(30)
    for (const row of FRUIT_DATASET) {
      expect(row.weight).toBeGreaterThan(0)
      expect(row.diameter).toBeGreaterThan(0)
    }
  })

  it('contains the designed boundary case: a yellow apple in the test set', () => {
    const boundary = TEST_ROWS.find((row) => row.id === 'T2')
    expect(boundary).toMatchObject({ fruit: '苹果', color: '黄', weight: 168 })
  })
})

describe('A1-U1 rules and program-computed matrices', () => {
  it('rule v1: training 24/24, test 5/6, matrix rows match the draft', () => {
    const judgments = judgeAll('v1')
    expect(confusionMatrix(judgments, 'train')).toMatchObject({ correct: 24, total: 24 })
    const test = confusionMatrix(judgments, 'test')
    expect(test).toMatchObject({ correct: 5, total: 6 })
    expect(test.counts).toEqual([
      [1, 1, 0],
      [0, 2, 0],
      [0, 0, 2],
    ])
    expect(testMisses(judgments)).toHaveLength(1)
    expect(testMisses(judgments)[0]).toMatchObject({ id: 'T2', actual: '苹果', predicted: '香蕉' })
  })

  it('rule v2: training still 24/24, test 6/6, matrix diagonal full', () => {
    const judgments = judgeAll('v2')
    expect(confusionMatrix(judgments, 'train')).toMatchObject({ correct: 24, total: 24 })
    const test = confusionMatrix(judgments, 'test')
    expect(test).toMatchObject({ correct: 6, total: 6 })
    expect(test.counts).toEqual([
      [2, 0, 0],
      [0, 2, 0],
      [0, 0, 2],
    ])
    expect(testMisses(judgments)).toHaveLength(0)
  })

  it('v1 ignores weight and v2 applies the 150 g yellow-apple branch', () => {
    expect(classifyV1('黄')).toBe('香蕉')
    expect(classifyV1('红')).toBe('苹果')
    expect(classifyV2('黄', 149)).toBe('香蕉')
    expect(classifyV2('黄', 150)).toBe('苹果')
    expect(classifyV2('黄', 168)).toBe('苹果')
  })
})

describe('A1-U1 sandbox source accounting (dataset must not squeeze the student budget)', () => {
  it('rule code is pure stdlib: no imports at all, no ML libraries', () => {
    for (const code of [RULE_V1_PYTHON, RULE_V2_PYTHON]) {
      expect(code).not.toMatch(/import\s/)
      expect(code).not.toMatch(/numpy|sklearn|pandas/)
    }
  })

  it('student rule code fits its own 5000-char limit and the transmitted total fits the sandbox cap', () => {
    for (const code of [RULE_V1_PYTHON, RULE_V2_PYTHON]) {
      expect(code.length).toBeLessThanOrEqual(STUDENT_SOURCE_LIMIT)
      const built = buildSandboxSource(code)
      expect(built.studentCode).toBe(code)
      expect(built.lessonStaticLength).toBeGreaterThan(0)
      expect(built.transmitted).toContain(buildDatasetLiteral())
      expect(built.transmitted).toContain(code)
      expect(built.transmitted).toContain(DRIVER_PYTHON)
      expect(built.transmitted.length).toBeLessThanOrEqual(STUDENT_SOURCE_LIMIT)
    }
    expect(SANDBOX_OUTPUT_LIMIT).toBe(4000)
  })

  it('the dataset literal is generated from the dataset module, not hand-typed twice', () => {
    const literal = buildDatasetLiteral()
    expect(literal).toContain('TRAIN=[')
    expect(literal).toContain('TEST=[')
    expect(literal).toContain('"T2","苹果","黄",168,7.1')
  })
})

describe('A1-U1 sandbox output parser (fail closed, never a hand-filled matrix)', () => {
  function sampleOutput(): string {
    return judgeAll('v1')
      .map((judgment) => `${judgment.set === 'train' ? 'TRAIN' : 'TEST'} ${judgment.id} ${judgment.actual} ${judgment.predicted}`)
      .join('\n')
  }

  it('parses a well-formed 30-line run into 30 judgments', () => {
    const { judgments, error } = parseSandboxJudgments(sampleOutput())
    expect(error).toBeNull()
    expect(judgments).toHaveLength(30)
    expect(confusionMatrix(judgments, 'test')).toMatchObject({ correct: 5, total: 6 })
  })

  it('rejects garbage, unknown samples, mismatched labels, duplicates, and short output', () => {
    expect(parseSandboxJudgments('hello\n').error).not.toBeNull()
    expect(parseSandboxJudgments(`${sampleOutput()}\nTEST T9 苹果 苹果`).error).not.toBeNull()
    expect(parseSandboxJudgments(sampleOutput().replace('TRAIN A1 苹果 苹果', 'TRAIN A1 香蕉 苹果')).error).not.toBeNull()
    expect(parseSandboxJudgments(`${sampleOutput()}\nTRAIN A1 苹果 苹果`).error).not.toBeNull()
    expect(parseSandboxJudgments(sampleOutput().split('\n').slice(0, 29).join('\n')).error).not.toBeNull()
  })
})

describe('A1 ai-python engine registration (outside lesson-maturity)', () => {
  it('registers a distinct engine id with five pilot lessons, routes, and one spec', () => {
    expect(AI_PYTHON_ENGINE_ID).toBe('ai-python')
    expect(EXISTING_ENGINE_IDS).not.toContain(AI_PYTHON_ENGINE_ID)
    expect(AI_PYTHON_PILOT_LESSON_IDS).toEqual(['A1-U1-L01', 'A1-U1-L02', 'A1-U1-L03', 'A1-U1-L04', 'A1-U1-L05'])
    for (const id of AI_PYTHON_PILOT_LESSON_IDS) {
      expect(aiPythonPilotRoute(id)).toBe(`/learn/ai-python-lab/${id}`)
    }
    expect(aiPythonPilotRoute('A1-U1-L06')).toBeNull()
    expect(aiPythonPilotRoute('P0-U1-L01')).toBeNull()
    expect(AI_PYTHON_PILOT_E2E_SPEC).toBe('tests/e2e/ai-python-a1-u1.spec.ts')
  })
})
