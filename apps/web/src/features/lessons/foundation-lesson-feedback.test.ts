import { describe, expect, it } from 'vitest'

import { getFoundationLessonFeedback } from './foundation-lesson-feedback'

describe('getFoundationLessonFeedback', () => {
  it('uses a result-first progress line for lesson 01', () => {
    expect(
      getFoundationLessonFeedback('lesson-01-forest-hello', 'progress'),
    ).toBe('现在，小狐狸已经会向右走 100 步、走上舞台了。')
  })

  it('uses a result-first progress line for lesson 02', () => {
    expect(
      getFoundationLessonFeedback('lesson-02-forest-greeting', 'progress'),
    ).toBe('现在，小狐狸已经会先出场、再打招呼了。')
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
    ).toBe('现在，故事不只会转场，小狐狸还会在草地上再走 100 步了。')
  })

  it('keeps lesson 06 focused on the upcoming full project', () => {
    expect(
      getFoundationLessonFeedback('lesson-06-meadow-story', 'progress'),
    ).toBe('很好，你马上就要做出一个完整作品了。')
  })

  it('uses a result-first progress line for lesson 07', () => {
    expect(
      getFoundationLessonFeedback('lesson-07-garden-click', 'progress'),
    ).toBe('现在，蝴蝶已经会回应点击了。')
  })

  it('uses a result-first progress line for lesson 08', () => {
    expect(
      getFoundationLessonFeedback('lesson-08-garden-dialogue', 'progress'),
    ).toBe('现在，蝴蝶已经会先飞再说了。')
  })

  it('keeps lesson 09 focused on the upcoming full project', () => {
    expect(
      getFoundationLessonFeedback('lesson-09-garden-story', 'progress'),
    ).toBe('很好，你马上就要做出一个完整作品了。')
  })

  it('uses a result-first progress line for lesson 10', () => {
    expect(
      getFoundationLessonFeedback('lesson-10-second-friend', 'progress'),
    ).toBe('继续观察两条轨道：移动只给当前操作的朋友，切换后才轮到小熊。')
  })

  it('uses a stronger cooperation result line for lesson 11', () => {
    expect(
      getFoundationLessonFeedback('lesson-11-duo-rehearsal', 'progress'),
    ).toBe('继续观察实际位置和对白：小熊说话，狐狸不会跟着说。')
  })

  it('keeps lesson 12 focused on the richer graduation project', () => {
    expect(
      getFoundationLessonFeedback('lesson-12-graduation-show', 'progress'),
    ).toBe('很好，你马上就要做出真正完整的启蒙毕业作品了。')
  })

  it('falls back to a result-first generic line for unknown lessons', () => {
    expect(
      getFoundationLessonFeedback('lesson-99-fallback', 'progress'),
    ).toBe('很好，这一步已经完成了。继续往下，你的作品会更完整。')
  })
})
