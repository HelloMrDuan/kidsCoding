import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u3-l05/A1-U3-L05'

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

async function pickAllEightCorrect(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-u3-l05-verdict-E1-trusted').click()
  await page.getByTestId('ai-u3-l05-verdict-E2-digit').click()
  await page.getByTestId('ai-u3-l05-verdict-P1-source').click()
  await page.getByTestId('ai-u3-l05-verdict-P2-insufficient').click()
  await page.getByTestId('ai-u3-l05-verdict-P3-digit').click()
  await page.getByTestId('ai-u3-l05-verdict-P4-insufficient').click()
  await page.getByTestId('ai-u3-l05-verdict-T1-insufficient').click()
  await page.getByTestId('ai-u3-l05-verdict-T2-trusted').click()
}

test.describe('A1-U3-L05 lesson page (unified LessonWorkspace integration)', () => {
  test('renders the source book and the eight check items', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ws-topbar')).toContainText('引用与幻觉核对')
    await expect(page.getByTestId('ai-u3-l05-source-A')).toContainText('森林图书馆借阅单')
    await expect(page.getByTestId('ai-u3-l05-source-E')).toContainText('植物园记录')
    await expect(page.getByTestId('ai-u3-l05-item-E1')).toContainText('小狐狸借了 3 本书')
    await expect(page.getByTestId('ai-u3-l05-item-P4')).toContainText('（无引用）')
    await expect(page.getByTestId('ai-u3-l05-item-T2')).toContainText('20 名小学生')
    await expect(page.getByTestId('ai-u3-l05-check')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l05-draft-status')).toContainText('已选 0/8')
  })

  test('a correct verdict passes one item', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l05-verdict-E1-trusted').click()
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-result')).toContainText('E1：通过')
  })

  test('a wrong verdict fails that item', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l05-verdict-E2-trusted').click()
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-result')).toContainText('E2：未通过')
    await expect(page.getByTestId('ai-u3-l05-result')).toContainText('2 小时')
  })

  test('all eight correct pass and show the work summary', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await pickAllEightCorrect(page)
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-verdict')).toContainText('合格：八项全部通过')
    await expect(page.getByTestId('ai-u3-l05-work')).toContainText('作品总结')
    // OPS-025 shell feedback card: the slot judgment is really displayed.
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次核对合格。')
    await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：合格：八项全部通过。')
    await expect(page.getByTestId('ws-feedback-stage')).toContainText('检查结果：八项全部通过')
    await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('方法证据：')
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('edit after a pass invalidates the shell feedback judgment', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await pickAllEightCorrect(page)
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次核对合格。')
    await page.getByTestId('ai-u3-l05-verdict-E1-digit').click()
    // OPS-025: the shell feedback card invalidates with the edit — the old
    // judgment is gone, the stale note is shown, no placeholder is faked.
    await expect(page.getByTestId('ws-judgment-stale')).toContainText('旧判定已失效，修改后请重新检查')
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('unpicked items show how many are left to pick', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-notice')).toContainText('还有 8 项没选')
    await page.getByTestId('ai-u3-l05-verdict-E1-trusted').click()
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-notice')).toContainText('还有 7 项没选')
  })

  test('no-citation boundary P4: insufficient evidence is the correct verdict', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l05-verdict-P4-insufficient').click()
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-result')).toContainText('P4：通过')
  })

  test('shell task drawer reveals hints in order, never all at once', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ws-task-button').click()
    const drawer = page.getByTestId('ws-task-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('ws-hint-reveal-3')).toBeDisabled()
    await drawer.getByTestId('ws-hint-reveal-1').click()
    await expect(drawer).toContainText('核对三步')
    // '逐项点出来' 只在三级提示里出现（规则卡与方法步骤都不含它）；
    // 揭示一级提示后它必须还未出现。
    await expect(drawer).not.toContainText('逐项点出来')
    await drawer.getByTestId('ws-hint-reveal-2').click()
    await expect(drawer).toContainText('没有引用的回答没法核对')
    await drawer.getByTestId('ws-hint-reveal-3').click()
    await expect(drawer).toContainText('逐项点出来')
  })

  test('shell save failure is shown, never reported as saved; saving recovers after storage returns', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l05-verdict-E1-trusted').click()
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
    // save left no half draft: the picked E1 saved before the failure
    // is still there, intact.
    await page.reload()
    await expect(page.getByTestId('ai-u3-l05-verdict-E1-trusted')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByTestId('ai-u3-l05-verdict-E2-digit').click()
    await waitForShellSaved(page)
    await expect(page.getByTestId('ws-save-message')).not.toContainText('未能保存')
    await page.reload()
    await expect(page.getByTestId('ai-u3-l05-verdict-E2-digit')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('shell draft saves and restores across reload; file-menu reset clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l05-verdict-E1-trusted').click()
    await waitForShellSaved(page)
    await page.reload()
    await expect(page.getByTestId('ws-save-message')).toContainText('已恢复草稿')
    await expect(page.getByTestId('ai-u3-l05-verdict-E1-trusted')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await resetViaFileMenu(page)
    await expect(page.getByTestId('ai-u3-l05-verdict-E1-trusted')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect(page.getByTestId('ai-u3-l05-draft-status')).toContainText('已选 0/8')
  })
})

test.describe('A1-U3-L05 tablet screen', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })
  test('768px: all eight correct pass; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await pickAllEightCorrect(page)
    await page.getByTestId('ai-u3-l05-check').tap()
    await expect(page.getByTestId('ai-u3-l05-verdict')).toContainText('合格：八项全部通过')
    // OPS-025: the shell feedback card shows the real judgment on tablet.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次核对合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(1024)
    expect(await overflow(page)).toBe(false)
  })
})

test.describe('A1-U3-L05 narrow screen', () => {
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    await page.getByTestId('ai-u3-l05-verdict-E1-trusted').click()
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-result')).toBeVisible()
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })

  test('375px: all eight correct pass; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await pickAllEightCorrect(page)
    await page.getByTestId('ai-u3-l05-check').click()
    await expect(page.getByTestId('ai-u3-l05-verdict')).toContainText('合格：八项全部通过')
    // OPS-025: the shell feedback card shows the real judgment on phone.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次核对合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(812)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })
})
