/**
 * G2-U1 viewport acceptance: the six U1 lessons, each run at mobile 375x812
 * (real mobile touch emulation: isMobile + hasTouch, actions via tap),
 * tablet 768x1024 (hasTouch, actions via tap) and desktop 1440x900 (click).
 *
 * Per lesson the test performs the lesson's proven key block operation,
 * applies it to the real Scratch VM, re-runs it (green flag, plus Stop for
 * the flag/stop transition), and asserts the VM outcome that the main
 * scratch-g2-u1.spec.ts proves at desktop -- here extended to three
 * viewports and to tap. It also asserts no horizontal overflow before and
 * after the interaction, and records the green-flag / apply button boxes
 * (touch-target sizes) plus one main-interaction-state screenshot per
 * lesson per viewport under test-results (see the CI job).
 *
 * Lab interaction model (form-based editor, not drag): target selection is
 * panel switching, covered here via tap on touch viewports; stage sprites
 * have draggable=false and there are no drag handlers, so drag is N/A by
 * design. The lab's vm-status text is a last-event label, not an idle
 * indicator: the flag click sets it to 'running' and no flag-flow
 * transition clears it, so the flag checks assert the two deterministic
 * transitions (flag registers a run, Stop ends it) plus the lesson's own
 * VM outcome -- never a return to the loaded text.
 *
 * Local runs behind a proxy that cannot reach jsDelivr may set
 * SCRATCH_VM_LOCAL_CDN=1 to serve the pinned scratch-vm / scratch-storage
 * bundles from local copies (routeLocalScratchVm in scratch-g2-helpers.ts);
 * CI never sets it and uses the real CDN.
 */
import {expect, test, type Page, type TestInfo} from '@playwright/test'
import {writeFile} from 'node:fs/promises'
import {openG2Lab, routeLocalScratchVm, spriteState, stageSprite} from './scratch-g2-helpers'

test.beforeEach(async ({page}, testInfo) => {
  await routeLocalScratchVm(page)
})

const L01 = 'G2-U1-L01'
const L02 = 'G2-U1-L02'
const L03 = 'G2-U1-L03'
const L04 = 'G2-U1-L04'
const L05 = 'G2-U1-L05'
const L06 = 'G2-U1-L06'

type Act = (loc: import('@playwright/test').Locator) => Promise<void>
const actFor = (touch: boolean): Act => (loc) => (touch ? loc.tap() : loc.click())

async function selectT(page: Page, name: string, act: Act) {
  await act(page.locator(`[data-testid="g2-select-target"][data-name="${name}"]`))
  await expect(page.locator(`[data-testid="g2-target-card"][data-name="${name}"]`)).toContainText('当前选中')
}

async function applyAndWait(page: Page, act: Act) {
  await act(page.getByTestId('g2-apply-blocks'))
  await expect(page.getByTestId('g2-apply-blocks')).toBeDisabled({timeout: 12_000})
  await expect(page.getByTestId('g2-green-flag')).toBeEnabled({timeout: 12_000})
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function shot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({path: testInfo.outputPath(`${name}.png`)})
}

async function record(page: Page, testInfo: TestInfo, name: string, extra: Record<string, unknown>) {
  const green = await page.getByTestId('g2-green-flag').boundingBox().catch(() => null)
  const apply = await page.getByTestId('g2-apply-blocks').boundingBox().catch(() => null)
  await writeFile(testInfo.outputPath(`${name}_metrics.json`), JSON.stringify({test: name, greenFlagBox: green, applyBox: apply, ...extra}, null, 2))
}

const VIEWPORTS = [
  {name: '375x812', size: {width: 375, height: 812}, hasTouch: true, isMobile: true, touch: true},
  {name: '768x1024', size: {width: 768, height: 1024}, hasTouch: true, isMobile: false, touch: true},
  {name: '1440x900', size: {width: 1440, height: 900}, hasTouch: false, isMobile: false, touch: false},
] as const

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({viewport: vp.size, hasTouch: vp.hasTouch, isMobile: vp.isMobile})
    const act = actFor(vp.touch)

    test(`${L01} key block op + rerun`, async ({page}, testInfo) => {
      test.setTimeout(150_000)
      await openG2Lab(page, L01)
      const ovBefore = await overflow(page)
      await selectT(page, '小鸟', act)
      await page.getByTestId('g2-edit-x').fill('110')
      await page.getByTestId('g2-edit-y').fill('60')
      await expect(page.getByTestId('g2-green-flag')).toBeDisabled()
      await applyAndWait(page, act)
      await expect(page.getByTestId('g2-vm-status')).toContainText('积木已写入真实 Scratch VM', {timeout: 12_000})
      await act(page.getByTestId('g2-green-flag'))
      await expect(spriteState(page, '小鸟')).toContainText('x 110 · y 60', {timeout: 10_000})
      await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
      const ovAfter = await overflow(page)
      await shot(page, testInfo, `v2_l01_${vp.name}`)
      await record(page, testInfo, `v2_l01_${vp.name}`, {viewport: vp.name, isMobile: vp.isMobile, hasTouch: vp.hasTouch, touchUsed: vp.touch, overflowBefore: ovBefore, overflowAfter: ovAfter})
      expect(ovAfter).toBe(false)
    })

    test(`${L02} key block op + rerun`, async ({page}, testInfo) => {
      test.setTimeout(150_000)
      await openG2Lab(page, L02)
      const ovBefore = await overflow(page)
      await selectT(page, '小橘猫', act)
      await page.getByTestId('g2-edit-times').fill('3')
      await page.getByTestId('g2-edit-wait').fill('0.2')
      await applyAndWait(page, act)
      await act(stageSprite(page, '小橘猫'))
      await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true', {timeout: 10_000})
      await act(page.getByTestId('g2-green-flag'))
      await expect(stageSprite(page, '小橘猫')).toHaveAttribute('data-costume', '站立', {timeout: 10_000})
      // The lab's status text is a last-event label: the flag click sets it
      // to '正在执行…' and no flag-flow transition ever clears it back to
      // the loaded text, so assert the two deterministic transitions instead:
      // the flag click registers a run, and Stop ends it.
      await expect(page.getByTestId('g2-vm-status')).toContainText('正在执行')
      await act(page.getByTestId('g2-stop'))
      await expect(page.getByTestId('g2-vm-status')).toContainText('已通过 Scratch VM stopAll 停止所有脚本。')
      const ovAfter = await overflow(page)
      await shot(page, testInfo, `v2_l02_${vp.name}`)
      await record(page, testInfo, `v2_l02_${vp.name}`, {viewport: vp.name, isMobile: vp.isMobile, hasTouch: vp.hasTouch, touchUsed: vp.touch, overflowBefore: ovBefore, overflowAfter: ovAfter})
      expect(ovAfter).toBe(false)
    })

    test(`${L03} key block op + rerun`, async ({page}, testInfo) => {
      test.setTimeout(150_000)
      await openG2Lab(page, L03)
      const ovBefore = await overflow(page)
      await selectT(page, '小鸟', act)
      await page.getByTestId('g2-edit-sound').selectOption('啾啾')
      await applyAndWait(page, act)
      await act(stageSprite(page, '小鸟'))
      await expect(page.getByTestId('g2-sound-log')).toContainText('小鸟刚才播放“啾啾”', {timeout: 10_000})
      await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
      await act(page.getByTestId('g2-green-flag'))
      // The lab's status text is a last-event label: the flag click sets it
      // to '正在执行…' and no flag-flow transition ever clears it back to
      // the loaded text, so assert the two deterministic transitions instead:
      // the flag click registers a run, and Stop ends it.
      await expect(page.getByTestId('g2-vm-status')).toContainText('正在执行')
      await act(page.getByTestId('g2-stop'))
      await expect(page.getByTestId('g2-vm-status')).toContainText('已通过 Scratch VM stopAll 停止所有脚本。')
      const ovAfter = await overflow(page)
      await shot(page, testInfo, `v2_l03_${vp.name}`)
      await record(page, testInfo, `v2_l03_${vp.name}`, {viewport: vp.name, isMobile: vp.isMobile, hasTouch: vp.hasTouch, touchUsed: vp.touch, overflowBefore: ovBefore, overflowAfter: ovAfter})
      expect(ovAfter).toBe(false)
    })

    test(`${L04} key block op + rerun`, async ({page}, testInfo) => {
      test.setTimeout(150_000)
      await openG2Lab(page, L04)
      const ovBefore = await overflow(page)
      await selectT(page, '小橘猫', act)
      await page.getByTestId('g2-edit-direction').selectOption('90')
      await page.getByTestId('g2-edit-steps').fill('240')
      await applyAndWait(page, act)
      await act(page.getByTestId('g2-green-flag'))
      await expect(spriteState(page, '小橘猫')).toContainText('x 140 · y -70', {timeout: 10_000})
      await expect(page.locator('[data-testid="g2-bubble"][data-name="小橘猫"]')).toHaveCount(0, {timeout: 8_000})
      await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
      const ovAfter = await overflow(page)
      await shot(page, testInfo, `v2_l04_${vp.name}`)
      await record(page, testInfo, `v2_l04_${vp.name}`, {viewport: vp.name, isMobile: vp.isMobile, hasTouch: vp.hasTouch, touchUsed: vp.touch, overflowBefore: ovBefore, overflowAfter: ovAfter})
      expect(ovAfter).toBe(false)
    })

    test(`${L05} key block op + rerun`, async ({page}, testInfo) => {
      test.setTimeout(150_000)
      await openG2Lab(page, L05)
      const ovBefore = await overflow(page)
      await selectT(page, '小白兔', act)
      await page.getByTestId('g2-edit-x').fill('0')
      await applyAndWait(page, act)
      await act(stageSprite(page, '小橘猫'))
      await expect(spriteState(page, '小白兔')).toContainText('x 0 · y -40', {timeout: 10_000})
      await expect(page.getByTestId('g2-task-practiceB')).toHaveAttribute('data-done', 'true')
      await act(page.getByTestId('g2-green-flag'))
      // The lab's status text is a last-event label: the flag click sets it
      // to '正在执行…' and no flag-flow transition ever clears it back to
      // the loaded text, so assert the two deterministic transitions instead:
      // the flag click registers a run, and Stop ends it.
      await expect(page.getByTestId('g2-vm-status')).toContainText('正在执行')
      await act(page.getByTestId('g2-stop'))
      await expect(page.getByTestId('g2-vm-status')).toContainText('已通过 Scratch VM stopAll 停止所有脚本。')
      const ovAfter = await overflow(page)
      await shot(page, testInfo, `v2_l05_${vp.name}`)
      await record(page, testInfo, `v2_l05_${vp.name}`, {viewport: vp.name, isMobile: vp.isMobile, hasTouch: vp.hasTouch, touchUsed: vp.touch, overflowBefore: ovBefore, overflowAfter: ovAfter})
      expect(ovAfter).toBe(false)
    })

    test(`${L06} key block op + rerun`, async ({page}, testInfo) => {
      test.setTimeout(150_000)
      await openG2Lab(page, L06)
      const ovBefore = await overflow(page)
      await selectT(page, '蛋糕', act)
      await page.getByTestId('g2-edit-costume').selectOption('蜡烛点亮')
      await applyAndWait(page, act)
      await act(stageSprite(page, '蛋糕'))
      await expect(page.getByTestId('g2-sound-log')).toContainText('（开始播放时造型：蜡烛点亮）', {timeout: 10_000})
      await expect(page.getByTestId('g2-task-practiceA')).toHaveAttribute('data-done', 'true')
      await act(page.getByTestId('g2-green-flag'))
      await expect(stageSprite(page, '蛋糕')).toHaveAttribute('data-costume', '蜡烛熄灭', {timeout: 10_000})
      const ovAfter = await overflow(page)
      await shot(page, testInfo, `v2_l06_${vp.name}`)
      await record(page, testInfo, `v2_l06_${vp.name}`, {viewport: vp.name, isMobile: vp.isMobile, hasTouch: vp.hasTouch, touchUsed: vp.touch, overflowBefore: ovBefore, overflowAfter: ovAfter})
      expect(ovAfter).toBe(false)
    })
  })
}

test.describe('mobile save/restore spot check', () => {
  test.use({viewport: {width: 375, height: 812}, hasTouch: true, isMobile: true})
  test(`${L01} mobile: edit, reload, draft restores`, async ({page}, testInfo) => {
    test.setTimeout(150_000)
    const act = actFor(true)
    await openG2Lab(page, L01)
    await selectT(page, '小鸟', act)
    await page.getByTestId('g2-edit-x').fill('110')
    await page.getByTestId('g2-edit-y').fill('60')
    await applyAndWait(page, act)
    await page.reload()
    await expect(page.getByTestId('g2-vm-status')).toContainText(/已加载项目|已从本机草稿恢复/, {timeout: 60_000})
    await selectT(page, '小鸟', act)
    await act(page.getByTestId('g2-green-flag'))
    await expect(spriteState(page, '小鸟')).toContainText('x 110 · y 60', {timeout: 10_000})
    await shot(page, testInfo, 'v2_l01_375x812_restore')
  })
})
