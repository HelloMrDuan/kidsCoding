import { expect, test } from '@playwright/test'
import { solveMistakeStep, solvePracticeStep } from './lesson-pane-helpers'

test('guest user can reach the first completed project', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('home-start').click()
  await page.getByTestId('age-band-age_6_8').click()
  await page.getByTestId('assessment-option-sequence-one_by_one').click()
  await page.getByTestId('assessment-option-loop-repeat_until_done').click()
  await page.getByTestId('assessment-option-event-trigger_by_events').click()
  await page.getByTestId('assessment-option-logic-branch_story').click()
  await page.getByTestId('lesson-card-lesson-01-forest-hello').click()
  await page.getByTestId('lesson-add-when_start').click()
  for(let step=0;step<2;step++){
    if(step===1)await page.getByTestId('lesson-add-move_right').click()
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:15_000})
    await page.getByTestId('lesson-complete-step').click()
  }
  // TQ-011: 第 3 关 is the second practice (walk 200 步 to the rabbit).
  await solvePracticeStep(page,{goalType:'change-distance',guess:'beside-friend',build:['move_right']})
  await page.getByTestId('lesson-complete-step').click()
  // TQ-010: 第 4 关 is the designed mistake step (no “开始时”).
  await solveMistakeStep(page,{expectCode:'missing-start',answer:'stayed',fix:['when_start','move_right']})
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')

  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByRole('link', { name: '回到学习地图' })).toBeVisible()
})
