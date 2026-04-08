import { describe, expect, it } from 'vitest'

import { getFoundationLessonFeedback } from './foundation-lesson-feedback'

describe('getFoundationLessonFeedback', () => {
  it('uses a result-first progress line for lesson 01', () => {
    expect(
      getFoundationLessonFeedback('lesson-01-forest-hello', 'progress'),
    ).toBe('现在，角色已经会走上舞台了。')
  })

  it('uses a result-first progress line for lesson 02', () => {
    expect(
      getFoundationLessonFeedback('lesson-02-forest-greeting', 'progress'),
    ).toBe('现在，角色已经会边出场边打招呼了。')
  })

  it('keeps lesson 03 focused on the upcoming full project', () => {
    expect(
      getFoundationLessonFeedback('lesson-03-forest-story', 'progress'),
    ).toBe('很好，你马上就要做出一个完整作品了。')
  })

  it('uses a result-first progress line for lesson 04', () => {
    expect(
      getFoundationLessonFeedback('lesson-04-meadow-scene', 'progress'),
    ).toBe('现在，故事已经会换到新场景了。')
  })

  it('uses a result-first progress line for lesson 05', () => {
    expect(
      getFoundationLessonFeedback('lesson-05-meadow-order', 'progress'),
    ).toBe('现在，故事已经有先后顺序了。')
  })

  it('keeps lesson 06 focused on the upcoming full project', () => {
    expect(
      getFoundationLessonFeedback('lesson-06-meadow-story', 'progress'),
    ).toBe('很好，你马上就要做出一个完整作品了。')
  })

  it('uses a result-first progress line for lesson 07', () => {
    expect(
      getFoundationLessonFeedback('lesson-07-garden-click', 'progress'),
    ).toBe('现在，角色已经会回应点击了。')
  })

  it('uses a result-first progress line for lesson 08', () => {
    expect(
      getFoundationLessonFeedback('lesson-08-garden-dialogue', 'progress'),
    ).toBe('现在，角色已经会先动再说了。')
  })

  it('keeps lesson 09 focused on the upcoming full project', () => {
    expect(
      getFoundationLessonFeedback('lesson-09-garden-story', 'progress'),
    ).toBe('很好，你马上就要做出一个完整作品了。')
  })

  it('uses a result-first progress line for lesson 10', () => {
    expect(
      getFoundationLessonFeedback('lesson-10-second-friend', 'progress'),
    ).toBe('现在，第二位朋友已经上场了。')
  })

  it('uses a result-first progress line for lesson 11', () => {
    expect(
      getFoundationLessonFeedback('lesson-11-duo-rehearsal', 'progress'),
    ).toBe('现在，两个朋友已经开始配合了。')
  })

  it('keeps lesson 12 focused on the graduation project', () => {
    expect(
      getFoundationLessonFeedback('lesson-12-graduation-show', 'progress'),
    ).toBe('很好，你马上就要做出启蒙毕业作品了。')
  })

  it('falls back to a result-first generic line for unknown lessons', () => {
    expect(
      getFoundationLessonFeedback('lesson-99-fallback', 'progress'),
    ).toBe('很好，这一步已经完成了。继续往下，你的作品会更完整。')
  })
})
