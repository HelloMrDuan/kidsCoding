import { expect, test } from '@playwright/test'
import {
  clickLessonControl,
  completeForestStep,
  solveMistakeStep,
  solvePracticeStep,
} from './lesson-pane-helpers'

test('guest user can reach the first completed project', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('home-start').click()
  await page.getByTestId('age-band-age_6_8').click()
  await page.getByTestId('assessment-option-sequence-one_by_one').click()
  await page.getByTestId('assessment-option-loop-repeat_until_done').click()
  await page.getByTestId('assessment-option-event-trigger_by_events').click()
  await page.getByTestId('assessment-option-logic-branch_story').click()
  await page.getByTestId('lesson-card-lesson-01-forest-hello').click()
  // P0-1: the card leads to the lesson's only official workspace, V3.
  await page.waitForURL('**/studio/blockly/lesson-01-forest-hello')
  await expect(page.getByTestId('studio-shell')).toBeVisible({ timeout: 30_000 })

  // V3 keeps one program per 关: 第 1 关 starts empty, 第 2 关 builds its own
  // when_start + move_right, and later 关 replace their programs.
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
  await expect(page.getByRole('link', { name: '回到学习地图' })).toBeVisible()
})
