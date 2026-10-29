import {expect, test} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {mutateSb3, openG2Lab, unzip, routeLocalScratchVm, selectTarget, spriteState, stageSprite} from './scratch-g2-helpers'

// G2-U1 lessons on the real Scratch VM (scratch-vm@5.0.300 in a sandboxed
// iframe). No VM mocks: every task state below comes from VM SAY events,
// VM target coordinates and the VM's own .sb3 serializer.
test.beforeEach(async ({page}) => {
  await routeLocalScratchVm(page)
})

const L01 = 'G2-U1-L01'
const L01_SAMPLE = 'public/scratch-samples/g2-u1-l01-park-friends.sb3.b64'

test.describe('G2-U1-L01 认识舞台与精灵', () => {
  test('catalog entry opens the lab; clicking each sprite runs its own click script in the VM (practice A + prediction)', async ({page}) => {
    test.setTimeout(150_000)
    await page.goto(`/learn/catalog/${L01}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '认识舞台与精灵'})).toBeVisible()
    await expect(page.getByText('不保存正式成绩').first()).toBeVisible()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('春日公园')
    await expect(stageSprite(page, '小橘猫')).toBeVisible()
    await expect(stageSprite(page, '小鸟')).toBeVisible()
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-predict-option').filter({hasText: '小橘猫说话'}).click()
    await expect(page.getByTestId('g2-predict-result')).toContainText('去舞台上点一点验证')

    await stageSprite(page, '小鸟').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小鸟"]')).toHaveText('叽叽！我想回到鸟窝。', {timeout: 10_000})
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveCount(0)
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：小鸟说话')
    await expect(page.getByTestId('g2-predict-result')).toContainText('和预测不一样')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')

    await stageSprite(page, '小橘猫').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveText('你好！我是小橘猫。', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
    // The say block lasts 2 seconds in the VM, then the bubble is cleared by the VM itself.
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveCount(0, {timeout: 6_000})

    // Clicking the backdrop is the stage, not a sprite: no sprite speaks.
    await page.getByTestId('g2-stage-backdrop').click({position: {x: 12, y: 12}})
    await expect(page.getByTestId('g2-stage-note')).toContainText('舞台不是精灵')
    await expect(page.getByTestId('g2-bubble')).toHaveCount(0)

    // Selecting a sprite shows only that sprite's own scripts.
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-block-editor')).toContainText('小鸟的积木脚本')
    await expect(page.getByTestId('g2-edit-say')).toHaveValue('叽叽！我想回到鸟窝。')
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-say')).toHaveValue('你好！我是小橘猫。')
    await expect(page.getByTestId('g2-edit-x')).toHaveValue('-120')
  })

  test('practice B: editing the bird go-to block moves the real VM sprite into the nest; two different positions both pass', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L01)
    await selectTarget(page, '小鸟')
    await expect(spriteState(page, '小鸟')).toContainText('x -150 · y 110')
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小鸟')).toContainText('x -150 · y 110')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-edit-x').fill('110')
    await page.getByTestId('g2-edit-y').fill('60')
    await expect(page.getByTestId('g2-green-flag')).toBeDisabled() // unapplied blocks never run
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('积木已写入真实 Scratch VM', {timeout: 12_000})
    await expect(spriteState(page, '小鸟')).toContainText('x -150 · y 110') // not moved until the program runs
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小鸟')).toContainText('x 110 · y 60', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
    await expect(spriteState(page, '小橘猫')).toContainText('x -120 · y -80') // the other sprite is untouched

    // Equivalent solution: another point inside the nest.
    await page.getByTestId('g2-edit-x').fill('90')
    await page.getByTestId('g2-edit-y').fill('80')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小鸟')).toContainText('x 90 · y 80', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')

    // Boundary: outside the nest is a real run but does not pass.
    await page.getByTestId('g2-edit-x').fill('-20')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小鸟')).toContainText('x -20 · y 80', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')

    // Boundary: the editor clamps x to the stage edge, never sends 300 to the VM.
    await page.getByTestId('g2-edit-x').fill('300')
    await expect(page.getByTestId('g2-edit-x')).toHaveValue('240')
  })

  test('debug case: moving the stage is a real VM no-op; three hint layers lead to fixing it on the sprite', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L01)
    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-block-editor')).toContainText('舞台的积木区')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-stage-attach-extra').click()
    await expect(page.getByTestId('g2-editor-validity')).toContainText('舞台的绿旗下面拼了')
    await page.getByTestId('g2-edit-x').fill('120')
    await page.getByTestId('g2-edit-y').fill('40')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-move-result')).toContainText('请求舞台移到 (120, 40)', {timeout: 10_000})
    await expect(page.getByTestId('g2-move-result')).toContainText('移动前 (0, 0) → 移动后 (0, 0)')
    await expect(page.getByTestId('g2-move-result')).toContainText('舞台没有移动')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('g2-hint-1')).toContainText('看现象')
    await expect(page.getByTestId('g2-hint-2')).toHaveCount(0)
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('舞台是背景，不是精灵')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('选中“小鸟”')
    await expect(page.getByTestId('g2-next-hint')).toHaveCount(0)

    // Repair as the third hint says.
    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-x').fill('120')
    await page.getByTestId('g2-edit-y').fill('70')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小鸟')).toContainText('x 120 · y 70', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
  })

  test('creative change, real .sb3 export re-verified in a fresh VM, then re-import restores the edited project', async ({page}) => {
    test.setTimeout(180_000)
    await openG2Lab(page, L01)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-say').fill('一起去放风筝吧')
    await page.getByTestId('g2-edit-x').fill('-60')
    await expect(page.getByTestId('g2-export-sb3')).toBeDisabled()
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    await stageSprite(page, '小橘猫').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveText('一起去放风筝吧', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true')

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-认识舞台与精灵.sb3')
    const file = await readFile((await downloaded.path())!)
    expect(file[0]).toBe(0x50)
    expect(file[1]).toBe(0x4b)
    // The VM serializer (with scratch-storage attached) re-packs the original SVG artwork, so the file stays editable.
    const names = unzip(file).map(entry => entry.name).sort()
    expect(names).toHaveLength(4)
    expect(names).toContain('project.json')
    expect(names.filter(name => /^[0-9a-f]{32}\.svg$/.test(name))).toHaveLength(3)
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 MESSAGE=一起去放风筝吧')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 X=-60')

    // Change again, then re-import the exported file: the exported version comes back.
    await page.getByTestId('g2-edit-say').fill('换一句')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-park.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-say')).toHaveValue('一起去放风筝吧')
    await expect(page.getByTestId('g2-edit-x')).toHaveValue('-60')
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小橘猫')).toContainText('x -60 · y -80', {timeout: 10_000})
  })

  test('sandbox rejects corrupt and illegal projects and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(L01_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, L01)
    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-x').fill('100')
    await page.getByTestId('g2-edit-y').fill('60')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})

    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, '小鸟')
      await expect(page.getByTestId('g2-edit-x')).toHaveValue('100')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    await reject('corrupt.sb3', Buffer.alloc(1024, 0x41), '不是 Scratch ZIP')
    await reject('out-of-range.sb3', mutateSb3(sample, p => { p.targets[2].blocks.bird_goto.inputs = {X: [1, [4, '300']], Y: [1, [4, '60']]} }), '数字超出允许范围')
    await reject('extra-sprite.sb3', mutateSb3(sample, p => { p.targets.push({...p.targets[2], name: '小狗'}) }), '精灵数量不符合课程模型')
    await reject('renamed-sprite.sb3', mutateSb3(sample, p => { p.targets[2].name = '大怪兽' }), '精灵不在课程名单')
    await reject('extra-block.sb3', mutateSb3(sample, p => {
      p.targets[1].blocks.evil = {opcode: 'control_forever', next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 0, y: 0}
    }), '课程模型之外的积木')
    await reject('changed-opcode.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_say.opcode = 'looks_thinkforsecs' }), '不允许的积木类型')
    await reject('other-lesson.sb3', await readFile('public/scratch-samples/meteor-clones.sb3'), /导入 Scratch 项目失败/)

    // The surviving project still runs the applied edit in the VM.
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小鸟')).toContainText('x 100 · y 60', {timeout: 10_000})
  })

  test('applied work auto-saves as a real .sb3 in IndexedDB, reopens after reload, and can be reset', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L01)
    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-x').fill('130')
    await page.getByTestId('g2-edit-y').fill('55')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存真实 Scratch .sb3', {timeout: 30_000})
    await page.reload()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已从本机草稿恢复', {timeout: 60_000})
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-x')).toHaveValue('130')
    await expect(page.getByTestId('g2-edit-y')).toHaveValue('55')
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '小鸟')).toContainText('x 130 · y 55', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')

    await page.getByTestId('g2-reset-draft').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 40_000})
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-x')).toHaveValue('-150')
    await page.reload()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
  })

  test('recovery: a failed sample download can be retried without losing the page', async ({page}) => {
    test.setTimeout(120_000)
    let attempts = 0
    await page.route('**/scratch-samples/g2-u1-l01-park-friends.sb3.b64', async route => {
      attempts += 1
      if (attempts === 1) { await route.fulfill({status: 500, body: 'boom'}); return }
      await route.continue()
    })
    await page.goto(`/learn/scratch-lab/${L01}`)
    await expect(page.getByTestId('g2-vm-status')).toContainText('项目加载失败', {timeout: 60_000})
    await page.getByTestId('g2-retry-load').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByTestId('g2-retry-load')).toHaveCount(0)
    expect(attempts).toBeGreaterThanOrEqual(2)
  })
})

const L02 = 'G2-U1-L02'
const L02_SAMPLE = 'public/scratch-samples/g2-u1-l02-cat-costumes.sb3.b64'

test.describe('G2-U1-L02 角色换造型', () => {
  test('catalog entry opens the costume lab; the VM answers the prediction; switching to “挥手” really changes the sprite costume (practice A)', async ({page}) => {
    test.setTimeout(150_000)
    await page.goto(`/learn/catalog/${L02}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '角色换造型'})).toBeVisible()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('演出舞台')
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '站立')
    await expect(stageSprite(page, '小鸟')).toHaveAttribute('data-costume', '收翅')

    await page.getByTestId('g2-predict-option').filter({hasText: '保持站立'}).click()
    await expect(page.getByTestId('g2-predict-result')).toContainText('去舞台上点一点验证')
    await stageSprite(page, '小橘猫').click()
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '挥手', {timeout: 10_000})
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：变成挥手')
    await expect(page.getByTestId('g2-predict-result')).toContainText('和预测不一样')
    // One click = one "next costume": not a dance yet.
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')

    // Green flag with the original "switch to 站立" puts the cat back: practice A not done.
    await page.getByTestId('g2-green-flag').click()
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '站立', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')

    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-block-editor')).toContainText('小橘猫的积木脚本')
    await expect(page.getByTestId('g2-edit-costume')).toHaveValue('站立')
    await expect(page.getByTestId('g2-edit-costume').locator('option')).toHaveText(['站立', '挥手'])
    await page.getByTestId('g2-edit-costume').selectOption('挥手')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '挥手', {timeout: 10_000})
    await expect(spriteState(page, '小橘猫')).toContainText('造型 挥手')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')

    // The bird only offers its own costumes.
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-costume').locator('option')).toHaveText(['收翅', '展翅'])
  })

  test('practice B: repeat + next costume; 1 repeat is not enough, 3×0.2 s and 6×0.3 s both make a real VM costume dance', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L02)
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-times')).toHaveValue('1')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('0.5')
    await stageSprite(page, '小橘猫').click()
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '挥手', {timeout: 10_000})
    await page.waitForTimeout(800)
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-edit-times').fill('3')
    await page.getByTestId('g2-edit-wait').fill('0.2')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await stageSprite(page, '小橘猫').click()
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true', {timeout: 10_000})
    // Three changes from 挥手: 站立 → 挥手 → 站立.
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '站立', {timeout: 5_000})

    // An equivalent, slower and longer dance also passes on a fresh page.
    await page.getByTestId('g2-reset-draft').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 40_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-times').fill('6')
    await page.getByTestId('g2-edit-wait').fill('0.3')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await stageSprite(page, '小橘猫').click()
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true', {timeout: 10_000})
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '站立', {timeout: 5_000})
  })

  test('debug case: “switch to 挥手” on the stage is a real VM no-op; three hint layers lead to the fix on the cat', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L02)
    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-stage-attach-extra').click()
    await expect(page.getByTestId('g2-editor-validity')).toContainText('换成（挥手）造型')
    await page.getByTestId('g2-apply-blocks').click()
    const result = page.getByTestId('g2-costume-result')
    await expect(result).toContainText('请求舞台换成“挥手”造型', {timeout: 10_000})
    await expect(result).toContainText('舞台自己的背景只有：演出舞台')
    await expect(result).toContainText('舞台 演出舞台 → 演出舞台')
    await expect(result).toContainText('小橘猫 站立 → 站立')
    await expect(result).toContainText('没有任何对象换造型')
    await expect(page.getByTestId('g2-backdrop')).toHaveText('演出舞台')
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '站立')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('g2-hint-1')).toContainText('看现象')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('舞台只有自己的背景')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('选中“小橘猫”')

    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-costume').selectOption('挥手')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '挥手', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
  })

  test('creative bird costume, real .sb3 export with all five original costumes re-verified in a fresh VM, then re-import', async ({page}) => {
    test.setTimeout(180_000)
    await openG2Lab(page, L02)
    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-costume').selectOption('展翅')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-times').fill('4')
    await page.getByTestId('g2-edit-wait').fill('0.7')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(stageSprite(page, '小鸟')).toHaveAttribute('data-costume', '展翅', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true')

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-角色换造型.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.map(entry => entry.name)).toContain('project.json')
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(5)
    const project = JSON.parse(entries.find(entry => entry.name === 'project.json')!.data.toString('utf8'))
    const bird = project.targets.find((t: {name: string}) => t.name === '小鸟')
    expect(bird.blocks.bird_costume_menu.fields.COSTUME[0]).toBe('展翅')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('小鸟 COSTUME=展翅')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 TIMES=4')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 DURATION=0.7')

    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-costume').selectOption('收翅')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-show.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-costume')).toHaveValue('展翅')
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-times')).toHaveValue('4')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('0.7')
    await page.getByTestId('g2-green-flag').click()
    await expect(stageSprite(page, '小鸟')).toHaveAttribute('data-costume', '展翅', {timeout: 10_000})
  })

  test('sandbox rejects costume projects outside the lesson model and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(L02_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, L02)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-costume').selectOption('挥手')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, '小橘猫')
      await expect(page.getByTestId('g2-edit-costume')).toHaveValue('挥手')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    type Costume = Record<string, unknown>
    await reject('foreign-costume.sb3', mutateSb3(sample, p => { (p.targets[1].blocks.cat_costume_menu.fields as Record<string, unknown>).COSTUME = ['展翅', null] }), '选项不在课程允许范围')
    await reject('wait-too-short.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_wait.inputs = {DURATION: [1, [4, '0.05']]} }), '秒数必须在')
    await reject('repeat-too-many.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_repeat.inputs = {TIMES: [1, [4, '99']], SUBSTACK: [2, 'cat_next']} }), '数字超出允许范围')
    await reject('extra-costume.sb3', mutateSb3(sample, p => {
      const costumes = p.targets[1].costumes as Costume[]
      p.targets[1].costumes = [...costumes, {...costumes[0], name: '偷偷加的造型'}]
    }), '造型不符合课程模型')
    await reject('forever-dance.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_repeat.opcode = 'control_forever' }), '不允许的积木类型')
    await reject('l01-file.sb3', Buffer.from(await readFile(L01_SAMPLE, 'utf8'), 'base64'), /导入 Scratch 项目失败/)

    await page.getByTestId('g2-green-flag').click()
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '挥手', {timeout: 10_000})
  })
})

const L03 = 'G2-U1-L03'
const L03_SAMPLE = 'public/scratch-samples/g2-u1-l03-forest-concert.sb3.b64'
const soundLog = (page: import('@playwright/test').Page) => page.getByTestId('g2-sound-log')

test.describe('G2-U1-L03 设置背景和声音', () => {
  test('catalog entry opens the concert lab; the VM counts 3 bell plays for the prediction; the stage backdrop switches to 绿色草地 (practice A)', async ({page}) => {
    test.setTimeout(150_000)
    await page.goto(`/learn/catalog/${L03}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '设置背景和声音'})).toBeVisible()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('夜晚森林')
    await expect(soundLog(page)).toContainText('还没有点绿旗')

    await page.getByTestId('g2-predict-option').filter({hasText: '1 次'}).click()
    await page.getByTestId('g2-green-flag').click()
    await expect(soundLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(soundLog(page)).toHaveAttribute('data-plays', '3')
    await expect(soundLog(page)).toContainText('上一次绿旗：Scratch VM 执行舞台“播放声音”3 次')
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：3 次')
    await expect(page.getByTestId('g2-predict-result')).toContainText('和预测不一样')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')

    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-block-editor')).toContainText('舞台的积木区')
    await expect(page.getByTestId('g2-edit-backdrop').locator('option')).toHaveText(['夜晚森林', '绿色草地'])
    await expect(page.getByTestId('g2-edit-sound')).toHaveCount(0)
    await page.getByTestId('g2-edit-backdrop').selectOption('绿色草地')
    // An unapplied stage edit blocks running stale code.
    await expect(page.getByTestId('g2-green-flag')).toBeDisabled()
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('绿色草地', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')

    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-sound').locator('option')).toHaveText(['叽叽', '啾啾'])
    await expect(page.getByTestId('g2-edit-backdrop')).toHaveCount(0)
  })

  test('debug case: the bell inside “repeat 3” really plays 3 times; hints lead to repeat 1; 6 is rejected; then exactly one play', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L03)
    await page.getByTestId('g2-green-flag').click()
    await expect(soundLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(soundLog(page)).toHaveAttribute('data-plays', '3')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-1')).toContainText('看现象')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('重复执行 3 次')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('改成 1 次')

    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-edit-times')).toHaveValue('3')
    await page.getByTestId('g2-edit-times').fill('6')
    await expect(page.getByTestId('g2-editor-validity')).toContainText('积木没有拼好')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-edit-times').fill('2')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(soundLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(soundLog(page)).toHaveAttribute('data-plays', '2')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-edit-times').fill('1')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(soundLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(soundLog(page)).toHaveAttribute('data-plays', '1')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true')
  })

  test('practice B: clicking the bird plays its own sound in the VM; switching to 啾啾 is recorded', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L03)
    await stageSprite(page, '小鸟').click()
    await expect(soundLog(page)).toContainText('小鸟刚才播放“叽叽”', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-sound')).toHaveValue('叽叽')
    await page.getByTestId('g2-edit-sound').selectOption('啾啾')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await stageSprite(page, '小鸟').click()
    await expect(soundLog(page)).toContainText('小鸟刚才播放“啾啾”', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
    // Clicking the cat runs its say script and plays no sound.
    await stageSprite(page, '小橘猫').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveText('欢迎来到森林音乐会！', {timeout: 10_000})
  })

  test('creative opening, real .sb3 export with backdrops and WAV sounds re-verified in a fresh VM, then re-import', async ({page}) => {
    test.setTimeout(180_000)
    await openG2Lab(page, L03)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-say').fill('音乐会开始啦')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    await stageSprite(page, '小橘猫').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveText('音乐会开始啦', {timeout: 10_000})
    await selectTarget(page, 'Stage')
    await page.getByTestId('g2-edit-backdrop').selectOption('绿色草地')
    await page.getByTestId('g2-edit-times').fill('1')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(soundLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(soundLog(page)).toHaveAttribute('data-plays', '1')
    await expect(page.getByTestId('g2-backdrop')).toHaveText('绿色草地')
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true')

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-设置背景和声音.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(4)
    const wavs = entries.filter(entry => /^[0-9a-f]{32}\.wav$/.test(entry.name))
    expect(wavs).toHaveLength(3)
    for (const wav of wavs) expect(wav.data.subarray(0, 4).toString('ascii')).toBe('RIFF')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('Stage BACKDROP=绿色草地')
    await expect(page.getByTestId('g2-export-status')).toContainText('Stage TIMES=1')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 MESSAGE=音乐会开始啦')

    await page.getByTestId('g2-edit-times').fill('4')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-concert.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-edit-times')).toHaveValue('1')
    await expect(page.getByTestId('g2-edit-backdrop')).toHaveValue('绿色草地')
    await page.getByTestId('g2-green-flag').click()
    await expect(soundLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(soundLog(page)).toHaveAttribute('data-plays', '1')
  })

  test('sandbox rejects concert projects outside the lesson model and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(L03_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, L03)
    await selectTarget(page, 'Stage')
    await page.getByTestId('g2-edit-times').fill('1')
    await page.getByTestId('g2-apply-blocks').click()
    await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, 'Stage')
      await expect(page.getByTestId('g2-edit-times')).toHaveValue('1')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    type Sound = Record<string, unknown>
    await reject('stage-sound-on-bird.sb3', mutateSb3(sample, p => { (p.targets[2].blocks.bird_sound_menu.fields as Record<string, unknown>).SOUND_MENU = ['开幕铃', null] }), '选项不在课程允许范围')
    await reject('repeat-9.sb3', mutateSb3(sample, p => { p.targets[0].blocks.stage_repeat.inputs = {TIMES: [1, [4, '9']], SUBSTACK: [2, 'stage_play']} }), '数字超出允许范围')
    await reject('forever-bell.sb3', mutateSb3(sample, p => { p.targets[0].blocks.stage_repeat.opcode = 'control_forever' }), '不允许的积木类型')
    await reject('extra-sound.sb3', mutateSb3(sample, p => {
      const sounds = p.targets[2].sounds as Sound[]
      p.targets[1].sounds = [{...sounds[0], name: '偷偷加的声音'}]
    }), '声音不符合课程模型')
    await reject('l02-file.sb3', Buffer.from(await readFile(L02_SAMPLE, 'utf8'), 'base64'), /导入 Scratch 项目失败/)

    await page.getByTestId('g2-green-flag').click()
    await expect(soundLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(soundLog(page)).toHaveAttribute('data-plays', '1')
  })
})

const L04 = 'G2-U1-L04'
const L04_SAMPLE = 'public/scratch-samples/g2-u1-l04-cat-walks.sb3.b64'
const turnTotal = (page: import('@playwright/test').Page, name: string) => page.locator(`[data-testid="g2-turn-total"][data-name="${name}"]`)
async function applyAndWait(page: import('@playwright/test').Page) {
  await page.getByTestId('g2-apply-blocks').click()
  await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled({timeout: 12_000})
  await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
}
async function flagAndSettle(page: import('@playwright/test').Page, catX: number) {
  await page.getByTestId('g2-green-flag').click()
  await expect(spriteState(page, '小橘猫')).toContainText(`x ${catX} · y -70`, {timeout: 10_000})
  // The flag script ends with a 2 s speech bubble; wait until the VM has no threads left.
  await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveCount(0, {timeout: 8_000})
}

test.describe('G2-U1-L04 运动积木初体验', () => {
  test('catalog entry opens the motion lab; the VM walks the cat left for the prediction; three hints lead to facing 90 (debug)', async ({page}) => {
    test.setTimeout(150_000)
    await page.goto(`/learn/catalog/${L04}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '运动积木初体验'})).toBeVisible()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('小河边')
    await expect(spriteState(page, '小橘猫')).toContainText('x -100 · y -70 · 方向 -90')
    await expect(stageSprite(page, '风车')).toBeVisible()

    await page.getByTestId('g2-predict-option').filter({hasText: '向右走'}).click()
    await flagAndSettle(page, -200)
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveCount(0)
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：向左走')
    await expect(page.getByTestId('g2-predict-result')).toContainText('和预测不一样')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')
    // Facing left with rotation style left-right: the costume is mirrored, not upside down.
    await expect(stageSprite(page, '小橘猫').locator('img')).toHaveAttribute('style', /scaleX\(-1\)/)

    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-1')).toContainText('-200')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('-90 是左边')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('改成 90')

    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-direction')).toHaveValue('-90')
    await expect(page.getByTestId('g2-edit-steps')).toHaveValue('100')
    await page.getByTestId('g2-edit-direction').selectOption('90')
    await expect(page.getByTestId('g2-green-flag')).toBeDisabled()
    await applyAndWait(page)
    await flagAndSettle(page, 0)
    await expect(spriteState(page, '小橘猫')).toContainText('方向 90')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')
  })

  test('practice A: steps decide how far; 400 is refused; 240 and 210 both reach the fish zone in the VM', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L04)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-direction').selectOption('90')
    await page.getByTestId('g2-edit-steps').fill('400')
    await expect(page.getByTestId('g2-editor-validity')).toContainText('积木没有拼好')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-edit-steps').fill('240')
    await applyAndWait(page)
    await flagAndSettle(page, 140)
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
    await page.getByTestId('g2-edit-steps').fill('210')
    await applyAndWait(page)
    await flagAndSettle(page, 110)
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
  })

  test('practice B: the VM counts how far the pinwheel turns; 15° is not enough, 6×15° is a quarter turn; 200° is refused', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L04)
    await stageSprite(page, '风车').click()
    await expect(turnTotal(page, '风车')).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(turnTotal(page, '风车')).toHaveAttribute('data-total', '15')
    await expect(spriteState(page, '风车')).toContainText('方向 105')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')
    await selectTarget(page, '风车')
    await page.getByTestId('g2-edit-degrees').fill('200')
    await expect(page.getByTestId('g2-editor-validity')).toContainText('积木没有拼好')
    await page.getByTestId('g2-edit-degrees').fill('15')
    await page.getByTestId('g2-edit-times').fill('6')
    await applyAndWait(page)
    await stageSprite(page, '风车').click()
    await expect(turnTotal(page, '风车')).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(turnTotal(page, '风车')).toHaveAttribute('data-total', '90')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
    await expect(spriteState(page, '风车')).toContainText('方向 -165')
  })

  test('creative full turn + arrival line, real .sb3 export re-verified in a fresh VM, then re-import restores the motion settings', async ({page}) => {
    test.setTimeout(180_000)
    await openG2Lab(page, L04)
    await selectTarget(page, '风车')
    await page.getByTestId('g2-edit-times').fill('4')
    await page.getByTestId('g2-edit-degrees').fill('90')
    await applyAndWait(page)
    await stageSprite(page, '风车').click()
    await expect(turnTotal(page, '风车')).toHaveAttribute('data-finished', 'true', {timeout: 10_000})
    await expect(turnTotal(page, '风车')).toHaveAttribute('data-total', '360')
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-direction').selectOption('90')
    await page.getByTestId('g2-edit-steps').fill('250')
    await page.getByTestId('g2-edit-say').fill('小鱼我来啦')
    await applyAndWait(page)
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    await page.getByTestId('g2-green-flag').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveText('小鱼我来啦', {timeout: 10_000})
    await expect(spriteState(page, '小橘猫')).toContainText('x 150 · y -70')
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true', {timeout: 8_000})

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-运动积木初体验.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(3)
    const project = JSON.parse(entries.find(entry => entry.name === 'project.json')!.data.toString('utf8'))
    const cat = project.targets.find((t: {name: string}) => t.name === '小橘猫')
    expect(cat.blocks.cat_point.opcode).toBe('motion_pointindirection')
    expect(cat.blocks.cat_move.opcode).toBe('motion_movesteps')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 STEPS=250')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 DIRECTION=90')
    await expect(page.getByTestId('g2-export-status')).toContainText('风车 DEGREES=90')

    await page.getByTestId('g2-edit-steps').fill('30')
    await applyAndWait(page)
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-walk.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-steps')).toHaveValue('250')
    await expect(page.getByTestId('g2-edit-direction')).toHaveValue('90')
    await flagAndSettle(page, 150)
  })

  test('sandbox rejects motion projects outside the lesson model and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(L04_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, L04)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-direction').selectOption('90')
    await applyAndWait(page)
    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, '小橘猫')
      await expect(page.getByTestId('g2-edit-direction')).toHaveValue('90')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    await reject('steps-999.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_move.inputs = {STEPS: [1, [4, '999']]} }), '数字超出允许范围')
    await reject('direction-45.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_point.inputs = {DIRECTION: [1, [8, '45']]} }), '选项不在课程允许范围')
    await reject('start-moved.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_goto.inputs = {X: [1, [4, '120']], Y: [1, [4, '-70']]} }), '积木数值被改动')
    await reject('glide.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_move.opcode = 'motion_glidesecstoxy' }), '不允许的积木类型')
    await reject('l03-file.sb3', Buffer.from(await readFile(L03_SAMPLE, 'utf8'), 'base64'), /导入 Scratch 项目失败/)

    await flagAndSettle(page, 0)
  })
})

const L05 = 'G2-U1-L05'
const L05_SAMPLE = 'public/scratch-samples/g2-u1-l05-broadcast-show.sb3.b64'
const broadcastLog = (page: import('@playwright/test').Page) => page.getByTestId('g2-broadcast-log')
async function clickHost(page: import('@playwright/test').Page) {
  await stageSprite(page, '小橘猫').click()
  await expect(broadcastLog(page)).toHaveAttribute('data-message', '开场', {timeout: 10_000})
  await expect(broadcastLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 12_000})
}

test.describe('G2-U1-L05 广播第一条消息', () => {
  test('catalog entry opens the broadcast lab; the VM broadcast 开场 does not wake the bird listening for 谢幕; hints lead to the fix (debug)', async ({page}) => {
    test.setTimeout(150_000)
    await page.goto(`/learn/catalog/${L05}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '广播第一条消息'})).toBeVisible()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('幕布舞台')
    await expect(broadcastLog(page)).toContainText('还没有广播')

    await page.getByTestId('g2-predict-option').filter({hasText: '会说话'}).first().click()
    await stageSprite(page, '小橘猫').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveText('表演开始！', {timeout: 10_000})
    await expect(broadcastLog(page)).toHaveAttribute('data-message', '开场', {timeout: 10_000})
    await expect(broadcastLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 12_000})
    await expect(broadcastLog(page)).toHaveAttribute('data-speakers', '')
    // The receivers that do listen for 开场 really ran: the rabbit moved to its receive x.
    await expect(spriteState(page, '小白兔')).toContainText('x 110')
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小鸟"]')).toHaveCount(0)
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：不会说话')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-1')).toContainText('广播了“开场”')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('当接收到（谢幕）')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('改成“开场”')

    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-message')).toHaveValue('谢幕')
    await expect(page.getByTestId('g2-edit-message').locator('option')).toHaveText(['开场', '谢幕'])
    await page.getByTestId('g2-edit-message').selectOption('开场')
    await expect(page.getByTestId('g2-green-flag')).toBeDisabled()
    await applyAndWait(page)
    await stageSprite(page, '小橘猫').click()
    await expect(page.locator('[data-testid="g2-bubble"][data-name="小鸟"]')).toHaveText('叽叽喳喳，欢迎大家！', {timeout: 12_000})
    await expect(broadcastLog(page)).toHaveAttribute('data-speakers', '小鸟')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true', {timeout: 8_000})
  })

  test('practice A: the stage receives 开场 and switches to 灯光舞台 in the VM; the green flag resets it', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L05)
    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-edit-backdrop')).toHaveValue('幕布舞台')
    await page.getByTestId('g2-edit-backdrop').selectOption('灯光舞台')
    await applyAndWait(page)
    await expect(page.getByTestId('g2-backdrop')).toHaveText('幕布舞台')
    await clickHost(page)
    await expect(page.getByTestId('g2-backdrop')).toHaveText('灯光舞台')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
    await page.getByTestId('g2-green-flag').click()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('幕布舞台', {timeout: 10_000})
    await expect(spriteState(page, '小白兔')).toContainText('x 190')
  })

  test('practice B: the rabbit’s receive script moves it from backstage to the centre; only x is editable', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L05)
    await selectTarget(page, '小白兔')
    await expect(page.getByTestId('g2-edit-y')).toHaveCount(0)
    await expect(page.getByTestId('g2-edit-x')).toHaveValue('110')
    await clickHost(page)
    await expect(spriteState(page, '小白兔')).toContainText('x 110')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')
    await page.getByTestId('g2-edit-x').fill('0')
    await applyAndWait(page)
    await clickHost(page)
    await expect(spriteState(page, '小白兔')).toContainText('x 0 · y -40')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
  })

  test('creative full opening, real .sb3 export with broadcasts re-verified in a fresh VM, then re-import keeps the bird listening for 开场', async ({page}) => {
    test.setTimeout(180_000)
    await openG2Lab(page, L05)
    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-message').selectOption('开场')
    await page.getByTestId('g2-edit-say').fill('欢迎来看表演')
    await applyAndWait(page)
    await selectTarget(page, 'Stage')
    await page.getByTestId('g2-edit-backdrop').selectOption('灯光舞台')
    await applyAndWait(page)
    await selectTarget(page, '小白兔')
    await page.getByTestId('g2-edit-x').fill('20')
    await applyAndWait(page)
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    await clickHost(page)
    await expect(broadcastLog(page)).toHaveAttribute('data-speakers', '小鸟')
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true')

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-广播第一条消息.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(5)
    const project = JSON.parse(entries.find(entry => entry.name === 'project.json')!.data.toString('utf8'))
    const stage = project.targets.find((t: {isStage: boolean}) => t.isStage)
    // The file keeps both lesson messages; Scratch VM drops the unused one (谢幕) when it re-opens the file.
    expect(Object.values(stage.broadcasts).sort()).toEqual(['开场', '谢幕'])
    const bird = project.targets.find((t: {name: string}) => t.name === '小鸟')
    expect(bird.blocks.bird_recv.fields.BROADCAST_OPTION[0]).toBe('开场')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('小鸟 BROADCAST_OPTION=开场')
    await expect(page.getByTestId('g2-export-status')).toContainText('小白兔 X=20')

    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-message').selectOption('谢幕')
    await applyAndWait(page)
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-show.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-message')).toHaveValue('开场')
    await expect(page.getByTestId('g2-edit-say')).toHaveValue('欢迎来看表演')
    await clickHost(page)
    await expect(broadcastLog(page)).toHaveAttribute('data-speakers', '小鸟')
    // The dropped lesson message 谢幕 can still be chosen again: the sandbox re-creates it on the stage.
    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-message').selectOption('谢幕')
    await applyAndWait(page)
    await clickHost(page)
    await expect(broadcastLog(page)).toHaveAttribute('data-speakers', '')
  })

  test('sandbox rejects broadcast projects outside the lesson model and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(L05_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, L05)
    await selectTarget(page, '小鸟')
    await page.getByTestId('g2-edit-message').selectOption('开场')
    await applyAndWait(page)
    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, '小鸟')
      await expect(page.getByTestId('g2-edit-message')).toHaveValue('开场')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    await reject('unknown-message.sb3', mutateSb3(sample, p => { (p.targets[2].blocks.bird_recv.fields as Record<string, unknown>).BROADCAST_OPTION = ['开饭', 'kc-msg-food'] }), /广播消息不符合课程模型|选项不在课程允许范围/)
    await reject('extra-variable.sb3', mutateSb3(sample, p => { p.targets[0].variables = {'kc-var': ['分数', 0]} }), '含有课程模型之外的变量')
    await reject('cat-sends-bow.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_bcast.inputs = {BROADCAST_INPUT: [1, [11, '谢幕', 'kc-msg-bow']]} }), '积木数值被改动')
    await reject('broadcast-and-wait.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_bcast.opcode = 'event_broadcastandwait' }), '不允许的积木类型')
    await reject('rabbit-x-300.sb3', mutateSb3(sample, p => { p.targets[3].blocks.rabbit_goto.inputs = {X: [1, [4, '300']], Y: [1, [4, '-40']]} }), '数字超出允许范围')
    await reject('l04-file.sb3', Buffer.from(await readFile(L04_SAMPLE, 'utf8'), 'base64'), /导入 Scratch 项目失败/)

    await clickHost(page)
    await expect(broadcastLog(page)).toHaveAttribute('data-speakers', '小鸟')
  })
})

const L06 = 'G2-U1-L06'
const L06_SAMPLE = 'public/scratch-samples/g2-u1-l06-birthday-card.sb3.b64'
const speechLog = (page: import('@playwright/test').Page) => page.getByTestId('g2-speech-log')
const bubbleOf = (page: import('@playwright/test').Page, name: string) => page.locator(`[data-testid="g2-bubble"][data-name="${name}"]`)
/** Click the green flag and wait until the VM run has finished (balloon said its line and floated up). */
/** Quick-edit inputs are controlled by the Blockly workspace; re-fill until the box (and so the block) really holds the value before applying. */
async function fillEdit(page: import('@playwright/test').Page, testId: string, value: string) {
  const box = page.getByTestId(testId)
  await expect(async () => {
    if (await box.inputValue() !== value) await box.fill(value)
    await expect(box).toHaveValue(value, {timeout: 1_000})
  }).toPass({timeout: 10_000})
}
async function flagCard(page: import('@playwright/test').Page) {
  await page.getByTestId('g2-green-flag').click()
  // A run lasts at least 2 s (the balloon's line), so the new run is seen in progress before it finishes.
  await expect(speechLog(page)).toHaveAttribute('data-finished', 'false', {timeout: 5_000})
  await expect(speechLog(page)).toHaveAttribute('data-speakers', '小橘猫,气球', {timeout: 15_000})
  await expect(speechLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 20_000})
}

test.describe('G2-U1-L06 制作生日贺卡', () => {
  test('catalog entry opens the card lab; with “wait 0” the VM shows both lines at once (readable, not overlapping on screen); hints; wait 1 still talks over, wait 2 takes turns (debug)', async ({page}) => {
    test.setTimeout(180_000)
    await page.goto(`/learn/catalog/${L06}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '制作生日贺卡'})).toBeVisible()
    await expect(speechLog(page)).toContainText('还没有点绿旗')

    await page.getByTestId('g2-predict-option').filter({hasText: '一个说完另一个才说'}).first().click()
    await page.getByTestId('g2-green-flag').click()
    // Both speech bubbles are on the stage at the same time in the VM…
    await expect(bubbleOf(page, '小橘猫')).toHaveText('生日快乐！', {timeout: 10_000})
    await expect(bubbleOf(page, '气球')).toHaveText('许个愿吧！', {timeout: 10_000})
    // …and the page draws them apart, so a child can read both and see the real problem is timing.
    const catBox = (await bubbleOf(page, '小橘猫').boundingBox())!
    const balloonBox = (await bubbleOf(page, '气球').boundingBox())!
    const intersects = catBox.x < balloonBox.x + balloonBox.width && balloonBox.x < catBox.x + catBox.width &&
      catBox.y < balloonBox.y + balloonBox.height && balloonBox.y < catBox.y + catBox.height
    expect(intersects).toBe(false)
    await expect(speechLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 20_000})
    expect(Number(await speechLog(page).getAttribute('data-overlaps'))).toBeGreaterThan(0)
    await expect(speechLog(page)).toContainText('抢话')
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：会同时出现')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-1')).toContainText('两个对话框同时')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('等待 0 秒')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('2 或更大的整数')

    await selectTarget(page, '气球')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('0')
    // Not a whole second, or more than 5: the restricted editor refuses it.
    await page.getByTestId('g2-edit-wait').fill('1.5')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-edit-wait').fill('6')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-edit-wait').fill('1')
    await applyAndWait(page)
    await flagCard(page)
    expect(Number(await speechLog(page).getAttribute('data-overlaps'))).toBeGreaterThan(0)
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-edit-wait').fill('2')
    await applyAndWait(page)
    await flagCard(page)
    await expect(speechLog(page)).toHaveAttribute('data-overlaps', '0')
    await expect(speechLog(page)).toContainText('没有抢话')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true', {timeout: 8_000})
  })

  test('practice A: clicking the cake plays the song; the VM records the costume when the song starts; 蜡烛点亮 first passes and the green flag resets it', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L06)
    await stageSprite(page, '蛋糕').click()
    await expect(page.getByTestId('g2-sound-log')).toContainText('蛋糕刚才播放“生日歌”（开始播放时造型：蜡烛熄灭）', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')
    await selectTarget(page, '蛋糕')
    await expect(page.getByTestId('g2-edit-costume')).toHaveValue('蜡烛熄灭')
    await expect(page.getByTestId('g2-edit-sound')).toHaveCount(0)
    await page.getByTestId('g2-edit-costume').selectOption('蜡烛点亮')
    await applyAndWait(page)
    await stageSprite(page, '蛋糕').click()
    await expect(page.getByTestId('g2-sound-log')).toContainText('（开始播放时造型：蜡烛点亮）', {timeout: 10_000})
    await expect(stageSprite(page, '蛋糕')).toHaveAttribute('data-costume', '蜡烛点亮')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
    await page.getByTestId('g2-green-flag').click()
    await expect(stageSprite(page, '蛋糕')).toHaveAttribute('data-costume', '蜡烛熄灭', {timeout: 10_000})
  })

  test('practice B: repeat × change y floats the balloon; 2×10 is not enough, 40 per step is refused, 5×10 and 2×30 both reach the ribbon', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, L06)
    await flagCard(page)
    await expect(spriteState(page, '气球')).toContainText('x 160 · y -70')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')
    await selectTarget(page, '气球')
    await fillEdit(page, 'g2-edit-dy', '40')
    await expect(page.getByTestId('g2-editor-validity')).toContainText('积木没有拼好')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await fillEdit(page, 'g2-edit-dy', '10')
    await fillEdit(page, 'g2-edit-times', '5')
    await expect(page.getByTestId('g2-editor-validity')).toContainText('积木连接正确')
    await applyAndWait(page)
    await flagCard(page)
    await expect(spriteState(page, '气球')).toContainText('x 160 · y -40')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
    await fillEdit(page, 'g2-edit-times', '2')
    await fillEdit(page, 'g2-edit-dy', '30')
    await expect(page.getByTestId('g2-editor-validity')).toContainText('积木连接正确')
    await applyAndWait(page)
    await flagCard(page)
    await expect(spriteState(page, '气球')).toContainText('x 160 · y -30')
  })

  test('creative card, real .sb3 export with 5 SVG + WAV re-verified in a fresh VM, re-import, and the saved card reopens after reload (recovery)', async ({page}) => {
    test.setTimeout(200_000)
    await openG2Lab(page, L06)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-say').fill('祝你天天开心')
    await applyAndWait(page)
    await selectTarget(page, '气球')
    await page.getByTestId('g2-edit-wait').fill('3')
    await page.getByTestId('g2-edit-times').fill('6')
    await page.getByTestId('g2-edit-dy').fill('10')
    await applyAndWait(page)
    await selectTarget(page, '蛋糕')
    await page.getByTestId('g2-edit-costume').selectOption('蜡烛点亮')
    await applyAndWait(page)
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    // Recovery: closing and reopening the page brings back the saved card from this device.
    await page.reload()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已从本机草稿恢复', {timeout: 60_000})
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-say')).toHaveValue('祝你天天开心')
    await flagCard(page)
    await expect(speechLog(page)).toHaveAttribute('data-overlaps', '0')
    await expect(spriteState(page, '气球')).toContainText('y -30')
    await stageSprite(page, '蛋糕').click()
    await expect(page.getByTestId('g2-sound-log')).toContainText('蜡烛点亮', {timeout: 10_000})
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true')

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-制作生日贺卡.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(5)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.wav$/.test(entry.name))).toHaveLength(1)
    const project = JSON.parse(entries.find(entry => entry.name === 'project.json')!.data.toString('utf8'))
    const balloon = project.targets.find((t: {name: string}) => t.name === '气球')
    expect(balloon.blocks.balloon_wait.inputs.DURATION[1][1]).toBe('3')
    expect(balloon.blocks.balloon_rise.opcode).toBe('motion_changeyby')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('气球 DURATION=3')
    await expect(page.getByTestId('g2-export-status')).toContainText('蛋糕 COSTUME=蜡烛点亮')

    await selectTarget(page, '气球')
    await page.getByTestId('g2-edit-wait').fill('0')
    await applyAndWait(page)
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-card.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, '气球')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('3')
    await flagCard(page)
    await expect(speechLog(page)).toHaveAttribute('data-overlaps', '0')
  })

  test('sandbox rejects card projects outside the lesson model and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(L06_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, L06)
    await selectTarget(page, '气球')
    await page.getByTestId('g2-edit-wait').fill('2')
    await applyAndWait(page)
    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, '气球')
      await expect(page.getByTestId('g2-edit-wait')).toHaveValue('2')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    await reject('wait-1.5.sb3', mutateSb3(sample, p => { p.targets[3].blocks.balloon_wait.inputs = {DURATION: [1, [4, '1.5']]} }), '数字超出允许范围')
    await reject('wait-9.sb3', mutateSb3(sample, p => { p.targets[3].blocks.balloon_wait.inputs = {DURATION: [1, [4, '9']]} }), '数字超出允许范围')
    await reject('change-x.sb3', mutateSb3(sample, p => { p.targets[3].blocks.balloon_rise.opcode = 'motion_changexby' }), '不允许的积木类型')
    await reject('song-before-candles.sb3', mutateSb3(sample, p => {
      const b = p.targets[2].blocks as Record<string, {next: string | null; parent: string | null}>
      b.cake_click.next = 'cake_play'; b.cake_play.parent = 'cake_click'; b.cake_play.next = 'cake_switch'
      b.cake_switch.parent = 'cake_play'; b.cake_switch.next = null
    }), '积木连接不符合课程模型')
    await reject('cat-swaps-song.sb3', mutateSb3(sample, p => { p.targets[1].sounds = p.targets[2].sounds }), /声音|不符合课程模型/)
    await reject('l05-file.sb3', Buffer.from(await readFile(L05_SAMPLE, 'utf8'), 'base64'), /导入 Scratch 项目失败/)

    await flagCard(page)
    await expect(speechLog(page)).toHaveAttribute('data-overlaps', '0')
  })
})

// G2-U2 (animation unit) runs in the same G2 lab and shares this spec file with G2-U1.
const U2L01 = 'G2-U2-L01'
const U2L01_SAMPLE = 'public/scratch-samples/g2-u2-l01-cat-walk-home.sb3.b64'
const frameLog = (page: import('@playwright/test').Page) => page.getByTestId('g2-frame-log')
const framesOf = (page: import('@playwright/test').Page, name: string) => page.locator(`[data-testid="g2-frame-total"][data-name="${name}"]`)
async function flagWalk(page: import('@playwright/test').Page) {
  await page.getByTestId('g2-green-flag').click()
  // The new run clears the last summary first; the bird demo alone lasts 2.4 s, so the run is seen before it finishes.
  await expect(frameLog(page)).toHaveAttribute('data-finished', 'false', {timeout: 5_000})
  await expect(frameLog(page)).toHaveAttribute('data-finished', 'true', {timeout: 40_000})
}
async function catAvgMs(page: import('@playwright/test').Page) {
  return Number(await framesOf(page, '小橘猫').getAttribute('data-avg-ms'))
}

test.describe('G2-U2-L01 让角色走路有帧动画', () => {
  test('catalog entry opens the walk lab; with “wait 0” the VM steps a frame every ~0.03 s (blur) while the bird shows 0.3 s; hints; 0.25/1.1 refused, 0.2 makes each frame visible (debug)', async ({page}) => {
    test.setTimeout(180_000)
    await page.goto(`/learn/catalog/${U2L01}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '让角色走路有帧动画'})).toBeVisible()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('回家的小路')
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '走路1')
    await expect(frameLog(page)).toContainText('还没有点绿旗')

    await page.getByTestId('g2-predict-option').filter({hasText: '看得清'}).first().click()
    await flagWalk(page)
    await expect(framesOf(page, '小橘猫')).toHaveAttribute('data-count', '6')
    await expect(framesOf(page, '小橘猫')).toHaveAttribute('data-end', '走路3')
    expect(await catAvgMs(page)).toBeLessThan(100)
    await expect(framesOf(page, '小橘猫')).toContainText('太快，看不清')
    await expect(framesOf(page, '小鸟')).toHaveAttribute('data-count', '8')
    expect(Number(await framesOf(page, '小鸟').getAttribute('data-avg-ms'))).toBeGreaterThanOrEqual(290)
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '走路3')
    await expect(spriteState(page, '小橘猫')).toContainText('x -40 · y -80')
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：快得看不清')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-1')).toContainText('约 0.03 秒')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('等待 0 秒')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('0.2 或更大')

    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('0')
    // Off the 0.1 s grid or over 1 s: the restricted editor refuses it instead of rounding.
    await page.getByTestId('g2-edit-wait').fill('0.25')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-edit-wait').fill('1.1')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-edit-wait').fill('0.2')
    await applyAndWait(page)
    await flagWalk(page)
    expect(await catAvgMs(page)).toBeGreaterThanOrEqual(150)
    await expect(framesOf(page, '小橘猫')).toContainText('看得清')
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true', {timeout: 8_000})
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')
  })

  test('practice A: the costume wraps from 走路4 back to 走路1; 25 loops are refused, 8 loops end on 走路1 in the VM', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, U2L01)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-times').fill('25')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    // Blockly reports the refused 25 asynchronously; re-type 8 until the input settles on it.
    await fillEdit(page, 'g2-edit-times', '8')
    await applyAndWait(page)
    await flagWalk(page)
    await expect(framesOf(page, '小橘猫')).toHaveAttribute('data-count', '8')
    await expect(framesOf(page, '小橘猫')).toHaveAttribute('data-end', '走路1')
    await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '走路1')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
    // The bird is a fixed demo: none of its values can be edited.
    await selectTarget(page, '小鸟')
    await expect(page.getByTestId('g2-edit-times')).toHaveCount(0)
    await expect(page.getByTestId('g2-edit-wait')).toHaveCount(0)
  })

  test('practice B: loops × steps decide how far the cat walks; 6×20 stops at x -40, 50 steps are refused, 12×25 and 8×35 reach the door', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, U2L01)
    await flagWalk(page)
    await expect(spriteState(page, '小橘猫')).toContainText('x -40 · y -80')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'false')
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-steps').fill('50')
    await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    await page.getByTestId('g2-edit-steps').fill('25')
    await page.getByTestId('g2-edit-times').fill('12')
    await applyAndWait(page)
    await flagWalk(page)
    await expect(spriteState(page, '小橘猫')).toContainText('x 140 · y -80')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
    await page.getByTestId('g2-edit-steps').fill('35')
    await page.getByTestId('g2-edit-times').fill('8')
    await applyAndWait(page)
    await flagWalk(page)
    await expect(spriteState(page, '小橘猫')).toContainText('x 120 · y -80')
  })

  test('creative walk home, real .sb3 export with 7 SVG frames re-verified in a fresh VM, re-import, and the saved walk reopens after reload (recovery)', async ({page}) => {
    test.setTimeout(200_000)
    await openG2Lab(page, U2L01)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-say').fill('回家吃鱼啦')
    await page.getByTestId('g2-edit-times').fill('12')
    await page.getByTestId('g2-edit-steps').fill('25')
    await page.getByTestId('g2-edit-wait').fill('0.2')
    await applyAndWait(page)
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    await page.reload()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已从本机草稿恢复', {timeout: 60_000})
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-say')).toHaveValue('回家吃鱼啦')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('0.2')
    await flagWalk(page)
    await expect(framesOf(page, '小橘猫')).toHaveAttribute('data-end', '走路1')
    expect(await catAvgMs(page)).toBeGreaterThanOrEqual(150)
    await expect(spriteState(page, '小橘猫')).toContainText('x 140')
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true', {timeout: 8_000})

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-让角色走路有帧动画.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(7)
    const project = JSON.parse(entries.find(entry => entry.name === 'project.json')!.data.toString('utf8'))
    const cat = project.targets.find((t: {name: string}) => t.name === '小橘猫')
    expect(cat.costumes.map((c: {name: string}) => c.name)).toEqual(['走路1', '走路2', '走路3', '走路4'])
    expect(cat.blocks.cat_wait.inputs.DURATION[1][1]).toBe('0.2')
    expect(cat.blocks.cat_next.opcode).toBe('looks_nextcostume')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('小橘猫 DURATION=0.2')

    await page.getByTestId('g2-edit-wait').fill('0')
    await applyAndWait(page)
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-walk.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('0.2')
    await expect(page.getByTestId('g2-edit-times')).toHaveValue('12')
  })

  test('sandbox rejects walk projects outside the lesson model and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(U2L01_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, U2L01)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-wait').fill('0.3')
    await applyAndWait(page)
    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, '小橘猫')
      await expect(page.getByTestId('g2-edit-wait')).toHaveValue('0.3')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    await reject('wait-0.25.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_wait.inputs = {DURATION: [1, [4, '0.25']]} }), '0.1 秒为一格')
    await reject('wait-2.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_wait.inputs = {DURATION: [1, [4, '2']]} }), '0.1 秒为一格')
    await reject('loops-30.sb3', mutateSb3(sample, p => { p.targets[1].blocks.cat_repeat.inputs = {TIMES: [1, [4, '30']], SUBSTACK: [2, 'cat_move']} }), '数字超出允许范围')
    await reject('bird-faster.sb3', mutateSb3(sample, p => { p.targets[2].blocks.bird_wait.inputs = {DURATION: [1, [4, '0.1']]} }), '积木数值被改动')
    await reject('frame-before-move.sb3', mutateSb3(sample, p => {
      const b = p.targets[1].blocks as Record<string, {next: string | null; parent: string | null; inputs?: unknown}>
      b.cat_repeat.inputs = {TIMES: [1, [4, '6']], SUBSTACK: [2, 'cat_next']}
      b.cat_next.parent = 'cat_repeat'; b.cat_next.next = 'cat_move'
      b.cat_move.parent = 'cat_next'; b.cat_move.next = 'cat_wait'; b.cat_wait.parent = 'cat_move'
    }),/积木(连接|嵌套)不符合课程模型/)
    await reject('fifth-frame.sb3', mutateSb3(sample, p => {
      const costumes = p.targets[1].costumes as unknown[]
      p.targets[1].costumes = [...costumes, {...(costumes[0] as object), name: '走路5'}]
    }), '造型不符合课程模型')
    await reject('l06-file.sb3', Buffer.from(await readFile(L06_SAMPLE, 'utf8'), 'base64'), /导入 Scratch 项目失败/)

    await flagWalk(page)
    expect(await catAvgMs(page)).toBeGreaterThanOrEqual(150)
  })
})

const U2L02 = 'G2-U2-L02'
const U2L02_SAMPLE = 'public/scratch-samples/g2-u2-l02-day-night.sb3.b64'
const cycleLog = (page: import('@playwright/test').Page) => page.getByTestId('g2-cycle-log')
const spokeOn = (page: import('@playwright/test').Page, name: string, backdrop: string) =>
  page.locator(`[data-testid="g2-cycle-speech"][data-name="${name}"][data-backdrop="${backdrop}"]`)
async function switchesAtLeast(page: import('@playwright/test').Page, n: number, timeout = 25_000) {
  await expect.poll(async () => Number(await cycleLog(page).getAttribute('data-switches')), {timeout}).toBeGreaterThanOrEqual(n)
}
async function startCycle(page: import('@playwright/test').Page) {
  await page.getByTestId('g2-green-flag').click()
  await expect(cycleLog(page)).toContainText('运行中', {timeout: 5_000})
}
async function stopCycle(page: import('@playwright/test').Page) {
  await page.getByTestId('g2-stop').click()
  await expect(cycleLog(page)).toHaveAttribute('data-stopped', 'true', {timeout: 10_000})
  await expect(cycleLog(page)).toHaveAttribute('data-finished', 'true')
}

test.describe('G2-U2-L02 制作昼夜交替', () => {
  test('catalog entry opens the day/night lab; the forever loop keeps switching; the owl listening for 白天 hoots in daylight; hints; 夜晚 fixes it (debug)', async ({page}) => {
    test.setTimeout(180_000)
    await page.goto(`/learn/catalog/${U2L02}`)
    await expect(page.getByTestId('catalog-lesson-maturity')).toHaveAttribute('data-level', '3')
    await page.getByTestId('scratch-trial-entry').click()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已加载项目', {timeout: 60_000})
    await expect(page.getByRole('heading', {name: '制作昼夜交替'})).toBeVisible()
    await expect(cycleLog(page)).toContainText('还没有点绿旗')

    await page.getByTestId('g2-predict-option').filter({hasText: '换 1 次就停'}).click()
    await startCycle(page)
    await expect(spokeOn(page, '猫头鹰', '白天').first()).toBeVisible({timeout: 10_000})
    await switchesAtLeast(page, 3)
    // A forever loop does not end by itself.
    await expect(cycleLog(page)).toHaveAttribute('data-finished', 'false')
    expect(Number(await cycleLog(page).getAttribute('data-avg-ms'))).toBeLessThan(1500)
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：一直换，直到按停止')
    await expect(spokeOn(page, '小橘猫', '夜晚').first()).toBeVisible()
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-1')).toContainText('背景是“白天”')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('当背景换成（白天）')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('改成“夜晚”')

    await selectTarget(page, '猫头鹰')
    await expect(page.getByTestId('g2-edit-backdrop')).toHaveValue('白天')
    await page.getByTestId('g2-edit-backdrop').selectOption('夜晚')
    await applyAndWait(page)
    await startCycle(page)
    await expect(spokeOn(page, '猫头鹰', '夜晚').first()).toBeVisible({timeout: 10_000})
    await expect(stageSprite(page, '猫头鹰')).toHaveAttribute('data-costume', '醒来', {timeout: 5_000})
    await switchesAtLeast(page, 3)
    await expect(spokeOn(page, '猫头鹰', '白天')).toHaveCount(0)
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true')
    await stopCycle(page)
  })

  test('practice A: the stage wait sets each phase (6 and 0 refused); 3 s phases are VM-timed, and only the stop button ends the forever loop', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, U2L02)
    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('1')
    for (const bad of ['6', '0', '2.5']) {
      await page.getByTestId('g2-edit-wait').fill(bad)
      await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    }
    await page.getByTestId('g2-edit-wait').fill('3')
    await applyAndWait(page)
    await startCycle(page)
    await switchesAtLeast(page, 2, 20_000)
    expect(Number(await cycleLog(page).getAttribute('data-avg-ms'))).toBeGreaterThanOrEqual(2900)
    await expect(cycleLog(page)).toHaveAttribute('data-finished', 'false')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'false')
    await stopCycle(page)
    await expect(cycleLog(page)).toContainText('已按停止')
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
  })

  test('practice B: the cat’s hat listens for 白天 and greets the morning in the VM', async ({page}) => {
    test.setTimeout(150_000)
    await openG2Lab(page, U2L02)
    await selectTarget(page, '小橘猫')
    await expect(page.getByTestId('g2-edit-backdrop')).toHaveValue('夜晚')
    await page.getByTestId('g2-edit-backdrop').selectOption('白天')
    await page.getByTestId('g2-edit-say').fill('早上好！')
    await applyAndWait(page)
    await startCycle(page)
    await expect(spokeOn(page, '小橘猫', '白天').first()).toBeVisible({timeout: 10_000})
    await expect(bubbleOf(page, '小橘猫')).toHaveText('早上好！')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
    await switchesAtLeast(page, 2)
    await expect(spokeOn(page, '小橘猫', '夜晚')).toHaveCount(0)
    await stopCycle(page)
  })

  test('creative day/night, real .sb3 export re-verified in a fresh VM, re-import, and the saved work reopens after reload (recovery)', async ({page}) => {
    test.setTimeout(200_000)
    await openG2Lab(page, U2L02)
    await selectTarget(page, '猫头鹰')
    await page.getByTestId('g2-edit-backdrop').selectOption('夜晚')
    await page.getByTestId('g2-edit-say').fill('月亮出来啦')
    await applyAndWait(page)
    await selectTarget(page, '小橘猫')
    await page.getByTestId('g2-edit-backdrop').selectOption('白天')
    await applyAndWait(page)
    await selectTarget(page, 'Stage')
    await page.getByTestId('g2-edit-wait').fill('3')
    await applyAndWait(page)
    await expect(page.getByTestId('g2-local-save-status')).toContainText('已在本机自动保存', {timeout: 30_000})
    await page.reload()
    await expect(page.getByTestId('g2-vm-status')).toContainText('已从本机草稿恢复', {timeout: 60_000})
    await selectTarget(page, '猫头鹰')
    await expect(page.getByTestId('g2-edit-backdrop')).toHaveValue('夜晚')
    await expect(page.getByTestId('g2-edit-say')).toHaveValue('月亮出来啦')
    await startCycle(page)
    await switchesAtLeast(page, 2, 20_000)
    await expect(spokeOn(page, '猫头鹰', '夜晚').first()).toBeVisible()
    await expect(spokeOn(page, '小橘猫', '白天').first()).toBeVisible()
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true', {timeout: 8_000})
    await stopCycle(page)

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-制作昼夜交替.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(5)
    const project = JSON.parse(entries.find(entry => entry.name === 'project.json')!.data.toString('utf8'))
    const stage = project.targets.find((t: {isStage: boolean}) => t.isStage)
    const owl = project.targets.find((t: {name: string}) => t.name === '猫头鹰')
    expect(stage.blocks.stage_forever.opcode).toBe('control_forever')
    expect(stage.blocks.stage_wait.inputs.DURATION[1][1]).toBe('3')
    expect(owl.blocks.owl_hat.fields.BACKDROP[0]).toBe('夜晚')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    await expect(page.getByTestId('g2-export-status')).toContainText('猫头鹰 BACKDROP=夜晚')

    await selectTarget(page, 'Stage')
    await page.getByTestId('g2-edit-wait').fill('1')
    await applyAndWait(page)
    await page.getByTestId('g2-import-sb3').setInputFiles({name: 'my-day-night.sb3', mimeType: 'application/octet-stream', buffer: file})
    await expect(page.getByTestId('g2-vm-status')).toContainText('已重新导入作品', {timeout: 50_000})
    await selectTarget(page, 'Stage')
    await expect(page.getByTestId('g2-edit-wait')).toHaveValue('3')
  })

  test('sandbox rejects day/night projects outside the lesson model and keeps the working project', async ({page}) => {
    test.setTimeout(180_000)
    const sample = Buffer.from(await readFile(U2L02_SAMPLE, 'utf8'), 'base64')
    await openG2Lab(page, U2L02)
    await selectTarget(page, '猫头鹰')
    await page.getByTestId('g2-edit-backdrop').selectOption('夜晚')
    await applyAndWait(page)
    const reject = async (name: string, buffer: Buffer, reason: string | RegExp) => {
      await page.getByTestId('g2-import-sb3').setInputFiles({name, mimeType: 'application/octet-stream', buffer})
      await expect(page.getByTestId('g2-vm-status')).toContainText(reason, {timeout: 50_000})
      await selectTarget(page, '猫头鹰')
      await expect(page.getByTestId('g2-edit-backdrop')).toHaveValue('夜晚')
      await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
    }
    await reject('wait-0.sb3', mutateSb3(sample, p => { p.targets[0].blocks.stage_wait.inputs = {DURATION: [1, [4, '0']]} }), '数字超出允许范围')
    await reject('wait-9.sb3', mutateSb3(sample, p => { p.targets[0].blocks.stage_wait.inputs = {DURATION: [1, [4, '9']]} }), '数字超出允许范围')
    await reject('dusk.sb3', mutateSb3(sample, p => { p.targets[1].blocks.owl_hat.fields = {BACKDROP: ['黄昏', null]} }), '选项不在课程允许范围')
    await reject('repeat-10.sb3', mutateSb3(sample, p => { p.targets[0].blocks.stage_forever.opcode = 'control_repeat' }), /不允许的积木类型|积木输入不符合课程模型/)
    await reject('third-backdrop.sb3', mutateSb3(sample, p => {
      const costumes = p.targets[0].costumes as unknown[]
      p.targets[0].costumes = [...costumes, {...(costumes[0] as object), name: '黄昏'}]
    }), '舞台的造型不符合课程模型')
    await reject('u2-l01-file.sb3', Buffer.from(await readFile(U2L01_SAMPLE, 'utf8'), 'base64'), /导入 Scratch 项目失败/)

    await startCycle(page)
    await expect(spokeOn(page, '猫头鹰', '夜晚').first()).toBeVisible({timeout: 10_000})
    await stopCycle(page)
  })
})
