import { expect, test } from '@playwright/test'

/**
 * D1/D3 regression: the catalog trial section says five gates (not four),
 * and the grid classroom reports local-only saving (no server privacy note).
 * Covers one G0-U1 and one G0-U3 loop lesson because both share GridLab.
 */
for (const lessonId of ['G0-U1-L01', 'G0-U3-L01']) {
  test(`D1/D3: catalog ${lessonId} says five gates; classroom is local-only`, async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto(`/learn/catalog/${lessonId}`)
    const trialSection = page.locator('section', { has: page.getByTestId('grid-trial-entry') })
    await expect(trialSection).toContainText('五关')
    await expect(page.locator('body')).not.toContainText('四关')

    await page.getByTestId('grid-trial-entry').click()
    await expect(page.getByTestId('lesson-workbench-shell')).toBeVisible()
    await expect(page.getByTestId('lesson-save-cloud')).toContainText('仅保存到本机')
    await expect(page.getByTestId('lesson-cloud-privacy-note')).toHaveCount(0)
  })
}
