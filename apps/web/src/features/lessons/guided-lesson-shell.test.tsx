import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GuidedLessonShell } from './guided-lesson-shell'

describe('GuidedLessonShell', () => {
  it('shows the purchase lock for paid lessons without entitlement', () => {
    render(
      <GuidedLessonShell
        lessonTitle="让两个角色一起表演"
        lessonGoal="安排两个角色先后出场"
        isLocked
        onStartRemedial={vi.fn()}
      />,
    )

    expect(screen.getByText('购买整套课程后继续学习')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '完成这一步' })).toBeNull()
  })
})
