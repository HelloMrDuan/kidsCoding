import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u3-l06/A1-U3-L06'

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

async function predictAndAskAllEight(page: import('@playwright/test').Page) {
  for (const id of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']) {
    await page.getByTestId(`ai-u3-l06-predict-${id}-answer`).click()
    await page.getByTestId(`ai-u3-l06-ask-${id}`).click()
  }
  for (const id of ['Q7', 'Q8']) {
    await page.getByTestId(`ai-u3-l06-predict-${id}-refuse`).click()
    await page.getByTestId(`ai-u3-l06-ask-${id}`).click()
  }
}

test.describe('A1-U3-L06 lesson page (unified LessonWorkspace integration)', () => {
  test('renders the question list and the ask input', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ws-topbar')).toContainText('制作学习问答助手')
    await expect(page.getByTestId('ai-u3-l06-question-Q1')).toContainText('金帅苹果为什么被颜色规则判成香蕉？')
    await expect(page.getByTestId('ai-u3-l06-question-Q8')).toContainText('恐龙为什么灭绝？')
    await expect(page.getByTestId('ai-u3-l06-custom-input')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l06-check')).toBeVisible()
  })

  test('a correct prediction and ask passes one check and shows the reply', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-predict-Q1-answer').click()
    await page.getByTestId('ai-u3-l06-ask-Q1').click()
    await expect(page.getByTestId('ai-u3-l06-reply-Q1')).toContainText('回答：因为它是黄色的')
    await expect(page.getByTestId('ai-u3-l06-reply-Q1')).toContainText('预测正确。')
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ai-u3-l06-result')).toContainText('Q1：通过')
  })

  test('a wrong prediction fails that check', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-predict-Q7-answer').click()
    await page.getByTestId('ai-u3-l06-ask-Q7').click()
    await expect(page.getByTestId('ai-u3-l06-reply-Q7')).toContainText('拒答：这个问题超出课节限定任务')
    await expect(page.getByTestId('ai-u3-l06-reply-Q7')).toContainText('预测错了')
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ai-u3-l06-result')).toContainText('Q7：未通过')
  })

  test('all eight correct predictions pass and show the work summary', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await predictAndAskAllEight(page)
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ai-u3-l06-verdict')).toContainText('合格：八问全部通过')
    await expect(page.getByTestId('ai-u3-l06-work')).toContainText('作品总结')
    // OPS-025 shell feedback card: the slot judgment is really displayed.
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次问答合格。')
    await expect(page.getByTestId('ws-feedback-task')).toContainText('任务判定：合格：八问全部通过。')
    await expect(page.getByTestId('ws-feedback-stage')).toContainText('检查结果：八问全部通过')
    await expect(page.getByTestId('ws-feedback-knowledge')).toContainText('方法证据：')
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('edit after a pass invalidates the shell feedback judgment', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await predictAndAskAllEight(page)
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ws-feedback-conclusion')).toContainText('结论：本次问答合格。')
    await page.getByTestId('ai-u3-l06-predict-Q1-refuse').click()
    // OPS-025: the shell feedback card invalidates with the edit — the old
    // judgment is gone, the stale note is shown, no placeholder is faked.
    await expect(page.getByTestId('ws-judgment-stale')).toContainText('旧判定已失效，修改后请重新检查')
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
    await expect(page.getByText('暂无检查结果')).toHaveCount(0)
  })

  test('out-of-scope questions are refused with the fixed refusal', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-predict-Q7-refuse').click()
    await page.getByTestId('ai-u3-l06-ask-Q7').click()
    await expect(page.getByTestId('ai-u3-l06-reply-Q7')).toContainText(
      '拒答：这个问题超出课节限定任务，我不能回答；请回到课节内的任务来。',
    )
    await page.getByTestId('ai-u3-l06-predict-Q8-refuse').click()
    await page.getByTestId('ai-u3-l06-ask-Q8').click()
    await expect(page.getByTestId('ai-u3-l06-reply-Q8')).toContainText('拒答：这个问题超出课节限定任务')
  })

  test('an unknown question is refused with the no-match text', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-custom-input').fill('今天天气怎么样？')
    await page.getByTestId('ai-u3-l06-custom-predict-refuse').click()
    await page.getByTestId('ai-u3-l06-custom-ask').click()
    await expect(page.getByTestId('ai-u3-l06-custom-result')).toContainText(
      '拒答：这个问题在本地知识库里没有匹配条目',
    )
    await expect(page.getByTestId('ai-u3-l06-custom-result')).toContainText('预测正确。')
  })

  test('an empty question shows the fixed empty text and asks nothing', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-custom-ask').click()
    await expect(page.getByText('请先写一个问题，再点提问。')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l06-custom-result')).toHaveCount(0)
  })

  test('error examples: ans2 is an invented digit and ans3 is an invented source', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-error-ans2-pass').click()
    await expect(page.getByText('不对，再看一次：')).toBeVisible()
    await page.getByTestId('ai-u3-l06-error-ans2-digit').click()
    await expect(page.getByText('判断正确：编造数字。')).toBeVisible()
    await page.getByTestId('ai-u3-l06-error-ans3-source').click()
    await expect(page.getByText('判断正确：编造来源。')).toBeVisible()
  })

  test('fix flow: a wrong prediction is corrected and the drill passes', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await predictAndAskAllEight(page)
    // Deliberately mispredict Q7 first: the check must fail on Q7 only.
    await page.getByTestId('ai-u3-l06-predict-Q7-answer').click()
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ai-u3-l06-result')).toContainText('未合格')
    await expect(page.getByTestId('ai-u3-l06-result')).toContainText('Q7：未通过')
    await page.getByTestId('ai-u3-l06-predict-Q7-refuse').click()
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ai-u3-l06-verdict')).toContainText('合格：八问全部通过')
  })

  test('custom questions: a new in-scope question and a new out-of-scope one', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-custom-input').fill('金帅苹果有多重？')
    await page.getByTestId('ai-u3-l06-custom-predict-answer').click()
    await page.getByTestId('ai-u3-l06-custom-ask').click()
    await expect(page.getByTestId('ai-u3-l06-custom-result')).toContainText('回答：')
    await expect(page.getByTestId('ai-u3-l06-custom-result')).toContainText('预测正确。')
    await page.getByTestId('ai-u3-l06-custom-input').fill('恐龙吃什么？')
    await page.getByTestId('ai-u3-l06-custom-predict-refuse').click()
    await page.getByTestId('ai-u3-l06-custom-ask').click()
    await expect(page.getByTestId('ai-u3-l06-custom-result')).toContainText('拒答：这个问题超出课节限定任务')
    await expect(page.getByTestId('ai-u3-l06-draft-status')).toContainText('迁移提问 2 个')
  })

  test('shell task drawer reveals hints in order, never all at once', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ws-task-button').click()
    const drawer = page.getByTestId('ws-task-drawer')
    await expect(drawer).toBeVisible()
    await expect(drawer.getByTestId('ws-hint-reveal-3')).toBeDisabled()
    await drawer.getByTestId('ws-hint-reveal-1').click()
    await expect(drawer).toContainText('先看八问的分类')
    // '先猜它会答还是拒' 只在三级提示里出现（scopeGap 与方法步骤都不含它）；
    // 揭示一级提示后它必须还未出现。
    await expect(drawer).not.toContainText('先猜它会答还是拒')
    await drawer.getByTestId('ws-hint-reveal-2').click()
    await drawer.getByTestId('ws-hint-reveal-3').click()
    await expect(drawer).toContainText('先猜它会答还是拒')
  })

  test('shell save failure is shown, never reported as saved; saving recovers after storage returns', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-predict-Q1-answer').click()
    await page.getByTestId('ai-u3-l06-ask-Q1').click()
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
    // save left no half draft: the asked Q1 saved before the failure
    // is still there, intact.
    await page.reload()
    await expect(page.getByTestId('ai-u3-l06-reply-Q1')).toBeVisible()
    await page.getByTestId('ai-u3-l06-predict-Q2-answer').click()
    await page.getByTestId('ai-u3-l06-ask-Q2').click()
    await waitForShellSaved(page)
    await expect(page.getByTestId('ws-save-message')).not.toContainText('未能保存')
    await page.reload()
    await expect(page.getByTestId('ai-u3-l06-reply-Q2')).toBeVisible()
  })

  test('shell draft saves and restores across reload; file-menu reset clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l06-predict-Q1-answer').click()
    await page.getByTestId('ai-u3-l06-ask-Q1').click()
    await waitForShellSaved(page)
    await page.reload()
    await expect(page.getByTestId('ws-save-message')).toContainText('已恢复草稿')
    await expect(page.getByTestId('ai-u3-l06-reply-Q1')).toBeVisible()
    await resetViaFileMenu(page)
    await expect(page.getByTestId('ai-u3-l06-reply-Q1')).toHaveCount(0)
    await expect(page.getByTestId('ai-u3-l06-draft-status')).toContainText('已问 0/8')
  })
})

test.describe('A1-U3-L06 tablet screen', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true })
  test('768px: all eight correct predictions pass; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    for (const id of ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6']) {
      await page.getByTestId(`ai-u3-l06-predict-${id}-answer`).tap()
      await page.getByTestId(`ai-u3-l06-ask-${id}`).tap()
    }
    for (const id of ['Q7', 'Q8']) {
      await page.getByTestId(`ai-u3-l06-predict-${id}-refuse`).tap()
      await page.getByTestId(`ai-u3-l06-ask-${id}`).tap()
    }
    await page.getByTestId('ai-u3-l06-check').tap()
    await expect(page.getByTestId('ai-u3-l06-verdict')).toContainText('合格：八问全部通过')
    // OPS-025: the shell feedback card shows the real judgment on tablet.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次问答合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(1024)
    expect(await overflow(page)).toBe(false)
  })
})

test.describe('A1-U3-L06 narrow screen', () => {
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
    await page.getByTestId('ai-u3-l06-predict-Q1-answer').click()
    await page.getByTestId('ai-u3-l06-ask-Q1').click()
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ai-u3-l06-result')).toBeVisible()
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })

  test('375px: all eight correct predictions pass; shell feedback conclusion is in view', async ({ page }) => {
    test.setTimeout(150_000)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(ROUTE)
    await predictAndAskAllEight(page)
    await page.getByTestId('ai-u3-l06-check').click()
    await expect(page.getByTestId('ai-u3-l06-verdict')).toContainText('合格：八问全部通过')
    // OPS-025: the shell feedback card shows the real judgment on phone.
    const conclusion = page.getByTestId('ws-feedback-conclusion')
    await expect(conclusion).toContainText('结论：本次问答合格。')
    await conclusion.scrollIntoViewIfNeeded()
    const conclusionBox = await conclusion.boundingBox()
    expect(conclusionBox).not.toBeNull()
    expect(conclusionBox!.y).toBeGreaterThanOrEqual(0)
    expect(conclusionBox!.y + conclusionBox!.height).toBeLessThanOrEqual(812)
    await expect.poll(() => overflow(page), { timeout: 10_000 }).toBe(false)
  })
})
