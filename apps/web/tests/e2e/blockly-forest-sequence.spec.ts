import {expect,test} from '@playwright/test'

test('forest greeting lesson really moves then speaks before completion',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  for(let step=0;step<5;step++){
    if(step===2)await page.getByTestId('lesson-add-say_line').click()
    // TQ-008 step-5 “从预设对白里选一句”: the choice is real and the fox says it.
    if(step===4)await page.getByTestId('lesson-say-line-lets-play').click()
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
    await expect(page.getByTestId('stage-character-main')).toHaveCSS('transform','matrix(1, 0, 0, 1, 100, 0)')
    if(step>=2&&step<4)await expect(page.getByTestId('lesson-playable-stage')).toContainText('你好！')
    if(step===4)await expect(page.getByTestId('stage-character-main')).toContainText('一起来玩吧！')
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

test('TQ-008: lesson 2 step 5 accepts every preset line (no free text) and the fox says the chosen one',async({page})=>{
  test.setTimeout(150_000)
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('tq008-seeded'))return
    sessionStorage.setItem('tq008-seeded','1')
    const lessonId='lesson-02-forest-greeting'
    sessionStorage.setItem(`kc-lesson-draft:${lessonId}:4`,JSON.stringify({schemaVersion:1,lessonId,stepIndex:4,blocks:[{type:'when_start'},{type:'move_right'},{type:'say_line'}],updatedAt:new Date().toISOString()}))
  })
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 步')
  const choices=page.getByTestId('lesson-say-line-choices')
  await expect(choices.getByRole('button')).toHaveCount(4)
  await expect(choices.locator('input,textarea')).toHaveCount(0)
  for(const [id,text] of [['hello','你好！'],['hi-all','大家好呀！'],['nice-to-meet','很高兴见到你！'],['lets-play','一起来玩吧！']]){
    await page.getByTestId(`lesson-say-line-${id}`).click()
    await expect(page.getByTestId(`lesson-say-line-${id}`)).toHaveAttribute('aria-pressed','true')
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
    await expect(page.getByTestId('stage-character-main')).toContainText(text)
  }
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/lesson-02-forest-greeting/complete')
})
