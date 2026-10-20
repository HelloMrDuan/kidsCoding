import {expect,test} from '@playwright/test'
import {expectStageWalk,solveMistakeStep,solvePracticeStep} from './lesson-pane-helpers'

test('forest greeting lesson really moves then speaks before completion',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  for(let step=0;step<4;step++){
    if(step===1){
      await page.getByTestId('lesson-add-say_line').click()
      // TQ-008/TQ-011: “选一句对白” is part of the main build now; the choice is real and the fox says it.
      await page.getByTestId('lesson-say-line-lets-play').click()
    }
    // TQ-011: 第 3 关 is the second practice — no move block, the fox greets where it stands.
    if(step===2){
      await solvePracticeStep(page,{goalType:'change-distance',guess:'stay',clear:true,build:['when_start','say_line']})
      await expectStageWalk(page,0)
      await expect(page.getByTestId('practice-answer-reply')).toContainText('猜对啦')
    }
    // TQ-010: 第 4 关 is the designed mistake step — the fox speaks before walking.
    else if(step===3)await solveMistakeStep(page,{expectCode:'say-too-early',answer:'before-walk',fix:['when_start','move_right','say_line']})
    else{
      await page.getByTestId('run-code-button').click()
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
    }
    if(step!==2)await expectStageWalk(page,100)
    if(step===1)await expect(page.getByTestId('stage-character-main')).toContainText('一起来玩吧！')
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/lesson-02-forest-greeting/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})
test('forest first story walks all the way to the rabbit, then greets, through real Blockly execution',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-03-forest-story')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-add-move_right').click()
  await page.getByTestId('lesson-add-move_right').click()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('请先点击舞台')
  for(let step=0;step<4;step++){
    if(step===1)await page.getByTestId('lesson-add-say_line').click()
    // TQ-011: 第 3 关 is the second practice — greet half way, then compare with 第 2 关.
    if(step===2){
      await solvePracticeStep(page,{goalType:'compare-orders',clear:true,build:['when_start','move_right','say_line','move_right'],wrongAnswer:'stop-place',answer:'say-place'})
    }
    // TQ-010: 第 4 关 is the designed mistake step — the story greets before the fox reaches the rabbit.
    else if(step===3)await solveMistakeStep(page,{expectCode:'say-too-early',answer:'said-first',fix:['when_start','move_right','move_right','say_line']})
    else{
      await page.getByTestId('run-code-button').click()
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
    }
    await expectStageWalk(page,200)
    if(step>=1)await expect(page.getByTestId('lesson-playable-stage')).toContainText('你好！')
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/lesson-03-forest-story/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('TQ-008: lesson 2 第 2 关 accepts every preset line (no free text) and the fox says the chosen one',async({page})=>{
  test.setTimeout(150_000)
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('tq008-seeded'))return
    sessionStorage.setItem('tq008-seeded','1')
    const lessonId='lesson-02-forest-greeting'
    // TQ-011: the line choice is part of the main build (第 2 关).
    sessionStorage.setItem(`kc-lesson-draft:${lessonId}:1`,JSON.stringify({schemaVersion:1,lessonId,stepIndex:1,blocks:[{type:'when_start'},{type:'move_right'},{type:'say_line'}],updatedAt:new Date().toISOString()}))
  })
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
  await expect(page.getByTestId('lesson-task-card')).toContainText('选一句对白')
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
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
  await expect(page.getByTestId('practice-task')).toContainText('新练习：站在原地打招呼')
})
