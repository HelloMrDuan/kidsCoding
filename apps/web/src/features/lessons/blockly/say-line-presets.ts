/**
 * TQ-008: preset lines a child can pick for the say block (lesson-02 "换一句自己的话").
 * Fixed, kid-safe phrases only — there is deliberately no free-text input (minor privacy).
 *
 * TQ-012: unit projects add meadow (lesson-06) and garden (lesson-09) groups. Ids are unique
 * across ALL groups so a saved snapshot's `line` resolves the same everywhere; the first
 * line of the meadow / garden group is the scene default (defaultSayMessage) so a say block
 * with no choice still says what it always said.
 */
export type SayLinePreset = { id: string; text: string }

export const FOREST_GREETING_LINES: readonly SayLinePreset[] = [
  { id: 'hello', text: '你好！' },
  { id: 'hi-all', text: '大家好呀！' },
  { id: 'nice-to-meet', text: '很高兴见到你！' },
  { id: 'lets-play', text: '一起来玩吧！' },
]

/** TQ-012: lesson-06 travel feelings; first line = meadow default. */
export const MEADOW_TRAVEL_LINES: readonly SayLinePreset[] = [
  { id: 'meadow-arrived', text: '我到草地啦！' },
  { id: 'meadow-pretty', text: '草地真漂亮！' },
  { id: 'meadow-fun', text: '旅行真好玩！' },
  { id: 'meadow-hi-bird', text: '小鸟，你好呀！' },
]

/** TQ-012: lesson-09 butterfly replies; first line = click default. */
export const GARDEN_REPLY_LINES: readonly SayLinePreset[] = [
  { id: 'garden-got-click', text: '蝴蝶收到你的点击啦！' },
  { id: 'garden-thanks', text: '谢谢你点我！' },
  { id: 'garden-dance', text: '看我跳个舞！' },
  { id: 'garden-fly-together', text: '我们一起飞吧！' },
]

export const ALL_SAY_LINE_GROUPS: readonly (readonly SayLinePreset[])[] = [
  FOREST_GREETING_LINES,
  MEADOW_TRAVEL_LINES,
  GARDEN_REPLY_LINES,
]

const PRESET_TEXT = new Map(ALL_SAY_LINE_GROUPS.flat().map((line) => [line.id, line.text]))

/** Text of a preset line id (any group); null for no / unknown id (unknown ids never reach the stage). */
export function resolveSayLine(id: string | undefined | null) {
  return id ? PRESET_TEXT.get(id) ?? null : null
}

export function isKnownSayLine(id: string | undefined | null) {
  return !!id && PRESET_TEXT.has(id)
}
