import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u3-l04/A1-U3-L04'
const GOOD_RULE = '从任务句里挑关键词；来源、时间、证据、相关四问全过才可用。'

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

/** Answer all 24 questions correctly (ground truth: A/B all yes; C no on time; D/E no on source; F no on relevant). */
async function answerAllCorrect(page: import('@playwright/test').Page) {
  for (const cardId of ['A', 'B'] as const) {
    for (const key of ['source', 'time', 'evidence', 'relevant'] as const) {
      await page.getByTestId(`ai-u3-l04-q-${cardId}-${key}-yes`).click()
    }
  }
  await page.getByTestId('ai-u3-l04-q-C-source-yes').click()
  await page.getByTestId('ai-u3-l04-q-C-time-no').click()
  await page.getByTestId('ai-u3-l04-q-C-evidence-yes').click()
  await page.getByTestId('ai-u3-l04-q-C-relevant-yes').click()
  await page.getByTestId('ai-u3-l04-q-D-source-no').click()
  await page.getByTestId('ai-u3-l04-q-D-time-yes').click()
  await page.getByTestId('ai-u3-l04-q-D-evidence-no').click()
  await page.getByTestId('ai-u3-l04-q-D-relevant-yes').click()
  await page.getByTestId('ai-u3-l04-q-E-source-no').click()
  await page.getByTestId('ai-u3-l04-q-E-time-yes').click()
  await page.getByTestId('ai-u3-l04-q-E-evidence-no').click()
  await page.getByTestId('ai-u3-l04-q-E-relevant-yes').click()
  await page.getByTestId('ai-u3-l04-q-F-source-yes').click()
  await page.getByTestId('ai-u3-l04-q-F-time-yes').click()
  await page.getByTestId('ai-u3-l04-q-F-evidence-yes').click()
  await page.getByTestId('ai-u3-l04-q-F-relevant-no').click()
}

/** The full passing flow: teacher keywords, retrieve, 24 correct answers, A+B, rule text, check. */
async function passFlow(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-u3-l04-keywords').fill('苹果 颜色 规则')
  await page.getByTestId('ai-u3-l04-retrieve').click()
  await expect(page.getByTestId('ai-u3-l04-hits-A')).toHaveText('3')
  await expect(page.getByTestId('ai-u3-l04-hits-B')).toHaveText('2')
  await expect(page.getByTestId('ai-u3-l04-hits-C')).toHaveText('1')
  await expect(page.getByTestId('ai-u3-l04-hits-D')).toHaveText('0')
  await expect(page.getByTestId('ai-u3-l04-hits-E')).toHaveText('0')
  await expect(page.getByTestId('ai-u3-l04-hits-F')).toHaveText('0')
  await answerAllCorrect(page)
  await page.getByTestId('ai-u3-l04-usable-A').check()
  await page.getByTestId('ai-u3-l04-usable-B').check()
  await page.getByTestId('ai-u3-l04-rule').fill(GOOD_RULE)
  await page.getByTestId('ai-u3-l04-check').click()
  await expect(page.getByTestId('ai-u3-l04-verdict')).toContainText('合格：五项全部通过')
}

test.describe('A1-U3-L04 lesson page (unified LessonWorkspace integration)', () => {
  test('renders the corpus table, keyword input, retrieve button and rule input', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ws-topbar')).toContainText('检索可信资料')
    await expect(page.getByTestId('ai-u3-l04-task')).toContainText('颜色规则把黄色判成香蕉')
    await expect(page.getByTestId('ai-u3-l04-corpus').locator('tbody tr')).toHaveCount(6)
    await expect(page.getByTestId('ai-u3-l04-corpus')).toContainText('恐龙灭绝之谜')
    await expect(page.getByTestId('ai-u3-l04-hits-A')).toHaveText('—')
    await expect(page.getByTestId('ai-u3-l04-keywords')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l04-retrieve')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l04-rule')).toBeVisible()
    // OPS-025 shell feedback card: neutral placeholder before any check, no conclusion yet.
    await expect(page.getByTestId('ws-feedback')).toBeVisible()
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    await expect(page.getByText('暂无检查结果')).toHaveCount(1)
    // The course's own copy never writes the banned mastery/demo wording.
    // (The shared shell's task-panel footnote contains a pre-existing
    // "本演示不提供" line outside this course's scope; the course editor
    // area itself must be clean.)
    await expect(page.locator('body')).not.toContainText('已掌握')
    await expect(page.getByTestId('ws-editor-slot')).not.toContainText('已掌握')
    await expect(page.getByTestId('ws-editor-slot')).not.toContainText('本演示')
  })

  test('a correct retrieval passes all five checks and shows the work summary', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await passFlow(page)
    await expect(page.getByTestId('ai-u3-l04-work')).toContainText('作品总结')
    await expect(page.getByTestId('ai-u3-l04-work')).toContainText('可用资料：A、B')
    // OPS-025 shell feedback card: the slot judgment is really displayed.
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('本次检索合格。')
    await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：合格：五项全部通过。')
    await expect(page.getByTestId('ws-feedback-stage')).toContainText('检查结果：五项全部通过')
    await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('方法证据：')
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('edit after a pass invalidates the shell feedback judgment', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await passFlow(page)
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('本次检索合格。')
    await page.getByTestId('ai-u3-l04-q-A-source-no').click()
    // OPS-025: the shell feedback card invalidates with the edit — the old
    // judgment is gone, the stale note is shown, no placeholder is faked.
    await expect(page.getByTestId('ws-judgment-stale')).toContainText('旧判定已失效，修改后请重新检查')
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('fabricated source: card D is named with its veto reason', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-bad-source').click()
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('未合格')
    await expect(result).toContainText('卡 D·来源')
    await expect(result).toContainText('来源不可信')
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格。')
  })

  test('outdated material: card C is named with its veto reason', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-outdated').click()
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('卡 C·时间')
    await expect(result).toContainText('资料过期')
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格。')
  })

  test('irrelevant material: card F is named with its veto reason', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-irrelevant').click()
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('卡 F·相关')
    await expect(result).toContainText('与任务无关')
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格。')
  })

  test('off-topic keywords: named as not from the task sentence; no usable card retrieved', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-bad-keywords').click()
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('不在任务句中')
    await expect(result).toContainText('可用 0 张')
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格。')
  })

  test('missing rule word: the missing question is named', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-missing-rule').click()
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('没提到“相关”')
    await expect(result).toContainText('规则说明完整：失败')
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('未合格。')
  })

  test('unanswered questions are listed one by one', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-keywords').fill('苹果 颜色 规则')
    await page.getByTestId('ai-u3-l04-retrieve').click()
    for (const key of ['source', 'time', 'evidence', 'relevant'] as const) {
      await page.getByTestId(`ai-u3-l04-q-A-${key}-yes`).click()
    }
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('四问答完：失败')
    await expect(result).toContainText('卡 B·来源')
    await expect(result).toContainText('还没回答')
  })

  test('fix flow: repair the outdated card and reach pass', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-outdated').click()
    await page.getByTestId('ai-u3-l04-check').click()
    await expect(page.getByTestId('ai-u3-l04-result')).toContainText('未合格')
    await page.getByTestId('ai-u3-l04-q-C-time-no').click()
    await page.getByTestId('ai-u3-l04-usable-C').uncheck()
    await page.getByTestId('ai-u3-l04-check').click()
    await expect(page.getByTestId('ai-u3-l04-verdict')).toContainText('合格：五项全部通过')
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('本次检索合格。')
  })

  test('zero keywords retrieve nothing and fail the keyword check', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-retrieve').click()
    await expect(page.getByTestId('ai-u3-l04-hits-A')).toHaveText('0')
    await expect(page.getByTestId('ai-u3-l04-found-A')).toHaveText('未检索到')
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('关键词有效：失败')
    await expect(result).toContainText('当前 0 个')
  })

  test('four keywords fail the keyword check (over 3)', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-keywords').fill('苹果 颜色 规则 金帅')
    await page.getByTestId('ai-u3-l04-check').click()
    const result = page.getByTestId('ai-u3-l04-result')
    await expect(result).toContainText('关键词有效：失败')
    await expect(result).toContainText('当前 4 个')
  })

  test('shell task drawer reveals hints in order, never all at once', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ws-task-button').click()
    const drawer = page.getByTestId('ws-task-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('ws-hint-reveal-3')).toBeDisabled()
    await drawer.getByTestId('ws-hint-reveal-1').click()
    await expect(drawer).toContainText('命中数是线索')
    await expect(drawer).not.toContainText('最后看相关')
    await drawer.getByTestId('ws-hint-reveal-2').click()
    await drawer.getByTestId('ws-hint-reveal-3').click()
    await expect(drawer).toContainText('最后看相关')
  })

  test('shell save failure is shown, never reported as saved; saving recovers after storage returns', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-good').click()
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
    // save left no half draft: the good retrieval saved before the failure
    // is still there, intact.
    await page.reload()
    await expect(page.getByTestId('ai-u3-l04-keywords')).toHaveValue(/苹果/)
    await page.getByTestId('ai-u3-l04-example-bad-keywords').click()
    await waitForShellSaved(page)
    await expect(page.getByTestId('ws-save-message')).not.toContainText('未能保存')
    await page.reload()
    await expect(page.getByTestId('ai-u3-l04-keywords')).toHaveValue(/恐龙/)
  })

  test('shell draft saves and restores across reload; file-menu reset clears; judgment is not stored', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l04-example-outdated').click()
    await page.getByTestId('ai-u3-l04-check').click()
    await expect(page.getByTestId('ai-u3-l04-verdict')).toContainText('未合格')
    await waitForShellSaved(page)
    await page.reload()
    await expect(page.getByTestId('ws-save-message')).toContainText('已恢复草稿')
    await expect(page.getByTestId('ai-u3-l04-keywords')).toHaveValue(/规则/)
    await expect(page.getByTestId('ai-u3-l04-rule')).toHaveValue(/来源、时间、证据、相关/)
    await expect(page.getByTestId('ai-u3-l04-usable-C')).toBeChecked()
    await expect(page.getByTestId('ai-u3-l04-q-C-time-yes')).toHaveAttribute('aria-pressed', 'true')
    // The judgment is not part of the draft: after reload there is no result until re-check.
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    await expect(page.getByTestId('ai-u3-l04-result')).toHaveCount(0)
    await resetViaFileMenu(page)
    await expect(page.getByTestId('ai-u3-l04-keywords')).toHaveValue('')
    await expect(page.getByTestId('ai-u3-l04-usable-C')).not.toBeChecked()
  })
})

test.describe('A1-U3-L04 tablet screen', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })
  test('768px: a correct retrieval passes; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await passFlow(page)
    // OPS-025: the shell feedback card shows the real judgment on tablet.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('本次检索合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(1024)
    expect(await overflow(page)).toBe(false)
  })
})

test.describe('A1-U3-L04 narrow screen', () => {
  test('375px: a correct retrieval passes; shell feedback conclusion is in view; no horizontal overflow', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    await passFlow(page)
    // OPS-025: the shell feedback card shows the real judgment on phone.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('本次检索合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(812)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })
})
