// OPS-024: Scratch VM self-hosting regression — the G2 lab must load from
// the app's own origin with the old CDN host unreachable, and no request to
// jsDelivr may happen at all. This locks in the fix for CI run 41983605834
// (scratch-real-vm-shard-s2), where the jsDelivr download failed and the
// G2-U2-L06 lab could not initialise inside the 60 s gate.
import { expect, test } from '@playwright/test'
import { openG2Lab } from './scratch-g2-helpers'

test('G2-U2-L06 loads with jsDelivr unreachable (self-hosted VM)', async ({ page }) => {
  test.setTimeout(180_000)
  const cdnRequests: string[] = []
  await page.route('https://cdn.jsdelivr.net/**', (route) => {
    cdnRequests.push(route.request().url())
    return route.abort()
  })
  await openG2Lab(page, 'G2-U2-L06')
  await expect(page.getByTestId('g2-green-flag')).toBeEnabled()
  expect(cdnRequests).toEqual([])
})
