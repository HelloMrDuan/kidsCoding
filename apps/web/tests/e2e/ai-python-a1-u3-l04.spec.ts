/**
 * A1-U3-L04 E2E 骨架（脚手架 OPS-030 生成）。
 *
 * 三端（1440×900 / 768×1024 / 375×812）+ 真实反馈卡 + 草稿恢复。
 * 课程独有的断言由课程作者按本课判定填写；骨架断言只覆盖外壳行为。
 */

import { expect, test } from '@playwright/test'

const LESSON_URL = '/ai-python-lab-a1-u3/A1-U3-L04'

test.describe('A1-U3-L04 classroom (scaffold)', () => {
  test('desktop renders the workspace and the feedback card', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(LESSON_URL)
    await expect(page.getByTestId('ws-root')).toBeVisible()
    await expect(page.getByTestId('ws-feedback')).toBeVisible()
    await expect(page.getByTestId('ws-feedback')).not.toContainText('本演示')
  })

  test('tablet renders without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(LESSON_URL)
    await expect(page.getByTestId('ws-root')).toBeVisible()
    await expect(page.getByTestId('ws-feedback')).toBeVisible()
  })

  test('mobile renders without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(LESSON_URL)
    await expect(page.getByTestId('ws-root')).toBeVisible()
    await expect(page.getByTestId('ws-feedback')).toBeVisible()
  })

  test('check reports a judgment to the shell feedback card', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(LESSON_URL)
    await page.getByTestId('ws-a1-u3-l04-check').click()
    // 骨架断言：反馈卡出现判定结论（课程作者按本课判定收紧文案）。
    await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible()
  })

  test('editing after a check invalidates the shown judgment', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(LESSON_URL)
    await page.getByTestId('ws-a1-u3-l04-check').click()
    await expect(page.getByTestId('ws-feedback-conclusion')).toBeVisible()
    await page.getByTestId('ws-a1-u3-l04-input').fill('edited')
    await expect(page.getByTestId('ws-feedback-conclusion')).toHaveCount(0)
  })
})
