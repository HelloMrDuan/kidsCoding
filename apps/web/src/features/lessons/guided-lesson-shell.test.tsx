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
      screen.getByText(
        '这节高阶内容会在启蒙毕业后开启。先完成 12 节启蒙课，再决定要不要升级更复杂的互动故事。',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '完成这一课' })).toBeNull()
  })

  it('shows the task card, workbench shell, and result card on unlocked lessons', () => {
    render(
      <GuidedLessonShell
        feedback="太好了，角色已经准备好登场了。"
        instruction="把开始积木和向右移动积木接起来。"
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        onCompleteStep={vi.fn()}
        onStartRemedial={vi.fn()}
        stepTitle="第 1 步：连接动作"
        voiceover="先放开始积木。"
      >
        <div>工作台内容</div>
      </GuidedLessonShell>,
    )

    expect(screen.getByText('今天的小任务')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-support-rail')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-task-card')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-workbench-shell')).toBeInTheDocument()
    expect(screen.getByText('把开始积木和向右移动积木接起来。')).toBeInTheDocument()
    expect(screen.getByText('主语音：先放开始积木。')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-feedback-card')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-feedback-preview')).toBeInTheDocument()
    expect(screen.getByText('刚刚完成')).toBeInTheDocument()
    expect(screen.getByText('太好了，角色已经准备好登场了。')).toBeInTheDocument()
    expect(screen.getByText('工作台内容')).toBeInTheDocument()
    expect(screen.getByTestId('lesson-complete-step')).toBeInTheDocument()
  })

  it('shows the in-lesson remedial micro script when the child gets stuck', () => {
    render(
      <GuidedLessonShell
        hintCopy="先看一眼更简单的说明，再回来试一次。"
        instruction="把开始积木和向右移动积木接起来。"
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        remedialMicroScript={{
          title: '课内小补课',
          lines: ['先放开始积木。', '再接上动作积木。'],
          demo: '先高亮开始积木，再高亮后面的动作积木。',
        }}
        onStartRemedial={vi.fn()}
        stepTitle="第 1 步：连接动作"
      />,
    )

    expect(screen.getByText('课内小补课')).toBeInTheDocument()
    expect(screen.getByText('先放开始积木。')).toBeInTheDocument()
    expect(screen.getByText('再接上动作积木。')).toBeInTheDocument()
    expect(
      screen.getByText('示意动作：先高亮开始积木，再高亮后面的动作积木。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '先去补这节小课' })).toBeNull()
  })
})
