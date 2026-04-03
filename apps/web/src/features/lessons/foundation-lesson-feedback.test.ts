import { describe, expect, it } from 'vitest'

import { getFoundationLessonFeedback } from './foundation-lesson-feedback'

describe('getFoundationLessonFeedback', () => {
  it('returns the lesson specific opening guidance for lesson 01', () => {
    expect(
      getFoundationLessonFeedback('lesson-01-forest-hello', 'initial'),
    ).toBe('先让小狐狸准备好出场，再把动作积木接上去。')
  })

  it('returns the lesson specific progress feedback for lesson 02', () => {
    expect(
      getFoundationLessonFeedback('lesson-02-forest-greeting', 'progress'),
    ).toBe('太好了，小狐狸已经会打招呼了。')
  })

  it('returns the lesson specific retry guidance for lesson 03', () => {
    expect(
      getFoundationLessonFeedback('lesson-03-forest-story', 'retry'),
    ).toBe('先看看动作和对白的顺序对不对，再把缺少的积木接完整。')
  })

  it('falls back to the generic copy for later lessons', () => {
    expect(
      getFoundationLessonFeedback('lesson-07-garden-click', 'progress'),
    ).toBe('很好，这一步完成了。继续往下，作品马上会更像一个完整故事。')
  })

  it('returns the lesson specific opening guidance for lesson 04', () => {
    expect(
      getFoundationLessonFeedback('lesson-04-meadow-scene', 'initial'),
    ).toBe('先看看森林和草地两个画面，再把出发动作接起来。')
  })

  it('returns the lesson specific progress feedback for lesson 05', () => {
    expect(
      getFoundationLessonFeedback('lesson-05-meadow-order', 'progress'),
    ).toBe('太好了，故事已经开始按顺序往前走了。')
  })

  it('returns the lesson specific retry guidance for lesson 06', () => {
    expect(
      getFoundationLessonFeedback('lesson-06-meadow-story', 'retry'),
    ).toBe('先看看出发、转场和收尾的话是不是按顺序接好了。')
  })
})
