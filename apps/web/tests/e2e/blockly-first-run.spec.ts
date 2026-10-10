import {expect,test} from '@playwright/test'

test('first forest Blockly lesson requires actual execution before each step and awards completion once',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('请先点击舞台')
  for(let step=0;step<5;step++){
    if(step===3)await page.getByTestId('lesson-add-move_right').click()
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:15_000})
    if(step>=3)await expect(page.getByTestId('stage-character-main')).toHaveCSS('transform','matrix(1, 0, 0, 1, 100, 0)')
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
})

test('bad Blockly program cannot be passed off as actual execution',async({page})=>{
  test.setTimeout(100_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  // The first task intentionally offers only the start block. Run without it.
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('积木好像不太对',{timeout:12_000})
  await page.getByTestId('lesson-complete-step').click()
  await expect(page).toHaveURL(/lesson-01-forest-hello/)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 1 步')
})
