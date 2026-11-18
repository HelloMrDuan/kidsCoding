import { expect, test, type Page } from '@playwright/test'

/**
 * V3 工作区样板（lesson-01-forest-hello）验收 E2E：证明五区信息架构落在
 * 真实 Blockly 上，而不是静态仿制品：
 * - 外壳分类栏出现且由适配器真实分类驱动，画布内自带工具箱列隐藏；
 * - 点分类栏打开真实 flyout（素材与分类一致）；
 * - 角色区如实标注（狐狸可编程/当前编辑、兔子舞台角色、无增删假按钮）；
 * - 任务带（关卡 + 一句话指令）在画布上方首屏可见，画布与调色板同屏；
 * - Scratch 主题变体生效（开始帽子块填充 #ffbf00）；
 * - 反馈默认只显结论，三层判定收进可展开的详细反馈（数据不删）。
 * 四关完整链与同步/导航 P0 行为由 studio-forest-hello.spec.ts 覆盖。
 */

const ROUTE = '/studio/blockly/lesson-01-forest-hello'
const SHOTS = 'test-results/forest-hello-evidence'

async function openLesson(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto(ROUTE)
  await page
    .getByTestId('ws-editor-slot')
    .locator('svg.blocklySvg')
    .waitFor({ state: 'visible', timeout: 30_000 })
  await page.getByTestId('forest-hello-slot').waitFor({ timeout: 30_000 })
}

test('V3 desktop 1440: rail, roles, task band, scratch theme, feedback layers', async ({ page }) => {
  test.setTimeout(240_000)
  await openLesson(page, 1440, 900)

  // 分类栏：外壳渲染、分类来自适配器（第 1 关只有“开始”）。
  const rail = page.getByTestId('ws-icon-rail')
  await expect(rail).toBeVisible()
  await expect(page.getByTestId('ws-rail-开始')).toBeVisible()
  // 画布内自带工具箱列隐藏（与分类栏不共存）。
  const toolboxDisplay = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ws-editor-slot"] .blocklyToolbox')
    return el ? getComputedStyle(el).display : 'missing'
  })
  expect(toolboxDisplay).toBe('none')

  // 任务带：指令在画布上方且首屏可见（不滚动）。
  const instruction = page.getByTestId('forest-hello-instruction')
  await expect(instruction).toBeVisible()
  const instructionBox = await instruction.boundingBox()
  const canvasBox = await page
    .getByTestId('ws-editor-slot')
    .locator('svg.blocklySvg')
    .boundingBox()
  expect(instructionBox).not.toBeNull()
  expect(canvasBox).not.toBeNull()
  expect(instructionBox!.y).toBeLessThan(canvasBox!.y)
  expect(instructionBox!.y + instructionBox!.height).toBeLessThanOrEqual(900)
  // 调色板与画布同屏（首屏不滚动即可见）。
  await expect(page.getByTestId('lesson-block-palette')).toBeInViewport()

  // 角色区：当前编辑与两种角色如实标注，没有增删/造型假按钮。
  await expect(page.getByTestId('ws-roles-panel')).toBeVisible()
  await expect(page.getByTestId('forest-hello-current-role')).toContainText('小狐狸')
  await expect(page.getByTestId('forest-hello-role-fox')).toContainText('可编程角色')
  await expect(page.getByTestId('forest-hello-role-rabbit')).toContainText('舞台角色')
  await expect(page.getByTestId('forest-hello-role-note')).toContainText('不在本课范围')
  await expect(
    page.getByTestId('ws-roles-panel').getByRole('button', { name: /添加|删除|增删|造型/ }),
  ).toHaveCount(0)

  // Scratch 主题：放一块“开始时”，帽子块填充应为事件色 #ffbf00。
  await page.getByTestId('lesson-add-when_start').click()
  const hatFill = await page.evaluate(() => {
    const path = document.querySelector(
      '[data-testid="ws-editor-slot"] svg.blocklySvg .blocklyBlockCanvas .when_start .blocklyPath',
    )
    return path?.getAttribute('fill') ?? null
  })
  expect(hatFill?.toLowerCase()).toBe('#ffbf00')

  // 运行后反馈：结论直接可见；三层判定在折叠的详细反馈里，展开可见。
  await page.getByTestId('ws-run-toggle').click()
  const conclusion = page.getByTestId('ws-feedback-conclusion')
  await expect(conclusion).toBeVisible({ timeout: 20_000 })
  // 第 1 关的目标就是观察：只有开始块时结论如实说狐狸一动不动（短句）。
  await expect(conclusion).toContainText('一动不动')
  const details = page.getByTestId('ws-feedback-details')
  await expect(details).toBeVisible()
  const isOpen = await details.evaluate((el) => (el as HTMLDetailsElement).open)
  expect(isOpen).toBe(false)
  await details.locator('summary').click()
  await expect(page.getByTestId('ws-feedback-task')).toBeVisible()
  await expect(page.getByTestId('ws-feedback-stage')).toContainText('一动不动')

  await page.screenshot({ path: `${SHOTS}/v3-first-1440.png` })
})

test('V3 rail flyout: step 2 motion category opens the real flyout from the rail', async ({ page }) => {
  test.setTimeout(240_000)
  await openLesson(page, 1440, 900)
  // 走到第 2 关（第 1 关：放开始块 → 运行 → 完成）。
  await page.getByTestId('lesson-add-when_start').click()
  await page.getByTestId('ws-run-toggle').click()
  await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('forest-hello-complete-step').click()
  await expect(page.getByTestId('forest-hello-step-title')).toContainText('第 2 关', { timeout: 20_000 })
  // 第 2 关分类栏出现“移动”；点击后真实 flyout 打开且含可拖的移动积木。
  await expect(page.getByTestId('ws-rail-移动')).toBeVisible()
  await page.getByTestId('ws-rail-移动').click()
  const flyoutBlock = page.locator('.blocklyFlyout .blocklyDraggable').first()
  await expect(flyoutBlock).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.blocklyFlyout').first()).toContainText('向右走')
})

for (const size of [
  { name: '1366', width: 1366, height: 768 },
  { name: '768', width: 768, height: 1024 },
  { name: '375', width: 375, height: 812 },
]) {
  test(`V3 ${size.name}: first-screen zones screenshot`, async ({ page }) => {
    test.setTimeout(240_000)
    await openLesson(page, size.width, size.height)
    if (size.width >= 768) {
      await expect(page.getByTestId('ws-icon-rail')).toBeVisible()
    } else {
      // 手机（<768）：外壳沿用既有布局隐藏分类栏包裹层，分类入口是画布
      // 内工具箱列（不隐藏）——分类面在手机上同样真实存在。
      const toolboxDisplay = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="ws-editor-slot"] .blocklyToolbox')
        return el ? getComputedStyle(el).display : 'missing'
      })
      expect(toolboxDisplay).not.toBe('none')
    }
    await expect(page.getByTestId('forest-hello-instruction')).toBeVisible()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SHOTS}/v3-first-${size.name}.png` })
  })
}
