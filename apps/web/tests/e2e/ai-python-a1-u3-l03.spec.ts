import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u3-l03/A1-U3-L03'

async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function openFileMenu(page: import('@playwright/test').Page) {
  await page.getByTestId('ws-file-menu-button').click()
}

async function resetViaFileMenu(page: import('@playwright/test').Page) {
  await openFileMenu(page)
  await page.getByTestId('ws-file-reset').click()
}

async function waitForShellSaved(page: import('@playwright/test').Page) {
  // Shell autosave is debounced (1000ms); only reload after the chip says saved,
  // otherwise a reload can drop the last edit before the timer fires.
  await expect(page.getByTestId('ws-save-chip')).toContainText('已保存到本机')
}

test.describe('A1-U3-L03 lesson page (unified LessonWorkspace integration)', () => {
  test('renders the schema table and the JSON editor', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ws-topbar')).toContainText('结构化JSON输出')
    await expect(page.locator('table th').nth(0)).toHaveText('字段')
    await expect(page.locator('table td').first()).toHaveText('名称')
    await expect(page.getByTestId('ai-u3-l03-json-input')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l03-validate')).toBeVisible()
  })

  test('a correct record passes all five checks and shows the work summary', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-good').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-verdict')).toContainText('合格：五项全部通过')
    await expect(page.getByTestId('ai-u3-l03-work')).toContainText('作品总结')
    // OPS-025 shell feedback card: the slot judgment is really displayed.
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次记录合格。')
    await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：合格：五项全部通过。')
    await expect(page.getByTestId('ws-feedback-stage')).toContainText('检查结果：五项全部通过')
    await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('方法证据：')
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('edit after a pass invalidates the shell feedback judgment', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-good').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次记录合格。')
    await page.getByTestId('ai-u3-l03-json-input').fill('{"名称": "苹果"}')
    // OPS-025: the shell feedback card invalidates with the edit — the old
    // judgment is gone, the stale note is shown, no placeholder is faked.
    await expect(page.getByTestId('ws-judgment-stale')).toContainText('旧判定已失效，修改后请重新检查')
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('a missing required field names that field', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-missing-required').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('未合格')
    await expect(result).toContainText('「颜色」')
    await expect(result).toContainText('字段齐全：失败')
  })

  test('a type error names the weight field', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('「重量」')
    await expect(result).toContainText('类型正确：失败')
  })

  test('an illegal category names the name field', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-enum-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('「名称」')
    await expect(result).toContainText('枚举内：失败')
  })

  test('an abnormal weight fails range', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-range-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    const result = page.getByTestId('ai-u3-l03-result')
    await expect(result).toContainText('「重量」')
    await expect(result).toContainText('数值范围：失败')
  })

  test('fix flow: repair the type error and reach pass', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-result')).toContainText('未合格')
    await page.getByTestId('ai-u3-l03-json-input').fill('{\n  "名称": "苹果",\n  "颜色": "红",\n  "重量": 182,\n  "直径": 7.6\n}')
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-verdict')).toContainText('合格：五项全部通过')
  })

  test('broken JSON shows a format error', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-json-input').fill('{bad')
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-result')).toContainText('JSON 格式错误')
  })

  test('shell task drawer reveals hints in order, never all at once', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ws-task-button').click()
    const drawer = page.getByTestId('ws-task-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('ws-hint-reveal-3')).toBeDisabled()
    await drawer.getByTestId('ws-hint-reveal-1').click()
    await expect(drawer).toContainText('再对照你的记录')
    await expect(drawer).not.toContainText('修完点校验')
    await drawer.getByTestId('ws-hint-reveal-2').click()
    await drawer.getByTestId('ws-hint-reveal-3').click()
    await expect(drawer).toContainText('修完点校验')
  })

  test('shell save failure is shown, never reported as saved; saving recovers after storage returns', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-good').click()
    await waitForShellSaved(page)
    // Real failure path (no demo hook on the formal route): make every
    // localStorage write throw, then save explicitly from the file menu.
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      }
    })
    await openFileMenu(page)
    await page.getByTestId('ws-file-save').click()
    await expect(page.getByTestId('ws-save-chip')).toContainText('未能保存')
    await expect(page.getByTestId('ws-save-message')).toContainText('未能保存')
    // A reload clears the injected failure (fresh JS state); the failed
    // save left no half draft: the good record saved before the failure
    // is still there, intact.
    await page.reload()
    await expect(page.getByTestId('ai-u3-l03-json-input')).toHaveValue(/"重量": 182/)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await waitForShellSaved(page)
    await expect(page.getByTestId('ws-save-message')).not.toContainText('未能保存')
    await page.reload()
    await expect(page.getByTestId('ai-u3-l03-json-input')).toHaveValue(/"182"/)
  })

  test('shell draft saves and restores across reload; file-menu reset clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-type-error').click()
    await waitForShellSaved(page)
    await page.reload()
    await expect(page.getByTestId('ws-save-message')).toContainText('已恢复草稿')
    await expect(page.getByTestId('ai-u3-l03-json-input')).toHaveValue(/"182"/)
    await resetViaFileMenu(page)
    await expect(page.getByTestId('ai-u3-l03-json-input')).toHaveValue('')
  })
})

test.describe('A1-U3-L03 tablet screen', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })
  test('768px: a correct record passes; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-good').tap()
    await page.getByTestId('ai-u3-l03-validate').tap()
    await expect(page.getByTestId('ai-u3-l03-verdict')).toContainText('合格：五项全部通过')
    // OPS-025: the shell feedback card shows the real judgment on tablet.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次记录合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(1024)
    expect(await overflow(page)).toBe(false)
  })
})

test.describe('A1-U3-L03 narrow screen', () => {
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    await page.getByTestId('ai-u3-l03-example-enum-error').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-result')).toBeVisible()
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })

  test('375px: a correct record passes; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l03-example-good').click()
    await page.getByTestId('ai-u3-l03-validate').click()
    await expect(page.getByTestId('ai-u3-l03-verdict')).toContainText('合格：五项全部通过')
    // OPS-025: the shell feedback card shows the real judgment on phone.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次记录合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(812)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })
})
