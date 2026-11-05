// G2-U3-L02 × 共享 LessonWorkspace：Gap A 课程侧真实验证（OPS-022）。
// 被测对象：共享壳（含 #480 的 D1 修复与 ShellControl）+ 本课真实的 EditorSlot（真实 Blockly）+ 真实 Scratch VM 沙箱，页面 /learn/g2-u3-l02（正式接线后的页面）。
// 验证手机上不靠 DOM 事件劫持、不靠全局命令通道也能可靠操作：添加 / 上移 / 下移 / 删除 / 改数字，
// 并覆盖 Blockly 焦点丢失、重新选择、运行后修改、草稿恢复。手机视口用触摸点按（tap），桌面用鼠标点击。
// 本文件依赖 OPS-022（#480）的壳。#480 合并并完成正式接线之前，/learn/g2-u3-l02 还是过渡课堂页，所以本文件默认跳过；
// 在“#470 + #480”集成工作区里设置 L02_SHELL_WIRED=1 运行。正式接线时删除下面这个开关，使它成为常规用例。
// 没有 #480 的壳时（D1），本文件在页面打开就失败（适配器从未挂载，引擎永远不就绪）。
import {readFileSync} from 'node:fs'
import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test'
import {routeLocalScratchVm} from './scratch-g2-helpers'

const URL = '/learn/g2-u3-l02'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L02'

async function injectCjkFont(page: Page) {
  const file = process.env.L02_CJK_FONT_FILE
  if (!file) return
  const font = readFileSync(file)
  await page.route('**/__cjk-font.woff2', route => route.fulfill({body: font, contentType: 'font/woff2'}))
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = "@font-face{font-family:KcCjk;src:url(/__cjk-font.woff2) format('woff2')} body,body *,svg text{font-family:KcCjk,sans-serif !important}"
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style))
  })
}

async function open(page: Page) {
  await injectCjkFont(page)
  await routeLocalScratchVm(page)
  await page.addInitScript(() => { if (!sessionStorage.getItem('l2-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L02') })
  await page.goto(URL)
  await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
}

const VIEWPORTS = [
  {name: 'desktop', viewport: {width: 1440, height: 900}, hasTouch: false, isMobile: false},
  {name: 'phone', viewport: {width: 375, height: 812}, hasTouch: true, isMobile: true},
] as const
const isPhone = (info: TestInfo) => info.titlePath.some(t => t === '[phone]')

/** 手机用触摸点按，桌面用鼠标点击。 */
async function press(loc: Locator, info: TestInfo) {
  await loc.scrollIntoViewIfNeeded()
  if (isPhone(info)) await loc.tap()
  else await loc.click()
}

type Prog = {scripts: Array<{hat: string | null; body: unknown[]}>}
const programOf = async (page: Page): Promise<Prog> => JSON.parse((await page.getByTestId('l2-script-host').getAttribute('data-program'))!)
const innerOf = async (page: Page) => ((await programOf(page)).scripts[0]?.body[0] as {body?: unknown[]} | undefined)?.body
/** 编辑经 Blockly 事件异步回到页面，所以断言用轮询而不是读一次。 */
const expectProgram = (page: Page, expected: Prog) => expect.poll(() => programOf(page)).toEqual(expected)
const expectInner = (page: Page, expected: unknown[]) => expect.poll(() => innerOf(page)).toEqual(expected)
const SOLVE_PROGRAM: Prog = {scripts: [{hat: 'flag', body: [{t: 'repeat', times: 3, body: [{t: 'move', dx: 50}]}]}]}
const CANVAS = '.blocklyWorkspace > .blocklyBlockCanvas'

async function addBlock(page: Page, info: TestInfo, type: 'flag' | 'move' | 'repeat') {
  if (!(await page.getByTestId('l2-palette').isVisible())) await press(page.getByTestId('l2-add-block'), info)
  await press(page.getByTestId(`l2-add-${type}`), info)
}

async function setNumber(page: Page, value: number) {
  const box = page.getByTestId('l2-number')
  await expect(box).toBeEnabled()
  await box.scrollIntoViewIfNeeded()
  await box.fill(String(value))
}

/** 点积木上的文字来选中它（Blockly 的真实选择）；同名积木取第 nth 个。 */
async function selectBlock(page: Page, info: TestInfo, label: string, nth = 0) {
  const text = page.locator(`${CANVAS} text.blocklyText`, {hasText: label}).nth(nth)
  await text.scrollIntoViewIfNeeded()
  if (isPhone(info)) await text.tap()
  else await text.click()
}

/** 把键盘焦点从 Blockly 工作区挪走（Blockly 12 的选中随焦点丢失）：聚焦页面上一个与编辑器无关的控件。 */
async function loseBlocklyFocus(page: Page) {
  await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-testid="ws-file-menu-button"]')
    el?.focus()
  })
  await expect(page.getByTestId('ws-file-menu-button')).toBeFocused()
}

async function goSolve(page: Page, info: TestInfo) {
  await press(page.getByTestId('l2-level-solve'), info)
  await expect(page.getByTestId('l2-script-host')).toBeVisible()
}

/** 搭：绿旗 → 重复 3 次 → 里面 移动 50。 */
async function buildSolve(page: Page, info: TestInfo) {
  await addBlock(page, info, 'flag')
  await addBlock(page, info, 'repeat')
  await setNumber(page, 3)
  await addBlock(page, info, 'move')
  await setNumber(page, 50)
  await expectProgram(page, SOLVE_PROGRAM)
}

/** 壳自己的运行按钮：手机用脚本区里的粘性运行行，桌面用舞台下方的运行条。 */
const runViaShell = (page: Page, info: TestInfo) => press(page.getByTestId(isPhone(info) ? 'ws-sticky-run' : 'ws-run-toggle'), info)

async function runAndWait(page: Page, info: TestInfo) {
  await runViaShell(page, info)
  await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
}

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})
    test.skip(!process.env.L02_SHELL_WIRED, '需要 #480 的共享壳 + 正式接线的页面；在集成工作区设置 L02_SHELL_WIRED=1')
    test.describe('G2-U3-L02 共享壳内的 Gap A：真实 EditorSlot + Blockly 的五项编辑操作', () => {
      test.setTimeout(150_000)

      test('五项操作：添加、上移、下移、删除、改数字，全部作用于同一个 Blockly 工作区，并能经壳的运行按钮运行通过', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info) // 添加 + 改数字
        // 在重复里再加一块移动（选中的是刚加的 50 → 新块接在它后面）
        await addBlock(page, info, 'move')
        await setNumber(page, 10)
        await expectInner(page, [{t: 'move', dx: 50}, {t: 'move', dx: 10}])
        // 上移：10 跑到 50 前面；此时它在最上面，不能再上移
        await expect(page.getByTestId('l2-move-up')).toBeEnabled()
        await press(page.getByTestId('l2-move-up'), info)
        await expectInner(page, [{t: 'move', dx: 10}, {t: 'move', dx: 50}])
        await expect(page.getByTestId('l2-move-up')).toBeDisabled()
        // 下移：回到原来的顺序；此时它在最下面，不能再下移
        await expect(page.getByTestId('l2-move-down')).toBeEnabled()
        await press(page.getByTestId('l2-move-down'), info)
        await expectInner(page, [{t: 'move', dx: 50}, {t: 'move', dx: 10}])
        await expect(page.getByTestId('l2-move-down')).toBeDisabled()
        // 删除：10 被删掉
        await press(page.getByTestId('l2-delete'), info)
        await expectProgram(page, SOLVE_PROGRAM)
        await expect(page.getByTestId('l2-delete')).toBeDisabled() // 删除后没有选中
        // 经壳的运行按钮运行（D1 修复后适配器已挂载），3 × 50 = 150 接住
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('接到了水果')
        await expect(page.getByTestId('ws-feedback-task')).toContainText('本次任务达标')
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('满足循环应用要求')
        await expect(page.getByTestId('l2-stage')).toHaveAttribute('data-basket-x', '150')
        await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握/)
      })

      test('Blockly 焦点丢失：焦点离开工作区后，选中的积木仍可被上移 / 下移 / 删除 / 改数字', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await addBlock(page, info, 'move')
        await setNumber(page, 10)
        // 点积木选中 50（真实 Blockly 选择），再把焦点挪走
        await selectBlock(page, info, '将 x 坐标增加', 0)
        await expect(page.getByTestId('l2-number')).toHaveValue('50')
        await loseBlocklyFocus(page)
        // 焦点已不在工作区，按钮和数字框仍然可用，并作用于刚才选中的那一块（50）
        await expect(page.getByTestId('l2-move-down')).toBeEnabled()
        await expect(page.getByTestId('l2-delete')).toBeEnabled()
        await expect(page.getByTestId('l2-number')).toHaveValue('50')
        await press(page.getByTestId('l2-move-down'), info)
        await expectInner(page, [{t: 'move', dx: 10}, {t: 'move', dx: 50}])
        await loseBlocklyFocus(page)
        await setNumber(page, 40)
        await expectInner(page, [{t: 'move', dx: 10}, {t: 'move', dx: 40}])
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l2-delete'), info)
        await expectInner(page, [{t: 'move', dx: 10}])
        // 点工具栏按钮本身把焦点带走，也不丢选中：删除后没有选中，新加的块接在脚本末尾并被选中，直接改数字
        await addBlock(page, info, 'move')
        await setNumber(page, 20)
        await expectProgram(page, {scripts: [{hat: 'flag', body: [{t: 'repeat', times: 3, body: [{t: 'move', dx: 10}]}, {t: 'move', dx: 20}]}]})
      })

      test('重新选择：换选另一块后操作作用于新选中的块；点空白处取消选中后按钮不可用；再选又可用', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await addBlock(page, info, 'move')
        await setNumber(page, 10)
        await selectBlock(page, info, '将 x 坐标增加', 0)
        await expect(page.getByTestId('l2-number')).toHaveValue('50')
        await selectBlock(page, info, '将 x 坐标增加', 1)
        await expect(page.getByTestId('l2-number')).toHaveValue('10')
        await loseBlocklyFocus(page)
        await setNumber(page, 30) // 作用于重新选中的 10，不是之前的 50
        await expectInner(page, [{t: 'move', dx: 50}, {t: 'move', dx: 30}])
        // 选重复：数字框显示重复次数，改它不影响移动
        await selectBlock(page, info, '重复执行')
        await expect(page.getByTestId('l2-number')).toHaveValue('3')
        await setNumber(page, 2)
        await expect.poll(async () => (await programOf(page)).scripts[0].body[0]).toMatchObject({t: 'repeat', times: 2})
        // 点工作区空白处：取消选中，删除和数字框不可用
        const ws = page.getByTestId('l2-blockly')
        await ws.scrollIntoViewIfNeeded() // 先滚到位再量坐标，否则坐标是滚动前的
        const box = (await ws.boundingBox())!
        const blank = {x: box.x + box.width * 0.7, y: box.y + box.height * 0.5}
        if (isPhone(info)) await page.touchscreen.tap(blank.x, blank.y)
        else await page.mouse.click(blank.x, blank.y)
        await expect(page.getByTestId('l2-delete')).toBeDisabled()
        await expect(page.getByTestId('l2-number')).toBeDisabled()
        // 再选一块：又可用
        await selectBlock(page, info, '将 x 坐标增加', 0)
        await expect(page.getByTestId('l2-delete')).toBeEnabled()
        await expect(page.getByTestId('l2-number')).toHaveValue('50')
      })

      test('运行后修改：通过之后再改，壳显示旧判定已失效、旧结论消失；重新运行得到新结论', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
        // 运行后用工具栏改数字（焦点先离开工作区）：旧结论失效
        await selectBlock(page, info, '将 x 坐标增加', 0)
        await loseBlocklyFocus(page)
        await setNumber(page, 20)
        await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        // 重新运行：3 × 20 = 60，离水果 150 太远，如实未通过
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('没接到水果')
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('还没达到要求')
        // 再用“删除”修改，旧结论同样失效；改回去再运行又通过
        await selectBlock(page, info, '将 x 坐标增加', 0)
        await press(page.getByTestId('l2-delete'), info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await selectBlock(page, info, '重复执行') // 选中重复，新块才会加进重复里面
        await addBlock(page, info, 'move')
        await setNumber(page, 50)
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('接到了水果')
      })

      test('草稿恢复：刷新后关卡、脚本从草稿恢复，旧判定不恢复；恢复后五项操作和焦点丢失场景仍然可靠', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await addBlock(page, info, 'move')
        await setNumber(page, 10)
        await runAndWait(page, info)
        const before = await programOf(page)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', {timeout: 15_000})
        // 同一个草稿键，只有一份
        expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kidscoding-draft')))).toEqual([DRAFT_KEY])
        await page.evaluate(() => sessionStorage.setItem('l2-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
        await expect(page.getByTestId('l2-level-solve')).toHaveAttribute('aria-current', 'step')
        await expectProgram(page, before)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0) // 判定不入草稿，也不恢复
        // 恢复出来的脚本是真实的：先改回去（删掉多的 10）再运行通过
        await selectBlock(page, info, '将 x 坐标增加', 1)
        await expect(page.getByTestId('l2-number')).toHaveValue('10')
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l2-move-up'), info)
        await expectInner(page, [{t: 'move', dx: 10}, {t: 'move', dx: 50}])
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l2-delete'), info)
        await expectProgram(page, SOLVE_PROGRAM)
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('接到了水果')
        // 编辑之后新的草稿覆盖旧的：再刷新，恢复的是编辑后的版本
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', {timeout: 15_000})
        const after = await programOf(page)
        await page.reload()
        await expect(page.getByTestId('l2-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expectProgram(page, after)
      })

      test('ShellControl 协作：槽位工具栏的 运行 / 停止 / 保存 走壳的同一入口，状态与壳一致', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        const slotRun = page.getByTestId('l2-shell-run')
        const shellRun = page.getByTestId('ws-run-toggle')
        await expect(slotRun).toHaveText('运行作品')
        await expect(page.getByTestId('l2-shell-save-state')).toHaveText('未保存')
        // 槽位按钮运行：壳的运行按钮同时变成“停止”，结束后一起回到“运行作品”，判定由壳展示
        await press(slotRun, info)
        await expect(slotRun).toHaveAttribute('data-running', 'true')
        await expect(shellRun).toHaveText('停止')
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expect(slotRun).toHaveText('运行作品')
        await expect(shellRun).toHaveText('运行作品')
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('接到了水果')
        // 槽位按钮停止：运行中点它，运行被停掉，不产生判定，脚本保留
        await press(slotRun, info)
        await expect(slotRun).toHaveAttribute('data-running', 'true')
        await press(slotRun, info)
        await expect(slotRun).toHaveText('运行作品', {timeout: 15_000})
        await expect(shellRun).toHaveText('运行作品')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expectProgram(page, SOLVE_PROGRAM)
        // 停止之后能再次运行并得到判定（没有残留的旧运行）
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('接到了水果')
        // 从壳的按钮停止同样有效，槽位按钮随之回到“运行作品”
        await press(shellRun, info)
        await expect(slotRun).toHaveAttribute('data-running', 'true')
        await press(shellRun, info)
        await expect(slotRun).toHaveText('运行作品', {timeout: 15_000})
        // 保存：槽位的保存按钮 = 壳的显式保存；状态与壳的保存标签一致
        await press(page.getByTestId('l2-shell-save'), info)
        await expect(page.getByTestId('l2-shell-save-state')).toHaveText('已保存到本机')
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机')
        const saved = JSON.parse((await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY))!)
        expect(saved).toMatchObject({lessonId: 'G2-U3-L02'})
        expect(saved.script).toMatchObject({levelId: 'solve'})
        expect(JSON.stringify(saved)).not.toMatch(/landing|passedAt|basketMoves/)
        // 保存之后再编辑：旧判定失效（壳 1 秒防抖自动保存，所以这里不断言“未保存”的瞬时状态）
        await selectBlock(page, info, '将 x 坐标增加', 0)
        await setNumber(page, 40)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(page.getByTestId('l2-shell-save-state')).toHaveText('已保存到本机', {timeout: 10_000}) // 自动保存后与壳一致
      })

      test('ShellControl 保存失败：存储写入失败时槽位与壳都显示“未能保存”，不显示“已保存”', async ({page}, info) => {
        await page.addInitScript(() => {
          if (sessionStorage.getItem('l2-keep')) return
          const original = Storage.prototype.setItem
          Storage.prototype.setItem = function (key: string, value: string) {
            if (String(key).startsWith('kidscoding-draft')) throw new Error('quota')
            return original.call(this, key, value)
          }
        })
        await open(page)
        await goSolve(page, info)
        await addBlock(page, info, 'flag')
        await press(page.getByTestId('l2-shell-save'), info)
        await expect(page.getByTestId('l2-shell-save-state')).toHaveText('未能保存')
        await expect(page.getByTestId('l2-shell-save-state')).toHaveAttribute('data-state', 'failed')
        await expect(page.getByTestId('ws-save-chip')).toContainText('未能保存')
        await expect(page.getByTestId('ws-save-chip')).not.toContainText('已保存')
      })
    })
  })
}
