import { describe, expect, it } from 'vitest'

import { buildProjectCompletionCopy } from './build-project-completion-copy'

describe('buildProjectCompletionCopy', () => {
  it('uses the new first project copy for lesson 03', () => {
    const copy = buildProjectCompletionCopy('lesson-03-forest-story')

    expect(copy.summary).toBe(
      '小狐狸已经会走上舞台，还会打招呼了。先回看作品，再继续下一课。',
    )
    expect(copy.spotlightTag).toBe('第一个完整作品')
    expect(copy.spotlightTitle).toBe('你做出了一个完整作品')
    expect(copy.spotlightBody).toContain('小狐狸走上舞台')
    expect(copy.spotlightBody).toContain('第二单元')
  })

  it('uses the new second project copy for lesson 06', () => {
    const copy = buildProjectCompletionCopy('lesson-06-meadow-story')

    expect(copy.summary).toBe(
      '这次，小动物从森林走到草地，完成了一次小旅行。先回看作品，再继续下一课。',
    )
    expect(copy.spotlightTag).toBe('第二个完整作品')
    expect(copy.spotlightTitle).toBe('你做出了一个完整作品')
    expect(copy.spotlightBody).toContain('第三单元')
  })

  it('uses the new interactive project copy for lesson 09', () => {
    const copy = buildProjectCompletionCopy('lesson-09-garden-story')

    expect(copy.summary).toBe(
      '现在，你的故事已经会回应你的点击了。先回看作品，再继续下一课。',
    )
    expect(copy.spotlightTag).toBe('第三个完整作品')
    expect(copy.spotlightTitle).toBe('你做出了一个完整作品')
    expect(copy.spotlightBody).toContain('会回应点击')
    expect(copy.spotlightBody).toContain('第四单元')
  })

  it('uses the graduation project copy for lesson 12', () => {
    const copy = buildProjectCompletionCopy('lesson-12-graduation-show')

    expect(copy.summary).toBe(
      '这次，两个动物朋友一起完成了一个完整故事。先回看作品，再看看高阶创作阶段。',
    )
    expect(copy.spotlightTag).toBe('启蒙毕业作品')
    expect(copy.spotlightTitle).toBe('你做出了一个完整作品')
    expect(copy.spotlightBody).toContain('启蒙毕业作品')
    expect(copy.spotlightBody).toContain('高阶创作阶段')
  })
})
