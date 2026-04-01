import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LessonEditor } from './lesson-editor'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
  }),
}))

describe('LessonEditor', () => {
  it('saves the whole lesson draft and shows the returned status', async () => {
    const saveDraftRequest = vi.fn().mockResolvedValue({ ok: true, issues: [] })
    const lesson = {
      id: 'trial-01-move-character',
      title: '让角色动起来',
      goal: '角色从左边走到右边',
      steps: [
        {
          id: 'step-1',
          title: '放入开始积木',
          instruction: '先放开始积木',
          allowedBlocks: ['when_start'],
          requiredBlockTypes: ['when_start'],
        },
      ],
      hintLayers: [{ id: 'repeat-goal', mode: 'repeat_goal', copy: '先完成这一步' }],
      phase: 'trial',
      mode: 'guided',
      sortOrder: 1,
    } as const

    render(
      <LessonEditor
        lesson={lesson}
        draftUpdatedAt={null}
        publishedAt={null}
        hasUnpublishedChanges={false}
        saveDraftRequest={saveDraftRequest}
      />,
    )

    fireEvent.change(screen.getByLabelText('课程标题'), {
      target: { value: '新的课程标题' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }))

    await waitFor(() =>
      expect(saveDraftRequest).toHaveBeenCalledWith(
        'trial-01-move-character',
        expect.objectContaining({
          title: '新的课程标题',
        }),
      ),
    )

    await waitFor(() => {
      expect(screen.getByText('草稿已保存')).toBeInTheDocument()
      expect(refresh).toHaveBeenCalled()
    })
  })
})
