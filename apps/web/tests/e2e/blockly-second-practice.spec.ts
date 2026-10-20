import {expect,test,type Page} from '@playwright/test'
import {expectStageWalk} from './lesson-pane-helpers'

/**
 * TQ-011 (= TQ-002e): each Blockly lesson 01–09 has one second practice whose goal differs
 * from the main build. These specs open the practice (第 3 关) directly and check that it is a
 * real, judged task: a prediction before the run, the honest result on stage, the specific
 * failure reason and a hint for THIS goal, and a comparison question that must be answered.
 */
async function resumeAtPractice(page:Page,lessonId:string,blocks:Array<{type:string}>){
  await page.addInitScript(({lessonId,blocks})=>{
    if(sessionStorage.getItem('tq011-seeded'))return
    sessionStorage.setItem('tq011-seeded','1')
    // A draft for 第 3 关 (index 2) holding the main build's program, as if carried over from 第 2 关.
    sessionStorage.setItem(`kc-lesson-draft:${lessonId}:2`,JSON.stringify({schemaVersion:1,lessonId,stepIndex:2,blocks,updatedAt:new Date().toISOString()}))
  },{lessonId,blocks})
  await page.goto('/learn/lesson/'+lessonId)
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
  await expect(page.getByTestId('lesson-progress-strip')).toContainText('关卡 3 / 4')
}

test('TQ-011: lesson 4 第 3 关 — predict where the scene changes, a wrong order gets this goal\'s reason and hint, then the real switch at 200 步',async({page})=>{
  test.setTimeout(150_000)
  await resumeAtPractice(page,'lesson-04-meadow-scene',[{type:'when_start'},{type:'move_right'},{type:'switch_scene'}])
  const task=page.getByTestId('practice-task')
  await expect(task).toHaveAttribute('data-goal-type','change-distance')
  await expect(task).toContainText('新练习：在森林多走一会儿')
  await expect(page.getByTestId('practice-setup')).toContainText('“开始时 → 向右走 100 步 → 向右走 100 步 → 切换场景”')
  await expect(page.getByTestId('practice-question')).toContainText('先猜一猜：小狐狸在森林里走多少步，才换到草地？')
  // The practice offers the program tools (another order needs a rebuild).
  await expect(page.getByTestId('lesson-clear-program')).toBeVisible()
  // No guess, no run.
  await expect(page.getByTestId('run-code-button')).toBeDisabled()
  await expect(page.getByTestId('practice-need-guess')).toBeVisible()
  await page.getByTestId('practice-answer-one-hundred').click()
  await expect(page.getByTestId('practice-answer-reply')).toContainText('猜好啦')
  // Adding a move at the end puts it AFTER the switch: a real failed run with the specific reason.
  await page.getByTestId('lesson-add-move_right').click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('stage-run-reason')).toContainText('换场景换早啦！先在森林走 200 步，再去草地。',{timeout:20_000})
  // The hint describes this practice's goal, not the main build's “开始时 → 向右走 100 步 → 切换场景”.
  await expect(page.getByTestId('lesson-hint')).toHaveAttribute('data-hint-tier','1')
  await expect(page.getByTestId('lesson-hint')).toContainText('两块“向右走 100 步”都放在“切换场景”上面')
  await expect(page.getByTestId('practice-done')).toHaveCount(0)
  // Rebuild in the right order.
  await page.getByTestId('lesson-clear-program').click()
  for(const type of ['when_start','move_right','move_right','switch_scene'])await page.getByTestId('lesson-add-'+type).click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await expectStageWalk(page,200)
  // The wrong guess gets the honest result; the step still completes (it was a prediction).
  await expect(page.getByTestId('practice-answer-reply')).toContainText('在森林里走了 200 步，才换到草地')
  await expect(page.getByTestId('practice-done')).toContainText('“切换场景”放在哪里')
  await expect(page.getByTestId('practice-answer-two-hundred')).toBeDisabled()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
  await expect(page.getByTestId('mistake-task')).toBeVisible()
})

test('TQ-011: lesson 8 第 3 关 — compare “开始时” with “被点击时”: the butterfly no longer waits and says “你好！”',async({page})=>{
  test.setTimeout(150_000)
  await resumeAtPractice(page,'lesson-08-garden-dialogue',[{type:'when_clicked'},{type:'move_right'},{type:'say_line'}])
  const task=page.getByTestId('practice-task')
  await expect(task).toHaveAttribute('data-goal-type','compare-events')
  await expect(task).toContainText('新练习：换成“开始时”比一比')
  await expect(page.getByTestId('lesson-task-card')).toContainText('把开头换成“开始时”')
  // Lesson 8 does not repeat lesson 7's click prediction; the comparison question waits for a run.
  await expect(page.getByTestId('garden-prediction')).toHaveCount(0)
  await expect(page.getByTestId('practice-question')).toHaveCount(0)
  await expect(page.getByTestId('run-code-button')).toContainText('▶ 运行')
  // Keeping “被点击时”: the program still waits for a click, then fails with the specific reason.
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('garden-await-click')).toBeVisible()
  await page.getByTestId('stage-character-main').click()
  await expect(page.getByTestId('stage-run-reason')).toContainText('这次一按“运行”就要开始，换成“开始时”开头吧！',{timeout:20_000})
  await expect(page.getByTestId('lesson-hint')).toContainText('这一关用“开始时”开头')
  // Swap the start event.
  await page.getByTestId('lesson-clear-program').click()
  for(const type of ['when_start','move_right','say_line'])await page.getByTestId('lesson-add-'+type).click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('garden-await-click')).toHaveCount(0)
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:20_000})
  await expect(page.getByTestId('stage-walked-distance')).toContainText('小蝴蝶已飞 100 步')
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
  await expect(page.getByTestId('practice-question')).toContainText('比一比：和上一关比，蝴蝶有什么不一样？')
  await expect(page.getByTestId('practice-need-answer')).toBeVisible()
  // The comparison is the point: the step does not pass before it is answered right.
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-feedback-card')).toContainText('先回答舞台上的问题：和上一关比，蝴蝶有什么不一样？')
  await page.getByTestId('practice-answer-still-waits').click()
  await expect(page.getByTestId('practice-answer-reply')).toContainText('你没点蝴蝶，它一运行就飞了 100 步')
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 3 关')
  await page.getByTestId('practice-answer-no-wait').click()
  await expect(page.getByTestId('practice-answer-reply')).toContainText('“被点击时”要等你点，才说“蝴蝶收到你的点击啦！”')
  await expect(page.getByTestId('practice-done')).toContainText('开头的积木决定蝴蝶什么时候开始表演')
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('点击“完成这一关”继续')
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
  await expect(page.getByTestId('mistake-task')).toBeVisible()
})

test('TQ-011: lesson 6 第 3 关 — speaking in the forest changes what the fox says; the journey stays the same',async({page})=>{
  test.setTimeout(150_000)
  await resumeAtPractice(page,'lesson-06-meadow-story',[{type:'when_start'},{type:'move_right'},{type:'switch_scene'},{type:'repeat_twice'},{type:'say_line'}])
  await expect(page.getByTestId('practice-task')).toHaveAttribute('data-goal-type','compare-orders')
  // Running the previous 关's program again is not this practice.
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('stage-run-reason')).toBeVisible({timeout:20_000})
  await expect(page.getByTestId('practice-question')).toHaveCount(0)
  await page.getByTestId('lesson-clear-program').click()
  for(const type of ['when_start','move_right','say_line','switch_scene','repeat_twice'])await page.getByTestId('lesson-add-'+type).click()
  await page.getByTestId('run-code-button').click()
  await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:25_000})
  await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
  await expectStageWalk(page,200)
  await expect(page.getByTestId('stage-character-main')).toContainText('你好！')
  await page.getByTestId('practice-answer-different-line').click()
  await expect(page.getByTestId('practice-done')).toBeVisible()
  await page.getByTestId('lesson-complete-step').click()
  await expect(page.getByTestId('lesson-task-card')).toContainText('第 4 关')
})
