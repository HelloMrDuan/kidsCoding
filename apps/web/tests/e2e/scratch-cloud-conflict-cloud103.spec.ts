import { expect, test, type Page } from '@playwright/test'

// CLOUD-103: Scratch save conflict guard, lab UI layer.
// The lab buttons require the real Scratch VM (loaded), so this spec runs
// where the VM CDN is reachable (CI); locally the sandbox blocks jsDelivr
// and the VM never loads. Cloud responses here are mocked with page.route.
// Wired into curriculum-content.yml scratch-real-vm-browser jobs (both
// shards). The machine-stack table-layer proof (B PUT creates only its own
// row, A row untouched) is recorded separately in the CLOUD-103 inventory.

async function bootLab(page: Page) {
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-green-flag')).toBeEnabled({ timeout: 60_000 })
  await expect(page.getByTestId('scratch-editor-validity')).toContainText('连接正确')
  await page.getByTestId('scratch-edit-spawn-count').fill('2')
  await page.getByTestId('scratch-edit-fall-step').fill('25')
  await page.getByTestId('scratch-apply-blocks').click()
  await expect(page.getByTestId('scratch-applied-program')).toHaveText('2颗 / 每步25 / 每0.3秒', { timeout: 12_000 })
  await expect(page.getByTestId('scratch-cloud-save')).toBeEnabled()
}

test('newer cloud draft asks first, cancel keeps the cloud version and uploads nothing', async ({ page }) => {
  test.setTimeout(180_000)
  let puts = 0
  let dialogMessage = ''
  await page.route('**/api/practice/scratch', async (route, request) => {
    if (request.method() === 'PUT') {
      puts += 1
      await route.fulfill({ json: { synced: true, lessonId: 'G3-U1-L02', updatedAt: '2026-10-28T12:00:00.000Z', verifiedGrade: false } })
    } else {
      await route.fulfill({ json: { draft: { lessonId: 'G3-U1-L02', archiveBase64: 'AAAA', updatedAt: '2999-01-01T00:00:00.000Z' } } })
    }
  })
  page.on('dialog', async (dialog) => {
    dialogMessage = dialog.message()
    await dialog.dismiss()
  })
  await bootLab(page)
  await page.getByTestId('scratch-cloud-save').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('云端作品已保留，未上传。')
  expect(dialogMessage).toContain('上传会覆盖云端版本')
  expect(puts).toBe(0)
})

test('newer cloud draft asks first, accept uploads over the cloud version', async ({ page }) => {
  test.setTimeout(180_000)
  let puts = 0
  await page.route('**/api/practice/scratch', async (route, request) => {
    if (request.method() === 'PUT') {
      puts += 1
      await route.fulfill({ json: { synced: true, lessonId: 'G3-U1-L02', updatedAt: '2026-10-28T12:00:00.000Z', verifiedGrade: false } })
    } else {
      await route.fulfill({ json: { draft: { lessonId: 'G3-U1-L02', archiveBase64: 'AAAA', updatedAt: '2999-01-01T00:00:00.000Z' } } })
    }
  })
  page.on('dialog', async (dialog) => {
    await dialog.accept()
  })
  await bootLab(page)
  await page.getByTestId('scratch-cloud-save').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('已保存到当前登录账号')
  expect(puts).toBe(1)
})

test('older cloud draft uploads without asking', async ({ page }) => {
  test.setTimeout(180_000)
  let puts = 0
  await page.route('**/api/practice/scratch', async (route, request) => {
    if (request.method() === 'PUT') {
      puts += 1
      await route.fulfill({ json: { synced: true, lessonId: 'G3-U1-L02', updatedAt: '2026-10-28T12:00:00.000Z', verifiedGrade: false } })
    } else {
      await route.fulfill({ json: { draft: { lessonId: 'G3-U1-L02', archiveBase64: 'AAAA', updatedAt: '2020-01-01T00:00:00.000Z' } } })
    }
  })
  await bootLab(page)
  await page.getByTestId('scratch-cloud-save').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('已保存到当前登录账号')
  expect(puts).toBe(1)
})

test('unreadable cloud aborts the upload and uploads nothing', async ({ page }) => {
  test.setTimeout(180_000)
  let puts = 0
  let precheckArmed = false
  await page.route('**/api/practice/scratch', async (route, request) => {
    if (request.method() === 'PUT') {
      puts += 1
      await route.fulfill({ json: { synced: true, lessonId: 'G3-U1-L02', updatedAt: '2026-10-28T12:00:00.000Z', verifiedGrade: false } })
    } else if (precheckArmed) {
      await route.fulfill({ status: 503, json: { error: 'cloud-draft-storage-unavailable' } })
    } else {
      await route.fulfill({ json: { draft: null } })
    }
  })
  await bootLab(page)
  precheckArmed = true
  await page.getByTestId('scratch-cloud-save').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('无法读取云端作品，上传已取消')
  expect(puts).toBe(0)
})

test('no cloud draft uploads directly', async ({ page }) => {
  test.setTimeout(180_000)
  let puts = 0
  await page.route('**/api/practice/scratch', async (route, request) => {
    if (request.method() === 'PUT') {
      puts += 1
      await route.fulfill({ json: { synced: true, lessonId: 'G3-U1-L02', updatedAt: '2026-10-28T12:00:00.000Z', verifiedGrade: false } })
    } else {
      await route.fulfill({ json: { draft: null } })
    }
  })
  await bootLab(page)
  await page.getByTestId('scratch-cloud-save').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('已保存到当前登录账号')
  expect(puts).toBe(1)
})
