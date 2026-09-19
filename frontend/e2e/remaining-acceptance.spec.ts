import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ launchOptions: { args: ['--disable-features=LocalNetworkAccessChecks'] } })
for (const theme of ['light', 'dark'] as const) for (const width of [320, 1440]) {
  test(`reviewed cancellation and completion ${theme} ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    const errors: string[] = []; const writes: { path: string; body: unknown }[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const request = route.request(); writes.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() })
      await route.fulfill({ json: { success: true, data: {}, error: null } })
    })
    const html = await readFile(new URL('./fixtures/remaining-acceptance.html', import.meta.url), 'utf8')
    await page.route('**/e2e/fixtures/remaining-acceptance.html', route => route.fulfill({ contentType: 'text/html', body: html }))
    await page.goto('/e2e/fixtures/remaining-acceptance.html')
    await page.getByRole('button', { name: 'Decide request' }).click()
    await page.getByLabel('Decision', { exact: false }).selectOption('PartiallyApproved')
    await expect(page.getByRole('checkbox', { name: /SAMPLE-RECEIVED/ })).toBeDisabled()
    await page.getByRole('checkbox', { name: /SAMPLE-UNRECEIVED/ }).check()
    await page.getByLabel(/Reason for the Customer/).fill('Reviewed: cancel only the unreceived sample.')
    await page.keyboard.press('Escape'); await expect(page.getByText('Discard your unsaved cancellation decision?')).toBeVisible()
    await page.getByRole('button', { name: 'Keep editing' }).click()
    await expect(page.getByRole('checkbox', { name: /SAMPLE-UNRECEIVED/ })).toBeChecked()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('partial-cancellation.png'), fullPage: true })
    await page.getByRole('button', { name: 'Save decision' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(writes[0].body).toMatchObject({ version: 9, status: 'PartiallyApproved', sampleIds: ['44444444-4444-4444-8444-444444444444'] })
    await page.getByRole('button', { name: 'Complete Job' }).click()
    await expect(page.getByText(/Failed processing remains billable/)).toBeVisible()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
    await page.screenshot({ path: info.outputPath('complete-job.png'), fullPage: true })
    await page.getByRole('button', { name: 'Confirm completion' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(writes).toHaveLength(2); expect(errors).toEqual([])
  })
}

test('unavailable authentication prevents protected records from rendering (simulated)', async ({ page }) => {
  for (const path of ['/', '/lab-services/22222222-2222-4222-8222-222222222222', '/trial-projects/33333333-3333-4333-8333-333333333333']) {
    const html = await readFile(new URL('./fixtures/signed-out-access.html', import.meta.url), 'utf8')
    await page.route(`**${path}`, route => route.fulfill({ contentType: 'text/html', body: html }))
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Authentication is not configured' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Complete Job', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Download', exact: true })).toHaveCount(0)
  }
})
