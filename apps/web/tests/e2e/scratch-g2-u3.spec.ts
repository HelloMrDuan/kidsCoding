import {expect, test} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {openG2Lab, routeLocalScratchVm, selectTarget, spriteState, unzip} from './scratch-g2-helpers'

// G2-U3-L01 on the real Scratch VM (scratch-vm@5.0.300 in a sandboxed
// iframe). No VM mocks: every task state below comes from VM key-press
// hats and VM target coordinates after real key events.
test.beforeEach(async ({page}) => {
  await routeLocalScratchVm(page)
})

const U3L01 = 'G2-U3-L01'
const U3L01_SAMPLE = 'public/scratch-samples/g2-u3-l01-boat-keys.sb3.b64'
const keyLog = (page: import('@playwright/test').Page) => page.getByTestId('g2-key-log')
async function applyAndWait(page: import('@playwright/test').Page) {
  await page.getByTestId('g2-apply-blocks').click()
  await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled({timeout: 12_000})
  await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
}
// 约定（2026-11-01 首席裁定：改 spec，不改实验台）：实验台 key-log 记录的是
// 按键当时（移动前）的小船 x，不是移动后的 x。pressKey 因此断言两个不同的值：
//   - key-log data-last-x = prevX（按键当时、移动前的 x）
//   - 精灵状态文本 = x（VM 执行移动后的 x）
// 实验台记移动前 x 是 2026-10-31 已记录的既有行为，不是本次变基的回归；
// 本 spec 是新进 CI 的一侧，其“移动后 x”假设错了，改假设。
async function pressKey(page: import('@playwright/test').Page, key: 'right' | 'left', x: number, prevX: number) {
  await page.getByTestId(key === 'right' ? 'g2-key-right' : 'g2-key-left').click()
  await expect(keyLog(page)).toHaveAttribute('data-last-key', key === 'right' ? 'right arrow' : 'left arrow')
  await expect(keyLog(page)).toHaveAttribute('data-last-x', String(prevX))
  await expect(spriteState(page, '巡逻小船')).toContainText(`x ${x} · y -20`)
}

test.describe('G2-U3-L01 键盘控制小船', () => {
  test('catalog entry opens the boat lab; right key moves +10, left key also moves +10 at first; hints lead to -10 and back to zero (debug + prediction)', async ({page}) => {
    test.setTimeout(180_000)
    await openG2Lab(page, U3L01)
    await expect(page.getByRole('heading', {name: '键盘控制小船'})).toBeVisible()
    await expect(page.getByTestId('g2-backdrop')).toHaveText('海洋巡逻')
    await expect(keyLog(page)).toContainText('还没有按键')

    await page.getByTestId('g2-predict-option').filter({hasText: '向右走'}).first().click()
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '巡逻小船')).toContainText('x 0 · y -20')
    await pressKey(page, 'right', 10, 0)
    await expect(page.getByTestId('g2-predict-result')).toContainText('Scratch VM 实际：向右走')
    // The starting bug: the left key also moves +10, so the boat cannot sail back.
    await pressKey(page, 'left', 20, 10)
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'false')

    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-1')).toContainText('x 从 0 变成 10')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-2')).toContainText('左键脚本里')
    await page.getByTestId('g2-next-hint').click()
    await expect(page.getByTestId('g2-hint-3')).toContainText('-10')

    await selectTarget(page, '巡逻小船')
    await expect(page.getByTestId('g2-edit-dx')).toHaveValue('10')
    await expect(page.getByTestId('g2-edit-dx-2')).toHaveValue('10')
    await page.getByTestId('g2-edit-dx-2').fill('-10')
    await applyAndWait(page)
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '巡逻小船')).toContainText('x 0 · y -20')
    await pressKey(page, 'right', 10, 0)
    await pressKey(page, 'left', 0, 10)
    await expect(page.getByTestId('g2-task-debug')).toHaveAttribute('data-done', 'true')
    await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
  })

  test('practice A: three right presses reach x 30; out-of-range steps are refused; creative step 20 returns to zero and exports a real .sb3', async ({page}) => {
    test.setTimeout(180_000)
    await openG2Lab(page, U3L01)
    await selectTarget(page, '巡逻小船')
    await page.getByTestId('g2-edit-dx-2').fill('-10')
    await applyAndWait(page)
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '巡逻小船')).toContainText('x 0 · y -20')
    await pressKey(page, 'right', 10, 0)
    await pressKey(page, 'right', 20, 10)
    await pressKey(page, 'right', 30, 20)
    await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')

    const rightStep = page.getByTestId('g2-edit-dx')
    for (const bad of ['0', '21', '-5']) {
      await rightStep.fill(bad)
      expect(await rightStep.inputValue()).toBe(bad)
      await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled()
    }
    await rightStep.fill('20')
    await applyAndWait(page)
    await page.getByTestId('g2-green-flag').click()
    await expect(spriteState(page, '巡逻小船')).toContainText('x 0 · y -20')
    await pressKey(page, 'right', 20, 0)
    await pressKey(page, 'left', 10, 20)
    await pressKey(page, 'left', 0, 10)
    await expect(page.getByTestId('g2-task-create')).toHaveAttribute('data-done', 'true')

    const downloading = page.waitForEvent('download', {timeout: 60_000})
    await page.getByTestId('g2-export-sb3').click()
    const downloaded = await downloading
    expect(downloaded.suggestedFilename()).toBe('KidsCoding-键盘控制小船.sb3')
    const file = await readFile((await downloaded.path())!)
    const entries = unzip(file)
    expect(entries.filter(entry => /^[0-9a-f]{32}\.svg$/.test(entry.name))).toHaveLength(2)
    const project = JSON.parse(entries.find(entry => entry.name === 'project.json')!.data.toString('utf8'))
    const boat = project.targets.find((t: {name: string}) => t.name === '巡逻小船')
    expect(boat.blocks.boat_right_move.inputs.DX[1][1]).toBe('20')
    expect(boat.blocks.boat_left_move.inputs.DX[1][1]).toBe('-10')
    await expect(page.getByTestId('g2-export-status')).toContainText('独立 VM 中重新载入验证')
    // 导出摘要格式是“目标 字段=值”（与 G2-U1 诸 spec 同一约定，见 lab 的
    // PROJECT_EXPORTED 摘要拼接：取参数键的字段段）；本用例左键 DX 为 -10，
    // 故 DX=20 只能是右键步数，与上面 .sb3 内容断言共同验明两值。
    await expect(page.getByTestId('g2-export-status')).toContainText('巡逻小船 DX=20')
  })
})
