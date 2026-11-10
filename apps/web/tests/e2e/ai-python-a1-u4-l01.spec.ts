import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u4-l01/A1-U4-L01'

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

async function classifyAllSix(page: import('@playwright/test').Page) {
  for (const id of ['E1', 'E2', 'E3']) {
    await page.getByTestId(`ai-u4-l01-explore-${id}-valid`).click()
  }
  for (const id of ['V1', 'V2', 'V3']) {
    await page.getByTestId(`ai-u4-l01-explore-${id}-vague`).click()
  }
}

async function completeProblemCard(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-u4-l01-choose-E1').click()
  await page.getByTestId('ai-u4-l01-stmt-target').fill('哪类菜品剩得多')
  await page.getByTestId('ai-u4-l01-stmt-data').fill('每日各窗口剩菜总重量')
  await page.getByTestId('ai-u4-l01-stmt-success').fill('剩菜最多的两类菜品报对')
  for (const id of ['Q1', 'Q2', 'Q3', 'Q4']) {
    await page.getByTestId(`ai-u4-l01-feas-${id}-pass`).click()
  }
}

async function completeTransfer(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-u4-l01-transfer-T1').click()
  await page.getByTestId('ai-u4-l01-transfer-target').fill('哪种器材最常被借空')
  await page.getByTestId('ai-u4-l01-transfer-data').fill('各器材每日借出次数')
  await page.getByTestId('ai-u4-l01-transfer-success').fill('最常被借空的两种器材报对')
  await page.getByTestId('ai-u4-l01-grades-A').click()
}

async function completeLesson(page: import('@playwright/test').Page) {
  await classifyAllSix(page)
  await completeProblemCard(page)
  await completeTransfer(page)
}

test.describe('A1-U4-L01 lesson page (unified LessonWorkspace integration)', () => {
  test('renders the explore list, the problem card and the transfer section', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ws-topbar')).toContainText('提出校园真实问题')
    await expect(page.getByTestId('ai-u4-l01-explore-E1')).toContainText('食堂剩菜称重统计')
    await expect(page.getByTestId('ai-u4-l01-explore-V2')).toContainText('全班真实成绩')
    await expect(page.getByTestId('ai-u4-l01-explore-V3')).toContainText('提高图书馆效率')
    await expect(page.getByTestId('ai-u4-l01-stmt-target')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l01-feas-Q1-pass')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l01-transfer-T1')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l01-grades-A')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l01-check')).toBeVisible()
    await expect(page.getByText('校园真实问题不等于真实校园数据')).toBeVisible()
  })

  test('a correct classification passes one item and reveals the reason', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l01-explore-E1-valid').click()
    await expect(page.getByTestId('ai-u4-l01-explore-E1')).toContainText('分类正确：有效')
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('E1：通过')
  })

  test('a wrong classification fails that item', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l01-explore-V2-valid').click()
    await expect(page.getByTestId('ai-u4-l01-explore-V2')).toContainText('分类错了：禁题')
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('V2：未通过')
  })

  test('all six correct classifications pass the explore section', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('E1：通过')
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('V2：通过')
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('V3：通过')
    await expect(page.getByTestId('ai-u4-l01-verdict')).toContainText('未合格')
  })

  test('a complete problem card is reported; the verdict still waits for transfer', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await completeProblemCard(page)
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('问题卡完成')
    await expect(page.getByTestId('ai-u4-l01-verdict')).toContainText('迁移未完成')
  })

  test('a missing statement sentence fails the problem card', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await page.getByTestId('ai-u4-l01-choose-E1').click()
    await page.getByTestId('ai-u4-l01-stmt-target').fill('哪类菜品剩得多')
    await page.getByTestId('ai-u4-l01-stmt-data').fill('每日各窗口剩菜总重量')
    for (const id of ['Q1', 'Q2', 'Q3', 'Q4']) {
      await page.getByTestId(`ai-u4-l01-feas-${id}-pass`).click()
    }
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('问题陈述三句未齐')
  })

  test('the four feasibility answers are counted in the method evidence', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await completeProblemCard(page)
    await page.getByTestId('ai-u4-l01-feas-note-Q1').fill('数据是聚合计数，拿得到')
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('可行性检查 4/4')
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('问题卡三句齐全')
  })

  test('transfer with the correct grades answer completes the migration part', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await completeProblemCard(page)
    await completeTransfer(page)
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('迁移完成')
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('迁移场景 1 个')
  })

  test('a wrong grades answer fails transfer and shows the correction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l01-grades-B').click()
    await expect(page.getByText('不对，再想想：成绩数据拿得到，AI 也能算，问题是许可与隐私。')).toBeVisible()
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toContainText('成绩题未答对')
    await page.getByTestId('ai-u4-l01-grades-A').click()
    await expect(page.getByText('答对了：因为它用了个人记录，许可过不了，后果还敏感。')).toBeVisible()
  })

  test('the full lesson passes and shows the work summary', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await completeLesson(page)
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-verdict')).toContainText('合格：问题卡与迁移均已完成')
    await expect(page.getByTestId('ai-u4-l01-work')).toContainText('作品总结')
    // OPS-025 shell feedback card: the slot judgment is really displayed.
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次课堂练习合格。')
    await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：合格：问题卡与迁移均已完成。')
    await expect(page.getByTestId('ws-feedback-stage')).toContainText('检查结果：六条问题描述分类全部正确')
    await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('方法证据：')
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('edit after a pass invalidates the shell feedback judgment', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await completeLesson(page)
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次课堂练习合格。')
    await page.getByTestId('ai-u4-l01-explore-E1-vague').click()
    // OPS-025: the shell feedback card invalidates with the edit — the old
    // judgment is gone, the stale note is shown, no placeholder is faked.
    await expect(page.getByTestId('ws-judgment-stale')).toContainText('旧判定已失效，修改后请重新检查')
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('shell task drawer reveals hints in order, never all at once', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ws-task-button').click()
    const drawer = page.getByTestId('ws-task-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('ws-hint-reveal-3')).toBeDisabled()
    await drawer.getByTestId('ws-hint-reveal-1').click()
    await expect(drawer).toContainText('先看三例的共同点')
    // '换一个没做过的校园场景' 只在三级提示里出现（scopeGap 与方法步骤都不含它）；
    // 揭示一级提示后它必须还未出现。
    await expect(drawer).not.toContainText('换一个没做过的校园场景')
    await drawer.getByTestId('ws-hint-reveal-2').click()
    await drawer.getByTestId('ws-hint-reveal-3').click()
    await expect(drawer).toContainText('换一个没做过的校园场景')
  })

  test('shell save failure is shown, never reported as saved; saving recovers after storage returns', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l01-explore-E1-valid').click()
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
    // save left no half draft: the E1 classification saved before the failure
    // is still there, intact.
    await page.reload()
    await expect(page.getByTestId('ai-u4-l01-explore-E1')).toContainText('分类正确')
    await page.getByTestId('ai-u4-l01-explore-E2-valid').click()
    await waitForShellSaved(page)
    await expect(page.getByTestId('ws-save-message')).not.toContainText('未能保存')
    await page.reload()
    await expect(page.getByTestId('ai-u4-l01-explore-E2')).toContainText('分类正确')
  })

  test('shell draft saves and restores across reload; file-menu reset clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l01-explore-E1-valid').click()
    await waitForShellSaved(page)
    await page.reload()
    await expect(page.getByTestId('ws-save-message')).toContainText('已恢复草稿')
    await expect(page.getByTestId('ai-u4-l01-explore-E1')).toContainText('分类正确')
    await resetViaFileMenu(page)
    await expect(page.getByText('分类正确：有效：判断目标是分类')).toHaveCount(0)
    await expect(page.getByTestId('ai-u4-l01-draft-status')).toContainText('已分类 0/6')
  })
})

test.describe('A1-U4-L01 tablet screen', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })
  test('768px: the full lesson passes; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    for (const id of ['E1', 'E2', 'E3']) {
      await page.getByTestId(`ai-u4-l01-explore-${id}-valid`).tap()
    }
    for (const id of ['V1', 'V2', 'V3']) {
      await page.getByTestId(`ai-u4-l01-explore-${id}-vague`).tap()
    }
    await page.getByTestId('ai-u4-l01-choose-E1').tap()
    await page.getByTestId('ai-u4-l01-stmt-target').fill('哪类菜品剩得多')
    await page.getByTestId('ai-u4-l01-stmt-data').fill('每日各窗口剩菜总重量')
    await page.getByTestId('ai-u4-l01-stmt-success').fill('剩菜最多的两类菜品报对')
    for (const id of ['Q1', 'Q2', 'Q3', 'Q4']) {
      await page.getByTestId(`ai-u4-l01-feas-${id}-pass`).tap()
    }
    await page.getByTestId('ai-u4-l01-transfer-T1').tap()
    await page.getByTestId('ai-u4-l01-transfer-target').fill('哪种器材最常被借空')
    await page.getByTestId('ai-u4-l01-transfer-data').fill('各器材每日借出次数')
    await page.getByTestId('ai-u4-l01-transfer-success').fill('最常被借空的两种器材报对')
    await page.getByTestId('ai-u4-l01-grades-A').tap()
    await page.getByTestId('ai-u4-l01-check').tap()
    await expect(page.getByTestId('ai-u4-l01-verdict')).toContainText('合格：问题卡与迁移均已完成')
    // OPS-025: the shell feedback card shows the real judgment on tablet.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次课堂练习合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(1024)
    expect(await overflow(page)).toBe(false)
  })
})

test.describe('A1-U4-L01 narrow screen', () => {
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    await page.getByTestId('ai-u4-l01-explore-E1-valid').click()
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-result')).toBeVisible()
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })

  test('375px: the full lesson passes; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await completeLesson(page)
    await page.getByTestId('ai-u4-l01-check').click()
    await expect(page.getByTestId('ai-u4-l01-verdict')).toContainText('合格：问题卡与迁移均已完成')
    // OPS-025: the shell feedback card shows the real judgment on phone.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次课堂练习合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(812)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })
})
