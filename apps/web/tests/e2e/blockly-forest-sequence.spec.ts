import {expect,test,type Page} from '@playwright/test'
import {clickLessonControl,expectStageWalk,openForestTools,seedLaunchV3Draft,solveMistakeStep,solvePracticeStep,showLessonPane} from './lesson-pane-helpers'

/**
 * OPS-056: lesson-02 / lesson-03 now run in the V3 launch studio
 * (/studio/blockly/launch/<id>; the old /learn/lesson/<id> entry 308-redirects).
 * DOM mapping (same strength): lesson-task-card 第 N 关 -> launch-v3-step-progress 第 N /,
 * lesson-task-card step copy -> launch-v3-step-header, lesson-feedback-card -> launch-v3-notice,
 * block / run / complete buttons -> clickLessonControl (V3 tools drawer, stage run toggle,
 * launch-v3-complete-step). V3 keeps one program per 关, so a step that used to inherit the
 * previous 关's blocks lays them again first (same program as the old carry-over).
 */
async function add(page:Page,...types:string[]){
  for(const type of types)await clickLessonControl(page,`lesson-add-${type}`)
}
async function runToSuccess(page:Page){
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('ws-run-toggle')).not.toHaveText(/停止/,{timeout:20_000})
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
}
async function expectStep(page:Page,step:number){
  await showLessonPane(page,'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(`第 ${step} /`)
}

test('forest greeting lesson really moves then speaks before completion',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-02-forest-greeting')
  await page.waitForURL('**/studio/blockly/launch/lesson-02-forest-greeting')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await add(page,'when_start','move_right')
  for(let step=0;step<4;step++){
    await expectStep(page,step+1)
    if(step===1){
      // 第 2 关 opens on its own canvas: lay the 第 1 关 program again, then the new block.
      await add(page,'when_start','move_right','say_line')
      // TQ-008/TQ-011: “选一句对白” is part of the main build now; the choice is real and the fox says it.
      await clickLessonControl(page,'lesson-say-line-lets-play')
    }
    // TQ-011: 第 3 关 is the second practice — no move block, the fox greets where it stands.
    if(step===2){
      await solvePracticeStep(page,{goalType:'change-distance',guess:'stay',clear:true,build:['when_start','say_line']})
      await expectStageWalk(page,0)
      await expect(page.getByTestId('practice-answer-reply')).toContainText('猜对啦')
    }
    // TQ-010: 第 4 关 is the designed mistake step — the fox speaks before walking.
    else if(step===3)await solveMistakeStep(page,{expectCode:'say-too-early',answer:'before-walk',fix:['when_start','move_right','say_line']})
    else await runToSuccess(page)
    if(step!==2)await expectStageWalk(page,100)
    if(step===1)await expect(page.getByTestId('stage-character-main')).toContainText('一起来玩吧！')
    await clickLessonControl(page,'lesson-complete-step')
  }
  await page.waitForURL('**/project/lesson-02-forest-greeting/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})
test('forest first story walks all the way to the rabbit, then greets, through real Blockly execution',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-03-forest-story')
  await page.waitForURL('**/studio/blockly/launch/lesson-03-forest-story')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await add(page,'when_start','move_right','move_right')
  // V3: the run toggle is never disabled; completing before a real run explains why instead.
  await clickLessonControl(page,'lesson-complete-step')
  await showLessonPane(page,'task')
  // Same substring the old classroom asserted on lesson-feedback-card.
  await expect(page.getByTestId('launch-v3-notice')).toContainText('请先点击舞台')
  await expectStep(page,1)
  for(let step=0;step<4;step++){
    await expectStep(page,step+1)
    // 第 2 关 opens on its own canvas: lay the 第 1 关 program again, then greet.
    if(step===1)await add(page,'when_start','move_right','move_right','say_line')
    // TQ-011: 第 3 关 is the second practice — greet half way, then compare with 第 2 关.
    if(step===2){
      await solvePracticeStep(page,{goalType:'compare-orders',clear:true,build:['when_start','move_right','say_line','move_right'],wrongAnswer:'stop-place',answer:'say-place'})
    }
    // TQ-010: 第 4 关 is the designed mistake step — the story greets before the fox reaches the rabbit.
    else if(step===3)await solveMistakeStep(page,{expectCode:'say-too-early',answer:'said-first',fix:['when_start','move_right','move_right','say_line']})
    else await runToSuccess(page)
    await expectStageWalk(page,200)
    if(step>=1)await expect(page.getByTestId('lesson-playable-stage')).toContainText('你好！')
    await clickLessonControl(page,'lesson-complete-step')
  }
  await page.waitForURL('**/project/lesson-03-forest-story/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('TQ-008: lesson 2 第 2 关 accepts every preset line (no free text) and the fox says the chosen one',async({page})=>{
  test.setTimeout(150_000)
  const lessonId='lesson-02-forest-greeting'
  await page.goto('/')
  // TQ-011: the line choice is part of the main build (第 2 关); seed the real V3 draft there.
  await seedLaunchV3Draft(page,lessonId,1,{'step-2':[{type:'when_start'},{type:'move_right'},{type:'say_line'}]})
  await page.goto(`/learn/lesson/${lessonId}`)
  await page.waitForURL(`**/studio/blockly/launch/${lessonId}`)
  await expectStep(page,2)
  await expect(page.getByTestId('launch-v3-step-header')).toContainText('选一句对白')
  await openForestTools(page)
  const choices=page.getByTestId('lesson-say-line-choices')
  await expect(choices.getByRole('button')).toHaveCount(4)
  await expect(choices.locator('input,textarea')).toHaveCount(0)
  for(const [id,text] of [['hello','你好！'],['hi-all','大家好呀！'],['nice-to-meet','很高兴见到你！'],['lets-play','一起来玩吧！']]){
    await clickLessonControl(page,`lesson-say-line-${id}`)
    await expect(page.getByTestId(`lesson-say-line-${id}`)).toHaveAttribute('aria-pressed','true')
    await showLessonPane(page,'stage')
    await runToSuccess(page)
    await expect(page.getByTestId('stage-character-main')).toContainText(text)
  }
  await clickLessonControl(page,'lesson-complete-step')
  await expectStep(page,3)
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('practice-task')).toContainText('新练习：站在原地打招呼')
})
