import * as Blockly from 'blockly'
import { describe, expect, it } from 'vitest'

import { registerKidsBlocks } from '../blockly/register-kids-blocks'
import { judgeGreetingStep } from './forest-greeting-judging'
import {
  findGreetingWorkspace,
  greetingSnapshot,
  mainGreetingStack,
  moveGreetingBlock,
  rebuildGreetingProgram,
} from './forest-greeting-blockly-ops'

/**
 * headless 探针：Blockly 公共静态 API 能否定位工作区、一次上移/下移后
 * 快照顺序是否变化、判定结果是否随之变化、不重建工作区。
 * headless Workspace 没有 getInjectionDiv，Svg 定位部分须由 E2E 的 ↑↓
 * 用例覆盖；此处只锁连接重排代数与快照/判定联动。
 */
describe('forest-greeting blockly ops (headless)', () => {
  it('Blockly.Workspace.getAll() lists the workspace; a headless one has no injection div', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    expect(Blockly.Workspace.getAll()).toContain(ws)
    expect(findGreetingWorkspace(document.createElement('div'))).toBeNull()
    ws.dispose()
  })

  it('rebuild then snapshot round-trips the program', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    rebuildGreetingProgram(ws as unknown as Blockly.WorkspaceSvg, [
      { type: 'when_start' },
      { type: 'move_right' },
    ])
    expect(greetingSnapshot(ws)).toEqual([{ type: 'when_start' }, { type: 'move_right' }])
    expect(mainGreetingStack(ws).map((block) => block.type)).toEqual(['when_start', 'move_right'])
    ws.dispose()
  })

  it('moving move_right up past when_start is refused; moving it down flips the judgment', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    rebuildGreetingProgram(ws as unknown as Blockly.WorkspaceSvg, [
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'move_right' },
    ])
    const sameInstance = ws
    // 第 0 块（开始事件）永不移动，也没有任何块能移到它上面。
    expect(moveGreetingBlock(ws as unknown as Blockly.WorkspaceSvg, 1, -1)).toBe(false)
    expect(moveGreetingBlock(ws as unknown as Blockly.WorkspaceSvg, 0, 1)).toBe(false)
    expect(greetingSnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'move_right' },
    ])
    // 下移第二块：两块都是移动积木，顺序不变，但连接重排成功且不损坏程序。
    expect(moveGreetingBlock(ws as unknown as Blockly.WorkspaceSvg, 1, 1)).toBe(true)
    expect(ws).toBe(sameInstance)
    expect(greetingSnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'move_right' },
    ])
    expect(moveGreetingBlock(ws as unknown as Blockly.WorkspaceSvg, 2, 1)).toBe(false)
    ws.dispose()
  })

  it('rebuild restores the chosen line on say blocks; the snapshot round-trips it', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    rebuildGreetingProgram(ws as unknown as Blockly.WorkspaceSvg, [
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'say_line', line: 'lets-play' },
    ])
    expect(greetingSnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'say_line', line: 'lets-play' },
    ])
    // 重建后的程序可直接通过第 2 关判定（对白随积木一起恢复，不是假恢复）。
    expect(judgeGreetingStep(greetingSnapshot(ws), 1).passed).toBe(true)
    ws.dispose()
  })

  it('rebuild with no chosen line falls back to the first preset (the default line)', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    rebuildGreetingProgram(ws as unknown as Blockly.WorkspaceSvg, [
      { type: 'when_start' },
      { type: 'say_line' },
    ])
    expect(greetingSnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'say_line', line: 'hello' },
    ])
    ws.dispose()
  })

  it('moving say_line above move_right flips the judgment to say-too-early', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    rebuildGreetingProgram(ws as unknown as Blockly.WorkspaceSvg, [
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'say_line', line: 'hello' },
    ])
    expect(judgeGreetingStep(greetingSnapshot(ws), 1).passed).toBe(true)
    expect(moveGreetingBlock(ws as unknown as Blockly.WorkspaceSvg, 2, -1)).toBe(true)
    expect(greetingSnapshot(ws).map((block) => block.type)).toEqual([
      'when_start',
      'say_line',
      'move_right',
    ])
    expect(judgeGreetingStep(greetingSnapshot(ws), 1).failure).toBe('say-too-early')
    ws.dispose()
  })

  it('a program rebuilt with the start hat after a move is two loose stacks (disconnected)', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    // 移动块没有上连接口可接帽子块之下：重建后是两叠散块，判定先报 disconnected。
    rebuildGreetingProgram(ws as unknown as Blockly.WorkspaceSvg, [
      { type: 'move_right' },
      { type: 'when_start' },
    ])
    expect(greetingSnapshot(ws).map((block) => block.type)).toEqual(['move_right', 'when_start'])
    expect(judgeGreetingStep(greetingSnapshot(ws), 1).failure).toBe('disconnected')
    ws.dispose()
  })
})
