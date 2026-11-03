import { expect, test } from '@playwright/test'

const ROUTE = '/learn/ai-python-lab-u3-l02/A1-U3-L02'

async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

async function gotoIndependent(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-u3-l02-tab-independent').click()
}

test.describe('A1-U3-L02 lesson page (P0 contract classroom)', () => {
  test('goal bar shows five contract items and no API claim', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u3-l02-lesson-heading')).toContainText('实现文本摘要')
    const goalBar = page.getByTestId('ai-u3-l02-goal-bar')
    await expect(goalBar).toContainText('今天学什么：忠实摘要')
    await expect(goalBar).toContainText('要解决什么问题：从短文里挑出 3 句要点')
    await expect(goalBar).toContainText('学完能做什么：判断一句摘要是否忠实')
    await expect(goalBar).toContainText('尚未建成')
    await expect(goalBar).toContainText('不调用外部模型')
    await expect(goalBar).not.toContainText('通过 API 自动生成摘要')
    await expect(goalBar).not.toContainText('已掌握')
  })

  test('prediction: correct verdict and failed check are confirmed on reveal', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-predict-verdict-pred-a').selectOption('合格')
    await page.getByTestId('ai-u3-l02-reveal-pred-a').click()
    const resultA = page.getByTestId('ai-u3-l02-predict-result-pred-a')
    await expect(resultA).toContainText('真实结果：合格')
    await expect(resultA).toContainText('你猜对了')
    await page.getByTestId('ai-u3-l02-predict-verdict-pred-b').selectOption('未合格')
    await page.getByTestId('ai-u3-l02-predict-failed-pred-b').selectOption('漏要点')
    await page.getByTestId('ai-u3-l02-reveal-pred-b').click()
    const resultB = page.getByTestId('ai-u3-l02-predict-result-pred-b')
    await expect(resultB).toContainText('真实结果：未合格')
    await expect(resultB).toContainText('你猜对了')
  })

  test('prediction: reveal without a prediction asks for one first', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-reveal-pred-c').click()
    await expect(page.getByText('先写下你的预测，再揭示结果。')).toBeVisible()
    await expect(page.getByTestId('ai-u3-l02-predict-result-pred-c')).toHaveCount(0)
  })

  test('independent summary passes all five checks with three-line judging', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await expect(page.getByTestId('ai-u3-l02-passage')).toContainText('颜色是本数据集的主特征')
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-pick-P3-1').check()
    await page.getByTestId('ai-u3-l02-pick-P4-1').check()
    await page.getByTestId('ai-u3-l02-check-summary').click()
    const checks = page.getByTestId('ai-u3-l02-summary-checks')
    await expect(checks).toContainText('漏要点：通过')
    await expect(checks).toContainText('添内容：通过')
    await expect(checks).toContainText('改原意：通过')
    await expect(checks).toContainText('抽取规范：通过')
    await expect(checks).toContainText('来源核验：通过')
    await expect(checks).toContainText('数字规则检查')
    await expect(page.getByTestId('ai-u3-l02-summary-verdict')).toContainText('合格：五项全部通过')
    await expect(checks).toContainText('方法证据')
    await expect(checks).toContainText('要点覆盖 A、B、C')
    await expect(page.getByText('已掌握')).toHaveCount(0)
  })

  test('fix flow: failing summary, post-change prediction, then pass', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-pick-P3-1').check()
    await page.getByTestId('ai-u3-l02-check-summary').click()
    await expect(page.getByTestId('ai-u3-l02-summary-verdict')).toContainText('未合格')
    await expect(page.getByTestId('ai-u3-l02-summary-checks')).toContainText('漏要点：失败')
    await page.getByTestId('ai-u3-l02-explain-漏要点').fill('少了 C 要点，还没选测试集那段。')
    await page.getByTestId('ai-u3-l02-pick-P4-1').check()
    await page.getByTestId('ai-u3-l02-post-predict').selectOption('pass')
    await page.getByTestId('ai-u3-l02-check-summary').click()
    await expect(page.getByTestId('ai-u3-l02-summary-verdict')).toContainText('合格：五项全部通过')
    await expect(page.getByTestId('ai-u3-l02-post-predict-result')).toContainText('你猜对了')
  })

  test('examples stay locked until the first independent check', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await expect(page.getByTestId('ai-u3-l02-examples-locked')).toBeVisible()
    await expect(page.getByText('好摘要：三步法输出')).toHaveCount(0)
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-check-summary').click()
    await expect(page.getByText('好摘要：三步法输出')).toBeVisible()
    await expect(page.getByText('反例②：添了一句原文没有的话')).toBeVisible()
  })

  test('custom limits: at most 5 sentences, at most 200 chars, with visible notices', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await expect(page.getByText('自加句是用来练习识别添内容与来源不明的错误实验')).toBeVisible()
    for (let i = 1; i <= 5; i++) {
      await page.getByTestId('ai-u3-l02-custom-input').fill(`自加句${i}。`)
      await page.getByTestId('ai-u3-l02-add-custom').click()
    }
    await expect(page.getByTestId('ai-u3-l02-entries')).toContainText('自加句5。')
    await page.getByTestId('ai-u3-l02-custom-input').fill('自加句6。')
    await page.getByTestId('ai-u3-l02-add-custom').click()
    await expect(page.getByTestId('ai-u3-l02-custom-notice')).toContainText('最多 5 句，已达上限')
    await expect(page.getByTestId('ai-u3-l02-entries')).not.toContainText('自加句6。')
    await page.getByTestId('ai-u3-l02-tab-summary').click()
    await page.getByTestId('ai-u3-l02-reset').click()
    await gotoIndependent(page)
    await page.getByTestId('ai-u3-l02-custom-input').fill('x'.repeat(201))
    await page.getByTestId('ai-u3-l02-add-custom').click()
    await expect(page.getByTestId('ai-u3-l02-custom-notice')).toContainText('过长')
    await expect(page.getByTestId('ai-u3-l02-entries')).toHaveCount(0)
  })

  test('reverse: selecting all sentences fails extractive rules', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    for (const id of ['P1-1', 'P1-2', 'P2-1', 'P2-2', 'P3-1', 'P3-2', 'P4-1', 'P4-2', 'P5-1', 'P5-2']) {
      await page.getByTestId(`ai-u3-l02-pick-${id}`).check()
    }
    await page.getByTestId('ai-u3-l02-check-summary').click()
    const checks = page.getByTestId('ai-u3-l02-summary-checks')
    await expect(checks).toContainText('漏要点：通过')
    await expect(checks).toContainText('抽取规范：失败')
  })

  test('reverse: repeating one point fails extractive rules', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    for (const id of ['P1-1', 'P2-1', 'P3-1', 'P4-1']) {
      await page.getByTestId(`ai-u3-l02-pick-${id}`).check()
    }
    await page.getByTestId('ai-u3-l02-check-summary').click()
    await expect(page.getByTestId('ai-u3-l02-summary-checks')).toContainText('抽取规范：失败')
  })

  test('reverse: a custom sentence fails added-content and source checks; removal clears it', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await page.getByTestId('ai-u3-l02-custom-input').fill('黄苹果最甜。')
    await page.getByTestId('ai-u3-l02-add-custom').click()
    await expect(page.getByTestId('ai-u3-l02-entries')).toContainText('自加：黄苹果最甜。')
    await page.getByTestId('ai-u3-l02-check-summary').click()
    const checks = page.getByTestId('ai-u3-l02-summary-checks')
    await expect(checks).toContainText('添内容：失败')
    await expect(checks).toContainText('来源核验：失败')
    await page.getByTestId('ai-u3-l02-remove-custom-0').click()
    await expect(page.getByTestId('ai-u3-l02-entries')).toHaveCount(0)
  })

  test('reverse: a custom sentence with an invented digit fails meaning', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await page.getByTestId('ai-u3-l02-custom-input').fill('训练集共 30 条。')
    await page.getByTestId('ai-u3-l02-add-custom').click()
    await page.getByTestId('ai-u3-l02-check-summary').click()
    await expect(page.getByTestId('ai-u3-l02-summary-checks')).toContainText('改原意：失败')
  })

  test('transfer: a new passage passes the same five checks; a missing point fails', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-tab-transfer').click()
    await expect(page.getByTestId('ai-u3-l02-transfer-passage')).toContainText('整理书包先分三类')
    await page.getByTestId('ai-u3-l02-transfer-pick-T1-1').check()
    await page.getByTestId('ai-u3-l02-transfer-pick-T2-1').check()
    await page.getByTestId('ai-u3-l02-transfer-pick-T3-1').check()
    await page.getByTestId('ai-u3-l02-transfer-check').click()
    await expect(page.getByTestId('ai-u3-l02-transfer-verdict')).toContainText('合格：五项全部通过')
    await page.getByTestId('ai-u3-l02-transfer-remove-T3-1').click()
    await page.getByTestId('ai-u3-l02-transfer-check').click()
    await expect(page.getByTestId('ai-u3-l02-transfer-verdict')).toContainText('未合格')
    await expect(page.getByTestId('ai-u3-l02-transfer-checks')).toContainText('漏要点：失败')
  })

  test('fact check classifies all six statements', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-tab-facts').click()
    const answers: Record<string, string> = {
      F1: '原文事实',
      F2: '原文事实',
      G1: '合理概括',
      G2: '合理概括',
      U1: '无依据推断',
      U2: '无依据推断',
    }
    for (const [id, kind] of Object.entries(answers)) {
      await page.getByTestId(`ai-u3-l02-fact-${id}`).selectOption(kind)
    }
    await page.getByTestId('ai-u3-l02-check-facts').click()
    await expect(page.getByTestId('ai-u3-l02-fact-score')).toContainText('6 / 6 条正确')
    await expect(page.getByTestId('ai-u3-l02-fact-result-U1')).toContainText('正确：无依据推断')
  })

  test('task drawer holds progressive hints without revealing them all at once', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await page.getByTestId('ai-u3-l02-drawer-toggle').click()
    await expect(page.getByTestId('ai-u3-l02-drawer')).toBeVisible()
    await page.getByTestId('ai-u3-l02-hint-1').click()
    await expect(page.getByTestId('ai-u3-l02-hint-text')).toContainText('先读每段第一句找要点')
    await expect(page.getByTestId('ai-u3-l02-hint-text')).not.toContainText('对照清单')
    await page.getByTestId('ai-u3-l02-hint-3').click()
    await expect(page.getByTestId('ai-u3-l02-hint-text')).toContainText('对照清单')
  })

  test('draft saves and restores across reload; restore-default clears', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-custom-input').fill('黄苹果最甜。')
    await page.getByTestId('ai-u3-l02-add-custom').click()
    await page.getByTestId('ai-u3-l02-tab-facts').click()
    await page.getByTestId('ai-u3-l02-fact-F1').selectOption('原文事实')
    await page.getByTestId('ai-u3-l02-tab-transfer').click()
    await page.getByTestId('ai-u3-l02-transfer-pick-T1-1').check()
    await page.getByTestId('ai-u3-l02-tab-summary').click()
    await page.getByTestId('ai-u3-l02-method-summary').fill('先找主题句，再删重复，再排序。')
    await page.reload()
    await gotoIndependent(page)
    await expect(page.getByTestId('ai-u3-l02-pick-P1-1')).toBeChecked()
    await expect(page.getByTestId('ai-u3-l02-entries')).toContainText('自加：黄苹果最甜。')
    await page.getByTestId('ai-u3-l02-tab-facts').click()
    await expect(page.getByTestId('ai-u3-l02-fact-F1')).toHaveValue('原文事实')
    await page.getByTestId('ai-u3-l02-tab-transfer').click()
    await expect(page.getByTestId('ai-u3-l02-transfer-pick-T1-1')).toBeChecked()
    await page.getByTestId('ai-u3-l02-tab-summary').click()
    await expect(page.getByTestId('ai-u3-l02-method-summary')).toHaveValue('先找主题句，再删重复，再排序。')
    await page.getByTestId('ai-u3-l02-reset').click()
    await gotoIndependent(page)
    await expect(page.getByTestId('ai-u3-l02-pick-P1-1')).not.toBeChecked()
    await page.getByTestId('ai-u3-l02-tab-facts').click()
    await expect(page.getByTestId('ai-u3-l02-fact-F1')).toHaveValue('')
  })

  test('lesson data stays isolated per lessonId key across another lesson page', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await page.getByTestId('ai-u3-l02-pick-P1-1').check()
    await page.getByTestId('ai-u3-l02-tab-transfer').click()
    await page.getByTestId('ai-u3-l02-transfer-pick-T1-1').check()
    const keys = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith('kidscoding-draft:')),
    )
    expect(keys).toEqual(['kidscoding-draft:A1-U3-L02'])
    await page.goto('/learn/ai-python-lab-u3/A1-U3-L02')
    await page.goto(ROUTE)
    await gotoIndependent(page)
    await expect(page.getByTestId('ai-u3-l02-pick-P1-1')).toBeChecked()
    await page.getByTestId('ai-u3-l02-tab-transfer').click()
    await expect(page.getByTestId('ai-u3-l02-transfer-pick-T1-1')).toBeChecked()
  })
})

test.describe('A1-U3-L02 narrow screen', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })
  test('375px: no horizontal overflow before or after interaction', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(ROUTE)
    await expect(page.getByTestId('ai-u3-l02-lesson-heading')).toBeVisible()
    expect(await overflow(page)).toBe(false)
    await page.getByTestId('ai-u3-l02-tab-independent').tap()
    await page.getByTestId('ai-u3-l02-pick-P1-1').tap()
    await page.getByTestId('ai-u3-l02-check-summary').tap()
    await expect(page.getByTestId('ai-u3-l02-summary-checks')).toBeVisible()
    expect(await overflow(page)).toBe(false)
    await page.getByTestId('ai-u3-l02-tab-transfer').tap()
    await page.getByTestId('ai-u3-l02-transfer-pick-T1-1').tap()
    await page.getByTestId('ai-u3-l02-transfer-check').tap()
    await expect(page.getByTestId('ai-u3-l02-transfer-checks')).toBeVisible()
    expect(await overflow(page)).toBe(false)
  })
})
