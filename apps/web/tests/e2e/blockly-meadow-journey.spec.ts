import {expect,test,type Page} from '@playwright/test'
import {expectStageWalk,solveMistakeStep} from './lesson-pane-helpers'

type Mistake={step:number;expectCode:string;answer:string;fix:string[]}
async function play(page:Page,id:string,adds:Record<number,string[]>,sceneStep:number,repeatStep:number,mistake:Mistake){
  await page.goto('/learn/lesson/'+id)
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  for(let step=0;step<5;step++){
    for(const type of adds[step]??[])await page.getByTestId('lesson-add-'+type).click()
    // TQ-010: the designed mistake step opens on a pre-built wrong program.
    if(step===mistake.step)await solveMistakeStep(page,mistake)
    else{
      await page.getByTestId('run-code-button').click()
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:25_000})
    }
    await expect(page.getByTestId('stage-current-scene')).toContainText(step>=sceneStep?'草地':'森林')
    if(step>=repeatStep)await expectStageWalk(page,200)
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/'+id+'/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
}
test('lesson 4 switches real stage background after Scratch-like Blockly scene instruction',async({page})=>{
  test.setTimeout(180_000)
  await play(page,'lesson-04-meadow-scene',{0:['when_start'],1:['move_right'],3:['switch_scene']},3,99,
    {step:4,expectCode:'scene-switch-early',answer:'meadow',fix:['when_start','move_right','switch_scene']})
})
test('lesson 5 visibly repeats the prior movement after traveling to meadow',async({page})=>{
  test.setTimeout(180_000)
  await play(page,'lesson-05-meadow-order',{0:['when_start'],1:['move_right'],2:['switch_scene'],3:['repeat_twice']},2,3,
    {step:4,expectCode:'repeat-without-move',answer:'zero',fix:['when_start','move_right','switch_scene','repeat_twice']})
})
test('lesson 6 executes movement, scene change, repetition and speech in order',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-06-meadow-story')
  const adds:Record<number,string[]>={0:['when_start'],1:['move_right'],2:['switch_scene'],3:['repeat_twice','say_line']}
  for(let step=0;step<5;step++){
    for(const type of adds[step]??[])await page.getByTestId('lesson-add-'+type).click()
    // TQ-010: 第 5 关 is the designed mistake step — the scene switch comes too late.
    if(step===4)await solveMistakeStep(page,{expectCode:'scene-switch-late',answer:'too-far',fix:['when_start','move_right','switch_scene','repeat_twice','say_line']})
    else{
      await page.getByTestId('run-code-button').click()
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:25_000})
    }
    if(step>=3){
      await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
      await expectStageWalk(page,200)
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('我到草地啦！')
    }
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/lesson-06-meadow-story/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('TQ-009: lesson 5 blocks and stage say exactly what happens (向右走 100 步, repeat walks again after the scene switch)',async({page})=>{
  test.setTimeout(150_000)
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('tq009-seeded'))return
    sessionStorage.setItem('tq009-seeded','1')
    const lessonId='lesson-05-meadow-order'
    sessionStorage.setItem(`kc-lesson-draft:${lessonId}:2`,JSON.stringify({schemaVersion:1,lessonId,stepIndex:2,blocks:[],updatedAt:new Date().toISOString()}))
  })
  await page.goto('/learn/lesson/lesson-05-meadow-order')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
  await expect(page.getByTestId('lesson-add-move_right')).toHaveText('添加积木：向右走 100 步')
  await expect(page.getByTestId('lesson-add-repeat_twice')).toHaveText('添加积木：重复：再走 100 步')
  // Lesson 5 never speaks, so it does not offer the say block.
  await expect(page.getByTestId('lesson-add-say_line')).toHaveCount(0)
  await expect(page.getByTestId('lesson-progress-strip')).toContainText('关卡 3 / 5')
  await expect(page.getByTestId('stage-walked-distance')).toContainText('已走 0 步')
  for(const type of ['when_start','move_right','switch_scene','repeat_twice'])await page.getByTestId('lesson-add-'+type).click()
  // The real Blockly blocks carry the same labels as the palette buttons.
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('.blocklyBlockCanvas').first()
  await expect(canvas).toContainText('向右走 100 步')
  await expect(canvas).toContainText('重复：再走 100 步')
  await page.getByTestId('run-code-button').click()
  // Step 3 stops on arrival (100 步); the repeat walks again, so the run fails and says so in steps.
  await expect(page.getByTestId('stage-run-reason')).toContainText('要走 100 步，现在走了 200 步',{timeout:20_000})
  await expect(page.getByTestId('stage-walked-distance')).toContainText('已走 200 步')
  // The fox ends beside the bird, never on top of it.
  await expectStageWalk(page,200)
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
})

test('TQ-010: lesson 5 第 5 关 — “重复：再走 100 步” placed before any move stops the fox at 0, then the fix walks 200',async({page})=>{
  test.setTimeout(150_000)
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('tq010-seeded'))return
    sessionStorage.setItem('tq010-seeded','1')
    const lessonId='lesson-05-meadow-order'
    sessionStorage.setItem(`kc-lesson-draft:${lessonId}:3`,JSON.stringify({schemaVersion:1,lessonId,stepIndex:3,blocks:[{type:'when_start'},{type:'move_right'},{type:'switch_scene'},{type:'repeat_twice'}],updatedAt:new Date().toISOString()}))
  })
  await page.goto('/learn/lesson/lesson-05-meadow-order')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 5 关')
  await expect(page.getByTestId('mistake-task')).toContainText('纠错实验：“重复：再走 100 步”放早了')
  await expect(page.getByTestId('mistake-setup')).toContainText('“开始时 → 重复：再走 100 步 → 向右走 100 步 → 切换场景”')
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('.blocklyBlockCanvas').first()
  await expect(canvas).toContainText('重复：再走 100 步')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('stage-run-error')).toHaveAttribute('data-failure-code','repeat-without-move',{timeout:12_000})
  await expect(page.getByTestId('stage-run-reason')).toContainText('“重复：再走 100 步”前面要先有“向右走 100 步”')
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小狐狸已走 0 步')
  await expect(page.getByTestId('stage-current-scene')).toContainText('森林')
  await page.getByTestId('mistake-answer-zero').click()
  await expect(page.getByTestId('mistake-fix')).toContainText('挪到“切换场景”下面')
  // “再摆一次错误程序” puts the wrong program back; the observation is kept.
  await page.getByTestId('lesson-clear-program').click()
  await page.getByTestId('mistake-reload').click()
  await expect(canvas).toContainText('重复：再走 100 步')
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  await page.getByTestId('lesson-clear-program').click()
  for(const type of ['when_start','move_right','switch_scene','repeat_twice'])await page.getByTestId('lesson-add-'+type).click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('mistake-fixed')).toContainText('一共走了 200 步')
  await expectStageWalk(page,200)
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/lesson-05-meadow-order/complete')
})
