import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GuidedLessonShell } from './guided-lesson-shell'

describe('GuidedLessonShell', () => {
  it('shows the graduate-and-upgrade message for locked advanced lessons', () => {
    render(
      <GuidedLessonShell
        lessonGoal="安排两个角色先后出场，让故事片段更完整。"
        lessonTitle="让两个角色一起表演"
        isLocked
        onStartRemedial={vi.fn()}
      />,
    )

    expect(
      screen.getByText('这节高阶内容会在启蒙毕业后开启。先完成 12 节启蒙课，再决定要不要升级更复杂的互动故事。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '完成这一小步' })).toBeNull()
  })

  it('keeps the lesson completion action and task framing on unlocked lessons', () => {
    render(
      <GuidedLessonShell
        feedback="太好了，角色已经准备好登场。"
        instruction="把开始积木和向右移动积木接起来。"
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        onCompleteStep={vi.fn()}
        onStartRemedial={vi.fn()}
        stepTitle="第 1 步：连接动作"
      />,
    )

    expect(screen.getByText('今天的小目标')).toBeInTheDocument()
    expect(screen.getByText('把开始积木和向右移动积木接起来。')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-complete-step')).toBeInTheDocument()
  })
})
