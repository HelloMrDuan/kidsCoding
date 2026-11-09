// G2-U3-L03 × 共享 LessonWorkspace：Gap A 课程侧真实验证。
// 被测对象：共享壳（含 #480 的 D1 修复与 ShellControl，已在 main）+ 本课真实的 EditorSlot（真实 Blockly）+ 真实 Scratch VM 沙箱，页面 /learn/g2-u3-l03。
// 验证手机上不靠 DOM 事件劫持、不靠全局命令通道也能可靠操作：添加 / 上移 / 下移 / 删除 / 改数字（本课有两个数字框：下界、上界），
// 并覆盖 Blockly 焦点丢失、重新选择、运行后修改、草稿恢复。手机视口用触摸点按（tap），桌面用鼠标点击。
// 只读使用共享壳，不修改它。
import {readFileSync} from 'node:fs'
import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test'

const URL = '/learn/g2-u3-l03'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L03'

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
  await page.addInitScript(() => { if (!sessionStorage.getItem('l3-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L03') })
  await page.goto(URL)
  await expect(page.getByTestId('l3-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
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

type RX = {t: 'randomx'; from: number; to: number}
type Prog = {scripts: Array<{hat: string | null; body: unknown[]}>}
const programOf = async (page: Page): Promise<Prog> => JSON.parse((await page.getByTestId('l3-script-host').getAttribute('data-program'))!)
const innerOf = async (page: Page) => ((await programOf(page)).scripts[0]?.body[0] as {body?: unknown[]} | undefined)?.body
/** 编辑经 Blockly 事件异步回到页面，所以断言用轮询而不是读一次。 */
const expectProgram = (page: Page, expected: Prog) => expect.poll(() => programOf(page)).toEqual(expected)
const expectInner = (page: Page, expected: unknown[]) => expect.poll(() => innerOf(page)).toEqual(expected)
const rx = (from: number, to: number): RX => ({t: 'randomx', from, to})
const solveProgram = (times = 10): Prog => ({scripts: [{hat: 'flag', body: [{t: 'repeat', times, body: [rx(-150, 150)]}]}]})
const CANVAS = '.blocklyWorkspace > .blocklyBlockCanvas'
/** 积木右边的文字：左边的字紧挨着分类抽屉的滚动条，桌面上可能被它挡住。 */
const RX_LABEL = '之间取随机数'

async function addBlock(page: Page, info: TestInfo, type: 'flag' | 'randomx' | 'repeat') {
  if (!(await page.getByTestId('l3-palette').isVisible())) await press(page.getByTestId('l3-add-block'), info)
  await press(page.getByTestId(`l3-add-${type}`), info)
}

async function setFirst(page: Page, value: number) {
  const box = page.getByTestId('l3-number')
  await expect(box).toBeEnabled()
  await box.scrollIntoViewIfNeeded()
  await box.fill(String(value))
}
async function setTo(page: Page, value: number) {
  const box = page.getByTestId('l3-number-to')
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
    document.querySelector<HTMLElement>('[data-testid="ws-file-menu-button"]')?.focus()
  })
  await expect(page.getByTestId('ws-file-menu-button')).toBeFocused()
}

async function goSolve(page: Page, info: TestInfo) {
  await press(page.getByTestId('l3-level-solve'), info)
  await expect(page.getByTestId('l3-script-host')).toBeVisible()
}

/** 搭：绿旗 → 重复 times 次 → 里面 将 x 设为 -150～150 之间的随机数。 */
async function buildSolve(page: Page, info: TestInfo, times = 10) {
  await addBlock(page, info, 'flag')
  await addBlock(page, info, 'repeat')
  await setFirst(page, times)
  await addBlock(page, info, 'randomx')
  await setFirst(page, -150)
  await setTo(page, 150)
  await expectProgram(page, solveProgram(times))
}

/**
 * ShellControl 的入口。≥768px：槽位工具栏里有运行 / 停止 / 保存（走 props.shell，和壳是同一入口）。
 * 手机：壳自己的粘性运行行始终在视口顶部，槽位里再放一份只会把积木编辑区挤出首屏，所以槽位的副本在手机上隐藏；
 * 手机用壳的粘性运行行和文件菜单驱动同一套运行 / 停止 / 保存。
 */
function controls(page: Page, info: TestInfo) {
  const phone = isPhone(info)
  return {
    phone,
    run: page.getByTestId(phone ? 'ws-sticky-run' : 'l3-shell-run'),
    saveState: page.getByTestId(phone ? 'ws-sticky-save' : 'l3-shell-save-state'),
    save: async () => {
      if (phone) {
        await page.getByTestId('ws-file-menu-button').click()
        await page.getByTestId('ws-file-save').click()
      } else {
        await press(page.getByTestId('l3-shell-save'), info)
      }
    },
  }
}

const runViaShell = (page: Page, info: TestInfo) => press(page.getByTestId(isPhone(info) ? 'ws-sticky-run' : 'ws-run-toggle'), info)

async function runAndWait(page: Page, info: TestInfo) {
  await runViaShell(page, info)
  await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
}

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}]`, () => {
    test.use({viewport: {...vp.viewport}, hasTouch: vp.hasTouch, isMobile: vp.isMobile})
    test.describe('G2-U3-L03 共享壳内的 Gap A：真实 EditorSlot + Blockly 的五项编辑操作', () => {
      test.setTimeout(150_000)

      test('五项操作：添加、上移、下移、删除、改数字（下界、上界），全部作用于同一个 Blockly 工作区，并能经壳的运行按钮运行通过', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info) // 添加 + 改数字（下界、上界）
        // 在重复里再加一块（选中的是刚加的 -150～150 → 新块接在它后面）
        await addBlock(page, info, 'randomx')
        await setFirst(page, -20)
        await setTo(page, 20)
        await expectInner(page, [rx(-150, 150), rx(-20, 20)])
        // 上移：新块跑到前面；此时它在最上面，不能再上移
        await expect(page.getByTestId('l3-move-up')).toBeEnabled()
        await press(page.getByTestId('l3-move-up'), info)
        await expectInner(page, [rx(-20, 20), rx(-150, 150)])
        await expect(page.getByTestId('l3-move-up')).toBeDisabled()
        // 下移：回到原来的顺序；此时它在最下面，不能再下移
        await expect(page.getByTestId('l3-move-down')).toBeEnabled()
        await press(page.getByTestId('l3-move-down'), info)
        await expectInner(page, [rx(-150, 150), rx(-20, 20)])
        await expect(page.getByTestId('l3-move-down')).toBeDisabled()
        // 删除：新块被删掉
        await press(page.getByTestId('l3-delete'), info)
        await expectProgram(page, solveProgram())
        await expect(page.getByTestId('l3-delete')).toBeDisabled()
        await expect(page.getByTestId('l3-number')).toBeDisabled()
        await expect(page.getByTestId('l3-number-to')).toBeDisabled()
        // 经壳的运行按钮运行：-150～150 重复 10 次，通过
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('全部在本关要求的')
        await expect(page.getByTestId('ws-feedback-task')).toContainText('本次任务达标')
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('满足取值范围要求')
        await expect(page.getByTestId('l3-stage')).toHaveAttribute('data-placed', '10')
        await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握/)
      })

      test('Blockly 焦点丢失：焦点离开工作区后，选中的积木仍可被上移 / 下移 / 删除，下界和上界两个数字框都仍可改', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await addBlock(page, info, 'randomx')
        await setFirst(page, -20)
        await setTo(page, 20)
        // 点积木选中第一块（真实 Blockly 选择），再把焦点挪走
        await selectBlock(page, info, RX_LABEL, 0)
        await expect(page.getByTestId('l3-number')).toHaveValue('-150')
        await expect(page.getByTestId('l3-number-to')).toHaveValue('150')
        await loseBlocklyFocus(page)
        // 焦点已不在工作区，按钮和两个数字框仍然可用，并作用于刚才选中的那一块
        await expect(page.getByTestId('l3-move-down')).toBeEnabled()
        await expect(page.getByTestId('l3-delete')).toBeEnabled()
        await expect(page.getByTestId('l3-number')).toHaveValue('-150')
        await press(page.getByTestId('l3-move-down'), info)
        await expectInner(page, [rx(-20, 20), rx(-150, 150)])
        await loseBlocklyFocus(page)
        await setTo(page, 100)
        await expectInner(page, [rx(-20, 20), rx(-150, 100)])
        await loseBlocklyFocus(page)
        await setFirst(page, -90)
        await expectInner(page, [rx(-20, 20), rx(-90, 100)])
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l3-delete'), info)
        await expectInner(page, [rx(-20, 20)])
        // 删除后没有选中；新加的块接在脚本末尾并被选中，直接改两个数字
        await addBlock(page, info, 'randomx')
        await setFirst(page, -5)
        await setTo(page, 5)
        await expectProgram(page, {scripts: [{hat: 'flag', body: [{t: 'repeat', times: 10, body: [rx(-20, 20)]}, rx(-5, 5)]}]})
      })

      test('重新选择：换选另一块后操作作用于新选中的块；选重复时上界框不可用；点空白处取消选中后按钮不可用；再选又可用', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await addBlock(page, info, 'randomx')
        await setFirst(page, -20)
        await setTo(page, 20)
        await selectBlock(page, info, RX_LABEL, 0)
        await expect(page.getByTestId('l3-number')).toHaveValue('-150')
        await selectBlock(page, info, RX_LABEL, 1)
        await expect(page.getByTestId('l3-number')).toHaveValue('-20')
        await expect(page.getByTestId('l3-number-to')).toHaveValue('20')
        await loseBlocklyFocus(page)
        await setTo(page, 30) // 作用于重新选中的第二块，不是之前的第一块
        await expectInner(page, [rx(-150, 150), rx(-20, 30)])
        // 选重复：数字框显示重复次数，上界框不可用，改它不影响里面的积木
        await selectBlock(page, info, '重复执行')
        await expect(page.getByTestId('l3-number')).toHaveValue('10')
        await expect(page.getByTestId('l3-number-to')).toBeDisabled()
        await setFirst(page, 12)
        await expect.poll(async () => (await programOf(page)).scripts[0].body[0]).toMatchObject({t: 'repeat', times: 12})
        await expectInner(page, [rx(-150, 150), rx(-20, 30)])
        // 点工作区空白处：取消选中，删除和两个数字框不可用
        const ws = page.getByTestId('l3-blockly')
        await ws.scrollIntoViewIfNeeded()
        const box = (await ws.boundingBox())!
        const blank = {x: box.x + box.width * 0.85, y: box.y + box.height * 0.85}
        if (isPhone(info)) await page.touchscreen.tap(blank.x, blank.y)
        else await page.mouse.click(blank.x, blank.y)
        await expect(page.getByTestId('l3-delete')).toBeDisabled()
        await expect(page.getByTestId('l3-number')).toBeDisabled()
        await expect(page.getByTestId('l3-number-to')).toBeDisabled()
        // 再选一块：又可用
        await selectBlock(page, info, RX_LABEL, 0)
        await expect(page.getByTestId('l3-delete')).toBeEnabled()
        await expect(page.getByTestId('l3-number')).toHaveValue('-150')
        await expect(page.getByTestId('l3-number-to')).toHaveValue('150')
      })

      test('运行后修改：通过之后再改，壳显示旧判定已失效、旧结论消失；重新运行得到新结论（上界写成 250 就不通过）', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
        // 运行后用工具栏改上界（焦点先离开工作区）：旧结论失效
        await selectBlock(page, info, RX_LABEL, 0)
        await loseBlocklyFocus(page)
        await setTo(page, 250)
        await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        // 重新运行：上界 250 超出要求的 180，知识证据一定不通过（不管这一次碰巧取到什么）
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('没有满足取值范围要求')
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('还没达到要求')
        // 再用“删除”修改，旧结论同样失效；补回去再运行又通过
        await selectBlock(page, info, RX_LABEL, 0)
        await press(page.getByTestId('l3-delete'), info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await selectBlock(page, info, '重复执行') // 选中重复，新块才会加进重复里面
        await addBlock(page, info, 'randomx')
        await setFirst(page, -150)
        await setTo(page, 150)
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
      })

      test('草稿恢复：刷新后关卡、脚本从草稿恢复，旧判定不恢复；恢复后编辑和焦点丢失场景仍然可靠', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info)
        await addBlock(page, info, 'randomx')
        await setFirst(page, -20)
        await setTo(page, 20)
        await runAndWait(page, info)
        const before = await programOf(page)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', {timeout: 15_000})
        expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kidscoding-draft')))).toEqual([DRAFT_KEY])
        await page.evaluate(() => sessionStorage.setItem('l3-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l3-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
        await expect(page.getByTestId('l3-level-solve')).toHaveAttribute('aria-current', 'step')
        await expectProgram(page, before)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        // 恢复出来的脚本是真实的：把多的那块（-20～20）移到最上面再删掉，回到标准做法再运行通过
        await selectBlock(page, info, RX_LABEL, 1)
        await expect(page.getByTestId('l3-number')).toHaveValue('-20')
        await expect(page.getByTestId('l3-number-to')).toHaveValue('20')
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l3-move-up'), info)
        await expectInner(page, [rx(-20, 20), rx(-150, 150)])
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l3-delete'), info)
        await expectProgram(page, solveProgram())
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
        // 编辑之后新的草稿覆盖旧的：再刷新，恢复的是编辑后的版本
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', {timeout: 15_000})
        const after = await programOf(page)
        await page.reload()
        await expect(page.getByTestId('l3-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expectProgram(page, after)
      })

      test('ShellControl 协作：槽位工具栏的 运行 / 停止 / 保存 走壳的同一入口，状态与壳一致', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildSolve(page, info, 20) // 20 圈（每圈一帧），留出点“停止”的时间；仍满足“至少 10 次”
        const c = controls(page, info)
        const slotRun = c.run
        const shellRun = page.getByTestId('ws-run-toggle')
        if (c.phone) await expect(page.getByTestId('l3-shell-ctl')).toBeHidden()
        else await expect(page.getByTestId('l3-shell-ctl')).toBeVisible()
        await expect(slotRun).toHaveText('运行作品')
        await expect(c.saveState).toContainText('未保存')
        // 运行：壳的运行按钮同时变成“停止”，结束后一起回到“运行作品”，判定由壳展示
        await press(slotRun, info)
        await expect(shellRun).toHaveText('停止')
        await expect(slotRun).toHaveText('停止')
        await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({timeout: 30_000})
        await expect(slotRun).toHaveText('运行作品')
        await expect(shellRun).toHaveText('运行作品')
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
        // 运行中点停止：运行被停掉，不产生判定，脚本保留
        await press(slotRun, info)
        await expect(slotRun).toHaveText('停止')
        await press(slotRun, info)
        await expect(slotRun).toHaveText('运行作品', {timeout: 15_000})
        await expect(shellRun).toHaveText('运行作品')
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expectProgram(page, solveProgram(20))
        // 停止之后能再次运行并得到判定
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
        // 从壳的运行区停止同样有效，另一个入口随之回到“运行作品”
        await press(shellRun, info)
        await expect(slotRun).toHaveText('停止')
        await press(shellRun, info)
        await expect(slotRun).toHaveText('运行作品', {timeout: 15_000})
        // 保存：显式保存 = 壳的显式保存；状态与壳的保存标签一致
        await c.save()
        await expect(c.saveState).toContainText('已保存到本机')
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机')
        const saved = JSON.parse((await page.evaluate(k => localStorage.getItem(k), DRAFT_KEY))!)
        expect(saved).toMatchObject({lessonId: 'G2-U3-L03'})
        expect(saved.script).toMatchObject({levelId: 'solve'})
        expect(JSON.stringify(saved)).not.toMatch(/placements|draws|passedAt|trail/)
        // 保存之后再编辑：旧判定失效
        await selectBlock(page, info, RX_LABEL, 0)
        await setTo(page, 140)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(c.saveState).toContainText('已保存到本机', {timeout: 10_000})
      })

      test('ShellControl 保存失败：存储写入失败时槽位与壳都显示“未能保存”，不显示“已保存”', async ({page}, info) => {
        await page.addInitScript(() => {
          if (sessionStorage.getItem('l3-keep')) return
          const original = Storage.prototype.setItem
          Storage.prototype.setItem = function (key: string, value: string) {
            if (String(key).startsWith('kidscoding-draft')) throw new Error('quota')
            return original.call(this, key, value)
          }
        })
        await open(page)
        await goSolve(page, info)
        await addBlock(page, info, 'flag')
        const c = controls(page, info)
        await c.save()
        await expect(c.saveState).toContainText('未能保存')
        await expect(page.getByTestId('ws-save-chip')).toContainText('未能保存')
        await expect(page.getByTestId('ws-save-chip')).not.toContainText('已保存')
        await expect(c.saveState).not.toContainText('已保存')
      })
    })
  })
}
