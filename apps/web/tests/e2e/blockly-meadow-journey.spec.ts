import {expect,test,type Page} from '@playwright/test'

async function play(page:Page,id:string,adds:Record<number,string[]>,sceneStep:number,repeatStep:number){
  await page.goto('/learn/lesson/'+id)
  await expect(page.getByTestId('lesson-playable-stage')).toBeVisible()
  for(let step=0;step<5;step++){
    for(const type of adds[step]??[])await page.getByTestId('lesson-add-'+type).click()
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:25_000})
    await expect(page.getByTestId('stage-current-scene')).toContainText(step>=sceneStep?'草地':'森林')
    if(step>=repeatStep)await expect(page.getByTestId('stage-character-main')).toHaveCSS('transform','matrix(1, 0, 0, 1, 200, 0)')
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/'+id+'/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
}
test('lesson 4 switches real stage background after Scratch-like Blockly scene instruction',async({page})=>{
  test.setTimeout(180_000)
  await play(page,'lesson-04-meadow-scene',{0:['when_start'],1:['move_right'],3:['switch_scene']},3,99)
})
test('lesson 5 visibly repeats the prior movement after traveling to meadow',async({page})=>{
  test.setTimeout(180_000)
  await play(page,'lesson-05-meadow-order',{0:['when_start'],1:['move_right'],2:['switch_scene'],3:['repeat_twice']},2,3)
})
test('lesson 6 executes movement, scene change, repetition and speech in order',async({page})=>{
  test.setTimeout(180_000)
  await page.goto('/learn/lesson/lesson-06-meadow-story')
  const adds:Record<number,string[]>={0:['when_start'],1:['move_right'],2:['switch_scene'],3:['repeat_twice','say_line']}
  for(let step=0;step<5;step++){
    for(const type of adds[step]??[])await page.getByTestId('lesson-add-'+type).click()
    await page.getByTestId('run-code-button').click()
    await expect(page.getByTestId('lesson-playable-stage')).toContainText('运行成功',{timeout:25_000})
    if(step>=3){
      await expect(page.getByTestId('stage-current-scene')).toContainText('草地')
      await expect(page.getByTestId('stage-character-main')).toHaveCSS('transform','matrix(1, 0, 0, 1, 200, 0)')
      await expect(page.getByTestId('lesson-playable-stage')).toContainText('我到草地啦！')
    }
    await page.getByTestId('lesson-complete-step').click()
  }
  await page.waitForURL('**/project/lesson-06-meadow-story/complete')
  await expect(page.getByTestId('project-complete-heading')).toBeVisible()
})
