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
        '这节高阶内容会在启蒙毕业后开启。先学完 12 节启蒙课，再决定要不要继续升级更复杂的互动故事。',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '完成这一步' })).toBeNull()
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
    expect(screen.getByText('刚完成的小结果')).toBeInTheDocument()
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
          title: '课内微补课',
          lines: ['先放开始积木。', '再接上动作积木。'],
          demo: '先高亮开始积木，再高亮后面的动作积木。',
        }}
        onStartRemedial={vi.fn()}
        stepTitle="第 1 步：连接动作"
      />,
    )

    expect(screen.getByText('课内微补课')).toBeInTheDocument()
    expect(screen.getByText('先放开始积木。')).toBeInTheDocument()
    expect(screen.getByText('再接上动作积木。')).toBeInTheDocument()
    expect(
      screen.getByText('示意动作：先高亮开始积木，再高亮后面的动作积木。'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '先去补这一小节' })).toBeNull()
  })

  it('shows the progress strip with step, bar, and local save state', () => {
    render(
      <GuidedLessonShell
        cloudSyncState="synced"
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        localSaveState="saved"
        onStartRemedial={vi.fn()}
        stepCount={3}
        stepIndex={1}
      />,
    )

    expect(screen.getByTestId('lesson-progress-strip')).toBeInTheDocument()
    expect(screen.getByText('步骤 2 / 3')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '67',
    )
    expect(screen.getByTestId('lesson-save-local')).toHaveTextContent(
      '已保存到本机',
    )
    expect(screen.getByTestId('lesson-save-cloud')).toHaveTextContent(
      '已同步到云端',
    )
    expect(
      screen.queryByTestId('lesson-cloud-failure'),
    ).not.toBeInTheDocument()
  })

  it('hides the cloud chip before any sync attempt and shows unsaved locally', () => {
    render(
      <GuidedLessonShell
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        onStartRemedial={vi.fn()}
        stepCount={3}
        stepIndex={0}
      />,
    )

    expect(screen.getByTestId('lesson-save-local')).toHaveTextContent(
      '尚未保存',
    )
    expect(screen.queryByTestId('lesson-save-cloud')).not.toBeInTheDocument()
  })

  it('shows the resume note when the session restored a later step', () => {
    render(
      <GuidedLessonShell
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        onStartRemedial={vi.fn()}
        resumedFromStep={1}
        stepCount={3}
        stepIndex={1}
      />,
    )

    expect(screen.getByTestId('lesson-resume-note')).toHaveTextContent(
      '已回到上次进度：第 2 步',
    )
  })

  it('shows a local save failure with a retry button that calls the handler', () => {
    const onRetryLocalSave = vi.fn()
    render(
      <GuidedLessonShell
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        localSaveState="failed"
        onRetryLocalSave={onRetryLocalSave}
        onStartRemedial={vi.fn()}
        stepCount={3}
        stepIndex={0}
      />,
    )

    expect(screen.getByTestId('lesson-save-local')).toHaveTextContent(
      '本机保存失败',
    )
    screen.getByTestId('lesson-save-retry').click()
    expect(onRetryLocalSave).toHaveBeenCalledTimes(1)
  })

  it('shows a cloud sync failure with retry and local-only continue actions', () => {
    const onRetryCloudSync = vi.fn()
    const onContinueLocalOnly = vi.fn()
    render(
      <GuidedLessonShell
        cloudSyncState="failed"
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        localSaveState="saved"
        onContinueLocalOnly={onContinueLocalOnly}
        onRetryCloudSync={onRetryCloudSync}
        onStartRemedial={vi.fn()}
        stepCount={3}
        stepIndex={2}
      />,
    )

    expect(screen.getByTestId('lesson-save-cloud')).toHaveTextContent(
      '云端同步失败',
    )
    expect(screen.getByTestId('lesson-cloud-failure')).toHaveTextContent(
      '云端同步失败，进度已保存到本机，还没同步到云端。',
    )
    screen.getByTestId('lesson-cloud-retry').click()
    screen.getByTestId('lesson-cloud-continue-local').click()
    expect(onRetryCloudSync).toHaveBeenCalledTimes(1)
    expect(onContinueLocalOnly).toHaveBeenCalledTimes(1)
  })

  it('labels a server answer without a cloud backend as local-only, not synced', () => {
    render(
      <GuidedLessonShell
        cloudSyncState="local-only"
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        localSaveState="saved"
        onStartRemedial={vi.fn()}
        stepCount={3}
        stepIndex={2}
      />,
    )

    expect(screen.getByTestId('lesson-save-cloud')).toHaveTextContent(
      '仅保存到本机',
    )
    expect(
      screen.queryByTestId('lesson-cloud-failure'),
    ).not.toBeInTheDocument()
  })

  it('disables the complete button and shows the completing label while syncing', () => {
    render(
      <GuidedLessonShell
        cloudSyncState="syncing"
        isCompleting
        isLocked={false}
        lessonGoal="让主角从舞台左边走到右边。"
        lessonTitle="让角色动起来"
        onCompleteStep={vi.fn()}
        onStartRemedial={vi.fn()}
        stepCount={3}
        stepIndex={2}
      />,
    )

    const button = screen.getByTestId('lesson-complete-step')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('正在完成…')
  })
})
