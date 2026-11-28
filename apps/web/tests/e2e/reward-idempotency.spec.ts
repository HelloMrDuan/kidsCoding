import { expect, test } from '@playwright/test'

import { seedGuestProgress } from './_fixtures/progress'
import {
  clickLessonControl,
  completeForestStep,
  solveMistakeStep,
  solvePracticeStep,
} from './lesson-pane-helpers'

test.describe('reward idempotency', () => {
  test('replaying a completed lesson does not add stars again', async ({
    page,
  }) => {
    // Start with lesson-01 already completed once and 3 stars earned.
    await seedGuestProgress(page, {
      completedLessonIds: ['lesson-01-forest-hello'],
      currentLessonId: 'lesson-02-forest-greeting',
      stars: 3,
      badgeIds: ['lesson-lesson-01-forest-hello', 'first-project'],
      cardIds: ['theme-forest-fox', 'growth-first-project'],
      streakDays: 1,
      completedProjectIds: ['lesson-01-forest-hello'],
      projectSnapshots: [
        {
          lessonId: 'lesson-01-forest-hello',
          updatedAt: '2026-03-31T10:00:00.000Z',
          blocks: [{ type: 'when_start' }, { type: 'move_right' }],
        },
      ],
    })

    // The old address still leads to lesson-01's only official workspace, V3.
    await page.goto('/learn/lesson/lesson-01-forest-hello')
    await page.waitForURL('**/studio/blockly/lesson-01-forest-hello')
    await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })

    // Replay all four steps of lesson-01. V3 keeps a program per 关, so each
    // step builds its own; 第 3 关 and 第 4 关 use the shared practice/mistake flows.
    await clickLessonControl(page, 'lesson-add-when_start')
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
    await completeForestStep(page)

    await clickLessonControl(page, 'lesson-add-when_start')
    await clickLessonControl(page, 'lesson-add-move_right')
    await clickLessonControl(page, 'run-code-button')
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功', { timeout: 15_000 })
    await completeForestStep(page)

    // TQ-011: 第 3 关 is the second practice (walk 200 步 to the rabbit).
    await solvePracticeStep(page, {
      goalType: 'change-distance',
      guess: 'beside-friend',
      build: ['when_start', 'move_right', 'move_right'],
    })
    await completeForestStep(page)
    // TQ-010: 第 4 关 is the designed mistake step (no “开始时”).
    await solveMistakeStep(page, {
      expectCode: 'missing-start',
      answer: 'stayed',
      fix: ['when_start', 'move_right'],
    })
    await completeForestStep(page)

    await page.waitForURL('**/project/lesson-01-forest-hello/complete')

    await expect(page.getByTestId('project-complete-heading')).toBeVisible()
    // Stars must stay at 3 after replaying the same lesson.
    await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
  })

  test('completing a different lesson after replay keeps adding stars', async ({
    page,
    }) => {
    await seedGuestProgress(page, {
      completedLessonIds: ['lesson-01-forest-hello'],
      currentLessonId: 'lesson-02-forest-greeting',
      stars: 3,
      badgeIds: ['lesson-lesson-01-forest-hello', 'first-project'],
      cardIds: ['theme-forest-fox', 'growth-first-project'],
      streakDays: 1,
      completedProjectIds: ['lesson-01-forest-hello'],
      projectSnapshots: [
        {
          lessonId: 'lesson-01-forest-hello',
          updatedAt: '2026-03-31T10:00:00.000Z',
          blocks: [{ type: 'when_start' }, { type: 'move_right' }],
        },
      ],
    })

    // OPS-056: the old address leads to lesson-02's only official workspace, V3.
    await page.goto('/learn/lesson/lesson-02-forest-greeting')
    await page.waitForURL('**/studio/blockly/launch/lesson-02-forest-greeting')
    await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })

    // V3 keeps a program per 关 (same as lesson-01 above), so 第 1 关 and
    // 第 2 关 each build their own when_start + move_right (+ say_line).
    for(let step=0;step<4;step++){
      if(step<2){
        await clickLessonControl(page, 'lesson-add-when_start')
        await clickLessonControl(page, 'lesson-add-move_right')
      }
      if(step===1)await clickLessonControl(page, 'lesson-add-say_line')
      // TQ-011: 第 3 关 is the second practice (greet without walking).
      if(step===2)await solvePracticeStep(page,{goalType:'change-distance',guess:'stay',clear:true,build:['when_start','say_line']})
      // TQ-010: 第 4 关 is the designed mistake step (speaks before walking).
      else if(step===3)await solveMistakeStep(page,{expectCode:'say-too-early',answer:'before-walk',fix:['when_start','move_right','say_line']})
      else{
        await clickLessonControl(page, 'run-code-button')
        await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
      }
      await clickLessonControl(page, 'lesson-complete-step')
    }

    await page.waitForURL('**/project/lesson-02-forest-greeting/complete')

    await expect(page.getByTestId('project-complete-heading')).toBeVisible()
    // Total stars should now be 6.
    await expect(page.getByText('当前累计 6 颗星星')).toBeVisible()
  })
})
