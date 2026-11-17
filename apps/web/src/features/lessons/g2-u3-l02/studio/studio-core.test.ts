/**
 * OPS-042 核心链路测试：真实 .sb3 生成 → 真实 Scratch VM 运行 →
 * 本课既有 judge.ts 三层判定。与 2026-11-15 独立原型的五案一一
 * 对应，期望值来自原型在真实 VM 上的实测（不是静态数积木）：
 * - 参考程序：三层全 PASS，落地第 28 帧，循环内移动 15 次；
 * - 毛病程序（方向反了）：舞台/任务 FAIL、知识 PASS，总 FAIL；
 * - 未连接积木：真实执行 0 次移动，任务/知识 FAIL；
 * - 空循环（有重复积木且接住，但循环内 0 次执行）：舞台/任务
 *   PASS、知识 FAIL——静态数积木会误判的一案；
 * - 无循环（两次单独移动接住）：舞台/任务 PASS、知识 FAIL。
 */

import { describe, expect, it } from 'vitest'

import { judgeRun } from '../judge'
import { L02_LEVELS } from '../params'
import type { Program } from '../program'
import {
  buildStarterSb3,
  L02_BUGGY_PROGRAM,
  L02_REFERENCE_PROGRAM,
} from './build-starter'
import { runProjectTrace } from './run-trace'

const solve = L02_LEVELS.solve

async function judgeProgram(program: Program) {
  const sb3 = await buildStarterSb3(program, solve)
  const trace = await runProjectTrace(sb3, {
    levelId: 'solve',
    runId: 1,
    fingerprint: 'test',
  })
  return { trace, judgment: judgeRun(trace, solve) }
}

describe('OPS-042 run-trace + judge（真实 VM）', () => {
  it('参考程序：三层全过，落地第 28 帧，循环内真实移动 15 次', async () => {
    const { trace, judgment } = await judgeProgram(L02_REFERENCE_PROGRAM)
    expect(trace.endedBy).toBe('landed')
    expect(trace.landing?.frame).toBe(28)
    expect(trace.landing?.basketX).toBe(150)
    expect(
      trace.basketMoves.filter((m) => m.inLoop && m.dx !== 0).length,
    ).toBe(15)
    expect(judgment.status).toBe('judged')
    if (judgment.status !== 'judged') return
    expect(judgment.stage.passed).toBe(true)
    expect(judgment.task.passed).toBe(true)
    expect(judgment.knowledge.passed).toBe(true)
    expect(judgment.passed).toBe(true)
  })

  it('毛病程序（方向反了）：舞台/任务 FAIL、知识 PASS、总 FAIL', async () => {
    const { trace, judgment } = await judgeProgram(L02_BUGGY_PROGRAM)
    expect(trace.landing?.basketX).toBe(-150)
    expect(judgment.status).toBe('judged')
    if (judgment.status !== 'judged') return
    expect(judgment.stage.passed).toBe(false)
    expect(judgment.task.passed).toBe(false)
    expect(judgment.knowledge.passed).toBe(true)
    expect(judgment.passed).toBe(false)
  })

  it('未连接积木：真实执行 0 次移动，任务/知识 FAIL', async () => {
    const unconnected: Program = {
      scripts: [
        { hat: null, body: [{ t: 'repeat', times: 15, body: [{ t: 'move', dx: 10 }] }] },
      ],
    }
    const { trace, judgment } = await judgeProgram(unconnected)
    expect(trace.basketMoves.length).toBe(0)
    expect(judgment.status).toBe('judged')
    if (judgment.status !== 'judged') return
    expect(judgment.task.passed).toBe(false)
    expect(judgment.knowledge.passed).toBe(false)
    expect(judgment.passed).toBe(false)
  })

  it('空循环：接住但循环内 0 次执行——舞台/任务 PASS、知识 FAIL', async () => {
    const loopStaticOnly: Program = {
      scripts: [
        {
          hat: 'flag',
          body: [
            { t: 'repeat', times: 1, body: [] },
            { t: 'move', dx: 75 },
            { t: 'move', dx: 75 },
          ],
        },
      ],
    }
    const { trace, judgment } = await judgeProgram(loopStaticOnly)
    expect(trace.landing?.basketX).toBe(150)
    expect(trace.basketMoves.filter((m) => m.inLoop).length).toBe(0)
    expect(judgment.status).toBe('judged')
    if (judgment.status !== 'judged') return
    expect(judgment.stage.passed).toBe(true)
    expect(judgment.task.passed).toBe(true)
    expect(judgment.knowledge.passed).toBe(false)
    expect(judgment.passed).toBe(false)
  })

  it('无循环（两次单独移动接住）：舞台/任务 PASS、知识 FAIL', async () => {
    const noLoop: Program = {
      scripts: [
        {
          hat: 'flag',
          body: [
            { t: 'move', dx: 75 },
            { t: 'move', dx: 75 },
          ],
        },
      ],
    }
    const { judgment } = await judgeProgram(noLoop)
    expect(judgment.status).toBe('judged')
    if (judgment.status !== 'judged') return
    expect(judgment.stage.passed).toBe(true)
    expect(judgment.task.passed).toBe(true)
    expect(judgment.knowledge.passed).toBe(false)
    expect(judgment.passed).toBe(false)
  })

  it('第一关演示程序在 explore 关运行：篮子到 40，离水果 100 还差 60（接不住，符合教学设定）', async () => {
    const explore = L02_LEVELS.explore
    const demo: Program = {
      scripts: [
        { hat: 'flag', body: [{ t: 'repeat', times: 2, body: [{ t: 'move', dx: 20 }] }] },
      ],
    }
    const sb3 = await buildStarterSb3(demo, explore)
    const trace = await runProjectTrace(sb3, {
      levelId: 'explore',
      runId: 1,
      fingerprint: 'test',
    })
    const judgment = judgeRun(trace, explore)
    expect(trace.landing?.basketX).toBe(40)
    expect(judgment.status).toBe('judged')
    if (judgment.status !== 'judged') return
    expect(judgment.stage.passed).toBe(false)
    expect(judgment.knowledge.passed).toBe(true)
  })
})
