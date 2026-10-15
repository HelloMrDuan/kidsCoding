import { expect, test } from '@playwright/test'

// UX-003: LessonCard / ProgressTrack / StoryDialog in real Chrome.
// Unlike UX-002 (which verified shipped CSS via a mirrored fixture), this
// spec loads the real React components through the test-fixture route
// (/test-fixtures/ux-003) with real curriculum definitions and controlled
// test progress. No handwritten mock DOM.
for (const [name, width, height] of [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile', 375, 812],
] as const) {
  test(`UX-003 real components on ${name}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3100',
      viewport: { width, height },
      hasTouch: name === 'mobile',
    })
    const page = await context.newPage()
    await page.goto('/test-fixtures/ux-003')

    // --- StoryDialog: inline guide, NOT a modal (negative) ---
    const storyReal = page.getByTestId('story-dialog-real')
    await expect(storyReal.getByTestId('story-dialog')).toBeVisible()
    expect(await page.locator('dialog').count()).toBe(0)
    expect(await page.getByRole('dialog').count()).toBe(0)
    await expect(storyReal.getByTestId('story-dialog')).toContainText('森林里的第一次见面')
    await expect(storyReal.getByTestId('story-dialog')).toContainText('STEP 03')
    await expect(storyReal.getByTestId('story-dialog')).toContainText('完成目标')

    const storyDialogue = page.getByTestId('story-dialog-dialogue')
    await expect(storyDialogue.getByTestId('story-dialog')).toContainText('小熊')
    await expect(storyDialogue.getByTestId('story-dialog')).toContainText('你好呀，一起玩吧！')

    // --- LessonCard: real curriculum, real states ---
    const grid = page.getByTestId('lesson-card-grid')
    const cards = grid.locator('[data-testid^="lesson-card-"]')
    await expect(cards).toHaveCount(12)
    // First 2 completed (✓ + 已完成), 3rd current (03 + 当前练习), rest available.
    await expect(cards.nth(0)).toContainText('✓')
    await expect(cards.nth(0)).toContainText('已完成')
    await expect(cards.nth(1)).toContainText('已完成')
    await expect(cards.nth(2)).toContainText('03')
    await expect(cards.nth(2)).toContainText('当前练习')
    await expect(cards.nth(3)).toContainText('可以开始')

    // Frozen .step geometry: 44px node, ellipsis title.
    await expect(cards.nth(0).locator('.kc-step-node')).toHaveCSS('width', '44px')
    await expect(cards.nth(0).locator('.kc-step-node')).toHaveCSS('height', '44px')
    await expect(cards.nth(0).locator('b')).toHaveCSS('text-overflow', 'ellipsis')
    await expect(cards.nth(0).locator('b')).toHaveCSS('overflow', 'hidden')
    await expect(cards.nth(0).locator('b')).toHaveCSS('white-space', 'nowrap')
    // Done node paint (prototype .step.done).
    await expect(cards.nth(0).locator('.kc-step-node')).toHaveCSS(
      'background-color',
      'rgb(47, 106, 233)',
    )
    // Current node ring (prototype .step.current).
    await expect(cards.nth(2).locator('.kc-step-node')).toHaveCSS(
      'border-color',
      'rgb(41, 105, 237)',
    )

    // Display-only locked / unreleased: never focusable, never activatable.
    const displayOnly = page.getByTestId('lesson-card-display-only')
    const locked = displayOnly.getByTestId('lesson-card-test-locked-01')
    const unreleased = displayOnly.getByTestId('lesson-card-test-unreleased-01')
    await expect(locked).toHaveAttribute('aria-disabled', 'true')
    await expect(unreleased).toHaveAttribute('aria-disabled', 'true')
    await expect(locked).toContainText('已锁定')
    await expect(unreleased).toContainText('未开放')
    await locked.focus()
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).not.toBe(
      'lesson-card-test-locked-01',
    )
    await unreleased.focus()
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).not.toBe(
      'lesson-card-test-unreleased-01',
    )
    const urlBefore = page.url()
    await locked.click({ force: true })
    await unreleased.click({ force: true })
    expect(page.url()).toBe(urlBefore)

    // --- ProgressTrack: position (3) vs completion (2 of 5) ---
    const trackReal = page.getByTestId('progress-track-real').getByTestId('progress-track')
    await expect(trackReal.getByTestId('progress-track-text')).toContainText('步骤 3 / 5')
    const bar = trackReal.getByTestId('progress-track-bar')
    await expect(bar).toHaveAttribute('role', 'progressbar')
    await expect(bar).toHaveAttribute('aria-valuenow', '2')
    await expect(bar).toHaveAttribute('aria-valuemax', '5')
    await expect(bar.locator('i')).toHaveCSS('width', '52px') // 40% of the 130px prototype track
    await expect(bar).toHaveCSS('background-color', 'rgb(231, 238, 249)')
    await expect(bar.locator('i')).toHaveCSS('background-color', 'rgb(36, 99, 235)')

    // Variants: empty, error, full, not-started.
    await expect(
      page.getByTestId('progress-track-empty').getByTestId('progress-track'),
    ).toContainText('暂无步骤')
    await expect(
      page.getByTestId('progress-track-error').getByRole('alert'),
    ).toContainText('无法读取进度')
    await expect(
      page.getByTestId('progress-track-full').getByTestId('progress-track-bar').locator('i'),
    ).toHaveCSS('width', '130px')
    await expect(
      page.getByTestId('progress-track-not-started').getByTestId('progress-track-text'),
    ).toContainText('共 5 步')

    // No horizontal overflow at this viewport (long titles stay ellipsized).
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`${name}-ux-003.png`) })

    // Real keyboard navigation: focus the first available card, Enter
    // navigates to the real lesson URL.
    const firstAvailable = cards.nth(3)
    await firstAvailable.focus()
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe(
      await firstAvailable.getAttribute('data-testid'),
    )
    const href = await firstAvailable.getAttribute('href')
    await page.keyboard.press('Enter')
    await page.waitForURL(`**${href}`)
    expect(page.url()).toContain('/learn/lesson/')

    await context.close()
  })
}
