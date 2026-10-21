import {expect,test} from '@playwright/test'
import {expectStageWalk,showLessonPane,solveMistakeStep,solvePracticeStep} from './lesson-pane-helpers'

test('first forest Blockly lesson requires actual execution before each step and awards completion once',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await expect(page.getByTestId('stage-character-main')).toContainText('小狐狸')
  await showLessonPane(page,'code')
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('lesson-complete-step').click()
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('请先点击舞台')
  for(let step=0;step<2;step++){
    if(step===1){await showLessonPane(page,'code');await page.getByTestId('lesson-add-move_right').click();await showLessonPane(page,'stage')}
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:15_000})
    if(step>=1)await expectStageWalk(page,100)
    await page.getByTestId('lesson-complete-step').click()
  }
  // TQ-011: 第 3 关 is the second practice — predict, then walk 200 步 to the rabbit.
  await solvePracticeStep(page,{goalType:'change-distance',guess:'beside-friend',build:['move_right']})
  await expectStageWalk(page,200)
  await page.getByTestId('lesson-complete-step').click()
  // TQ-010: 第 4 关 is the designed mistake step (no “开始时”).
  await solveMistakeStep(page,{expectCode:'missing-start',answer:'stayed',fix:['when_start','move_right']})
  await expectStageWalk(page,100)
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
  await expect(page.getByText('当前累计 3 颗星星')).toBeVisible()
})

test('bad Blockly program cannot be passed off as actual execution',async({page})=>{
  test.setTimeout(100_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  await showLessonPane(page,'stage')
  // The first task intentionally offers only the start block. Run without it.
  await page.getByTestId('run-code-button').click()
  // TQ-008: the stage names the real reason instead of a generic “和要求一样”.
  await expect(page.getByTestId('stage-run-reason')).toContainText('先放一块“开始时”',{timeout:12_000})
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('需要和任务要求的积木一样')
  await page.getByTestId('lesson-complete-step').click()
  await expect(page).toHaveURL(/lesson-01-forest-hello/)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 1 关')
})

test('TQ-008: failed runs escalate hints 1 → 2 → 3 and tier 3 opens the matching start/sequence remedial',async({page})=>{
  test.setTimeout(120_000)
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('stage-run-reason')).toBeVisible({timeout:12_000})
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','1')
  await expect(page.getByTestId('lesson-hint')).toContainText('先让小狐狸准备好出场')
  // Pressing “完成这一关” on the same failed program does not skip a tier.
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','1')
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('先放一块“开始时”')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','2',{timeout:12_000})
  await expect(page.getByTestId('lesson-remedial-link')).toHaveCount(0)
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','3',{timeout:12_000})
  const link=page.getByTestId('lesson-remedial-link')
  await expect(link).toHaveAttribute('data-remedial-id','remedial-start-sequence')
  await showLessonPane(page,'task')
  await link.click()
  await page.waitForURL('**/learn/remedial/remedial-start-sequence?from=lesson-01-forest-hello**')
  await expect(page.getByRole('heading',{name:'先学会“开始”和顺序'})).toBeVisible()
  await page.getByTestId('remedial-card-say_line').click()
  await expect(page.getByTestId('remedial-nudge')).toContainText('先找找第 1 块')
  await page.getByTestId('remedial-card-when_start').click()
  await page.getByTestId('remedial-card-move_right').click()
  await page.getByTestId('remedial-card-say_line').click()
  await expect(page.getByTestId('remedial-success')).toContainText('开始 → 移动 → 说话')
  // TQ-010: the reset button uses the decorative SVG icon, not the “↺” glyph; its name is the plain text.
  const again=page.getByRole('button',{name:'再排一次',exact:true})
  await expect(again).toBeVisible()
  await expect(again.locator('svg[data-testid="reset-icon"]')).toHaveAttribute('aria-hidden','true')
  await expect(again).not.toContainText('↺')
  await page.getByRole('link',{name:'回到刚才的课程'}).click()
  await page.waitForURL('**/learn/lesson/lesson-01-forest-hello')
})

test('TQ-010: lesson 1 第 4 关 — the pre-built program without “开始时” is run, observed, explained and fixed',async({page})=>{
  test.setTimeout(150_000)
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('tq010-seeded'))return
    sessionStorage.setItem('tq010-seeded','1')
    // Resume at 第 3 关 (the practice); 第 4 关 has no draft, so it opens on its designed wrong program.
    const lessonId='lesson-01-forest-hello'
    sessionStorage.setItem(`kc-lesson-draft:${lessonId}:2`,JSON.stringify({schemaVersion:1,lessonId,stepIndex:2,blocks:[{type:'when_start'},{type:'move_right'},{type:'move_right'}],updatedAt:new Date().toISOString()}))
  })
  await page.goto('/learn/lesson/lesson-01-forest-hello')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
  await solvePracticeStep(page,{goalType:'change-distance',guess:'half-way',build:[]})
  await page.getByTestId('lesson-complete-step').click()
  await showLessonPane(page,'stage')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
  await expect(page.getByTestId('lesson-task-card')).toContainText('少了开始？找错再修好')
  const task=page.getByTestId('mistake-task')
  await expect(task).toContainText('纠错实验：少了“开始时”')
  await expect(task).toContainText('只有“向右走 100 步”')
  // The workspace really holds the wrong program: a move block and no start hat.
  const canvas=page.getByTestId('lesson-blockly-workspace').locator('.blocklyBlockCanvas').first()
  await expect(canvas).toContainText('向右走 100 步')
  await expect(canvas).not.toContainText('开始时')
  // Cannot skip the experiment.
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('先按舞台上的运行按钮')
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
  // Run it: the fox does not move, and the stage says why.
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('mistake-run-result')).toHaveAttribute('data-failure-code','missing-start',{timeout:12_000})
  await expect(page.getByTestId('stage-run-error')).toHaveCount(0)
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小狐狸已走 0 步')
  await expect(page.getByTestId('lesson-hint')).toHaveCount(0)
  await expect(page.getByTestId('mistake-question')).toContainText('按了运行，小狐狸怎么了？')
  // A wrong answer nudges and does not unlock the fix.
  await page.getByTestId('mistake-answer-walked').click()
  await expect(page.getByTestId('mistake-answer-reply')).toContainText('再看看舞台')
  await expect(page.getByTestId('mistake-fix')).toHaveCount(0)
  await page.getByTestId('mistake-answer-stayed').click()
  await expect(page.getByTestId('mistake-fix')).toContainText('把“开始时”放到“向右走 100 步”上面')
  // The child answered right: nothing under the panel may read as “you were wrong”.
  await expect(page.getByTestId('mistake-run-result')).toContainText('你看懂啦')
  await expect(page.getByTestId('lesson-playable-stage')).not.toContainText('哎呀')
  // Fix by tapping “开始时”: it snaps on top of the headless move block.
  await showLessonPane(page,'code')
  await page.getByTestId('lesson-add-when_start').click()
  await showLessonPane(page,'stage')
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:15_000})
  await expect(page.getByTestId('mistake-fixed')).toContainText('修好啦')
  await expectStageWalk(page,100)
  await page.getByTestId('lesson-complete-step').click()
  await page.waitForURL('**/project/lesson-01-forest-hello/complete')
})
