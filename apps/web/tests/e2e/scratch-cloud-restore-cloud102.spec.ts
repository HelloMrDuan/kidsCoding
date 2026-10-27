import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// CLOUD-102: cross-device draft recovery, Scratch lab presentation layer.
// The lab buttons require the real Scratch VM (loaded), so this spec runs
// where the VM CDN is reachable (CI); locally the sandbox blocks jsDelivr
// and the VM never loads. Server scoping and table-layer cross-device reads
// are proven separately by live real-account A/B tests on the machine stack;
// this spec proves the lab UI layer: a failed save shows an explicit retry
// prompt with the button still clickable, and a device-2 session restores
// the account cloud project through the real VM. Cloud responses here are
// mocked with page.route; the .sb3 archive is a real fixture project.
const SCRATCH_ARCHIVE_BASE64 = readFileSync('tests/e2e/fixtures/scratch-single-character.sb3').toString('base64')

test('Scratch cloud save failure shows an explicit retry prompt and the button stays clickable', async ({ page }) => {
  test.setTimeout(180_000)
  await page.route('**/api/practice/scratch', async (route, request) => {
    if (request.method() === 'PUT') {
      await route.fulfill({ status: 503, json: { error: 'cloud-draft-storage-unavailable' } })
    } else {
      await route.fulfill({ json: { draft: null } })
    }
  })
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({ timeout: 60_000 })
  await expect(page.getByTestId('scratch-editor-validity')).toContainText('连接正确')
  await page.getByTestId('scratch-edit-spawn-count').fill('2')
  await page.getByTestId('scratch-edit-fall-step').fill('25')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('2颗 / 每步25 / 每0.3秒', { timeout: 12_000 })
  await expect(page.getByTestId('scratch-cloud-save')).toBeEnabled()
  await page.getByTestId('scratch-cloud-save').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('可再次点击保存重试')
  await expect(page.getByTestId('scratch-cloud-save')).toBeEnabled()
})

test('Scratch device 2 restores the account cloud project', async ({ page }) => {
  test.setTimeout(180_000)
  await page.route('**/api/practice/scratch', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ json: { draft: { lessonId: 'G3-U1-L02', archiveBase64: SCRATCH_ARCHIVE_BASE64, updatedAt: '2026-10-27T10:00:00.000Z' } } })
    } else {
      await route.fulfill({ json: { ok: true } })
    }
  })
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-cloud-restore')).toBeEnabled({ timeout: 60_000 })
  await page.getByTestId('scratch-cloud-restore').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText(/已获取账号私有项目|已从当前登录账号恢复/, { timeout: 30_000 })
})
