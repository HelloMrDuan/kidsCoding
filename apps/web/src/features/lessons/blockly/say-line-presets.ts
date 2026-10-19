/**
 * TQ-008: preset lines a child can pick for the say block (lesson-02 "换一句自己的话").
 * Fixed, kid-safe phrases only — there is deliberately no free-text input (minor privacy).
 */
export type SayLinePreset = { id: string; text: string }

export const FOREST_GREETING_LINES: readonly SayLinePreset[] = [
  { id: 'hello', text: '你好！' },
  { id: 'hi-all', text: '大家好呀！' },
  { id: 'nice-to-meet', text: '很高兴见到你！' },
  { id: 'lets-play', text: '一起来玩吧！' },
]

const PRESET_TEXT = new Map(FOREST_GREETING_LINES.map((line) => [line.id, line.text]))

/** Text of a preset line id; null for no / unknown id (unknown ids never reach the stage). */
export function resolveSayLine(id: string | undefined | null) {
  return id ? PRESET_TEXT.get(id) ?? null : null
}
