import * as Blockly from 'blockly'

export const kidsBlockLabels: Record<string, string> = {
  when_start: '开始时',
  move_right: '向右移动',
  say_line: '说“你好呀”',
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
  ])

  isRegistered = true
}

export function getKidsBlockLabel(type: string) {
  return kidsBlockLabels[type] ?? type
}
