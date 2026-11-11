import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u4-l02/A1-U4-L02'

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
  for (const id of ['A1', 'A2', 'A3']) {
    await page.getByTestId(`ai-u4-l02-explore-${id}-aggregate`).click()
  }
  for (const id of ['P1', 'P2', 'P3']) {
    await page.getByTestId(`ai-u4-l02-explore-${id}-stop`).click()
  }
}

async function completeChecklist(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-u4-l02-checklist-0-item').fill('每日各窗口剩菜总重量')
  await page.getByTestId('ai-u4-l02-checklist-0-pii-no').click()
  await page
    .getByTestId('ai-u4-l02-checklist-0-permission')
    .fill('聚合数据可用，仍须教师确认来源')
  await page.getByTestId('ai-u4-l02-checklist-0-status-na').click()
  await page.getByTestId('ai-u4-l02-checklist-0-disposition-usable').click()

  await page.getByTestId('ai-u4-l02-checklist-1-item').fill('各排每日借出册数')
  await page.getByTestId('ai-u4-l02-checklist-1-pii-no').click()
  await page
    .getByTestId('ai-u4-l02-checklist-1-permission')
    .fill('聚合数据可用，仍须教师确认来源')
  await page.getByTestId('ai-u4-l02-checklist-1-status-na').click()
  await page.getByTestId('ai-u4-l02-checklist-1-disposition-usable').click()

  await page.getByTestId('ai-u4-l02-checklist-2-item').fill('全班同学姓名与班级名单')
  await page.getByTestId('ai-u4-l02-checklist-2-pii-yes').click()
  await page.getByTestId('ai-u4-l02-checklist-2-permission').fill('监护人同意')
  await page.getByTestId('ai-u4-l02-checklist-2-status-missing').click()
  await page.getByTestId('ai-u4-l02-checklist-2-disposition-stop').click()
}

async function completeTransfer(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-u4-l02-veto-W1-usable').click()
  await page.getByTestId('ai-u4-l02-veto-W2-usable').click()
  await page.getByTestId('ai-u4-l02-veto-W3-stop').click()
  await page.getByTestId('ai-u4-l02-veto-W4-stop').click()
  await page.getByTestId('ai-u4-l02-scope-A').click()
  for (const id of ['N1', 'N2', 'N3', 'N4', 'N5']) {
    await page.getByTestId(`ai-u4-l02-noncoverage-${id}`).click()
  }
}

async function completeLesson(page: import('@playwright/test').Page) {
  await classifyAllSix(page)
  await completeChecklist(page)
  await completeTransfer(page)
}

test.describe('A1-U4-L02 lesson page (unified LessonWorkspace integration)', () => {
  test('renders the explore list, the checklist and the transfer section', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ws-topbar')).toContainText('建立数据使用许可')
    await expect(page.getByTestId('ai-u4-l02-explore-A1')).toContainText('剩菜总重量')
    await expect(page.getByTestId('ai-u4-l02-explore-P1')).toContainText('姓名与班级')
    await expect(page.getByTestId('ai-u4-l02-explore-P2')).toContainText('考试成绩')
    await expect(page.getByTestId('ai-u4-l02-checklist-0-item')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l02-checklist-2-status-missing')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l02-veto-W1')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l02-scope-A')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l02-noncoverage-N1')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l02-check')).toBeVisible()
    await expect(page.getByText('R1：默认拒绝：无许可记录 = 不可用')).toBeVisible()
    await expect(page.getByTestId('ai-u4-l02-honest-note')).toContainText(
      '监护人同意如何映射到某个儿童档案',
    )
    await expect(page.getByText('下表为新增合成数据')).toBeVisible()
  })

  test('a correct classification passes one item and reveals the reason', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l02-explore-A1-aggregate').click()
    await expect(page.getByTestId('ai-u4-l02-explore-A1')).toContainText('分类正确：聚合可用')
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('A1：通过')
  })

  test('a wrong classification fails that item', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l02-explore-P1-aggregate').click()
    await expect(page.getByTestId('ai-u4-l02-explore-P1')).toContainText('分类错了：缺许可即停')
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('P1：未通过')
  })

  test('all six correct classifications pass the explore section', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('A1：通过')
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('P1：通过')
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('P3：通过')
    await expect(page.getByTestId('ai-u4-l02-verdict')).toContainText('未合格')
  })

  test('a complete checklist is reported; the verdict still waits for transfer', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await completeChecklist(page)
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('许可清单完成')
    await expect(page.getByTestId('ai-u4-l02-verdict')).toContainText('迁移未完成')
  })

  test('a missing checklist field fails the checklist', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await page.getByTestId('ai-u4-l02-checklist-0-item').fill('每日各窗口剩菜总重量')
    await page.getByTestId('ai-u4-l02-checklist-0-pii-no').click()
    await page
      .getByTestId('ai-u4-l02-checklist-0-permission')
      .fill('聚合数据可用，仍须教师确认来源')
    await page.getByTestId('ai-u4-l02-checklist-0-status-na').click()
    await page.getByTestId('ai-u4-l02-checklist-0-disposition-usable').click()
    await page.getByTestId('ai-u4-l02-checklist-1-item').fill('各排每日借出册数')
    await page.getByTestId('ai-u4-l02-checklist-1-pii-no').click()
    await page
      .getByTestId('ai-u4-l02-checklist-1-permission')
      .fill('聚合数据可用，仍须教师确认来源')
    await page.getByTestId('ai-u4-l02-checklist-1-status-na').click()
    await page.getByTestId('ai-u4-l02-checklist-1-disposition-usable').click()
    await page.getByTestId('ai-u4-l02-checklist-2-item').fill('全班同学姓名与班级名单')
    await page.getByTestId('ai-u4-l02-checklist-2-pii-yes').click()
    await page.getByTestId('ai-u4-l02-checklist-2-permission').fill('监护人同意')
    // 第 3 行许可状态与默认处置未选：清单未完成。
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('第 3 行未完成')
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('五列未齐')
  })

  test('the veto answers are counted in the method evidence', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await completeChecklist(page)
    await page.getByTestId('ai-u4-l02-veto-W1-usable').click()
    await page.getByTestId('ai-u4-l02-veto-W2-usable').click()
    await page.getByTestId('ai-u4-l02-veto-W3-stop').click()
    await page.getByTestId('ai-u4-l02-veto-W4-stop').click()
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('否决题 4/4 项')
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('许可清单 3/3 行')
  })

  test('transfer with the correct scope answer completes the migration part', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await classifyAllSix(page)
    await completeChecklist(page)
    await completeTransfer(page)
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('迁移完成')
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('否决题 4/4 项')
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('scope 题已答对')
  })

  test('a wrong scope answer fails transfer and shows the correction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l02-scope-B').click()
    await expect(page.getByText('不对，再想想：不是过期、也不是格式问题，是两种同意互不通用。')).toBeVisible()
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toContainText('scope 题未答对')
    await page.getByTestId('ai-u4-l02-scope-A').click()
    await expect(page.getByText('答对了：scope 分离，两种同意互不通用，须分别授予、分别撤销、分别记录。')).toBeVisible()
  })

  test('the full lesson passes and shows the work summary', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await completeLesson(page)
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-verdict')).toContainText('合格：许可清单与迁移均已完成')
    await expect(page.getByTestId('ai-u4-l02-work')).toContainText('作品总结')
    // OPS-025 shell feedback card: the slot judgment is really displayed.
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次课堂练习合格。')
    await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：合格：许可清单与迁移均已完成。')
    await expect(page.getByTestId('ws-feedback-stage')).toContainText('检查结果：六项数据分类全部正确')
    await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('方法证据：')
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('edit after a pass invalidates the shell feedback judgment', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await completeLesson(page)
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次课堂练习合格。')
    await page.getByTestId('ai-u4-l02-explore-A1-stop').click()
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
    await expect(drawer).toContainText('先按“含不含个人信息”分两堆')
    // '匿名化一下' 只在三级提示里出现（scopeGap 与方法步骤都不含它）；
    // 揭示一级提示后它必须还未出现。
    await expect(drawer).not.toContainText('匿名化一下')
    await drawer.getByTestId('ws-hint-reveal-2').click()
    await drawer.getByTestId('ws-hint-reveal-3').click()
    await expect(drawer).toContainText('匿名化一下')
  })

  test('shell save failure is shown, never reported as saved; saving recovers after storage returns', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l02-explore-A1-aggregate').click()
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
    // save left no half draft: the A1 classification saved before the failure
    // is still there, intact.
    await page.reload()
    await expect(page.getByTestId('ai-u4-l02-explore-A1')).toContainText('分类正确')
    await page.getByTestId('ai-u4-l02-explore-A2-aggregate').click()
    await waitForShellSaved(page)
    await expect(page.getByTestId('ws-save-message')).not.toContainText('未能保存')
    await page.reload()
    await expect(page.getByTestId('ai-u4-l02-explore-A2')).toContainText('分类正确')
  })

  test('shell draft saves and restores across reload; file-menu reset clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u4-l02-explore-A1-aggregate').click()
    await waitForShellSaved(page)
    await page.reload()
    await expect(page.getByTestId('ws-save-message')).toContainText('已恢复草稿')
    await expect(page.getByTestId('ai-u4-l02-explore-A1')).toContainText('分类正确')
    await resetViaFileMenu(page)
    await expect(page.getByText('分类正确：聚合可用')).toHaveCount(0)
    await expect(page.getByTestId('ai-u4-l02-draft-status')).toContainText('已分类 0/6')
  })
})

test.describe('A1-U4-L02 tablet screen', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })
  test('768px: the full lesson passes; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    for (const id of ['A1', 'A2', 'A3']) {
      await page.getByTestId(`ai-u4-l02-explore-${id}-aggregate`).tap()
    }
    for (const id of ['P1', 'P2', 'P3']) {
      await page.getByTestId(`ai-u4-l02-explore-${id}-stop`).tap()
    }
    await page.getByTestId('ai-u4-l02-checklist-0-item').fill('每日各窗口剩菜总重量')
    await page.getByTestId('ai-u4-l02-checklist-0-pii-no').tap()
    await page
      .getByTestId('ai-u4-l02-checklist-0-permission')
      .fill('聚合数据可用，仍须教师确认来源')
    await page.getByTestId('ai-u4-l02-checklist-0-status-na').tap()
    await page.getByTestId('ai-u4-l02-checklist-0-disposition-usable').tap()
    await page.getByTestId('ai-u4-l02-checklist-1-item').fill('各排每日借出册数')
    await page.getByTestId('ai-u4-l02-checklist-1-pii-no').tap()
    await page
      .getByTestId('ai-u4-l02-checklist-1-permission')
      .fill('聚合数据可用，仍须教师确认来源')
    await page.getByTestId('ai-u4-l02-checklist-1-status-na').tap()
    await page.getByTestId('ai-u4-l02-checklist-1-disposition-usable').tap()
    await page.getByTestId('ai-u4-l02-checklist-2-item').fill('全班同学姓名与班级名单')
    await page.getByTestId('ai-u4-l02-checklist-2-pii-yes').tap()
    await page.getByTestId('ai-u4-l02-checklist-2-permission').fill('监护人同意')
    await page.getByTestId('ai-u4-l02-checklist-2-status-missing').tap()
    await page.getByTestId('ai-u4-l02-checklist-2-disposition-stop').tap()
    await page.getByTestId('ai-u4-l02-veto-W1-usable').tap()
    await page.getByTestId('ai-u4-l02-veto-W2-usable').tap()
    await page.getByTestId('ai-u4-l02-veto-W3-stop').tap()
    await page.getByTestId('ai-u4-l02-veto-W4-stop').tap()
    await page.getByTestId('ai-u4-l02-scope-A').tap()
    for (const id of ['N1', 'N2', 'N3', 'N4', 'N5']) {
      await page.getByTestId(`ai-u4-l02-noncoverage-${id}`).tap()
    }
    await page.getByTestId('ai-u4-l02-check').tap()
    await expect(page.getByTestId('ai-u4-l02-verdict')).toContainText('合格：许可清单与迁移均已完成')
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

test.describe('A1-U4-L02 narrow screen', () => {
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    await page.getByTestId('ai-u4-l02-explore-A1-aggregate').click()
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-result')).toBeVisible()
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })

  test('375px: the full lesson passes; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await completeLesson(page)
    await page.getByTestId('ai-u4-l02-check').click()
    await expect(page.getByTestId('ai-u4-l02-verdict')).toContainText('合格：许可清单与迁移均已完成')
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
