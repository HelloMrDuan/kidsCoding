import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import { resolveProjectContinueAction } from './resolve-project-continue-action'

describe('resolveProjectContinueAction', () => {
  it('sends a normal lesson straight into the next lesson', () => {
    expect(
      resolveProjectContinueAction(launchLessons, 'lesson-01-forest-hello'),
    ).toEqual({
      href: '/learn/lesson/lesson-02-forest-greeting',
      label: '继续下一课',
    })
  })

  it('sends a milestone lesson straight into the next unit lesson', () => {
    expect(
      resolveProjectContinueAction(launchLessons, 'lesson-03-forest-story'),
    ).toEqual({
      href: '/learn/lesson/lesson-04-meadow-scene',
      label: '进入下一单元',
    })
  })

  it('keeps graduation completion pointed at the advanced upgrade step', () => {
    expect(
      resolveProjectContinueAction(launchLessons, 'lesson-12-graduation-show'),
    ).toEqual({
      href: '/parent/purchase',
      label: '看看高阶创作阶段',
    })
  })
})
