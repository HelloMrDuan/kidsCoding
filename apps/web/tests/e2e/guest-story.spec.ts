import { expect, test } from '@playwright/test'

test.describe('guest story progression', () => {

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

  // Verify that moving to step 5 clears the success message from step 4
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).not.toBeVisible()

  // Verify character displacement on step 5 (which has same blocks as step 4)
  const characterLabel = page.getByTestId('stage-character-main')
  await expect(characterLabel).toBeVisible()
  await expect(characterLabel).toContainText('小狐狸')

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

test('extra unrequired blocks prevent progression', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('home-start').click()
  await page.getByTestId('age-band-age_6_8').click()
  await page.getByTestId('assessment-option-sequence-one_by_one').click()
  await page.getByTestId('assessment-option-loop-repeat_until_done').click()
  await page.getByTestId('assessment-option-event-trigger_by_events').click()
  await page.getByTestId('assessment-option-logic-branch_story').click()
  await page.getByTestId('lesson-link-lesson-01-forest-hello').click()

  // Step 1
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('run-code-button').click()

  // Wait for success before proceeding
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('lesson-complete-step').click()

  // Step 2
  await expect(page.getByText('第 2 步 / 共 5 步')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('run-code-button').click()
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('lesson-complete-step').click()

  // Step 3
  await expect(page.getByText('第 3 步 / 共 5 步')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('run-code-button').click()
  await expect(page.getByText('太棒了！运行成功！点击"完成这一步"继续。')).toBeVisible({ timeout: 10000 })
  await page.getByTestId('lesson-complete-step').click()

  // Step 4: Verify we are on step 4
  await expect(page.getByText('第 4 步 / 共 5 步')).toBeVisible({ timeout: 20000 })

  // Add required move_right block
  const palette = page.getByTestId('lesson-block-palette')
  await expect(palette).toBeVisible()
  const moveBtn = palette.getByTestId('lesson-add-move_right')
  await expect(moveBtn).toBeVisible()
  await expect(moveBtn).toBeEnabled()
  await moveBtn.click()

  // Wait for the first block to appear in the workspace to avoid rapid-click debouncing issues
  const workspaceArea = page.getByTestId('lesson-blockly-workspace')
  await expect(workspaceArea).toBeVisible()

  // Add extra move_right block
  await moveBtn.click()

  // Run
  await page.getByTestId('run-code-button').click()

  // Expect error feedback
  await expect(page.getByText('⚠️ 积木好像不太对，再检查一下吧！需要和任务要求的积木一样哦。')).toBeVisible({ timeout: 10000 })

  // Verify click complete does not progress
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByText('第 4 步 / 共 5 步')).toBeVisible({ timeout: 10000 })
})

})
