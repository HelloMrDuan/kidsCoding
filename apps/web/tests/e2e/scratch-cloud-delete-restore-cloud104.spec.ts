import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// CLOUD-104: Scratch local delete and cloud restore chain.
// The lab buttons require the real Scratch VM (loaded), so this spec runs
// where the VM CDN is reachable (CI); locally the sandbox blocks jsDelivr
// and the VM never loads. Cloud responses here are mocked with page.route;
// the .sb3 archive is a real fixture project. IndexedDB is read directly
// in the page, so the assertions do not depend on VM load success beyond
// the buttons becoming enabled.
const SCRATCH_ARCHIVE_BASE64 = readFileSync('tests/e2e/fixtures/scratch-single-character.sb3').toString('base64')
const PSEUDO_BASE64 = (() => {
  const bytes = Buffer.alloc(1024, 0)
  bytes[0] = 0x50
  bytes[1] = 0x4b
  return bytes.toString('base64')
})()
const DB = 'kidscoding-scratch-local-v1'
const STORE = 'projects'
const KEY = 'G3-U1-L02'

async function readLocalDraftBase64(page): Promise<string | null> {
  return page.evaluate(async ({ db, store, key }) => {
    const open = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(db, 1)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    try {
      const record = await new Promise<{ archive?: unknown } | undefined>((resolve, reject) => {
        const tx = open.transaction(store, 'readonly')
        const req = tx.objectStore(store).get(key)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      if (!record || !(record.archive instanceof ArrayBuffer)) return null
      const bytes = new Uint8Array(record.archive)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      return btoa(binary)
    } finally {
      open.close()
    }
  }, { db: DB, store: STORE, key: KEY })
}

async function seedLocalDraft(page, archiveBase64: string) {
  await page.evaluate(async ({ db, store, key, archiveBase64 }) => {
    const binary = atob(archiveBase64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const open = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(db, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = open.transaction(store, 'readwrite')
        tx.objectStore(store).put({ archive: bytes.buffer, savedAt: new Date().toISOString() }, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } finally {
      open.close()
    }
  }, { db: DB, store: STORE, key: KEY, archiveBase64 })
}

test('Scratch cloud restore persists locally across reload', async ({ page }) => {
  test.setTimeout(180_000)
  await page.route('**/api/practice/scratch', async (route) => {
    await route.fulfill({ json: { draft: { lessonId: 'G3-U1-L02', archiveBase64: SCRATCH_ARCHIVE_BASE64, updatedAt: '2026-10-28T10:00:00.000Z' } } })
  })
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-cloud-restore')).toBeEnabled({ timeout: 60_000 })
  await page.getByTestId('scratch-cloud-restore').click()
  await expect(page.getByTestId('scratch-cloud-status')).toContainText('已获取账号私有项目', { timeout: 30_000 })
  // CLOUD-104: restore does not promise byte equality with the cloud
  // original. PROJECT_LOADED with source cloud triggers SAVE_DRAFT, and the
  // VM's re-serialized export overwrites the local record on the normal
  // path (the lab's restricted model keeps programs, not imported assets).
  // What restore must guarantee is persistence: a valid local archive is
  // present after the autosave settles, and the same bytes survive a reload.
  await expect(page.getByTestId('scratch-local-save-status')).toContainText('已在本机自动保存真实 Scratch .sb3', { timeout: 30_000 })
  const restored = await readLocalDraftBase64(page)
  expect(restored).not.toBeNull()
  expect(restored?.slice(0, 4)).toBe('UEsD')
  await page.reload()
  await expect(page.getByTestId('scratch-cloud-restore')).toBeEnabled({ timeout: 60_000 })
  expect(await readLocalDraftBase64(page)).toBe(restored)
})

test('Scratch local delete clears the device draft without touching the cloud', async ({ page }) => {
  test.setTimeout(180_000)
  let cloudCalls = 0
  await page.route('**/api/practice/scratch', async (route) => {
    cloudCalls += 1
    await route.fulfill({ json: { draft: null } })
  })
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-cloud-restore')).toBeEnabled({ timeout: 60_000 })
  await seedLocalDraft(page, SCRATCH_ARCHIVE_BASE64)
  await page.reload()
  await expect(page.getByTestId('scratch-reset-draft')).toBeEnabled({ timeout: 60_000 })
  await page.getByTestId('scratch-reset-draft').click()
  await expect(page.getByTestId('scratch-local-save-status')).toContainText('已清理这台设备保存的 Scratch 草稿。', { timeout: 30_000 })
  expect(await readLocalDraftBase64(page)).toBeNull()
  expect(cloudCalls).toBe(0)
})

test('Scratch corrupt local draft falls back to the sample without overwriting it', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/learn/scratch-lab/G3-U1-L02')
  await expect(page.getByTestId('scratch-cloud-restore')).toBeEnabled({ timeout: 60_000 })
  await seedLocalDraft(page, PSEUDO_BASE64)
  await page.reload()
  await expect(page.getByTestId('scratch-local-save-status')).toContainText('本机草稿文件无效，正在恢复课程示例；原文件未自动上传。', { timeout: 60_000 })
  expect(await readLocalDraftBase64(page)).toBe(PSEUDO_BASE64)
})
