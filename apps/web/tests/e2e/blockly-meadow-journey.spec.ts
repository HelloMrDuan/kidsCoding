import {expect,test,type Page} from '@playwright/test'
import {expectStageWalk,solveMistakeStep,solvePracticeStep,clickLessonControl,showLessonPane,seedLaunchV3Draft} from './lesson-pane-helpers'

type Mistake={expectCode:string;answer:string;fix:string[]}
type Practice=Parameters<typeof solvePracticeStep>[1]
type Expect={scene:'森林'|'草地';walk:number;say?:string;noBubble?:boolean}
/** TQ-011: warm-up → main build → second practice (第 3 关) → designed mistake (第 4 关). */
async function play(page:Page,id:string,adds:Record<number,string[]>,practice:Practice,mistake:Mistake,expects:Expect[]){
  await page.goto('/learn/lesson/'+id)
  // OPS-056: the old address permanently redirects to the shared V3 launch studio.
  await page.waitForURL('**/studio/blockly/launch/'+id)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  for(let step=0;step<4;step++){
    // V3 keeps a program per 关, so 第 2 关 builds on a fresh canvas: lay the
    // 第 1 关 blocks again, then the new ones (same final program as before).
    const build=step===1?[...(adds[0]??[]),...(adds[1]??[])]:adds[step]??[]
    for(const type of build)await clickLessonControl(page, 'lesson-add-'+type)
    if(step===2)await solvePracticeStep(page,practice)
    // TQ-010: the designed mistake step opens on a pre-built wrong program.
    else if(step===3)await solveMistakeStep(page,mistake)
    else{
      await clickLessonControl(page, 'run-code-button')
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:25_000})
    }
    await expect(page.getByTestId('stage-current-scene')).toContainText(expects[step].scene)
    await expectStageWalk(page,expects[step].walk)
    if(expects[step].say)await expect(page.getByTestId('stage-character-main')).toContainText(expects[step].say!)
    // TQ-011: a line said before “切换场景” does not follow the fox into the meadow.
    if(expects[step].noBubble)await expect(page.getByTestId('stage-character-main').locator('.kc-stage-speech')).toHaveCount(0)
    await clickLessonControl(page, 'lesson-complete-step')
  }
  await page.waitForURL('**/project/'+id+'/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
}
test('lesson 4 switches real stage background after Scratch-like Blockly scene instruction',async({page})=>{
  test.setTimeout(180_000)
  await play(page,'lesson-04-meadow-scene',{0:['when_start','move_right'],1:['switch_scene']},
    // TQ-011: walk 200 步 in the forest before the switch, predicting where the scene changes.
    {goalType:'change-distance',guess:'two-hundred',clear:true,build:['when_start','move_right','move_right','switch_scene']},
    {expectCode:'scene-switch-early',answer:'meadow',fix:['when_start','move_right','switch_scene']},
    [{scene:'森林',walk:100},{scene:'草地',walk:100},{scene:'草地',walk:200},{scene:'草地',walk:100}])
})
test('lesson 5 visibly repeats the prior movement after traveling to meadow',async({page})=>{
  test.setTimeout(180_000)
  await play(page,'lesson-05-meadow-order',{0:['when_start','move_right','switch_scene'],1:['repeat_twice']},
    // TQ-011: no scene switch — the repeat takes the fox to the bird in the forest.
    {goalType:'change-distance',guess:'beside-bird',clear:true,build:['when_start','move_right','repeat_twice']},
    {expectCode:'repeat-without-move',answer:'zero',fix:['when_start','move_right','switch_scene','repeat_twice']},
    [{scene:'草地',walk:100},{scene:'草地',walk:200},{scene:'森林',walk:200},{scene:'草地',walk:200}])
})
test('lesson 6 executes movement, scene change, repetition and speech in order',async({page})=>{
  test.setTimeout(180_000)
  await play(page,'lesson-06-meadow-story',{0:['when_start','move_right','switch_scene','repeat_twice'],1:['say_line']},
    // TQ-011: speak in the forest instead and compare what the fox says.
    {goalType:'compare-orders',clear:true,build:['when_start','move_right','say_line','switch_scene','repeat_twice'],wrongAnswer:'same-line',answer:'different-line'},
    {expectCode:'scene-switch-late',answer:'too-far',fix:['when_start','move_right','switch_scene','repeat_twice','say_line']},
    [{scene:'草地',walk:200},{scene:'草地',walk:200,say:'我到草地啦！'},{scene:'草地',walk:200,noBubble:true},{scene:'草地',walk:200,say:'我到草地啦！'}])
})

test('TQ-009: lesson 5 blocks and stage say exactly what happens (向右走 100 步, repeat walks again after the scene switch)',async({page})=>{
  test.setTimeout(150_000)
  // TQ-011: the “arrive in the meadow” goal (start → move → switch) is 第 1 关 now.
  await page.goto('/learn/lesson/lesson-05-meadow-order')
  // OPS-056: lesson-05 lives in the shared V3 launch studio; its task header
  // carries the 关 number and progress the old task card / strip used to.
  await page.waitForURL('**/studio/blockly/launch/lesson-05-meadow-order')
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 1 / 4 关')
  await expect(page.getByTestId('lesson-add-move_right')).toHaveText('添加积木：向右走 100 步')
  await expect(page.getByTestId('lesson-add-repeat_twice')).toHaveText('添加积木：重复：再走 100 步')
  // Lesson 5 never speaks, so it does not offer the say block.
  await expect(page.getByTestId('lesson-add-say_line')).toHaveCount(0)
  await expect(page.getByTestId('launch-v3-stepbar')).toBeAttached()
  await expect(page.getByTestId('stage-walked-distance')).toContainText('已走 0 步')
  for(const type of ['when_start','move_right','switch_scene','repeat_twice'])await clickLessonControl(page, 'lesson-add-'+type)
  // The real Blockly blocks carry the same labels as the palette buttons.
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('向右走 100 步')
  await expect(canvas).toContainText('重复：再走 100 步')
  await clickLessonControl(page, 'run-code-button')
  // 第 1 关 stops on arrival (100 步); the repeat walks again, so the run fails and says so in steps.
  await expect(page.getByTestId('stage-run-reason')).toContainText('要走 100 步，现在走了 200 步',{timeout:20_000})
  await expect(page.getByTestId('stage-walked-distance')).toContainText('已走 200 步')
  // The fox ends beside the bird, never on top of it.
  await expectStageWalk(page,200)
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
})

test('TQ-010: lesson 5 第 4 关 — “重复：再走 100 步” placed before any move stops the fox at 0, then the fix walks 200',async({page})=>{
  test.setTimeout(150_000)
  // Resume at 第 3 关 (the TQ-011 practice) with its program already built.
  // OPS-056: V3 keeps one owner-scoped draft per lesson with a program per 关;
  // 第 4 关 is left out so it opens on its designed wrong program.
  await page.goto('/learn/catalog')
  await seedLaunchV3Draft(page,'lesson-05-meadow-order',2,{
    'step-3':[{type:'when_start'},{type:'move_right'},{type:'repeat_twice'}],
  })
  await page.goto('/studio/blockly/launch/lesson-05-meadow-order')
  await expect(page.getByTestId('studio-shell')).toBeVisible({timeout:30_000})
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 3 / 4 关')
  await solvePracticeStep(page,{goalType:'change-distance',guess:'stay-100',build:[]})
  // The wrong guess gets the honest result in the stage's own words.
  await expect(page.getByTestId('practice-answer-reply')).toContainText('小狐狸已走 200 步')
  await expect(page.getByTestId('stage-current-scene')).toContainText('森林')
  await clickLessonControl(page, 'lesson-complete-step')
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText('第 4 / 4 关')
  await expect(page.getByTestId('mistake-task')).toContainText('纠错实验：“重复：再走 100 步”放早了')
  await expect(page.getByTestId('mistake-setup')).toContainText('“开始时 → 重复：再走 100 步 → 向右走 100 步 → 切换场景”')
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('重复：再走 100 步')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code','repeat-without-move',{timeout:12_000})
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小狐狸已走 0 步')
  await expect(page.getByTestId('stage-current-scene')).toContainText('森林')
  await clickLessonControl(page, 'mistake-answer-zero')
  await expect(page.getByTestId('mistake-fix')).toContainText('挪到“切换场景”下面')
  // “再摆一次错误程序” puts the wrong program back; the observation is kept.
  await clickLessonControl(page, 'lesson-clear-program')
  await clickLessonControl(page, 'mistake-reload')
  await expect(canvas).toContainText('重复：再走 100 步')
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  await clickLessonControl(page, 'lesson-clear-program')
  for(const type of ['when_start','move_right','switch_scene','repeat_twice'])await clickLessonControl(page, 'lesson-add-'+type)
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('mistake-fixed')).toContainText('一共走了 200 步')
  await expectStageWalk(page,200)
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await clickLessonControl(page, 'lesson-complete-step')
  await page.waitForURL('**/project/lesson-05-meadow-order/complete')
})
