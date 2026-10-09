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
  await page.getByTestId('run-code-button').click()
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('lesson-complete-step').click()
  await page.getByTestId('lesson-add-move_right').click()

  // Need to run the code for the playable stage
  await page.getByTestId('run-code-button').click()

  // Wait for run to finish and success message
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })

  // Verify reset invalidates success
  await page.getByTestId('reset-code-button').click()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByText('积木拼对啦！现在点击舞台上的"运行"按钮看看效果吧！')).toBeVisible({ timeout: 10000 })

  // Run again to pass the step
  await page.getByTestId('run-code-button').click()
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('lesson-complete-step').click()

  // Verify character displacement on step 5 (which has same blocks as step 4)
  const characterLabel = page.getByText('主角', { exact: true })
  await expect(characterLabel).toBeVisible()

  await page.getByTestId('run-code-button').click()
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  // Verify the character moved right (transform style changed)
  const styleStr = await characterLabel.evaluate((el) => el.getAttribute('style'))
  expect(styleStr).toContain('translateX(100px)')

  await page.getByTestId('lesson-complete-step').click()

  await page.waitForURL('**/project/lesson-01-forest-hello/complete')

  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByRole('link', { name: '回到学习地图' })).toBeVisible()
})
