import {describe, expect, it} from 'vitest'
import {g2u2L01, g2u2L02, g2u2L03, g2u2L04, g2u2L05, g2u2L06} from '@/content/curriculum/g2-u2-scratch-lessons'
import {g2u1L01, g2u1L02, g2u1L03, g2u1L04, g2u1L05, g2u1L06} from '@/content/curriculum/g2-u1-scratch-lessons'
import {G2_TEXT_FIELDS, changedValues, checkSlotValue, quickEditValue, readG2Program, valuesForTarget, type BlockLike, type WorkspaceLike} from './scratch-g2-program'

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

describe('G2 restricted Blockly adapter (G2-U1-L05 broadcasts)', () => {
  const bird5 = g2u1L05.targets.find(t => t.name === '小鸟')!
  const rabbit5 = g2u1L05.targets.find(t => t.name === '小白兔')!
  const receive = (message: string, line = '叽叽') => block('kc2_when_receive', {BROADCAST_OPTION: message}, block('kc2_say', {MESSAGE: line}))

  it('reads the message on the receive hat itself and refuses messages the lesson does not define', () => {
    expect(readG2Program(ws(receive('开场')), bird5)).toEqual({kind: 'sprite', values: {'小鸟|bird_recv|BROADCAST_OPTION': '开场', '小鸟|bird_say|MESSAGE': '叽叽'}})
    expect(readG2Program(ws(receive('开饭')), bird5)).toBeNull()
    expect(readG2Program(ws(receive('开场'), receive('谢幕')), bird5)).toBeNull()
    expect(readG2Program(ws(block('kc2_clicked', {}, block('kc2_say', {MESSAGE: '叽叽'}))), bird5)).toBeNull()
  })

  it('reads a sprite with a green-flag script and a receive script (only x is a lesson value)', () => {
    const flag = block('kc2_flag', {}, block('kc2_goto_start', {X: '190', Y: '-40'}))
    const recv = (x: string) => block('kc2_when_receive', {BROADCAST_OPTION: '开场'}, block('kc2_goto', {X: x, Y: '-40'}))
    expect(readG2Program(ws(flag, recv('0')), rabbit5)).toEqual({kind: 'sprite', values: {'小白兔|rabbit_goto|X': 0}})
    expect(readG2Program(ws(flag, recv('300')), rabbit5)).toBeNull()
    expect(readG2Program(ws(recv('0')), rabbit5)).toBeNull()
  })
})

describe('G2 restricted Blockly adapter (G2-U1-L06 birthday card)', () => {
  const balloon6 = g2u1L06.targets.find(t => t.name === '气球')!
  const cake6 = g2u1L06.targets.find(t => t.name === '蛋糕')!
  const balloonFlag = (wait: string, times = '2', dy = '10') => block('kc2_flag', {}, block('kc2_goto_start', {X: '160', Y: '-90'},
    block('kc2_wait_whole', {DURATION: wait}, block('kc2_say', {MESSAGE: '许个愿吧！'}, block('kc2_repeat', {TIMES: times}, null, block('kc2_change_y', {DY: dy}))))))

  it('reads a whole-second wait (0 allowed, no tenths, at most 5) and the repeat × change-y rise', () => {
    expect(readG2Program(ws(balloonFlag('2', '5', '10')), balloon6)).toEqual({kind: 'sprite', values: {
      '气球|balloon_wait|DURATION': 2, '气球|balloon_say|MESSAGE': '许个愿吧！', '气球|balloon_repeat|TIMES': 5, '气球|balloon_rise|DY': 10,
    }})
    expect(readG2Program(ws(balloonFlag('0')), balloon6)).not.toBeNull()
    expect(readG2Program(ws(balloonFlag('1.5')), balloon6)).toBeNull()
    expect(readG2Program(ws(balloonFlag('6')), balloon6)).toBeNull()
    expect(readG2Program(ws(balloonFlag('2', '2', '40')), balloon6)).toBeNull()
    expect(readG2Program(ws(balloonFlag('2', '11')), balloon6)).toBeNull()
  })

  it('keeps the cake order: switch costume, then play the song; the order cannot be swapped', () => {
    const flag = block('kc2_flag', {}, block('kc2_switch_costume', {COSTUME: '蜡烛熄灭'}))
    const click = (costume: string) => block('kc2_clicked', {}, block('kc2_switch_costume', {COSTUME: costume}, block('kc2_play_sound', {SOUND_MENU: '生日歌'})))
    expect(readG2Program(ws(flag, click('蜡烛点亮')), cake6)).toEqual({kind: 'sprite', values: {'蛋糕|cake_costume_menu|COSTUME': '蜡烛点亮'}})
    const swapped = block('kc2_clicked', {}, block('kc2_play_sound', {SOUND_MENU: '生日歌'}, block('kc2_switch_costume', {COSTUME: '蜡烛点亮'})))
    expect(readG2Program(ws(flag, swapped), cake6)).toBeNull()
  })
})

describe('G2 restricted Blockly adapter (G2-U2-L01 walk cycle)', () => {
  const cat = g2u2L01.targets.find(t => t.name === '小橘猫')!
  const bird = g2u2L01.targets.find(t => t.name === '小鸟')!
  const walk = (times: string, steps: string, wait: string, line = '我到家啦！', order: 'ok' | 'swapped' = 'ok') => {
    const inner = order === 'ok'
      ? block('kc2_move_steps', {STEPS: steps}, block('kc2_next_costume', {}, block('kc2_wait_free', {DURATION: wait})))
      : block('kc2_next_costume', {}, block('kc2_move_steps', {STEPS: steps}, block('kc2_wait_free', {DURATION: wait})))
    const say = block('kc2_say', {MESSAGE: line})
    const repeat = block('kc2_repeat', {TIMES: times}, say, inner)
    return ws(block('kc2_flag', {}, block('kc2_goto_start', {X: '-160', Y: '-80'}, block('kc2_switch_costume', {COSTUME: '走路1'}, repeat))))
  }

  it('reads repeat × steps and a tenths wait that may be 0', () => {
    expect(readG2Program(walk('12', '25', '0.2'), cat)).toEqual({kind: 'sprite', values: {
      '小橘猫|cat_repeat|TIMES': 12, '小橘猫|cat_move|STEPS': 25, '小橘猫|cat_wait|DURATION': 0.2, '小橘猫|cat_say|MESSAGE': '我到家啦！'}})
    expect(readG2Program(walk('6', '20', '0'), cat)).not.toBeNull()
    expect(readG2Program(walk('6', '20', '1'), cat)).not.toBeNull()
  })

  it('refuses a wait off the 0.1 s grid or over 1 s, out-of-range loops/steps and a swapped loop body', () => {
    expect(readG2Program(walk('6', '20', '0.25'), cat)).toBeNull()
    expect(readG2Program(walk('6', '20', '1.1'), cat)).toBeNull()
    expect(readG2Program(walk('6', '20', '-0.1'), cat)).toBeNull()
    expect(readG2Program(walk('21', '20', '0.2'), cat)).toBeNull()
    expect(readG2Program(walk('6', '41', '0.2'), cat)).toBeNull()
    expect(readG2Program(walk('6', '20', '0.2', '我到家啦！', 'swapped'), cat)).toBeNull()
  })

  it('reads the fixed bird demo without lesson values', () => {
    const birdWs = ws(block('kc2_flag', {}, block('kc2_switch_costume', {COSTUME: '收翅'},
      block('kc2_repeat', {TIMES: '8'}, null, block('kc2_next_costume', {}, block('kc2_wait', {DURATION: '0.3'}))))))
    expect(readG2Program(birdWs, bird)).toEqual({kind: 'sprite', values: {}})
  })
})

describe('G2 restricted Blockly adapter (G2-U2-L02 day/night)', () => {
  const stage = g2u2L02.targets.find(t => t.kind === 'stage')!
  const owl = g2u2L02.targets.find(t => t.name === '猫头鹰')!
  const stageWs = (wait: string, inner: 'ok' | 'swapped' = 'ok') => ws(block('kc2_flag', {}, block('kc2_switch_backdrop', {BACKDROP: '白天'},
    block('kc2_forever', {}, null, inner === 'ok'
      ? block('kc2_wait_whole', {DURATION: wait}, block('kc2_next_backdrop'))
      : block('kc2_next_backdrop', {}, block('kc2_wait_whole', {DURATION: wait}))))))
  const owlWs = (backdrop: string, line = '咕咕，天黑啦！') => ws(
    block('kc2_flag', {}, block('kc2_switch_costume', {COSTUME: '睡觉'})),
    block('kc2_when_backdrop', {BACKDROP: backdrop}, block('kc2_switch_costume', {COSTUME: '醒来'}, block('kc2_say', {MESSAGE: line}, block('kc2_switch_costume', {COSTUME: '睡觉'})))))

  it('reads the stage forever loop (whole-second wait 1～5) and refuses 0, 6, fractions or a swapped loop body', () => {
    expect(readG2Program(stageWs('3'), stage)).toEqual({kind: 'sprite', values: {'Stage|stage_wait|DURATION': 3}})
    for (const bad of ['0', '6', '2.5']) expect(readG2Program(stageWs(bad), stage)).toBeNull()
    expect(readG2Program(stageWs('3', 'swapped'), stage)).toBeNull()
  })

  it('reads the backdrop a hat listens for and refuses backdrops the stage does not have', () => {
    expect(readG2Program(owlWs('夜晚'), owl)).toEqual({kind: 'sprite', values: {'猫头鹰|owl_hat|BACKDROP': '夜晚', '猫头鹰|owl_say|MESSAGE': '咕咕，天黑啦！'}})
    expect(readG2Program(owlWs('黄昏'), owl)).toBeNull()
  })
})

describe('G2 quick-edit box value (TQ-023: no late re-render garbling the next edit)', () => {
  it('shows the value Blockly stored when it clamped or rounded what was typed', () => {
    expect(quickEditValue('25', '20', true)).toBe('20')
    expect(quickEditValue('300', '240', true)).toBe('240')
    expect(quickEditValue('0.25', '0.3', true)).toBe('0.3')
    expect(quickEditValue('1.1', '1', true)).toBe('1')
  })
  it('keeps what was typed while it is the same number, so a box never rewrites itself mid-typing', () => {
    expect(quickEditValue('8', '8', true)).toBe('8')
    expect(quickEditValue('1.0', '1', true)).toBe('1.0')
    expect(quickEditValue('0.50', '0.5', true)).toBe('0.50')
  })
  it('lets a number box stay empty while the learner retypes (the block keeps its last number)', () => {
    expect(quickEditValue('', '6', true)).toBe('')
    expect(quickEditValue('  ', '6', true)).toBe('  ')
  })
  it('shows the stored value when nothing was typed, and text/menu fields exactly as stored', () => {
    expect(quickEditValue(undefined, '20', true)).toBe('20')
    expect(quickEditValue('你好', '你好', false)).toBe('你好')
    expect(quickEditValue('站立', '挥手', false)).toBe('挥手')
    expect(G2_TEXT_FIELDS.has('MESSAGE') && G2_TEXT_FIELDS.has('DIRECTION') && !G2_TEXT_FIELDS.has('TIMES')).toBe(true)
  })
})

describe('G2 restricted Blockly adapter (G2-U2-L03 nested loops)', () => {
  const drum = g2u2L03.targets.find(t => t.name === '小鼓')!
  const drumWs = (bars: string, beats: string, w1: string, accent: string, w2: string, nested = true) => {
    const inner = block('kc2_repeat', {TIMES: beats}, null, block('kc2_play_sound', {SOUND_MENU: '咚'}, block('kc2_wait_free', {DURATION: w1})))
    const tail = block('kc2_play_sound', {SOUND_MENU: accent}, block('kc2_wait_free', {DURATION: w2}))
    if (nested) {
      inner.getNextBlock = () => tail
      return ws(block('kc2_flag', {}, block('kc2_repeat', {TIMES: bars}, null, inner)))
    }
    // Inner loop placed after the outer loop instead of inside it.
    const outer = block('kc2_repeat', {TIMES: bars}, inner, tail)
    return ws(block('kc2_flag', {}, outer))
  }

  it('reads both loop counts, both waits and the accent', () => {
    expect(readG2Program(drumWs('4', '3', '0.5', '啪', '0.5'), drum)).toEqual({kind: 'sprite', values: {
      '小鼓|drum_bars|TIMES': 4, '小鼓|drum_beats|TIMES': 3, '小鼓|drum_wait1|DURATION': 0.5,
      '小鼓|drum_accent_menu|SOUND_MENU': '啪', '小鼓|drum_wait2|DURATION': 0.5,
    }})
  })

  it('refuses 9 bars, 0 beats, waits off the 0.1 s grid or outside 0.2～1.0, other sounds and an un-nested inner loop', () => {
    expect(readG2Program(drumWs('9', '3', '0.5', '嗒', '0.5'), drum)).toBeNull()
    expect(readG2Program(drumWs('4', '0', '0.5', '嗒', '0.5'), drum)).toBeNull()
    for (const bad of ['0.25', '0.1', '1.5', '0']) expect(readG2Program(drumWs('4', '3', bad, '嗒', '0.5'), drum)).toBeNull()
    expect(readG2Program(drumWs('4', '3', '0.5', '咚', '0.5'), drum)).toBeNull()
    expect(readG2Program(drumWs('4', '3', '0.5', '嗒', '0.5', false), drum)).toBeNull()
  })
})

describe('G2 restricted Blockly adapter (G2-U2-L04 flight loop)', () => {
  const fly = g2u2L04.targets.find(t => t.name === '蝴蝶')!
  const flyWs = (times: string, steps: string, degrees: string, order: 'ok' | 'turn-first' = 'ok') => {
    const wait = block('kc2_wait', {DURATION: '0.2'})
    const next = block('kc2_next_costume', {}, wait)
    const inner = order === 'ok'
      ? block('kc2_move_steps', {STEPS: steps}, block('kc2_turn_right', {DEGREES: degrees}, next))
      : block('kc2_turn_right', {DEGREES: degrees}, block('kc2_move_steps', {STEPS: steps}, next))
    return ws(block('kc2_flag', {}, block('kc2_goto_start', {X: '-60', Y: '60'}, block('kc2_point_direction', {DIRECTION: '90'},
      block('kc2_switch_costume', {COSTUME: '展翅'}, block('kc2_repeat', {TIMES: times}, block('kc2_say', {MESSAGE: '我飞回花朵啦！'}), inner))))))
  }
  it('reads repeats, steps and degrees', () => {
    expect(readG2Program(flyWs('8', '40', '45'), fly)).toEqual({kind: 'sprite', values: {
      '蝴蝶|fly_repeat|TIMES': 8, '蝴蝶|fly_move|STEPS': 40, '蝴蝶|fly_turn|DEGREES': 45, '蝴蝶|fly_say|MESSAGE': '我飞回花朵啦！',
    }})
  })
  it('refuses 150°, 4°, 80 steps, 21 repeats, fractions and turning before moving', () => {
    expect(readG2Program(flyWs('8', '40', '150'), fly)).toBeNull()
    expect(readG2Program(flyWs('8', '40', '4'), fly)).toBeNull()
    expect(readG2Program(flyWs('8', '80', '45'), fly)).toBeNull()
    expect(readG2Program(flyWs('21', '40', '45'), fly)).toBeNull()
    expect(readG2Program(flyWs('8', '40', '22.5'), fly)).toBeNull()
    expect(readG2Program(flyWs('8', '40', '45', 'turn-first'), fly)).toBeNull()
  })
})

describe('G2 restricted Blockly adapter (G2-U2-L05 one broadcast, two performers)', () => {
  const rabbit = g2u2L05.targets.find(t => t.name === '小白兔')!
  const fox = g2u2L05.targets.find(t => t.name === '小狐狸')!
  const flag = block('kc2_flag', {}, block('kc2_goto_start', {X: '200', Y: '-70'}))
  const recv = (message: string, wait: string, line = '我是小白兔！') => block('kc2_when_receive', {BROADCAST_OPTION: message},
    block('kc2_wait_free', {DURATION: wait}, block('kc2_goto_start', {X: '60', Y: '-70'}, block('kc2_say', {MESSAGE: line}))))
  it('reads the rabbit\'s message, its wait (0 to 2.0 in tenths) and its line', () => {
    expect(readG2Program(ws(flag, recv('开演', '1')), rabbit)).toEqual({kind: 'sprite', values: {
      '小白兔|rabbit_recv|BROADCAST_OPTION': '开演', '小白兔|rabbit_wait|DURATION': 1, '小白兔|rabbit_say|MESSAGE': '我是小白兔！',
    }})
    expect(readG2Program(ws(flag, recv('谢幕', '0')), rabbit)).not.toBeNull()
    expect(readG2Program(ws(flag, recv('开演', '2')), rabbit)).not.toBeNull()
  })
  it('refuses 2.5 s, 1.05 s, negative waits, unknown messages and a missing green-flag script', () => {
    expect(readG2Program(ws(flag, recv('开演', '2.5')), rabbit)).toBeNull()
    expect(readG2Program(ws(flag, recv('开演', '1.05')), rabbit)).toBeNull()
    expect(readG2Program(ws(flag, recv('开演', '-1')), rabbit)).toBeNull()
    expect(readG2Program(ws(flag, recv('开饭', '1')), rabbit)).toBeNull()
    expect(readG2Program(ws(recv('开演', '1')), rabbit)).toBeNull()
  })
  it('reads only the fox\'s line; its receive message is a locked field, never a lesson value sent to the VM', () => {
    const foxFlag = block('kc2_flag', {}, block('kc2_goto_start', {X: '-200', Y: '-70'}))
    const foxRecv = (message: string) => block('kc2_when_receive', {BROADCAST_OPTION: message}, block('kc2_goto_start', {X: '-60', Y: '-70'}, block('kc2_say', {MESSAGE: '嗷呜'})))
    expect(readG2Program(ws(foxFlag, foxRecv('开演')), fox)).toEqual({kind: 'sprite', values: {'小狐狸|fox_say|MESSAGE': '嗷呜'}})
    expect(readG2Program(ws(foxFlag, foxRecv('谢幕')), fox)).toEqual({kind: 'sprite', values: {'小狐狸|fox_say|MESSAGE': '嗷呜'}})
  })
})

describe('G2 restricted Blockly adapter (G2-U2-L06 music short: three receive hats, a forever loop and a stop block)', () => {
  const filmCat = g2u2L06.targets.find(t => t.name === '小橘猫')!
  const filmStage = g2u2L06.targets.find(t => t.name === 'Stage')!
  const recv = (message: string, body: BlockLike) => block('kc2_when_receive', {BROADCAST_OPTION: message}, body)
  const hello = (line = '音乐短片开始啦！') => recv('开头', block('kc2_say', {MESSAGE: line}))
  const dance = (wait = '0.3') => recv('中段', block('kc2_forever', {}, null, block('kc2_next_costume', {}, block('kc2_wait_free', {DURATION: wait}))))
  const bye = (option = 'this script', line = '谢谢观看！') => recv('结尾', block('kc2_say', {MESSAGE: line}, block('kc2_stop', {STOP_OPTION: option})))
  it('matches each "when I receive" hat to the script listening for that message, in any order', () => {
    const expected = {kind: 'sprite', values: {'小橘猫|cat_hello|MESSAGE': '开拍啦', '小橘猫|cat_wait|DURATION': 0.5, '小橘猫|cat_bye|MESSAGE': '下次见', '小橘猫|cat_stop|STOP_OPTION': 'all'}}
    expect(readG2Program(ws(hello('开拍啦'), dance('0.5'), bye('all', '下次见')), filmCat)).toEqual(expected)
    expect(readG2Program(ws(bye('all', '下次见'), hello('开拍啦'), dance('0.5')), filmCat)).toEqual(expected)
  })
  it('refuses a body under the wrong scene, a missing or duplicated scene, a bad stop option and out-of-range loop waits', () => {
    // The dance loop under the 开头 hat and the greeting under 中段: same blocks, wrong scenes.
    expect(readG2Program(ws(recv('中段', block('kc2_say', {MESSAGE: 'hi'})), recv('开头', block('kc2_forever', {}, null, block('kc2_next_costume', {}, block('kc2_wait_free', {DURATION: '0.5'})))), bye()), filmCat)).toBeNull()
    expect(readG2Program(ws(hello(), dance()), filmCat)).toBeNull()
    expect(readG2Program(ws(hello(), dance(), bye(), bye()), filmCat)).toBeNull()
    expect(readG2Program(ws(hello(), dance(), bye('other scripts in sprite')), filmCat)).toBeNull()
    expect(readG2Program(ws(hello(), dance('0.25'), bye()), filmCat)).toBeNull()
    expect(readG2Program(ws(hello(), dance('1.5'), bye()), filmCat)).toBeNull()
    expect(readG2Program(ws(hello(), dance('0.1'), bye()), filmCat)).toBeNull()
  })
  it('reads the stage director: two whole-second scene waits within 1–10 and 4–50', () => {
    const director = (t1: string, t2: string) => block('kc2_flag', {}, block('kc2_switch_backdrop', {BACKDROP: '开场'}, block('kc2_broadcast', {BROADCAST_OPTION: '开头'},
      block('kc2_wait_whole', {DURATION: t1}, block('kc2_broadcast', {BROADCAST_OPTION: '中段'}, block('kc2_wait_whole', {DURATION: t2}, block('kc2_broadcast', {BROADCAST_OPTION: '结尾'})))))))
    const scenes = [recv('中段', block('kc2_switch_backdrop', {BACKDROP: '音乐舞台'})), recv('结尾', block('kc2_switch_backdrop', {BACKDROP: '谢幕'}))]
    expect(readG2Program(ws(director('3', '27'), ...scenes), filmStage)).toEqual({kind: 'sprite', values: {'Stage|stage_wait1|DURATION': 3, 'Stage|stage_wait2|DURATION': 27}})
    expect(readG2Program(ws(director('0', '27'), ...scenes), filmStage)).toBeNull()
    expect(readG2Program(ws(director('3', '51'), ...scenes), filmStage)).toBeNull()
    expect(readG2Program(ws(director('2.5', '27'), ...scenes), filmStage)).toBeNull()
  })
  it('treats the stop option as a menu choice, not a number', () => {
    expect(G2_TEXT_FIELDS.has('STOP_OPTION')).toBe(true)
  })
})
