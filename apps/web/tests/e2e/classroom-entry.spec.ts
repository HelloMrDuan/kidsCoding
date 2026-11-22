import { expect, test } from '@playwright/test'

/**
 * 「编程课堂」 entry: continue the child's recorded lesson at the same route
 * the course system uses; with no record, offer the course picker. It must
 * never permanently point at the G0 demo studio lesson.
 */

test('no learning record → 编程课堂 opens the course picker, not the demo lesson', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByTestId('kc-nav-lesson')
  await expect(nav).toHaveAttribute('href', '/learn/catalog')
  await expect(nav).not.toHaveAttribute('href', '/studio/blockly/lesson-01-forest-hello')
})

test('recorded catalog lesson → 编程课堂 opens the same route the catalog card uses', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kc-progress', JSON.stringify({
      currentLessonId: 'G1-U1-L01',
      completedLessonIds: ['G1-U1-L01'],
      completedProjectIds: [],
      projectSnapshots: [],
    }))
  })
  await page.goto('/')
  const nav = page.getByTestId('kc-nav-lesson')
  await expect(nav).toHaveAttribute('href', '/learn/story-lab/G1-U1-L01/golden')
  // At phone widths the sidebar is a drawer; the bottom bar is the visible
  // 编程课堂 entry, and it must carry the same resolved route.
  const entry = (await nav.isVisible()) ? nav : page.locator('.kc-mobile-bottom').getByRole('link', { name: '课堂' })
  await expect(entry).toHaveAttribute('href', '/learn/story-lab/G1-U1-L01/golden')
  await entry.click()
  await expect(page).toHaveURL(/\/learn\/story-lab\/G1-U1-L01\/golden$/)
  await expect(page.getByTestId('lesson-blockly-workspace')).toBeVisible()
})

test('recorded launch lesson → 编程课堂 keeps the original lesson URL', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kc-progress', JSON.stringify({
      currentLessonId: 'lesson-02-forest-greeting',
      completedLessonIds: ['lesson-01-forest-hello'],
      completedProjectIds: [],
      projectSnapshots: [],
    }))
  })
  await page.goto('/')
  await expect(page.getByTestId('kc-nav-lesson')).toHaveAttribute('href', '/learn/lesson/lesson-02-forest-greeting')
})
