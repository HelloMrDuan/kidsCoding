import * as Blockly from 'blockly'
import { describe, expect, it } from 'vitest'

import { L02_SAY_CHOICES } from '@/content/curriculum/g1-u1-story-lessons'
import { registerKidsBlocks } from '../blockly/register-kids-blocks'
import { judgeTurnTakingProgram } from './g1-u1-l02-judging'
import {
  findStoryWorkspace,
  mainStoryStack,
  moveStoryBlock,
  rebuildStoryProgram,
  setBlockLine,
  storySnapshot,
} from './g1-u1-l02-blockly-ops'

const CHOICES = L02_SAY_CHOICES
const CORRECT = [
  { type: 'when_start' },
  { type: 'say_line', line: 'hello' },
  { type: 'switch_character' },
  { type: 'say_line', line: 'glad' },
] as const

/**
 * Q4 最小探针（headless 部分）：Blockly 公共静态 API 能否定位工作区、
 * 一次上移/下移后快照顺序是否变化、判定结果是否随之变化、不重建工作区。
 * headless Workspace 没有 getInjectionDiv，Svg 定位部分须由浏览器探针
 * （临时页 + 临时 spec，已在探针阶段验证）与 E2E 的 ↑↓ 用例覆盖；
 * 此处只锁连接重排代数与快照/判定联动。
 */
describe('Q4 probe: reorder via public Blockly connections (headless)', () => {
  it('Blockly.Workspace.getAll() lists the workspace; a headless one has no injection div', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    expect(Blockly.Workspace.getAll()).toContain(ws)
    expect(findStoryWorkspace(document.createElement('div'))).toBeNull()
    ws.dispose()
  })

  it('moving say_line down flips the judgment to wrong_actor; moving it back up passes again', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    rebuildStoryProgram(ws as unknown as Blockly.WorkspaceSvg, [...CORRECT], CHOICES)
    expect(storySnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'say_line', line: 'hello' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'glad' },
    ])
    expect(judgeTurnTakingProgram(storySnapshot(ws)).passed).toBe(true)
    const sameInstance = ws
    expect(moveStoryBlock(ws as unknown as Blockly.WorkspaceSvg, 1, 1)).toBe(true)
    expect(ws).toBe(sameInstance)
    expect(storySnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'hello' },
      { type: 'say_line', line: 'glad' },
    ])
    const flipped = judgeTurnTakingProgram(storySnapshot(ws))
    expect(flipped.passed).toBe(false)
    expect(flipped.failure).toBe('wrong_actor')
    expect(moveStoryBlock(ws as unknown as Blockly.WorkspaceSvg, 2, -1)).toBe(true)
    expect(storySnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'say_line', line: 'hello' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'glad' },
    ])
    expect(judgeTurnTakingProgram(storySnapshot(ws)).passed).toBe(true)
    ws.dispose()
  })

  it('never moves the start hat and refuses out-of-range moves', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    rebuildStoryProgram(ws as unknown as Blockly.WorkspaceSvg, [...CORRECT], CHOICES)
    const svg = ws as unknown as Blockly.WorkspaceSvg
    expect(moveStoryBlock(svg, 0, 1)).toBe(false)
    expect(moveStoryBlock(svg, 1, -1)).toBe(false)
    expect(moveStoryBlock(svg, 3, 1)).toBe(false)
    expect(moveStoryBlock(svg, 4, -1)).toBe(false)
    expect(mainStoryStack(ws).map((block) => block.type)).toEqual([
      'when_start',
      'say_line',
      'switch_character',
      'say_line',
    ])
    ws.dispose()
  })

  it('setBlockLine swaps the line on a say block and refuses bad input', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    const svg = ws as unknown as Blockly.WorkspaceSvg
    rebuildStoryProgram(svg, [...CORRECT], CHOICES)
    const sayBlock = mainStoryStack(ws)[1]
    expect(setBlockLine(sayBlock, 'glad', CHOICES)).toBe(true)
    expect(storySnapshot(ws)[1]).toEqual({ type: 'say_line', line: 'glad' })
    expect(setBlockLine(sayBlock, 'no-such-line', CHOICES)).toBe(false)
    expect(setBlockLine(mainStoryStack(ws)[0], 'glad', CHOICES)).toBe(false)
    expect(storySnapshot(ws)[1]).toEqual({ type: 'say_line', line: 'glad' })
    ws.dispose()
  })

  it('rebuild swaps the whole program and keeps per-block say lines', () => {
    registerKidsBlocks()
    const ws = new Blockly.Workspace()
    const svg = ws as unknown as Blockly.WorkspaceSvg
    rebuildStoryProgram(svg, [...CORRECT], CHOICES)
    rebuildStoryProgram(svg, [
      { type: 'when_start' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'glad' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'hello' },
    ], CHOICES)
    expect(storySnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'glad' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'hello' },
    ])
    expect(judgeTurnTakingProgram(storySnapshot(ws)).failure).toBe('reversed_order')
    rebuildStoryProgram(svg, [...CORRECT, { type: 'switch_character' }, { type: 'say_line', line: 'hello' }], CHOICES)
    expect(storySnapshot(ws)).toEqual([
      { type: 'when_start' },
      { type: 'say_line', line: 'hello' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'glad' },
      { type: 'switch_character' },
      { type: 'say_line', line: 'hello' },
    ])
    expect(judgeTurnTakingProgram(storySnapshot(ws)).hasExtension).toBe(true)
    ws.dispose()
  })
})
