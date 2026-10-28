import {describe, expect, it} from 'vitest'
import {g2u1L01, g2u1L02, g2u1L03, g2u1L04} from '@/content/curriculum/g2-u1-scratch-lessons'
import {changedValues, checkSlotValue, readG2Program, valuesForTarget, type BlockLike, type WorkspaceLike} from './scratch-g2-program'

function block(type: string, fields: Record<string, string> = {}, next: BlockLike | null = null, inner: BlockLike | null = null): BlockLike {
  return {type, getNextBlock: () => next, getFieldValue: (name: string) => fields[name] ?? '', getInputTargetBlock: (name: string) => (name === 'DO' ? inner : null)}
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

describe('G2 restricted Blockly adapter (G2-U1-L02 costumes)', () => {
  const cat2 = g2u1L02.targets.find(t => t.name === '小橘猫')!
  const stage2 = g2u1L02.targets.find(t => t.kind === 'stage')!
  const dance = (times: string, secs: string, body?: BlockLike | null) =>
    block('kc2_clicked', {}, block('kc2_repeat', {TIMES: times}, null, body === undefined ? block('kc2_next_costume', {}, block('kc2_wait', {DURATION: secs})) : body))
  const flag = (costume: string) => block('kc2_flag', {}, block('kc2_switch_costume', {COSTUME: costume}))

  it('reads the costume choice and the repeat/wait values nested inside the C-block', () => {
    expect(readG2Program(ws(flag('挥手'), dance('3', '0.5')), cat2)).toEqual({kind: 'sprite', values: {
      '小橘猫|cat_costume_menu|COSTUME': '挥手', '小橘猫|cat_repeat|TIMES': 3, '小橘猫|cat_wait|DURATION': 0.5,
    }})
    expect(readG2Program(ws(dance('6', '0.2'), flag('站立')), cat2)).toEqual({kind: 'sprite', values: {
      '小橘猫|cat_costume_menu|COSTUME': '站立', '小橘猫|cat_repeat|TIMES': 6, '小橘猫|cat_wait|DURATION': 0.2,
    }})
  })

  it('rejects another sprite\'s costume, an empty or reordered repeat body, and out-of-range times or seconds', () => {
    expect(readG2Program(ws(flag('展翅'), dance('3', '0.5')), cat2)).toBeNull()
    expect(readG2Program(ws(flag('挥手'), dance('3', '0.5', null)), cat2)).toBeNull()
    expect(readG2Program(ws(flag('挥手'), dance('3', '0.5', block('kc2_wait', {DURATION: '0.5'}, block('kc2_next_costume')))), cat2)).toBeNull()
    expect(readG2Program(ws(flag('挥手'), dance('0', '0.5')), cat2)).toBeNull()
    expect(readG2Program(ws(flag('挥手'), dance('11', '0.5')), cat2)).toBeNull()
    expect(readG2Program(ws(flag('挥手'), dance('3', '0.1')), cat2)).toBeNull()
    expect(readG2Program(ws(flag('挥手'), dance('3', '0.25')), cat2)).toBeNull()
    expect(readG2Program(ws(flag('挥手'), dance('3', '1.1')), cat2)).toBeNull()
  })

  it('treats "switch costume" under the stage green flag as the stage-costume error case', () => {
    expect(readG2Program(ws(block('kc2_flag')), stage2)).toEqual({kind: 'stage-empty'})
    expect(readG2Program(ws(flag('挥手')), stage2)).toEqual({kind: 'stage-costume', costume: '挥手'})
    expect(readG2Program(ws(block('kc2_flag', {}, block('kc2_next_costume'))), stage2)).toBeNull()
  })

  it('validates tenths and costume slots like the sandbox', () => {
    const wait = cat2.scripts[1].body[0].children![1].slots[0]
    const costume = cat2.scripts[0].body[0].slots[0]
    expect(checkSlotValue(wait, '0.2')).toBe(0.2)
    expect(checkSlotValue(wait, '1')).toBe(1)
    expect(checkSlotValue(wait, '0.15')).toBeNull()
    expect(checkSlotValue(wait, 'abc')).toBeNull()
    expect(checkSlotValue(costume, '挥手')).toBe('挥手')
    expect(checkSlotValue(costume, '<script>')).toBeNull()
  })
})

describe('G2 restricted Blockly adapter (G2-U1-L03 backdrops and sounds)', () => {
  const stage3 = g2u1L03.targets.find(t => t.kind === 'stage')!
  const bird3 = g2u1L03.targets.find(t => t.name === '小鸟')!
  const stageFlag = (backdrop: string, times: string, inner: BlockLike | null = block('kc2_play_sound', {SOUND_MENU: '开幕铃'})) =>
    block('kc2_flag', {}, block('kc2_switch_backdrop', {BACKDROP: backdrop}, block('kc2_repeat', {TIMES: times}, null, inner)))

  it('reads a stage that has its own scripts like a sprite (backdrop choice + repeat count)', () => {
    expect(readG2Program(ws(stageFlag('绿色草地', '1')), stage3)).toEqual({kind: 'sprite', values: {
      'Stage|stage_backdrop_menu|BACKDROP': '绿色草地', 'Stage|stage_repeat|TIMES': 1,
    }})
    expect(readG2Program(ws(stageFlag('绿色草地', '6')), stage3)).toBeNull()
    expect(readG2Program(ws(stageFlag('草原', '1')), stage3)).toBeNull()
    expect(readG2Program(ws(stageFlag('绿色草地', '1', null)), stage3)).toBeNull()
    expect(readG2Program(ws(block('kc2_flag')), stage3)).toBeNull()
  })

  it('accepts only the bird\'s own sounds', () => {
    expect(readG2Program(ws(block('kc2_clicked', {}, block('kc2_play_sound', {SOUND_MENU: '啾啾'}))), bird3)).toEqual({kind: 'sprite', values: {'小鸟|bird_sound_menu|SOUND_MENU': '啾啾'}})
    expect(readG2Program(ws(block('kc2_clicked', {}, block('kc2_play_sound', {SOUND_MENU: '开幕铃'}))), bird3)).toBeNull()
  })
})

describe('G2 restricted Blockly adapter (G2-U1-L04 motion)', () => {
  const cat4 = g2u1L04.targets.find(t => t.name === '小橘猫')!
  const wheel4 = g2u1L04.targets.find(t => t.name === '风车')!
  const catFlag = (direction: string, steps: string, line = '到啦') =>
    block('kc2_flag', {}, block('kc2_goto_start', {}, block('kc2_point_direction', {DIRECTION: direction}, block('kc2_move_steps', {STEPS: steps}, block('kc2_say', {MESSAGE: line})))))

  it('reads direction, steps and line; refuses off-menu directions and out-of-range steps', () => {
    expect(readG2Program(ws(catFlag('90', '240')), cat4)).toEqual({kind: 'sprite', values: {
      '小橘猫|cat_point|DIRECTION': '90', '小橘猫|cat_move|STEPS': 240, '小橘猫|cat_say|MESSAGE': '到啦',
    }})
    expect(readG2Program(ws(catFlag('45', '240')), cat4)).toBeNull()
    expect(readG2Program(ws(catFlag('90', '400')), cat4)).toBeNull()
    expect(readG2Program(ws(catFlag('90', '0')), cat4)).toBeNull()
    expect(readG2Program(ws(catFlag('90', '12.5')), cat4)).toBeNull()
    // The fixed start block cannot be dropped.
    expect(readG2Program(ws(block('kc2_flag', {}, block('kc2_point_direction', {DIRECTION: '90'}, block('kc2_move_steps', {STEPS: '240'}, block('kc2_say', {MESSAGE: '到啦'}))))), cat4)).toBeNull()
  })

  it('reads the pinwheel repeat + turn + wait loop and refuses turns over 180 degrees', () => {
    const loop = (times: string, degrees: string, wait = '0.2') =>
      block('kc2_clicked', {}, block('kc2_repeat', {TIMES: times}, null, block('kc2_turn_right', {DEGREES: degrees}, block('kc2_wait', {DURATION: wait}))))
    expect(readG2Program(ws(loop('6', '15')), wheel4)).toEqual({kind: 'sprite', values: {
      '风车|wheel_repeat|TIMES': 6, '风车|wheel_turn|DEGREES': 15, '风车|wheel_wait|DURATION': 0.2,
    }})
    expect(readG2Program(ws(loop('1', '200')), wheel4)).toBeNull()
    expect(readG2Program(ws(loop('13', '30')), wheel4)).toBeNull()
    expect(checkSlotValue({key: 'k', field: 'DIRECTION', label: '方向', options: ['90', '-90']}, '-90')).toBe('-90')
  })
})
