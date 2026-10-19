import type { JudgeOptions } from './observable-run'
import { FOREST_GREETING_LINES, type SayLinePreset } from './say-line-presets'

/**
 * TQ-008: lesson-level choices that the classroom really offers, and how judging honours them.
 * Kept in code (not in the lesson payload) so a database copy of the curriculum cannot drop them.
 */
const SAY_LINE_CHOICES: Record<string, readonly SayLinePreset[]> = {
  // Lesson-02 step-5 promises “从预设对白里选一句”: the say block gets a preset dropdown in this lesson.
  'lesson-02-forest-greeting': FOREST_GREETING_LINES,
}

export function getSayLineChoices(lessonId: string): readonly SayLinePreset[] | undefined {
  return SAY_LINE_CHOICES[lessonId]
}

const cache = new Map<string, JudgeOptions>()

/** Stable object per lesson step, so it can sit in hook dependency lists. */
export function getStepJudgeOptions(lessonId: string, stepId: string): JudgeOptions {
  const key = `${lessonId}|${stepId}`
  const cached = cache.get(key)
  if (cached) return cached
  const choices = SAY_LINE_CHOICES[lessonId]
  const options: JudgeOptions = {}
  if (choices) options.acceptedLines = choices.map((line) => line.text)
  // Lesson-09 step-5: “蝴蝶一共飞两次，飞完第一次或第二次后回你一句话” — both timings are correct.
  if (lessonId === 'lesson-09-garden-story' && stepId === 'step-5') options.sayAnyTimeAfterMove = true
  cache.set(key, options)
  return options
}
