import {expect,test,type Page} from '@playwright/test'
import {clickLessonControl,expectStageWalk,openForestTools,seedLaunchV3Draft,showLessonPane,solveMistakeStep,solvePracticeStep} from './lesson-pane-helpers'

/**
 * OPS-056: lesson-07 / lesson-08 / lesson-09 now run in the V3 launch studio
 * (/studio/blockly/launch/<id>; the old /learn/lesson/<id> entry 308-redirects).
 * DOM mapping (same strength): lesson-task-card 第 N 关 -> launch-v3-step-progress 第 N /,
 * lesson-task-card step copy -> launch-v3-step-header, lesson-feedback-card -> launch-v3-notice,
 * block / run / complete buttons -> clickLessonControl (V3 tools drawer, stage run toggle,
 * launch-v3-complete-step), run-code-button text -> ws-run-toggle, the old category toolbox row
 * (.blocklyToolboxCategory) -> the docked V3 category buttons (v3-categories).
 * V3 keeps one program per 关, so a step that used to inherit the previous 关's blocks lays them
 * again first (same program as the old carry-over).
 * Behaviour differences recorded for the PR (not weakened silently):
 * - the run toggle is never disabled, so "no guess -> run-code-button disabled" has no V3 equivalent;
 * - hints are manual (ws-hint-reveal-N) and a failed run is counted only in the real draft's
 *   script.failures, so "lesson-hint data-hint-tier=1 after a real failure" is asserted on that
 *   counter (0 after the designed run, 1 after the real failed run) plus the same failure box/reason.
 */
const DRAFT_PREFIX='kids-lesson-owner-v1:guest:kidscoding-draft:'

async function expectStep(page:Page,step:number){
  await showLessonPane(page,'task')
  await expect(page.getByTestId('launch-v3-step-progress')).toContainText(`第 ${step} /`)
}
async function openLaunch(page:Page,lessonId:string){
  await page.goto(`/learn/lesson/${lessonId}`)
  await page.waitForURL(`**/studio/blockly/launch/${lessonId}`)
}
async function add(page:Page,...types:string[]){
  for(const type of types)await clickLessonControl(page,`lesson-add-${type}`)
}
/** The real autosaved V3 draft's failure counter (autosave is debounced, so poll it). */
function draftFailures(page:Page,lessonId:string){
  return page.evaluate((key)=>{
    const raw=window.localStorage.getItem(key)
    if(!raw)return null
    try{return (JSON.parse(raw) as {script?:{failures?:number}}).script?.failures ?? null}catch{return null}
  },`${DRAFT_PREFIX}${lessonId}`)
}

async function performClickStep(page:Page,expectedMovement:number,expectSpeech:boolean,predict=false){
  await showLessonPane(page,'stage')
  if(predict){
    // Code.org-inspired prediction: select a hypothesis before testing it (lesson 07 only since TQ-011).
    // OPS-056 behaviour difference: the V3 shell owns the run toggle and never disables it, so the old
    // "run-code-button is disabled until you guess" gate has no V3 equivalent. The guess is still
    // offered and answered here, and its reflection is still asserted after the click run below.
    await expect(page.getByTestId('garden-prediction')).toBeVisible()
    await clickLessonControl(page,'garden-predict-click')
  }else{
    // TQ-011: lessons 08–09 (and lesson 07's first 关) no longer repeat the same prediction question.
    await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  }
  await expect(page.getByTestId('ws-run-toggle')).toContainText('运行')
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await expectStageWalk(page,0)
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('运行成功')
  // No click means no execution and no credit, even though the blocks are correct.
  await clickLessonControl(page,'lesson-complete-step')
  await expect(page.getByTestId('launch-v3-notice')).toContainText('点击蝴蝶')
  await clickLessonControl(page,'stage-character-main')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  if(expectedMovement>0) await expectStageWalk(page,expectedMovement)
  if(expectSpeech) await expect(page.getByTestId('stage-character-main')).toContainText('蝴蝶收到你的点击啦！')
  if(predict) await expect(page.getByTestId('garden-reflection')).toContainText('点击事件发生后')
  await clickLessonControl(page,'lesson-complete-step')
}

test('lesson 7 teaches real click event: start alone never moves the butterfly',async({page})=>{
  test.setTimeout(180_000)
  await openLaunch(page,'lesson-07-garden-click')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await expect(page.getByTestId('stage-character-main')).toContainText('小蝴蝶')
  await expect(page.getByTestId('stage-current-scene')).toContainText('花园')
  await expectStep(page,1)
  await add(page,'when_clicked')
  await performClickStep(page,0,false)
  await expectStep(page,2)
  // 第 2 关 opens on its own canvas: lay the 第 1 关 program again, then the new block.
  await add(page,'when_clicked','move_right')
  await performClickStep(page,100,false,true)
  // TQ-011: 第 3 关 is the second practice — predict, then fly 200 步 to the frog.
  await expectStep(page,3)
  await solvePracticeStep(page,{goalType:'change-distance',guess:'beside-frog',build:['when_clicked','move_right','move_right'],click:true})
  await expectStageWalk(page,200)
  await clickLessonControl(page,'lesson-complete-step')
  // TQ-010: 第 4 关 is the designed mistake step — “开始时” flies without a click.
  await expectStep(page,4)
  await solveMistakeStep(page,{expectCode:'needs-click-trigger',answer:'flew-alone',fix:['when_clicked','move_right'],garden:true})
  await expectStageWalk(page,100)
  await clickLessonControl(page,'lesson-complete-step')
  await page.waitForURL('**/project/lesson-07-garden-click/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('lesson 8 uses clicked event to move and then speak, then compares “开始时” with “被点击时”',async({page})=>{
  test.setTimeout(180_000)
  await openLaunch(page,'lesson-08-garden-dialogue')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('stage-character-main')).toContainText('小蝴蝶')
  await add(page,'when_clicked','move_right')
  await performClickStep(page,100,false)
  await expectStep(page,2)
  await add(page,'when_clicked','move_right','say_line')
  await performClickStep(page,100,true)
  // TQ-011: 第 3 关 is the second practice — with “开始时” the butterfly does not wait and says “你好！”.
  await expectStep(page,3)
  await solvePracticeStep(page,{goalType:'compare-events',clear:true,build:['when_start','move_right','say_line'],wrongAnswer:'still-waits',answer:'no-wait'})
  await expect(page.getByTestId('garden-await-click')).toHaveCount(0)
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('ws-run-toggle')).toContainText('运行')
  await expectStageWalk(page,100)
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
  await clickLessonControl(page,'lesson-complete-step')
  // TQ-010: 第 4 关 is the designed mistake step — the butterfly speaks before it flies.
  await expectStep(page,4)
  await solveMistakeStep(page,{expectCode:'say-too-early',answer:'said-first',fix:['when_clicked','move_right','say_line'],garden:true,predict:false,wrongWaitsForClick:true})
  await expect(page.getByTestId('stage-character-main')).toContainText('蝴蝶收到你的点击啦！')
  await clickLessonControl(page,'lesson-complete-step')
  await page.waitForURL('**/project/lesson-08-garden-dialogue/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('lesson 9 has a distinct garden ending with clicked movement, speech and repeat',async({page})=>{
  test.setTimeout(180_000)
  await openLaunch(page,'lesson-09-garden-story')
  await add(page,'when_clicked','move_right')
  await performClickStep(page,100,false)
  await expectStep(page,2)
  await add(page,'when_clicked','move_right','say_line','repeat_twice')
  await performClickStep(page,200,true)
  // TQ-011: 第 3 关 is the second practice — reply after both flights, then compare.
  await expectStep(page,3)
  await solvePracticeStep(page,{goalType:'compare-orders',clear:true,build:['when_clicked','move_right','repeat_twice','say_line'],click:true,wrongAnswer:'fly-less',answer:'reply-later'})
  await expectStageWalk(page,200)
  await clickLessonControl(page,'lesson-complete-step')
  // TQ-010: 第 4 关 is the designed mistake step — the reply comes before flying twice.
  await expectStep(page,4)
  await solveMistakeStep(page,{expectCode:'say-too-early',answer:'before-fly',fix:['when_clicked','move_right','say_line','repeat_twice'],garden:true,predict:false,wrongWaitsForClick:true})
  await expectStageWalk(page,200)
  await clickLessonControl(page,'lesson-complete-step')
  await page.waitForURL('**/project/lesson-09-garden-story/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})

test('an incorrect first event cannot be used to bypass the click lesson',async({page})=>{
  test.setTimeout(90_000)
  await openLaunch(page,'lesson-07-garden-click')
  await showLessonPane(page,'stage')
  // TQ-011: 第 1 关 does not ask the click prediction (it is asked in 第 2 关 and the mistake step).
  await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toContainText('先放一块“被点击时”',{timeout:10_000})
  await expect(page.getByTestId('stage-character-main')).toBeDisabled()
  await clickLessonControl(page,'lesson-complete-step')
  await expect(page).toHaveURL(/\/studio\/blockly\/launch\/lesson-07-garden-click/)
  await expectStep(page,1)
})

test('TQ-008: lesson 9 第 4 关 accepts following the instruction literally (fly twice, then reply)',async({page})=>{
  test.setTimeout(120_000)
  // TQ-010/TQ-011: 第 4 关 is the designed mistake step; start from its wrong program (real V3 draft).
  await page.goto('/')
  await seedLaunchV3Draft(page,'lesson-09-garden-story',3,{'step-4':[{type:'when_clicked'},{type:'say_line'},{type:'move_right'},{type:'repeat_twice'}]})
  await openLaunch(page,'lesson-09-garden-story')
  await expectStep(page,4)
  await expect(page.getByTestId('launch-v3-step-header')).toContainText('一共飞两次')
  await solveMistakeStep(page,{expectCode:'say-too-early',answer:'before-fly',fix:['when_clicked','move_right','repeat_twice','say_line'],garden:true,predict:false,wrongWaitsForClick:true})
  await expectStageWalk(page,200)
  await expect(page.getByTestId('stage-character-main')).toContainText('蝴蝶收到你的点击啦！')
  await clickLessonControl(page,'lesson-complete-step')
  await page.waitForURL('**/project/lesson-09-garden-story/complete')
})

test('TQ-008/TQ-010: lesson 9 第 4 关 rejects replying before flying with a specific reason — the designed mistake, not a hint-raising failure',async({page})=>{
  test.setTimeout(120_000)
  const lessonId='lesson-09-garden-story'
  await page.goto('/')
  await seedLaunchV3Draft(page,lessonId,3,{'step-4':[{type:'when_clicked'},{type:'say_line'},{type:'move_right'},{type:'repeat_twice'}]})
  await openLaunch(page,lessonId)
  await expectStep(page,4)
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await clickLessonControl(page,'stage-character-main')
  // The designed run is the experiment: no failure-style “哎呀” box, the panel asks what happened.
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code','say-too-early',{timeout:20_000})
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('mistake-observed')).toBeVisible()
  // Old: lesson-hint count 0. V3: no hint is unlocked and the real draft counts no failure.
  await expect(page.getByTestId('ws-hint-reveal-2')).toBeDisabled()
  await expect.poll(()=>draftFailures(page,lessonId),{timeout:10_000}).toBe(0)
  await clickLessonControl(page,'lesson-complete-step')
  await expect(page).toHaveURL(/\/studio\/blockly\/launch\/lesson-09-garden-story/)
  await expectStep(page,4)
  // Running the same wrong program again after observing it is a real failed attempt.
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await clickLessonControl(page,'stage-character-main')
  // Old: lesson-hint data-hint-tier=1. V3 (manual hints): the real draft records exactly one failure.
  await expect.poll(()=>draftFailures(page,lessonId),{timeout:20_000}).toBe(1)
  await expect(page.getByTestId('stage-run-reason')).toContainText('说话说早啦')
  await expect(page.getByTestId('stage-run-error')).toContainText('哎呀')
})

test('TQ-009: the butterfly flies — lesson 9 blocks, palette, stage and feedback say “飞”, never “走”',async({page})=>{
  test.setTimeout(120_000)
  const lessonId='lesson-09-garden-story'
  await page.goto('/')
  await seedLaunchV3Draft(page,lessonId,3,{'step-4':[{type:'when_clicked'},{type:'move_right'},{type:'say_line'}]})
  await openLaunch(page,lessonId)
  await expectStep(page,4)
  await openForestTools(page)
  await expect(page.getByTestId('lesson-add-move_right')).toHaveText('添加积木：向右飞 100 步')
  await expect(page.getByTestId('lesson-add-repeat_twice')).toHaveText('添加积木：重复：再飞 100 步')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 0 步')
  // The restored program and the flyout are real Blockly blocks with the same “飞” labels.
  await showLessonPane(page,'code')
  const workspace=page.getByTestId('lesson-blockly-workspace')
  await expect(workspace.locator('svg.blocklySvg .blocklyBlockCanvas')).toContainText('向右飞 100 步')
  // V3 docked toolbox: the category buttons sit beside the flyout; the flyout shows a category
  // after its button is pressed (old classroom: the .blocklyToolboxCategory row).
  await workspace.getByTestId('v3-categories').getByRole('button',{name:'控制'}).click()
  await expect(workspace.locator('.blocklyFlyout').first()).toContainText('重复：再飞 100 步')
  await expect(workspace).not.toContainText('向右走')
  await expect(workspace).not.toContainText('再走')
  // Missing the repeat: the reason says how far it flew, in “飞”.
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await clickLessonControl(page,'stage-character-main')
  await expect(page.getByTestId('stage-run-reason')).toContainText('只飞了 100 步，要飞 200 步',{timeout:20_000})
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 100 步')
  // A dragged-in copy keeps the label too: adding the repeat by button shows “再飞”.
  await clickLessonControl(page,'lesson-add-repeat_twice')
  await showLessonPane(page,'code')
  await expect(workspace.locator('svg.blocklySvg .blocklyBlockCanvas')).toContainText('重复：再飞 100 步')
})

test('TQ-010: lesson 7 第 4 关 — “开始时” makes the butterfly fly without a click; fixed with “被点击时” it waits for the click',async({page})=>{
  test.setTimeout(150_000)
  const lessonId='lesson-07-garden-click'
  // Resume at 第 3 关 (the TQ-011 practice) with its program already built (real V3 draft).
  await page.goto('/')
  await seedLaunchV3Draft(page,lessonId,2,{'step-3':[{type:'when_clicked'},{type:'move_right'},{type:'move_right'}]})
  await openLaunch(page,lessonId)
  await expectStep(page,3)
  await solvePracticeStep(page,{goalType:'change-distance',guess:'half-way',build:[],click:true})
  await expect(page.getByTestId('practice-answer-reply')).toContainText('小蝴蝶已飞 200 步')
  await clickLessonControl(page,'lesson-complete-step')
  await expectStep(page,4)
  await expect(page.getByTestId('launch-v3-step-header')).toContainText('没点就飞？找错再修好')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('mistake-setup')).toContainText('“开始时 → 向右飞 100 步”')
  await showLessonPane(page,'code')
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('开始时')
  await expect(canvas).toContainText('向右飞 100 步')
  await clickLessonControl(page,'garden-predict-click')
  await clickLessonControl(page,'run-code-button')
  // No click: it never waits — the butterfly flies by itself.
  await expect(page.getByTestId('garden-await-click')).toHaveCount(0)
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code','needs-click-trigger',{timeout:20_000})
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 100 步')
  // Old: lesson-hint count 0. V3: no hint is unlocked and the real draft counts no failure.
  await expect(page.getByTestId('ws-hint-reveal-2')).toBeDisabled()
  await expect.poll(()=>draftFailures(page,lessonId),{timeout:10_000}).toBe(0)
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('mistake-question')).toContainText('你还没点蝴蝶，它怎么了？')
  await clickLessonControl(page,'mistake-answer-waited')
  await expect(page.getByTestId('mistake-answer-reply')).toContainText('蝴蝶已经飞了 100 步')
  await clickLessonControl(page,'mistake-answer-flew-alone')
  await expect(page.getByTestId('mistake-fix')).toContainText('把“开始时”换成“被点击时”')
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('哎呀')
  await clickLessonControl(page,'lesson-clear-program')
  await add(page,'when_clicked','move_right')
  await clickLessonControl(page,'run-code-button')
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await expectStageWalk(page,0)
  await clickLessonControl(page,'stage-character-main')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('mistake-fixed')).toContainText('等你点到它')
  await expectStageWalk(page,100)
  await clickLessonControl(page,'lesson-complete-step')
  await page.waitForURL('**/project/lesson-07-garden-click/complete')
})
