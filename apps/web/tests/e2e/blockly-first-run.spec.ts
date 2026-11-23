import {expect,test} from '@playwright/test'
import {expectStageWalk,solveMistakeStep,solvePracticeStep,clickLessonControl,showLessonPane,openForestV3,completeForestStep,seedForestV3Draft} from './lesson-pane-helpers'

// lesson-01 no longer renders the old three-column classroom: its only
// official workspace is the V3 studio, and the old URL redirects there.
// These specs therefore drive the real V3 controls (they are the same child
// actions, mapped onto the new shell) instead of asserting the retired UI.

test('first forest Blockly lesson requires actual execution before each step and awards completion once',async({page})=>{
  test.setTimeout(180_000)
  await openForestV3(page)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await expect(page.getByTestId('stage-character-main')).toContainText('小狐狸')
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('forest-hello-notice')).toContainText('请先点击舞台')
  // 第 1 关: the start hat really runs (0 steps) before the step may pass.
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:15_000})
  await completeForestStep(page)
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 2 / 4 关')
  // 第 2 关: V3 keeps each 关's own program, so the start hat is built again
  // and the 100-step walk is this step's real execution.
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'lesson-add-move_right')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:15_000})
  await expectStageWalk(page,100)
  await completeForestStep(page)
  // TQ-011: 第 3 关 is the second practice — predict, then walk 200 步 to the rabbit.
  await solvePracticeStep(page,{goalType:'change-distance',guess:'beside-friend',build:['when_start','move_right','move_right']})
  await expectStageWalk(page,200)
  await completeForestStep(page)
  // TQ-010: 第 4 关 is the designed mistake step (no “开始时”).
  await solveMistakeStep(page,{expectCode:'missing-start',answer:'stayed',fix:['when_start','move_right']})
  await expectStageWalk(page,100)
  await completeForestStep(page)
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
})

test('bad Blockly program cannot be passed off as actual execution',async({page})=>{
  test.setTimeout(100_000)
  await openForestV3(page)
  // The first task starts empty, intentionally offering only the start block.
  // Run without it.
  await clickLessonControl(page, 'run-code-button')
  // TQ-008: the stage names the real reason instead of a generic “和要求一样”.
  await expect(page.getByTestId('stage-run-reason')).toContainText('先放一块“开始时”',{timeout:12_000})
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('需要和任务要求的积木一样')
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page).toHaveURL(/\/studio\/blockly\/lesson-01-forest-hello$/)
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 1 / 4 关')
  await expect(page.getByTestId('forest-hello-notice')).toContainText('先放一块“开始时”')
})

test('TQ-008 (V3): hints stay manual — tier 2/3 unlock only on tap, and the remedial page returns to the V3 lesson',async({page})=>{
  test.setTimeout(120_000)
  await openForestV3(page)
  await showLessonPane(page, 'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  // V3 has no auto-escalating hint banner at all.
  await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('stage-run-reason')).toBeVisible({timeout:12_000})
  // A failed run leaves the tiers where they were: tier 1 offered, 2/3 locked.
  await showLessonPane(page, 'task')
  await expect(page.getByTestId('ws-hint-reveal-1')).toBeEnabled()
  await expect(page.getByTestId('ws-hint-reveal-2')).toBeDisabled()
  await expect(page.getByTestId('ws-hint-reveal-3')).toBeDisabled()
  // Pressing “完成这一关” does not reveal or skip a tier, and does not pass.
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('forest-hello-notice')).toContainText('先放一块“开始时”')
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 1 / 4 关')
  await expect(page.getByTestId('ws-hint-reveal-2')).toBeDisabled()
  // The child opens tier 1, then tier 2 becomes available; tier 3 is still locked.
  await clickLessonControl(page, 'ws-hint-reveal-1')
  await expect(page.getByTestId('ws-task-content')).toContainText('先让小狐狸准备好出场')
  await expect(page.getByTestId('ws-hint-reveal-2')).toBeEnabled()
  await expect(page.getByTestId('ws-hint-reveal-3')).toBeDisabled()
  await clickLessonControl(page, 'ws-hint-reveal-2')
  await expect(page.getByTestId('ws-task-content')).toContainText('把“开始时”放在最前面')
  await expect(page.getByTestId('ws-hint-reveal-3')).toBeEnabled()
  await clickLessonControl(page, 'ws-hint-reveal-3')
  await expect(page.getByTestId('ws-task-content')).toContainText('先看一个很短的示意，再回来试一次')
  // V3 has no inline remedial link; the remedial page is still reachable and returns here.
  await expect(page.getByTestId('lesson-remedial-link')).toHaveCount(0)
  await page.goto('/learn/remedial/remedial-start-sequence?from=lesson-01-forest-hello')
  await expect(page.getByRole('heading',{name:'先学会“开始”和顺序'})).toBeVisible()
  await clickLessonControl(page, 'remedial-card-say_line')
  await expect(page.getByTestId('remedial-nudge')).toContainText('先找找第 1 块')
  await clickLessonControl(page, 'remedial-card-when_start')
  await clickLessonControl(page, 'remedial-card-move_right')
  await clickLessonControl(page, 'remedial-card-say_line')
  await expect(page.getByTestId('remedial-success')).toContainText('开始 → 移动 → 说话')
  // TQ-010: the reset button uses the decorative SVG icon, not the “↺” glyph; its name is the plain text.
  const again=page.getByRole('button',{name:'再排一次',exact:true})
  await expect(again).toBeVisible()
  await expect(again.locator('svg[data-testid="reset-icon"]')).toHaveAttribute('aria-hidden','true')
  await expect(again).not.toContainText('↺')
  await page.getByRole('link',{name:'回到刚才的课程'}).click()
  await page.waitForURL('**/studio/blockly/lesson-01-forest-hello')
  await expect(page.getByTestId('forest-hello-slot')).toBeVisible()
})

test('TQ-010: lesson 1 第 4 关 — the pre-built program without “开始时” is run, observed, explained and fixed',async({page})=>{
  test.setTimeout(150_000)
  // Resume at 第 3 关 (the practice) with its real program. Each 关 keeps its
  // own program in V3; 第 4 关 opens on its designed wrong program.
  await page.goto('/learn/catalog')
  await seedForestV3Draft(page,2,{
    'step-3':[{type:'when_start'},{type:'move_right'},{type:'move_right'}],
    'step-4':[{type:'move_right'}],
  })
  await openForestV3(page)
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 3 / 4 关')
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('新练习：走到小兔子身边')
  await solvePracticeStep(page,{goalType:'change-distance',guess:'half-way',build:[]})
  await completeForestStep(page)
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 4 / 4 关')
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('少了开始？找错再修好')
  const task=page.getByTestId('mistake-task')
  await expect(task).toContainText('纠错实验：少了“开始时”')
  await expect(task).toContainText('只有“向右走 100 步”')
  // The workspace really holds the wrong program: a move block and no start hat.
  await showLessonPane(page, 'code')
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('svg.blocklySvg .blocklyBlockCanvas')
  await expect(canvas).toContainText('向右走 100 步')
  await expect(canvas).not.toContainText('开始时')
  // Cannot skip the experiment.
  await clickLessonControl(page, 'lesson-complete-step')
  await expect(page.getByTestId('forest-hello-notice')).toContainText('先按舞台上的运行按钮')
  await expect(page.getByTestId('forest-hello-step-progress')).toContainText('第 4 / 4 关')
  // Run it: the fox does not move, and the stage says why.
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code','missing-start',{timeout:12_000})
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小狐狸已走 0 步')
  await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  await expect(page.getByTestId('mistake-question')).toContainText('按了运行，小狐狸怎么了？')
  // A wrong answer nudges and does not unlock the fix.
  await clickLessonControl(page, 'mistake-answer-walked')
  await expect(page.getByTestId('mistake-answer-reply')).toContainText('再看看舞台')
  await expect(page.getByTestId('mistake-fix')).toHaveCount(0)
  await clickLessonControl(page, 'mistake-answer-stayed')
  await expect(page.getByTestId('mistake-fix')).toContainText('把“开始时”放到“向右走 100 步”上面')
  // The child answered right: nothing under the panel may read as “you were wrong”.
  await expect(page.getByTestId('mistake-run-result')).toContainText('你看懂啦')
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('哎呀')
  // Fix by tapping “开始时”: it snaps on top of the headless move block.
  await clickLessonControl(page, 'lesson-add-when_start')
  await clickLessonControl(page, 'run-code-button')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:15_000})
  await expect(page.getByTestId('mistake-fixed')).toContainText('修好啦')
  await expectStageWalk(page,100)
  await completeForestStep(page)
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
})
