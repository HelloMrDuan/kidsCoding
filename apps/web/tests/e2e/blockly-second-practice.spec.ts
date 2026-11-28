import {expect,test,type Page} from '@playwright/test'
import {expectProgramFromTop,expectStageWalk,showLessonPane,clickLessonControl,openForestTools,seedForestV3Draft,seedLaunchV3Draft} from './lesson-pane-helpers'

/**
 * TQ-011 (= TQ-002e): each Blockly lesson 01–09 has one second practice whose goal differs
 * from the main build. These specs open the practice (第 3 关) directly and check that it is a
 * real, judged task: a prediction before the run, the honest result on stage, the specific
 * failure reason for THIS goal, and a comparison question that must be answered.
 *
 * OPS-056: lesson-02…12 now run in the V3 launch studio (/studio/blockly/launch/<id>; the old
 * /learn/lesson/<id> entry 308-redirects). DOM mapping (same strength):
 * - lesson-task-card 第 N 关 / lesson-progress-strip 关卡 N / 4 -> launch-v3-step-progress 第 N / 4 关;
 * - lesson-task-card step copy -> launch-v3-instruction; lesson-feedback-card -> launch-v3-notice;
 * - run-code-button text -> ws-run-toggle; blocks / run / complete -> clickLessonControl;
 * - the resumed draft is the real owner-scoped V3 draft (seedLaunchV3Draft), not the old
 *   sessionStorage kc-lesson-draft key.
 * Behaviour differences recorded for the PR (not weakened silently):
 * - the run toggle is never disabled, so "no guess -> run-code-button disabled" is asserted on the
 *   completion gate instead (it must explain the missing guess and not advance);
 * - a real failed run counts once (real draft script.failures 0 -> 1) and raises lesson-hint to
 *   tier 1, as in the old classroom;
 * - 复审 HOLD P1: V3 again renders the practice step's own hint (practice-steps.ts `hint`) and
 *   “刚完成的小结果” (lesson-feedback-preview); the spec at the end asserts both as before.
 */
const DRAFT_PREFIX='kids-lesson-owner-v1:guest:kidscoding-draft:'

async function expectStep(page:Page,step:number){
  await showLessonPane(page,'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(`第 ${step} / 4 关`)
}
function draftFailures(page:Page,lessonId:string){
  return page.evaluate((key)=>{
    const raw=window.localStorage.getItem(key)
    if(!raw)return null
    try{return (JSON.parse(raw) as {script?:{failures?:number}}).script?.failures ?? null}catch{return null}
  },`${DRAFT_PREFIX}${lessonId}`)
}
async function resumeAtPractice(page:Page,lessonId:string,blocks:Array<{type:string}>){
  // A real V3 draft at 第 3 关 (index 2) holding the main build's program, as if carried over from 第 2 关.
  await page.goto('/')
  await seedLaunchV3Draft(page,lessonId,2,{'step-3':blocks})
  await page.goto('/learn/lesson/'+lessonId)
  await page.waitForURL(`**/studio/blockly/launch/${lessonId}`)
  await expectStep(page,3)
}

test('TQ-011: lesson 4 第 3 关 — predict where the scene changes, a wrong order gets this goal\'s reason, then the real switch at 200 步',async({page})=>{
  test.setTimeout(150_000)
  const lessonId='lesson-04-meadow-scene'
  await resumeAtPractice(page,lessonId,[{type:'when_start'},{type:'move_right'},{type:'switch_scene'}])
  await showLessonPane(page,'stage')
  const task=page.getByTestId('practice-task')
  await expect(task).toHaveAttribute('data-goal-type','change-distance')
  await expect(task).toContainText('新练习：在森林多走一会儿')
  await expect(page.getByTestId('practice-setup')).toContainText('“开始时 → 向右走 100 步 → 向右走 100 步 → 切换场景”')
  await expect(page.getByTestId('practice-question')).toContainText('先猜一猜：小狐狸在森林里走多少步，才换到草地？')
  // The practice offers the program tools (another order needs a rebuild).
  await openForestTools(page)
  await expect(page.getByTestId('lesson-clear-program')).toBeVisible()
  // No guess: V3 never disables the run toggle, so the gate is the completion attempt.
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('practice-need-guess')).toBeVisible()
  await clickLessonControl(page,'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-notice')).toContainText('先在舞台上猜一猜')
  await expectStep(page,3)
  await clickLessonControl(page,'practice-answer-one-hundred')
  await expect(page.getByTestId('practice-answer-reply')).toContainText('猜好啦')
  // Adding a move at the end puts it AFTER the switch: a real failed run with the specific reason.
  await clickLessonControl(page,'lesson-add-move_right')
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toContainText('换场景换早啦！先在森林走 200 步，再去草地。',{timeout:20_000})
  // Same as the old classroom: one real failure is recorded and lesson-hint reaches tier 1.
  await expect.poll(()=>draftFailures(page,lessonId),{timeout:20_000}).toBe(1)
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','1',{timeout:10_000})
  await expect(page.getByTestId('practice-done')).toHaveCount(0)
  // Rebuild in the right order.
  await clickLessonControl(page,'lesson-clear-program')
  for(const type of ['when_start','move_right','move_right','switch_scene'])await clickLessonControl(page,'lesson-add-'+type)
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await expectStageWalk(page,200)
  // The wrong guess gets the honest result; the step still completes (it was a prediction).
  await expect(page.getByTestId('practice-answer-reply')).toContainText('在森林里走了 200 步，才换到草地')
  await expect(page.getByTestId('practice-done')).toContainText('“切换场景”放在哪里')
  await expect(page.getByTestId('practice-answer-two-hundred')).toBeDisabled()
  await clickLessonControl(page,'lesson-complete-step')
  await expectStep(page,4)
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('mistake-task')).toBeVisible()
})

test('TQ-011: lesson 8 第 3 关 — compare “开始时” with “被点击时”: the butterfly no longer waits and says “你好！”',async({page})=>{
  test.setTimeout(150_000)
  await resumeAtPractice(page,'lesson-08-garden-dialogue',[{type:'when_clicked'},{type:'move_right'},{type:'say_line'}])
  await expect(page.getByTestId('launch-v3-instruction')).toContainText('把开头换成“开始时”')
  await showLessonPane(page,'stage')
  const task=page.getByTestId('practice-task')
  await expect(task).toHaveAttribute('data-goal-type','compare-events')
  await expect(task).toContainText('新练习：换成“开始时”比一比')
  // Lesson 8 does not repeat lesson 7's click prediction; the comparison question waits for a run.
  await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  await expect(page.getByTestId('practice-question')).toHaveCount(0)
  await expect(page.getByTestId('ws-run-toggle')).toContainText('运行')
  // Keeping “被点击时”: the program still waits for a click, then fails with the specific reason.
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await clickLessonControl(page,'stage-character-main')
  await expect(page.getByTestId('stage-run-reason')).toContainText('这次一按“运行”就要开始，换成“开始时”开头吧！',{timeout:20_000})
  // Swap the start event.
  await clickLessonControl(page,'lesson-clear-program')
  for(const type of ['when_start','move_right','say_line'])await clickLessonControl(page,'lesson-add-'+type)
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toHaveCount(0)
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 100 步')
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
  await expect(page.getByTestId('practice-question')).toContainText('比一比：和上一关比，蝴蝶有什么不一样？')
  await expect(page.getByTestId('practice-need-answer')).toBeVisible()
  // The comparison is the point: the step does not pass before it is answered right.
  await clickLessonControl(page,'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-notice')).toContainText('先回答舞台上的问题：和上一关比，蝴蝶有什么不一样？')
  await clickLessonControl(page,'practice-answer-still-waits')
  await expect(page.getByTestId('practice-answer-reply')).toContainText('你没点蝴蝶，它一运行就飞了 100 步')
  await clickLessonControl(page,'lesson-complete-step')
  await expectStep(page,3)
  await clickLessonControl(page,'practice-answer-no-wait')
  await expect(page.getByTestId('practice-answer-reply')).toContainText('“被点击时”要等你点，才说“蝴蝶收到你的点击啦！”')
  await expect(page.getByTestId('practice-done')).toContainText('开头的积木决定蝴蝶什么时候开始表演')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('点击“完成这一关”继续')
  await clickLessonControl(page,'lesson-complete-step')
  await expectStep(page,4)
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('mistake-task')).toBeVisible()
})

test('TQ-011: lesson 6 第 3 关 — speaking in the forest changes what the fox says; the journey stays the same',async({page})=>{
  test.setTimeout(150_000)
  await resumeAtPractice(page,'lesson-06-meadow-story',[{type:'when_start'},{type:'move_right'},{type:'switch_scene'},{type:'repeat_twice'},{type:'say_line'}])
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('practice-task')).toHaveAttribute('data-goal-type','compare-orders')
  // Running the previous 关's program again is not this practice.
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toBeVisible({timeout:20_000})
  await expect(page.getByTestId('practice-question')).toHaveCount(0)
  await clickLessonControl(page,'lesson-clear-program')
  for(const type of ['when_start','move_right','say_line','switch_scene','repeat_twice'])await clickLessonControl(page,'lesson-add-'+type)
  await showLessonPane(page,'stage')
  // The forest line is seen while the stage is still the forest (polled every frame: the bubble lasts ~0.5 s) …
  const saidInForest=page.waitForFunction(()=>document.querySelector('[data-testid=stage-character-main] .kc-stage-speech')?.textContent?.includes('你好！')&&document.querySelector('[data-testid=stage-current-scene]')?.textContent?.includes('森林'),null,{timeout:20_000})
  await clickLessonControl(page,'run-code-button')
  await saidInForest
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:25_000})
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await expectStageWalk(page,200)
  // … and “切换场景” leaves it behind: the meadow shows no old forest bubble (TQ-011).
  await expect(page.getByTestId('stage-character-main').locator('.kc-stage-speech')).toHaveCount(0)
  await clickLessonControl(page,'practice-answer-different-line')
  await expect(page.getByTestId('practice-done')).toBeVisible()
  await clickLessonControl(page,'lesson-complete-step')
  await expectStep(page,4)
})

/**
 * OPS-056 复审 HOLD P1 (restored): the old classroom showed the practice step's own hint after a
 * failed run and “刚完成的小结果” for the main build; V3 renders both again. The original
 * assertions run unchanged; the only V3 mapping is opening the 任务 pane before checking that
 * the card is visible (phones show one pane at a time).
 */
test('OPS-056: V3 shows the practice step\'s own hint and “刚完成的小结果” (restored)',async({page})=>{
  test.setTimeout(90_000)
  await resumeAtPractice(page,'lesson-04-meadow-scene',[{type:'when_start'},{type:'move_right'},{type:'switch_scene'}])
  await showLessonPane(page,'stage')
  await clickLessonControl(page,'practice-answer-one-hundred')
  await clickLessonControl(page,'lesson-add-move_right')
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toContainText('换场景换早啦！',{timeout:20_000})
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','1',{timeout:10_000})
  await expect(page.getByTestId('lesson-hint')).toContainText('两块“向右走 100 步”都放在“切换场景”上面')
  await showLessonPane(page,'task')
  await expect(page.getByTestId('lesson-feedback-preview')).toBeVisible()
})

/**
 * TQ-011 fix: when a step loads its program (carried over into 第 3 关, the pre-built wrong
 * program of 第 4 关) or the child rebuilds it with the buttons after “清空积木重拼”, the whole
 * program is visible from the top of the workspace — the first block is never cut off.
 */
const VIEWPORTS=[{name:'desktop',width:1440,height:900},{name:'tablet',width:768,height:1024},{name:'phone',width:375,height:812}] as const
const LOADED_PROGRAMS=[
  {lessonId:'lesson-08-garden-dialogue',stepIndex:2,blocks:['when_clicked','move_right','say_line'],rebuild:['when_start','move_right','say_line']},
  {lessonId:'lesson-04-meadow-scene',stepIndex:2,blocks:['when_start','move_right','switch_scene'],rebuild:['when_start','move_right','move_right','switch_scene']},
  {lessonId:'lesson-06-meadow-story',stepIndex:2,blocks:['when_start','move_right','switch_scene','repeat_twice','say_line'],rebuild:['when_start','move_right','say_line','switch_scene','repeat_twice']},
  {lessonId:'lesson-01-forest-hello',stepIndex:3,blocks:['move_right'],rebuild:null},
  {lessonId:'lesson-07-garden-click',stepIndex:3,blocks:['when_start','move_right'],rebuild:null},
] as const
for(const viewport of VIEWPORTS){
  test.describe(`on ${viewport.name}`,()=>{
    test.use({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.width<500})
    test(`TQ-011: loaded and rebuilt programs show from the top of the workspace on ${viewport.name}`,async({page})=>{
      test.setTimeout(180_000)
      for(const item of LOADED_PROGRAMS){
        await page.goto('/learn/catalog')
        const stepKey=`step-${item.stepIndex+1}`
        if(item.lessonId==='lesson-01-forest-hello'){
          // lesson-01 has one official workspace: the V3 studio. Its draft is
          // owner-scoped localStorage, and 第 4 关 keeps its own program.
          await seedForestV3Draft(page,item.stepIndex,{[stepKey]:item.blocks.map((type)=>({type}))})
          // The old bookmarked URL must land on that same V3 workspace.
          await page.goto('/learn/lesson/lesson-01-forest-hello')
          await expect(page).toHaveURL(/\/studio\/blockly\/lesson-01-forest-hello$/)
          await expect(page.getByTestId('forest-hello-slot')).toBeVisible()
          await expect(page.getByTestId('forest-hello-step-progress')).toContainText(`第 ${item.stepIndex+1} / 4 关`)
          await expectProgramFromTop(page)
          await showLessonPane(page,'task')
          continue
        }
        // OPS-056: lesson-02…12 load the real owner-scoped V3 draft in the launch studio.
        await seedLaunchV3Draft(page,item.lessonId,item.stepIndex,{[stepKey]:item.blocks.map((type)=>({type}))})
        await page.goto('/learn/lesson/'+item.lessonId)
        await page.waitForURL(`**/studio/blockly/launch/${item.lessonId}`)
        await expectStep(page,item.stepIndex+1)
        await expectProgramFromTop(page)
        if(item.rebuild){
          await clickLessonControl(page,'lesson-clear-program')
          for(const type of item.rebuild)await clickLessonControl(page,'lesson-add-'+type)
          await expectProgramFromTop(page)
        }
        await showLessonPane(page,'task')
      }
    })
  })
}
