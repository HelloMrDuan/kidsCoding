import type { Page } from '@playwright/test'

/**
 * UX-202: on phones (<=600px) the classroom shows one zone at a time
 * behind the 任务 / 积木 / 舞台 tabs. On larger viewports all zones are
 * visible and the tabs are display:none, so this is a no-op there.
 * Call it before interacting with elements that live in a zone.
 */
export async function showLessonPane(
  page: Page,
  pane: 'task' | 'code' | 'stage',
) {
  if (await page.getByTestId('lesson-mobile-tabs').isVisible()) {
    await page.getByTestId(`lesson-mobile-tab-${pane}`).click()
  }
}
