import { expect, test } from '@playwright/test'

test('guest user can reach the first completed project', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('home-start').click()
  await page.getByTestId('age-band-age_6_8').click()
  await page.getByTestId('assessment-option-sequence-one_by_one').click()
  await page.getByTestId('assessment-option-loop-repeat_until_done').click()
  await page.getByTestId('assessment-option-event-trigger_by_events').click()
  await page.getByTestId('assessment-option-logic-branch_story').click()
  await page.getByTestId('lesson-link-lesson-01-forest-hello').click()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('lesson-add-move_right').click()
  await expect(
    page.getByText('太好了，角色已经走上舞台了。再接一句话，故事就会更完整。'),
  ).toBeVisible()
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')

  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByRole('link', { name: '回到学习地图' })).toBeVisible()
})
