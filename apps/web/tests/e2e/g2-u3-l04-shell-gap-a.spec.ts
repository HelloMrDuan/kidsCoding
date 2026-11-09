// G2-U3-L04 × 共享 LessonWorkspace：Gap A 课程侧真实验证。
// 被测对象：共享壳（含 ShellControl）+ 本课真实的 EditorSlot（真实 Blockly）+ 真实 Scratch VM 与渲染器沙箱，页面 /learn/g2-u3-l04。
// 验证手机上不靠 DOM 事件劫持、不靠全局命令通道也能可靠操作：添加 / 上移 / 下移 / 删除 / 改数字（本课只有一个数字框：重复次数或加几分），
// 并覆盖 Blockly 焦点丢失、重新选择、运行后修改、草稿恢复。手机视口用触摸点按（tap），桌面用鼠标点击。
// 只读使用共享壳，不修改它。
import {readFileSync} from 'node:fs'
import {expect, test, type Locator, type Page, type TestInfo} from '@playwright/test'

const URL = '/learn/g2-u3-l04'
const DRAFT_KEY = 'kidscoding-draft:G2-U3-L04'

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
  await page.addInitScript(() => { if (!sessionStorage.getItem('l4-keep')) localStorage.removeItem('kidscoding-draft:G2-U3-L04') })
  await page.goto(URL)
  await expect(page.getByTestId('l4-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
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

type P = {t: string; [k: string]: unknown}
type Prog = {scripts: Array<{hat: string | null; body: unknown[]}>}
const score = (by: number): P => ({t: 'score', by})
const hide: P = {t: 'hide'}
const iftouch = (...body: P[]): P => ({t: 'iftouch', body})
const repeat = (times: number, ...body: P[]): P => ({t: 'repeat', times, body})
const flag = (...body: P[]): Prog => ({scripts: [{hat: 'flag', body}]})

const programOf = async (page: Page): Promise<Prog> => JSON.parse((await page.getByTestId('l4-script-host').getAttribute('data-program'))!)
/** “如果”里面的积木列表（脚本第一块是重复，重复里第一块是如果）。 */
const innerOf = async (page: Page) => {
  const rep = (await programOf(page)).scripts[0]?.body[0] as {body?: Array<{body?: unknown[]}>} | undefined
  return rep?.body?.[0]?.body
}
/** 编辑经 Blockly 事件异步回到页面，所以断言用轮询而不是读一次。 */
const expectProgram = (page: Page, expected: Prog) => expect.poll(() => programOf(page)).toEqual(expected)
const expectInner = (page: Page, expected: unknown[]) => expect.poll(() => innerOf(page)).toEqual(expected)
const CANVAS = '.blocklyWorkspace > .blocklyBlockCanvas'

async function addBlock(page: Page, info: TestInfo, type: 'flag' | 'repeat' | 'iftouch' | 'score' | 'hide') {
  if (!(await page.getByTestId('l4-palette').isVisible())) await press(page.getByTestId('l4-add-block'), info)
  await press(page.getByTestId(`l4-add-${type}`), info)
}

async function setNumber(page: Page, value: number) {
  const box = page.getByTestId('l4-number')
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
const SCORE_LABEL = '将 得分 增加'
const IF_LABEL = '如果'
const REPEAT_LABEL = '重复执行'

/** 把键盘焦点从 Blockly 工作区挪走（Blockly 12 的选中随焦点丢失）：聚焦页面上一个与编辑器无关的控件。 */
async function loseBlocklyFocus(page: Page) {
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('[data-testid="ws-file-menu-button"]')?.focus()
  })
  await expect(page.getByTestId('ws-file-menu-button')).toBeFocused()
}

async function goSolve(page: Page, info: TestInfo) {
  await press(page.getByTestId('l4-level-solve'), info)
  await expect(page.getByTestId('l4-script-host')).toBeVisible()
}

/** 搭：绿旗 → 重复 times 次 → 如果〈碰到 篮子？〉→ 将 得分 增加 1。选中的是刚加的“将 得分 增加”。 */
async function buildBase(page: Page, info: TestInfo, times = 30) {
  await addBlock(page, info, 'flag')
  await addBlock(page, info, 'repeat')
  await setNumber(page, times)
  await addBlock(page, info, 'iftouch')
  await addBlock(page, info, 'score')
  await expectProgram(page, flag(repeat(times, iftouch(score(1)))))
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
    run: page.getByTestId(phone ? 'ws-sticky-run' : 'l4-shell-run'),
    saveState: page.getByTestId(phone ? 'ws-sticky-save' : 'l4-shell-save-state'),
    save: async () => {
      if (phone) {
        await page.getByTestId('ws-file-menu-button').click()
        await page.getByTestId('ws-file-save').click()
      } else {
        await press(page.getByTestId('l4-shell-save'), info)
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
    test.describe('G2-U3-L04 共享壳内的 Gap A：真实 EditorSlot + Blockly 的五项编辑操作', () => {
      test.setTimeout(150_000)

      test('五项操作：添加、上移、下移、删除、改数字，全部作用于同一个 Blockly 工作区，并能经壳的运行按钮运行通过', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildBase(page, info) // 添加 + 改数字（重复次数）
        // 在“如果”里再加一块“将 得分 增加”（选中的是刚加的得分块 → 新块接在它后面），把它改成 2
        await addBlock(page, info, 'score')
        await setNumber(page, 2)
        await expectInner(page, [score(1), score(2)])
        // 上移：新块跑到前面；此时它在最上面，不能再上移
        await expect(page.getByTestId('l4-move-up')).toBeEnabled()
        await press(page.getByTestId('l4-move-up'), info)
        await expectInner(page, [score(2), score(1)])
        await expect(page.getByTestId('l4-move-up')).toBeDisabled()
        // 下移：回到原来的顺序；此时它在最下面，不能再下移
        await expect(page.getByTestId('l4-move-down')).toBeEnabled()
        await press(page.getByTestId('l4-move-down'), info)
        await expectInner(page, [score(1), score(2)])
        await expect(page.getByTestId('l4-move-down')).toBeDisabled()
        // 删除：新块被删掉，没有选中，删除和数字框都不可用
        await press(page.getByTestId('l4-delete'), info)
        await expectInner(page, [score(1)])
        await expect(page.getByTestId('l4-delete')).toBeDisabled()
        await expect(page.getByTestId('l4-number')).toBeDisabled()
        // 选中“如果”，再加“隐藏”：新块放进“如果”里面（接在已有内容的末尾）
        await selectBlock(page, info, IF_LABEL)
        await addBlock(page, info, 'hide')
        await expectInner(page, [score(1), hide])
        // 经壳的运行按钮运行：重复 30 次，红球只得一次分
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-stage')).toContainText('正好是本关要求的')
        await expect(page.getByTestId('ws-feedback-task')).toContainText('本次任务达标')
        await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('满足判断要求')
        await expect(page.getByTestId('l4-stage')).toHaveAttribute('data-score', '1')
        await expect(page.getByTestId('ws-feedback')).not.toContainText(/已(经)?掌握/)
      })

      test('Blockly 焦点丢失：焦点离开工作区后，选中的积木仍可被上移 / 下移 / 删除，数字框仍可改', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildBase(page, info)
        await addBlock(page, info, 'hide')
        await expectInner(page, [score(1), hide])
        // 点积木选中得分块（真实 Blockly 选择），再把焦点挪走
        await selectBlock(page, info, SCORE_LABEL)
        await expect(page.getByTestId('l4-number')).toHaveValue('1')
        await loseBlocklyFocus(page)
        // 焦点已不在工作区，按钮和数字框仍然可用，并作用于刚才选中的那一块
        await expect(page.getByTestId('l4-move-down')).toBeEnabled()
        await expect(page.getByTestId('l4-delete')).toBeEnabled()
        await press(page.getByTestId('l4-move-down'), info)
        await expectInner(page, [hide, score(1)])
        await loseBlocklyFocus(page)
        await setNumber(page, 4)
        await expectInner(page, [hide, score(4)])
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l4-delete'), info)
        await expectInner(page, [hide])
        // 删除后没有选中；选中“如果”再加一块得分，直接改数字
        await selectBlock(page, info, IF_LABEL)
        await addBlock(page, info, 'score')
        await setNumber(page, 5)
        await expectInner(page, [hide, score(5)])
      })

      test('重新选择：换选另一块后操作作用于新选中的块；选重复时数字框显示次数；点空白处取消选中后按钮不可用；再选又可用', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildBase(page, info)
        await addBlock(page, info, 'score')
        await setNumber(page, 3)
        await selectBlock(page, info, SCORE_LABEL, 0)
        await expect(page.getByTestId('l4-number')).toHaveValue('1')
        await selectBlock(page, info, SCORE_LABEL, 1)
        await expect(page.getByTestId('l4-number')).toHaveValue('3')
        await loseBlocklyFocus(page)
        await setNumber(page, 6) // 作用于重新选中的第二块，不是之前的第一块
        await expectInner(page, [score(1), score(6)])
        // 选重复：数字框显示重复次数，改它不影响里面的积木
        await selectBlock(page, info, REPEAT_LABEL)
        await expect(page.getByTestId('l4-number')).toHaveValue('30')
        await setNumber(page, 33)
        await expect.poll(async () => (await programOf(page)).scripts[0].body[0]).toMatchObject({t: 'repeat', times: 33})
        await expectInner(page, [score(1), score(6)])
        // 选“如果”：没有数字，数字框不可用
        await selectBlock(page, info, IF_LABEL)
        await expect(page.getByTestId('l4-number')).toBeDisabled()
        // 点工作区空白处：取消选中，删除和数字框不可用
        const ws = page.getByTestId('l4-blockly')
        await ws.scrollIntoViewIfNeeded()
        const box = (await ws.boundingBox())!
        const blank = {x: box.x + box.width * 0.85, y: box.y + box.height * 0.85}
        if (isPhone(info)) await page.touchscreen.tap(blank.x, blank.y)
        else await page.mouse.click(blank.x, blank.y)
        await expect(page.getByTestId('l4-delete')).toBeDisabled()
        await expect(page.getByTestId('l4-number')).toBeDisabled()
        // 再选一块：又可用
        await selectBlock(page, info, SCORE_LABEL, 0)
        await expect(page.getByTestId('l4-delete')).toBeEnabled()
        await expect(page.getByTestId('l4-number')).toHaveValue('1')
      })

      test('运行后修改：通过之后再改，壳显示旧判定已失效、旧结论消失；重新运行得到新结论（每球加 2 分就不通过）', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildBase(page, info)
        await addBlock(page, info, 'hide')
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
        // 运行后用工具栏改得分（焦点先离开工作区）：旧结论失效
        await selectBlock(page, info, SCORE_LABEL)
        await loseBlocklyFocus(page)
        await setNumber(page, 2)
        await expect(page.getByTestId('ws-judgment-stale')).toBeVisible()
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        // 重新运行：本关每球 1 分，红球加了 2 分，一定不通过（球的运动没有随机性）
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-task')).toContainText('红球这一次加了 2 分')
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('还没达到要求')
        // 再用“删除”修改（删掉“隐藏”），旧结论同样失效；补回去再运行又通过
        await selectBlock(page, info, '隐藏')
        await press(page.getByTestId('l4-delete'), info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await selectBlock(page, info, SCORE_LABEL)
        await setNumber(page, 1)
        await addBlock(page, info, 'hide')
        await expectInner(page, [score(1), hide])
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
      })

      test('草稿恢复：刷新后关卡、脚本从草稿恢复，旧判定不恢复；恢复后编辑和焦点丢失场景仍然可靠', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildBase(page, info)
        await addBlock(page, info, 'score') // 多余的一块，稍后删掉
        await setNumber(page, 2)
        await addBlock(page, info, 'hide')
        await runAndWait(page, info)
        const before = await programOf(page)
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', {timeout: 15_000})
        expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('kidscoding-draft')))).toEqual([DRAFT_KEY])
        await page.evaluate(() => sessionStorage.setItem('l4-keep', '1'))
        await page.reload()
        await expect(page.getByTestId('l4-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expect(page.getByTestId('ws-save-message')).toHaveText('已恢复草稿')
        await expect(page.getByTestId('l4-level-solve')).toHaveAttribute('aria-current', 'step')
        await expectProgram(page, before)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        // 恢复出来的脚本是真实的：选中多的那块（得分 2），焦点离开后删掉，回到标准做法再运行通过
        await selectBlock(page, info, SCORE_LABEL, 1)
        await expect(page.getByTestId('l4-number')).toHaveValue('2')
        await loseBlocklyFocus(page)
        await press(page.getByTestId('l4-delete'), info)
        await expectProgram(page, flag(repeat(30, iftouch(score(1), hide))))
        await runAndWait(page, info)
        await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('任务达标')
        // 编辑之后新的草稿覆盖旧的：再刷新，恢复的是编辑后的版本
        await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机', {timeout: 15_000})
        const after = await programOf(page)
        await page.reload()
        await expect(page.getByTestId('l4-engine-status')).toHaveText('Scratch VM 已就绪', {timeout: 60_000})
        await expectProgram(page, after)
      })

      test('ShellControl 协作：槽位工具栏的 运行 / 停止 / 保存 走壳的同一入口，状态与壳一致', async ({page}, info) => {
        await open(page)
        await goSolve(page, info)
        await buildBase(page, info, 100) // 100 圈（每圈一帧），留出点“停止”的时间
        await addBlock(page, info, 'hide')
        const c = controls(page, info)
        const slotRun = c.run
        const shellRun = page.getByTestId('ws-run-toggle')
        if (c.phone) await expect(page.getByTestId('l4-shell-ctl')).toBeHidden()
        else await expect(page.getByTestId('l4-shell-ctl')).toBeVisible()
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
        await expectProgram(page, flag(repeat(100, iftouch(score(1), hide))))
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
        expect(saved).toMatchObject({lessonId: 'G2-U3-L04'})
        expect(saved.script).toMatchObject({levelId: 'solve'})
        expect(JSON.stringify(saved)).not.toMatch(/scores|checks|passedAt|finalScore|trace/)
        // 保存之后再编辑：旧判定失效
        await selectBlock(page, info, SCORE_LABEL)
        await setNumber(page, 3)
        await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
        await expect(c.saveState).toContainText('已保存到本机', {timeout: 10_000})
      })

      test('ShellControl 保存失败：存储写入失败时槽位与壳都显示“未能保存”，不显示“已保存”', async ({page}, info) => {
        await page.addInitScript(() => {
          if (sessionStorage.getItem('l4-keep')) return
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
