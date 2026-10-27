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
    await page.getByTestId('g2-stage-attach-goto').click()
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
