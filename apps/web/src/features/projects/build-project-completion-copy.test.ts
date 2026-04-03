import { describe, expect, it } from 'vitest'

import { buildProjectCompletionCopy } from './build-project-completion-copy'

describe('buildProjectCompletionCopy', () => {
  it('returns the first full story copy for lesson 03', () => {
    const copy = buildProjectCompletionCopy('lesson-03-forest-story')

    expect(copy.summary).toContain('第一个完整小故事')
    expect(copy.spotlightTag).toBe('第一支完整故事')
    expect(copy.spotlightTitle).toBe('你已经做出了第一个完整小故事')
  })

  it('returns the second full story copy for lesson 06', () => {
    const copy = buildProjectCompletionCopy('lesson-06-meadow-story')

    expect(copy.summary).toContain('第二个完整小故事')
    expect(copy.summary).toContain('第三单元')
    expect(copy.spotlightTag).toBe('第二支完整故事')
  })

  it('returns the graduation copy for lesson 12', () => {
    const copy = buildProjectCompletionCopy('lesson-12-graduation-show')

    expect(copy.summary).toContain('启蒙毕业作品')
    expect(copy.spotlightTag).toBe('启蒙毕业')
    expect(copy.spotlightTitle).toContain('两个角色')
  })

  it('returns the interactive story copy for lesson 09', () => {
    const copy = buildProjectCompletionCopy('lesson-09-garden-story')

    expect(copy.summary).toContain('互动故事')
    expect(copy.summary).toContain('第四单元')
    expect(copy.spotlightTag).toBe('互动故事作品')
  })
})
