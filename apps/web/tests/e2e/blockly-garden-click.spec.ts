import {expect,test,type Page} from '@playwright/test'
import {expectStageWalk,solveMistakeStep} from './lesson-pane-helpers'

async function performClickStep(page:Page,expectedMovement:number,expectSpeech:boolean){
  // Code.org-inspired prediction: select a hypothesis before testing it.
  await page.getByTestId('garden-predict-click').click()
  await expect(page.getByTestId('run-code-button')).toBeEnabled()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await expectStageWalk(page,0)
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  // No click means no execution and no credit, even though the blocks are correct.
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('点击蝴蝶')
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  if(expectedMovement>0) await expectStageWalk(page,expectedMovement)
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
    if(step===2){
      // TQ-010: 第 3 关 is the designed mistake step — “开始时” flies without a click.
      await solveMistakeStep(page,{expectCode:'needs-click-trigger',answer:'flew-alone',fix:['when_clicked','move_right'],garden:true})
      await expectStageWalk(page,100)
      await page.getByTestId('lesson-complete-step').click()
      continue
    }
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
    if(step===4){
      // TQ-010: 第 5 关 is the designed mistake step — the butterfly speaks before it flies.
      await solveMistakeStep(page,{expectCode:'say-too-early',answer:'said-first',fix:['when_clicked','move_right','say_line'],garden:true,wrongWaitsForClick:true})
      await expect(page.getByTestId('stage-character-main')).toContainText('蝴蝶收到你的点击啦！')
      await page.getByTestId('lesson-complete-step').click()
      continue
    }
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
    if(step===4){
      // TQ-010: 第 5 关 is the designed mistake step — the reply comes before flying twice.
      await solveMistakeStep(page,{expectCode:'say-too-early',answer:'before-fly',fix:['when_clicked','move_right','say_line','repeat_twice'],garden:true,wrongWaitsForClick:true})
      await expectStageWalk(page,200)
      await page.getByTestId('lesson-complete-step').click()
      continue
    }
    await performClickStep(page,step>=2?100:0,step>=3)
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
  await expect(page.getByTestId('stage-run-reason')).toContainText('先放一块“被点击时”',{timeout:10_000})
  await expect(page.getByTestId('stage-character-main')).toBeDisabled()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page).toHaveURL(/lesson-07-garden-click/)
})

async function seedStepDraft(page:Page,lessonId:string,stepIndex:number,blocks:Array<{type:string;line?:string}>){
  await page.addInitScript(({lessonId,stepIndex,blocks})=>{
    if(sessionStorage.getItem('tq008-seeded'))return
    sessionStorage.setItem('tq008-seeded','1')
    sessionStorage.setItem(`kc-lesson-draft:${lessonId}:${stepIndex}`,JSON.stringify({schemaVersion:1,lessonId,stepIndex,blocks,updatedAt:new Date().toISOString()}))
  },{lessonId,stepIndex,blocks})
}

test('TQ-008: lesson 9 step 5 accepts following the instruction literally (fly twice, then reply)',async({page})=>{
  test.setTimeout(120_000)
  // TQ-010: 第 5 关 is now the designed mistake step; start from its wrong program.
  await seedStepDraft(page,'lesson-09-garden-story',4,[{type:'when_clicked'},{type:'say_line'},{type:'move_right'},{type:'repeat_twice'}])
  await page.goto('/learn/lesson/lesson-09-garden-story')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 关')
  await expect(page.getByTestId('lesson-task-card')).toContainText('一共飞两次')
  await solveMistakeStep(page,{expectCode:'say-too-early',answer:'before-fly',fix:['when_clicked','move_right','repeat_twice','say_line'],garden:true,wrongWaitsForClick:true})
  await expectStageWalk(page,200)
  await expect(page.getByTestId('stage-character-main')).toContainText('蝴蝶收到你的点击啦！')
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/lesson-09-garden-story/complete')
})

test('TQ-008/TQ-010: lesson 9 第 5 关 rejects replying before flying with a specific reason — the designed mistake, not a hint-raising failure',async({page})=>{
  test.setTimeout(120_000)
  await seedStepDraft(page,'lesson-09-garden-story',4,[{type:'when_clicked'},{type:'say_line'},{type:'move_right'},{type:'repeat_twice'}])
  await page.goto('/learn/lesson/lesson-09-garden-story')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 关')
  await page.getByTestId('garden-predict-click').click()
  await page.getByTestId('run-code-button').click()
  await page.getByTestId('stage-character-main').click()
  // The designed run is the experiment: no failure-style “哎呀” box, the panel asks what happened.
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code','say-too-early',{timeout:20_000})
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  await page.getByTestId('lesson-complete-step').click()
  await expect(page).toHaveURL(/lesson-09-garden-story/)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 关')
  // Running the same wrong program again after observing it is a real failed attempt.
  await page.getByTestId('run-code-button').click()
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','1',{timeout:20_000})
  await expect(page.getByTestId('stage-run-reason')).toContainText('说话说早啦')
  await expect(page.getByTestId('stage-run-error')).toContainText('哎呀')
})

test('TQ-009: the butterfly flies — lesson 9 blocks, palette, stage and feedback say “飞”, never “走”',async({page})=>{
  test.setTimeout(120_000)
  await seedStepDraft(page,'lesson-09-garden-story',4,[{type:'when_clicked'},{type:'move_right'},{type:'say_line'}])
  await page.goto('/learn/lesson/lesson-09-garden-story')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 关')
  await expect(page.getByTestId('lesson-add-move_right')).toHaveText('添加积木：向右飞 100 步')
  await expect(page.getByTestId('lesson-add-repeat_twice')).toHaveText('添加积木：重复：再飞 100 步')
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 0 步')
  // The restored program and the flyout are real Blockly blocks with the same “飞” labels.
  const workspace=page.getByTestId('lesson-blockly-workspace')
  await expect(workspace.locator('.blocklyBlockCanvas').first()).toContainText('向右飞 100 步')
  await expect(workspace.locator('.blocklyFlyout').first()).toContainText('重复：再飞 100 步')
  await expect(workspace).not.toContainText('向右走')
  await expect(workspace).not.toContainText('再走')
  // Missing the repeat: the reason says how far it flew, in “飞”.
  await page.getByTestId('garden-predict-click').click()
  await page.getByTestId('run-code-button').click()
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('stage-run-reason')).toContainText('只飞了 100 步，要飞 200 步',{timeout:20_000})
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 100 步')
  // A dragged-in copy keeps the label too: adding the repeat by button shows “再飞”.
  await page.getByTestId('lesson-add-repeat_twice').click()
  await expect(workspace.locator('.blocklyBlockCanvas').first()).toContainText('重复：再飞 100 步')
})

test('TQ-010: lesson 7 第 3 关 — “开始时” makes the butterfly fly without a click; fixed with “被点击时” it waits for the click',async({page})=>{
  test.setTimeout(150_000)
  await seedStepDraft(page,'lesson-07-garden-click',1,[{type:'when_clicked'},{type:'move_right'}])
  await page.goto('/learn/lesson/lesson-07-garden-click')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 2 关')
  await performClickStep(page,100,false)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
  await expect(page.getByTestId('lesson-task-card')).toContainText('没点就飞？找错再修好')
  await expect(page.getByTestId('mistake-setup')).toContainText('“开始时 → 向右飞 100 步”')
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('.blocklyBlockCanvas').first()
  await expect(canvas).toContainText('开始时')
  await expect(canvas).toContainText('向右飞 100 步')
  await page.getByTestId('garden-predict-click').click()
  await page.getByTestId('run-code-button').click()
  // No click: it never waits — the butterfly flies by itself.
  await expect(page.getByTestId('garden-await-click')).toHaveCount(0)
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code','needs-click-trigger',{timeout:20_000})
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 100 步')
  await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  await expect(page.getByTestId('mistake-question')).toContainText('你还没点蝴蝶，它怎么了？')
  await page.getByTestId('mistake-answer-waited').click()
  await expect(page.getByTestId('mistake-answer-reply')).toContainText('蝴蝶已经飞了 100 步')
  await page.getByTestId('mistake-answer-flew-alone').click()
  await expect(page.getByTestId('mistake-fix')).toContainText('把“开始时”换成“被点击时”')
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('哎呀')
  await page.getByTestId('lesson-clear-program').click()
  await page.getByTestId('lesson-add-when_clicked').click()
  await page.getByTestId('lesson-add-move_right').click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await expectStageWalk(page,0)
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('mistake-fixed')).toContainText('等你点到它')
  await expectStageWalk(page,100)
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
})
