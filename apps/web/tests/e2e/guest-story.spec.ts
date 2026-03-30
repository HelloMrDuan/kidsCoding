import { expect, test } from '@playwright/test'

test('guest user can reach the first completed project', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('home-start').click()
  await page.getByTestId('age-band-age_9_12').click()
  await page.getByTestId('assessment-option-sequence-one_by_one').click()
  await page.getByTestId('assessment-option-loop-repeat_until_done').click()
  await page.getByTestId('assessment-option-event-trigger_by_events').click()
  await page.getByTestId('assessment-option-logic-branch_story').click()
  await page.getByTestId('lesson-link-move-character').click()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('lesson-add-move_right').click()
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/move-character/complete')

  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})
