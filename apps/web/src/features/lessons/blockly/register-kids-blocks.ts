import * as Blockly from 'blockly'

export const kidsBlockLabels: Record<string, string> = {
  when_start: '开始时',
  when_clicked: '被点击时',
  move_right: '向右移动',
  say_line: '说一句话',
  switch_scene: '切换场景',
  switch_character: '切换到另一位朋友',
  repeat_twice: '再做一次',
}

let isRegistered = false

export function registerKidsBlocks() {
  if (isRegistered) {
    return
  }

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'when_start',
      message0: kidsBlockLabels.when_start,
      nextStatement: null,
      colour: 35,
    },
    {
      type: 'when_clicked',
      message0: kidsBlockLabels.when_clicked,
      nextStatement: null,
      colour: 20,
    },
    {
      type: 'move_right',
      message0: kidsBlockLabels.move_right,
      previousStatement: null,
      nextStatement: null,
      colour: 210,
    },
    {
      type: 'say_line',
      message0: kidsBlockLabels.say_line,
      previousStatement: null,
      nextStatement: null,
      colour: 120,
    },
    {
      type: 'switch_scene',
      message0: kidsBlockLabels.switch_scene,
      previousStatement: null,
      nextStatement: null,
      colour: 270,
    },
    {
      type: 'switch_character',
      message0: kidsBlockLabels.switch_character,
      previousStatement: null,
      nextStatement: null,
      colour: 300,
    },
    {
      type: 'repeat_twice',
      message0: kidsBlockLabels.repeat_twice,
      previousStatement: null,
      nextStatement: null,
      colour: 160,
    },
  ])

  isRegistered = true
}

export function getKidsBlockLabel(type: string) {
  return kidsBlockLabels[type] ?? type
}
