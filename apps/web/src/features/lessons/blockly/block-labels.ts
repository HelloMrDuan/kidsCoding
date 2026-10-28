/**
 * Child-facing block names (pure module, no Blockly import) so lesson copy, remedial cards,
 * palette buttons and the Blockly blocks themselves all read from one source.
 *
 * TQ-009: a block says exactly what it does on stage. One move is STEP_DISTANCE (100) steps,
 * so the move block says “向右走 100 步”, and the repeat block — which always repeats the
 * current character's move, even when it sits after “切换场景” or “说一句话” — says so too.
 *
 * The verb follows the character on stage: the fox and the bear walk (“走”), the garden
 * butterfly flies (“飞”). Block type ids never change; only the visible label does.
 */
export type MotionVerb = 'walk' | 'fly'

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
  // G0-U2 event stage
  when_bell: '听到铃铛时',
  wake_up: '睁开眼睛',
  say_hello: '说早上好',
  show_surprise: '露出惊喜',
  enter_stage: '走上舞台',
  raise_flag: '升起彩旗',
  fall_down: '掉到地上',
  send_bell: '摇响铃铛',
}

/** Labels that change when the character flies instead of walks. */
const flyBlockLabels: Record<string, string> = {
  move_right: '向右飞 100 步',
  repeat_twice: '重复：再飞 100 步',
}

/** Block types whose visible label depends on the motion verb. */
export const VERB_LABELLED_BLOCKS = Object.keys(flyBlockLabels)

/** Templates whose main character flies (the garden butterfly). */
const FLYING_TEMPLATES = new Set(['garden-interaction-stage'])

/** Lessons and remedials whose main character is the garden butterfly. */
const FLYING_LESSONS = new Set([
  'lesson-07-garden-click',
  'lesson-08-garden-dialogue',
  'lesson-09-garden-story',
  'remedial-click-trigger',
])

export function motionVerbForTemplate(templateId?: string | null): MotionVerb {
  return templateId && FLYING_TEMPLATES.has(templateId) ? 'fly' : 'walk'
}

export function motionVerbForLesson(lessonId?: string | null): MotionVerb {
  return lessonId && FLYING_LESSONS.has(lessonId) ? 'fly' : 'walk'
}

/** The motion word itself: “走” or “飞”. */
export function motionWord(verb: MotionVerb = 'walk') {
  return verb === 'fly' ? '飞' : '走'
}

export function getKidsBlockLabel(type: string, verb: MotionVerb = 'walk') {
  if (verb === 'fly' && flyBlockLabels[type]) return flyBlockLabels[type]
  return kidsBlockLabels[type] ?? type
}

/** Every label a block can show, across verbs (for copy checks). */
export function allKidsBlockLabels(verb: MotionVerb) {
  return Object.keys(kidsBlockLabels).map((type) => getKidsBlockLabel(type, verb))
}

/** Quoted block name for copy: “向右走 100 步” / “向右飞 100 步”. */
export function quoteBlock(type: string, verb: MotionVerb = 'walk') {
  return `“${getKidsBlockLabel(type, verb)}”`
}
