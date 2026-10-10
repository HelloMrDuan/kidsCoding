import {expect,test} from '@playwright/test'

test('forest greeting lesson really moves then speaks before completion',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  for(let step=0;step<5;step++){
    if(step===2)await page.getByTestId('lesson-add-say_line').click()
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
    await expect(page.getByTestId('stage-character-main')).toHaveCSS('transform','matrix(1, 0, 0, 1, 100, 0)')
    if(step>=2)await expect(page.getByTestId('lesson-playable-stage')).toContainText('你好！')
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/lesson-02-forest-greeting/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})
test('forest first story progresses from start to move to speech through real Blockly execution',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-03-forest-story')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('请先点击舞台')
  for(let step=0;step<5;step++){
    if(step===1)await page.getByTestId('lesson-add-move_right').click()
    if(step===2)await page.getByTestId('lesson-add-say_line').click()
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
    if(step>=2)await expect(page.getByTestId('lesson-playable-stage')).toContainText('你好！')
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/lesson-03-forest-story/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})
