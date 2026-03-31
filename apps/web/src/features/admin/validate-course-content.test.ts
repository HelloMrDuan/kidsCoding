import { describe, expect, it } from 'vitest'

import { validateCourseContent } from './validate-course-content'

describe('validateCourseContent', () => {
  it('blocks mojibake and replacement characters', () => {
    expect(
      validateCourseContent({
        lessonId: 'trial-01-move-character',
        title: '閸嬫艾濮╅悽璇诧箓顣�',
        steps: [{ title: '绗� 1 姝�', instruction: '瑙掕壊鍑虹幇�' }],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'encoding_suspect' }),
      ]),
    )
  })
})
