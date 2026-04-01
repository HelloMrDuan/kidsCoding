import { describe, expect, it } from 'vitest'

import { validateCourseContent } from './validate-course-content'

describe('validateCourseContent', () => {
  it('blocks mojibake and replacement characters', () => {
    expect(
      validateCourseContent({
        mode: 'publish',
        lessonId: 'trial-01-move-character',
        title: '闁稿鑹炬慨鈺呮偨鐠囪绠撻。锟?',
        goal: '让角色走到右边',
        steps: [
          {
            title: '缁楋拷 1 濮濓拷',
            instruction: '鐟欐帟澹婇崙铏瑰箛锟?',
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'encoding_suspect' }),
      ]),
    )
  })

  it('blocks empty fields during publish validation', () => {
    expect(
      validateCourseContent({
        mode: 'publish',
        lessonId: 'trial-01-move-character',
        title: '',
        goal: '',
        steps: [{ title: '', instruction: '' }],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'title_required' }),
        expect.objectContaining({ code: 'goal_required' }),
        expect.objectContaining({ code: 'step_title_required' }),
        expect.objectContaining({ code: 'step_instruction_required' }),
      ]),
    )
  })

  it('allows incomplete drafts as long as encoding is safe', () => {
    expect(
      validateCourseContent({
        mode: 'draft',
        lessonId: 'trial-01-move-character',
        title: '',
        goal: '',
        steps: [{ title: '', instruction: '' }],
      }),
    ).toEqual([])
  })
})
