import { chromium } from '@playwright/test'

// ubuntu-24.04 runner images provide Google Chrome. Verify the same Playwright
// channel as the course specs before spending the job budget on the build.
for (let attempt = 1; attempt <= 2; attempt++) {
  let browser
  try {
    browser = await chromium.launch({ channel: 'chrome', timeout: 15000 })
    const page = await browser.newPage()
    await page.setContent('<main>Chrome ready</main>', { timeout: 5000 })
    if (await page.locator('main').textContent({ timeout: 5000 }) !== 'Chrome ready') {
      throw new Error('Chrome did not render the probe page')
    }
    console.log(`Verified Google Chrome ${browser.version()} through the Playwright chrome channel`)
    break
  } catch (error) {
    console.error(`Chrome launch probe ${attempt}/2 failed:`, error.message)
    if (attempt === 2) {
      console.error('The runner must provide working Google Chrome and its system libraries.')
      process.exitCode = 1
    }
  } finally {
    await browser?.close()
  }
}
