import {expect,test,type Page} from '@playwright/test'

async function performClickStep(page:Page,expectedMovement:number,expectSpeech:boolean){
  // Code.org-inspired prediction: select a hypothesis before testing it.
  await page.getByTestId('garden-predict-click').click()
  await expect(page.getByTestId('run-code-button')).toBeEnabled()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await expect(page.getByTestId('stage-character-main')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)')
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  // No click means no execution and no credit, even though the blocks are correct.
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('点击蝴蝶')
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  if(expectedMovement>0) await expect(page.getByTestId('stage-character-main')).toHaveCSS('transform',`matrix(1, 0, 0, 1, ${expectedMovement}, 0)`)
  if(expectSpeech) await expect(page.getByTestId('stage-character-main')).toContainText('蝴蝶收到你的点击啦！')
  await expect(page.getByTestId('garden-reflection')).toContainText('点击事件发生后')
  await page.getByTestId('lesson-complete-step').click()
}

test('lesson 7 teaches real click event: start alone never moves the butterfly',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-07-garden-click')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await expect(page.getByTestId('stage-character-main')).toContainText('小蝴蝶')
  await expect(page.getByTestId('stage-current-scene')).toContainText('花园')
  await page.getByTestId('lesson-add-when_clicked').click()
  for(let step=0;step<5;step++){
    if(step===1)await page.getByTestId('lesson-add-move_right').click()
    await performClickStep(page,step===0?0:100,false)
  }
  await page.waitForURL('**/project/lesson-07-garden-click/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('lesson 8 uses clicked event to move and then speak, with reflective feedback',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-08-garden-dialogue')
  await expect(page.getByTestId('stage-character-main')).toContainText('小蝴蝶')
  await page.getByTestId('lesson-add-when_clicked').click()
  for(let step=0;step<5;step++){
    if(step===2)await page.getByTestId('lesson-add-move_right').click()
    if(step===3)await page.getByTestId('lesson-add-say_line').click()
    await performClickStep(page,step>=2?100:0,step>=3)
  }
  await page.waitForURL('**/project/lesson-08-garden-dialogue/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('lesson 9 has a distinct garden ending with clicked movement, speech and repeat',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-09-garden-story')
  await page.getByTestId('lesson-add-when_clicked').click()
  for(let step=0;step<5;step++){
    if(step===2)await page.getByTestId('lesson-add-move_right').click()
    if(step===3)await page.getByTestId('lesson-add-say_line').click()
    if(step===4)await page.getByTestId('lesson-add-repeat_twice').click()
    await performClickStep(page,step===4?200:step>=2?100:0,step>=3)
  }
  await page.waitForURL('**/project/lesson-09-garden-story/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('an incorrect first event cannot be used to bypass the click lesson',async({page})=>{
  test.setTimeout(90_000)
  await page.goto('/learn/lesson/lesson-07-garden-click')
  await expect(page.getByTestId('run-code-button')).toBeDisabled()
  await page.getByTestId('garden-predict-auto').click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('积木好像不太对',{timeout:10_000})
  await expect(page.getByTestId('stage-character-main')).toBeDisabled()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page).toHaveURL(/lesson-07-garden-click/)
})
