import { expect, type Page } from '@playwright/test'

export async function cancelCreateLeave(page: Page, trigger: () => Promise<unknown>) {
  const accepted = page.waitForEvent('dialog', { timeout: 8000 }).then(async (dialog) => {
    const type = dialog.type()
    await dialog.dismiss()
    expect(type).toBe('beforeunload')
  })
  await Promise.all([accepted, trigger()])
}
