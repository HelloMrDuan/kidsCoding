/**
 * Child-facing block names (pure module, no Blockly import) so lesson copy, remedial cards,
 * palette buttons and the Blockly blocks themselves all read from one source.
 *
 * TQ-009: a block says exactly what it does on stage. One move is STEP_DISTANCE (100) steps,
 * so the move block says “向右走 100 步”, and the repeat block — which always repeats the
 * current character's move, even when it sits after “切换场景” or “说一句话” — says so too.
 */
export const kidsBlockLabels: Record<string, string> = {
  when_start: '开始时',
  when_clicked: '被点击时',
  move_right: '向右走 100 步',
  say_line: '说一句话',
  switch_scene: '切换场景',
  switch_character: '切换到另一位朋友',
  repeat_twice: '重复：再走 100 步',
  move_up: '向上走一格',
  move_down: '向下走一格',
  move_left: '向左走一格',
  move_right_cell: '向右走一格',
  move_forward: '向前走一格',
  turn_left: '向左转',
  turn_right: '向右转',
  pick_key: '捡起钥匙',
  open_door: '打开树洞门',
}

export function getKidsBlockLabel(type: string) {
  return kidsBlockLabels[type] ?? type
}

/** Quoted block name for copy: “向右走 100 步”. */
export function quoteBlock(type: string) {
  return `“${getKidsBlockLabel(type)}”`
}
