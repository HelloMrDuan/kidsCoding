import { describe, expect, it } from 'vitest'

import { G1_U1_L02_STORY_LESSON } from '@/content/curriculum/g1-u1-story-lessons'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import {
  LEGACY_STORY_DRAFT_KEY,
  STORY_DRAFT_KEY,
  coerceStoryDraft,
  emptyStoryDraft,
  isValidStoryDraft,
} from './g1-u1-l02-draft'

const START = { type: 'when_start' }
const SAY_HELLO: ProgramBlock = { type: 'say_line', line: 'hello' }
const SAY_GLAD: ProgramBlock = { type: 'say_line', line: 'glad' }
const SWITCH: ProgramBlock = { type: 'switch_character' }
const CORRECT: ProgramBlock[] = [START, SAY_HELLO, SWITCH, SAY_GLAD]
const REVERSED: ProgramBlock[] = [START, SWITCH, SAY_GLAD, SWITCH, SAY_HELLO]

/**
 * 草稿键（Q9 方案 A）：新键为规范格式，旧键已废弃、不迁移。
 */
describe('story draft key (Q9 option A: no migration)', () => {
  it('uses the spec key, never the grid key or the legacy story key', () => {
    expect(STORY_DRAFT_KEY).toBe('kidscoding-draft:G1-U1-L02')
    expect(STORY_DRAFT_KEY).not.toContain('grid')
    expect(LEGACY_STORY_DRAFT_KEY).toBe('kids-story-lesson-v1:G1-U1-L02')
  })
})

/**
 * 保存恢复的恢复侧：损坏、外来、越界草稿绝不能让课堂崩掉，只能回到初始关。
 * （旧 parseStoryDraft 用例按新信封语义改写：输入为解包后的课数据对象，
 * version / lessonId 有门；savedAt 由外壳信封持有，不再进课数据。）
 */
describe('coerceStoryDraft / isValidStoryDraft (save/restore recovery)', () => {
  const lesson = G1_U1_L02_STORY_LESSON

  it('returns an empty draft for missing, corrupt, or wrong-shaped data', () => {
    expect(coerceStoryDraft(null)).toEqual(emptyStoryDraft())
    expect(coerceStoryDraft('')).toEqual(emptyStoryDraft())
    expect(coerceStoryDraft({ stepIndex: 'x', programs: {} })).toEqual(emptyStoryDraft())
    expect(coerceStoryDraft({ stepIndex: 0 })).toEqual(emptyStoryDraft())
    expect(coerceStoryDraft({ version: 1, lessonId: 'G1-U1-L02', stepIndex: 0, programs: null })).toEqual(
      emptyStoryDraft(),
    )
  })

  it('rejects a non-v1 version and a foreign lessonId (new envelope gates)', () => {
    const base = emptyStoryDraft()
    expect(isValidStoryDraft({ ...base, version: 2 })).toBe(false)
    expect(coerceStoryDraft({ ...base, version: 2 })).toEqual(emptyStoryDraft())
    expect(isValidStoryDraft({ ...base, lessonId: 'G1-U1-L01' })).toBe(false)
    expect(coerceStoryDraft({ ...base, lessonId: 'G1-U1-L01' })).toEqual(emptyStoryDraft())
    expect(isValidStoryDraft(base)).toBe(true)
  })

  it('clamps an out-of-range step index and drops unknown step ids', () => {
    const raw = {
      version: 1,
      lessonId: 'G1-U1-L02',
      stepIndex: 99,
      programs: { 'build-turn-taking': CORRECT, 'no-such-step': [SWITCH] },
      passed: ['build-turn-taking', 'no-such-step'],
      mistakes: ['reversed_order'],
      observed: ['error-lab'],
      finished: false,
    }
    const draft = coerceStoryDraft(raw)
    expect(draft.stepIndex).toBe(lesson.steps.length - 1)
    expect(Object.keys(draft.programs)).toEqual(lesson.steps.map((s) => s.id))
    expect(draft.programs['build-turn-taking']).toHaveLength(4)
    expect(draft.passed).toEqual(['build-turn-taking'])
    expect(draft.observed).toEqual(['error-lab'])
    expect(draft.mistakes).toEqual(['reversed_order'])
    expect(isValidStoryDraft(draft)).toBe(true)
  })

  it('restores a well-formed draft including the finished flag', () => {
    const raw = {
      version: 1,
      lessonId: 'G1-U1-L02',
      stepIndex: 3,
      programs: { 'run-verify': CORRECT },
      passed: ['build-turn-taking'],
      mistakes: [],
      observed: [],
      finished: true,
    }
    const draft = coerceStoryDraft(raw)
    expect(draft.stepIndex).toBe(3)
    expect(draft.finished).toBe(true)
    expect(draft.programs['run-verify']).toHaveLength(4)
    expect(isValidStoryDraft(draft)).toBe(true)
  })

  it('drops unknown failure codes and out-of-range reflections, keeps the rest', () => {
    const base = emptyStoryDraft()
    const draft = coerceStoryDraft({
      ...base,
      mistakes: ['reversed_order', 'not-a-code'],
      reflection: 5,
    })
    expect(draft.mistakes).toEqual(['reversed_order'])
    expect(draft.reflection).toBeUndefined()
    const kept = coerceStoryDraft({ ...base, reflection: 2 })
    expect(kept.reflection).toBe(2)
  })

  it('drops move blocks and other unknown block types from programs', () => {
    const base = emptyStoryDraft()
    const draft = coerceStoryDraft({
      ...base,
      programs: {
        'build-turn-taking': [START, SAY_HELLO, { type: 'move_right' }, SWITCH, SAY_GLAD],
      },
    })
    expect(draft.programs['build-turn-taking']).toEqual(CORRECT)
  })

  it('empty draft starts at step 0 with every step starter program', () => {
    const draft = emptyStoryDraft()
    expect(draft.stepIndex).toBe(0)
    expect(draft.programs['build-turn-taking']).toEqual([{ type: 'when_start' }])
    expect(draft.programs['error-lab']).toEqual(REVERSED)
    expect(draft.programs['creative-farewell']).toEqual(CORRECT)
  })
})
