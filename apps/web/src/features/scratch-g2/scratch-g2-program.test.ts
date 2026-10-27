import {describe, expect, it} from 'vitest'
import {g2u1L01} from '@/content/curriculum/g2-u1-scratch-lessons'
import {changedValues, checkSlotValue, readG2Program, valuesForTarget, type BlockLike, type WorkspaceLike} from './scratch-g2-program'

function block(type: string, fields: Record<string, string> = {}, next: BlockLike | null = null): BlockLike {
  return {type, getNextBlock: () => next, getFieldValue: (name: string) => fields[name] ?? ''}
}
const ws = (...tops: BlockLike[]): WorkspaceLike => ({getTopBlocks: () => tops})
const cat = g2u1L01.targets.find(t => t.name === '小橘猫')!
const stage = g2u1L01.targets.find(t => t.kind === 'stage')!

describe('G2 restricted Blockly adapter (G2-U1-L01)', () => {
  it('reads both scripts of a sprite into Scratch VM parameter keys, in any top-level order', () => {
    const flag = block('kc2_flag', {}, block('kc2_goto', {X: '-120', Y: '-80'}))
    const clicked = block('kc2_clicked', {}, block('kc2_say', {MESSAGE: '你好！我是小橘猫。'}))
    const expected = {kind: 'sprite', values: {'小橘猫|cat_goto|X': -120, '小橘猫|cat_goto|Y': -80, '小橘猫|cat_say|MESSAGE': '你好！我是小橘猫。'}}
    expect(readG2Program(ws(flag, clicked), cat)).toEqual(expected)
    expect(readG2Program(ws(clicked, flag), cat)).toEqual(expected)
  })

  it('rejects a detached body block, a duplicated hat, a missing script or out-of-range values', () => {
    const goto = block('kc2_goto', {X: '0', Y: '0'})
    const say = block('kc2_clicked', {}, block('kc2_say', {MESSAGE: 'hi'}))
    expect(readG2Program(ws(block('kc2_flag'), goto, say), cat)).toBeNull()
    expect(readG2Program(ws(block('kc2_flag', {}, goto), block('kc2_flag', {}, goto)), cat)).toBeNull()
    expect(readG2Program(ws(block('kc2_flag', {}, goto)), cat)).toBeNull()
    expect(readG2Program(ws(block('kc2_flag', {}, block('kc2_goto', {X: '300', Y: '0'})), say), cat)).toBeNull()
    expect(readG2Program(ws(block('kc2_flag', {}, goto), block('kc2_clicked', {}, block('kc2_say', {MESSAGE: ''}))), cat)).toBeNull()
  })

  it('treats a go-to block under the stage green flag as the stage-move error case', () => {
    expect(readG2Program(ws(block('kc2_flag')), stage)).toEqual({kind: 'stage-empty'})
    expect(readG2Program(ws(block('kc2_flag', {}, block('kc2_goto', {X: '100', Y: '50'}))), stage)).toEqual({kind: 'stage-move', x: 100, y: 50})
    expect(readG2Program(ws(block('kc2_clicked')), stage)).toBeNull()
  })

  it('validates slot values the same way the sandbox does', () => {
    const [x] = cat.scripts[0].body[0].slots
    const [message] = cat.scripts[1].body[0].slots
    expect(checkSlotValue(x, '240')).toBe(240)
    expect(checkSlotValue(x, '241')).toBeNull()
    expect(checkSlotValue(x, '1.5')).toBeNull()
    expect(checkSlotValue(message, '一二三四五六七八九十一二三四五六七八九十')).toHaveLength(20)
    expect(checkSlotValue(message, '一二三四五六七八九十一二三四五六七八九十一')).toBeNull()
    expect(checkSlotValue(message, '<b>hi</b>')).toBeNull()
    expect(checkSlotValue(message, 'a\nb')).toBeNull()
  })

  it('only sends changed values and filters by target', () => {
    const applied = {'小鸟|bird_goto|X': -150, '小鸟|bird_goto|Y': 110, '小橘猫|cat_goto|X': -120}
    expect(changedValues({'小鸟|bird_goto|X': 110, '小鸟|bird_goto|Y': 110}, applied)).toEqual({'小鸟|bird_goto|X': 110})
    expect(valuesForTarget(applied, '小鸟')).toEqual({'小鸟|bird_goto|X': -150, '小鸟|bird_goto|Y': 110})
  })
})
