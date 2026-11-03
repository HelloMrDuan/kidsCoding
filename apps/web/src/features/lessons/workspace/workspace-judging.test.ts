import { describe, expect, it } from 'vitest'

import { runDemoProgram, type DemoBlock } from './blockly-adapter'
import { DEMO_A } from './demo-contracts'
import { buildJudgment } from './workspace-judging'

const hat = { type: 'when_start' }
const right = (steps: number): DemoBlock => ({ type: 'ws_move_right', steps })
const repeat = (times: number, body: DemoBlock[]): DemoBlock => ({ type: 'repeat_times', times, body })

function judge(script: DemoBlock[]) {
  const result = runDemoProgram(script)
  if (!result.ok) throw new Error(`demo program should run: ${result.message}`)
  return buildJudgment(DEMO_A.contract, { x: result.finalX, score: 0, running: false }, result.trace)
}

describe('three-layer judging (ACCEPTANCE R1–R6, demo fruit x=200, threshold 80)', () => {
  it('R1 hat only: not caught, task fail, knowledge fail, conclusion not passed', () => {
    const j = judge([hat])
    expect(j.stage.passed).toBe(false)
    expect(j.stage.line).toMatch('x=0')
    expect(j.stage.line).toMatch('未接住')
    expect(j.task.passed).toBe(false)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
    expect(j.conclusion).not.toMatch('已完成')
    expect(j.conclusion).not.toMatch('已掌握')
  })

  it('R2 caught without repeat: task pass, knowledge fail, never 已掌握', () => {
    const j = judge([hat, right(100), right(30)])
    expect(j.stage.line).toMatch('x=130')
    expect(j.stage.line).toMatch('接住')
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
    expect(j.conclusion).not.toMatch('已掌握')
  })

  it('R3 wrong param: not caught, not passed', () => {
    const j = judge([hat, right(10)])
    expect(j.stage.passed).toBe(false)
    expect(j.task.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  it('R4 moved but short of target: not caught', () => {
    const j = judge([hat, right(30), right(30)])
    expect(j.stage.line).toMatch('x=60')
    expect(j.stage.line).toMatch('未接住')
    expect(j.passed).toBe(false)
  })

  it('R5 different structure, behavior passes: task pass without block matching', () => {
    const j = judge([hat, right(100), right(50)])
    expect(j.stage.line).toMatch('x=150')
    expect(j.task.passed).toBe(true)
    // No repeat, so knowledge still fails — behavior, not structure, decides.
    expect(j.knowledge.passed).toBe(false)
  })

  it('R6 repeat version: task and knowledge pass, conclusion 已完成，已掌握', () => {
    const j = judge([hat, repeat(3, [right(50)])])
    expect(j.stage.line).toMatch('x=150')
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(true)
    expect(j.passed).toBe(true)
    expect(j.conclusion).toBe('结论：已完成，已掌握')
  })

  it('passed is exactly task && knowledge', () => {
    const j = judge([hat, right(150)])
    expect(j.passed).toBe(j.task.passed && j.knowledge.passed)
  })
})
