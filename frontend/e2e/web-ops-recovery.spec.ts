import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--disable-features=LocalNetworkAccessChecks'] } })

async function openEmailDelivery(page: Page) {
  const tabs = page.getByRole('tablist', { name: 'Web Operations lists' })
  await expect(tabs.getByRole('tab')).toHaveCount(3)
  await expect(tabs.getByRole('tab', { name: /Mailing List/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Mailing List', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Email delivery', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pause email delivery', exact: true })).toHaveCount(0)
  const demos = tabs.getByRole('tab', { name: /Demo Requests/ })
  await demos.click()
  await expect(page.getByRole('region', { name: 'Demo Requests', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Mailing List', exact: true })).toHaveCount(0)
  await expect(page.getByText('Please arrange a research workflow demonstration.', { exact: true })).toBeVisible()
  await demos.press('ArrowRight')
  await expect(tabs.getByRole('tab', { name: 'Email delivery', exact: true })).toBeFocused()
  await expect(tabs.getByRole('tab', { name: 'Email delivery', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Email delivery', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Mailing List', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Demo Requests', exact: true })).toHaveCount(0)
}

test('Web Operations reviews the exact recipient and safely recovers email delivery', async ({ page }, testInfo) => {
  const errors: string[] = []
  const payloads: unknown[] = []
  page.on('pageerror', error => errors.push(error.message))
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  let version = 'first-version'
  let queued = false
  const notification = () => ({ id: 'notification-1', kind: 'TechnicalBrief', state: queued ? 'Pending' : 'Failed', organizationName: 'Synthetic Scientific Discovery Laboratory', intakeId: 'intake-12345678', contactName: 'Ada Example', recipientEmail: 'ada.synthetic@example.test', attemptCount: 5, createdAtUtc: '2026-09-01T12:00:00Z', lastAttemptAtUtc: '2026-09-01T13:00:00Z', acceptedAtUtc: null, nextAttemptAtUtc: queued ? '2026-09-05T14:00:00Z' : null, lastError: queued ? null : 'The email provider did not confirm acceptance.', version, canResend: !queued })
  await page.route('**/api/web-ops/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/summary')) return route.fulfill({ json: { success: true, data: { isPaused: false, version: 'control-1', updatedAtUtc: null, updatedByName: null, reason: null, pendingCount: queued ? 1 : 0, processingCount: 0, failedCount: queued ? 0 : 1, expiredProcessingCount: 0, oldestPendingAtUtc: null } } })
    if (url.pathname.endsWith('/attempts')) return route.fulfill({ json: { success: true, data: [{ attemptNumber: 5, startedAtUtc: '2026-09-01T13:00:00Z', finishedAtUtc: '2026-09-01T13:00:05Z', outcome: 'Interrupted', error: 'Provider acceptance is unconfirmed; review before resending.', staffRequested: false }], error: null } })
    if (url.pathname.endsWith('/resend')) {
      payloads.push(route.request().postDataJSON())
      if (version === 'first-version') { version = 'refreshed-version'; return route.fulfill({ status: 409, json: { success: false, data: null, error: { code: 'website_notification_conflict', message: 'This notification changed. Refresh email delivery and review its current status.' } } }) }
      queued = true
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ json: { success: true, data: { items: [notification()], page: 1, pageSize: 10, totalCount: 1 }, error: null } })
  })
  const html = await readFile(new URL('./fixtures/web-ops.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/web-ops.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/web-ops.html')
  await openEmailDelivery(page)
  await expect(page.getByRole('heading', { name: 'Email delivery' })).toBeVisible()
  await expect(page.getByText('Needs attention', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View attempts' }).click()
  await expect(page.getByText(/Attempt 5.*Interrupted/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('web-ops-delivery.png'), fullPage: true })
  await page.getByRole('button', { name: /Queue resend\s*: Technical brief/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/Recipient: ada.synthetic@example.test/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).focus()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('web-ops-resend-review.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Queue resend', exact: true }).click()
  await expect(dialog.getByText(/This notification changed/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Refresh delivery status' }).click()
  await expect(dialog.getByText(/This notification changed/)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Queue resend', exact: true }).click()
  await expect(page.getByText('Email was queued. Delivery status will update automatically.')).toBeVisible()
  await expect(page.getByText('Queued', { exact: true })).toBeVisible()
  expect(payloads).toEqual([{ version: 'first-version' }, { version: 'refreshed-version' }])
  await expect(page.getByRole('heading', { name: 'Email delivery' })).toBeFocused()
  await page.getByRole('tab', { name: /Mailing List/ }).click()
  await expect(page.getByRole('heading', { name: 'Email delivery', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'View attempts', exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Email delivery', exact: true }).click()
  await expect(page.getByRole('tabpanel')).toHaveCount(1)
  await expect(page.getByText('Queued', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Website email processing pauses and resumes without losing queued work or a reviewed reason', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  let state = { isPaused: false, version: 'control-1', updatedAtUtc: null as string | null, updatedByName: null as string | null, reason: null as string | null, pendingCount: 2, processingCount: 1, failedCount: 1, expiredProcessingCount: 1, oldestPendingAtUtc: '2026-09-05T12:00:00Z' }
  const message = { kind: 'TechnicalBrief', organizationName: 'Synthetic Scientific Discovery Laboratory', intakeId: 'intake-12345678', contactName: 'Ada Example', recipientEmail: 'ada.synthetic@example.test', attemptCount: 5, createdAtUtc: '2026-09-01T12:00:00Z', lastAttemptAtUtc: '2026-09-01T13:00:00Z', acceptedAtUtc: null, nextAttemptAtUtc: null, lastError: null, version: 'delivery-1', canResend: false }
  const attention = [{ ...message, id: 'failed-1', state: 'Failed' }, { ...message, id: 'interrupted-1', state: 'Processing', isProcessingExpired: true }]
  const queued = [{ ...message, id: 'queued-1', state: 'Pending', attemptCount: 0 }, { ...message, id: 'queued-2', state: 'Pending', attemptCount: 0 }]
  let writes = 0; let delayRead = false; let finishRead!: () => void; let attentionRequested = false
  const payloads: unknown[] = []
  await page.route('**/api/web-ops/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/summary')) {
      if (delayRead) { delayRead = false; await new Promise<void>(resolve => { finishRead = resolve }) }
      return route.fulfill({ json: { success: true, data: state } })
    }
    if (url.pathname.endsWith('/processing')) {
      writes++; const input = route.request().postDataJSON(); payloads.push(input)
      if (writes === 1) {
        state.version = 'control-2'; delayRead = true
        return route.fulfill({ status: 409, json: { success: false, error: { code: 'website_notification_conflict', message: 'The processing setting changed. Reload it before retrying.' } } })
      }
      state = { ...state, isPaused: input.isPaused, reason: input.reason, updatedAtUtc: '2026-09-05T13:00:00Z', updatedByName: 'Synthetic Administrator', version: `control-${writes + 1}` }
      return route.fulfill({ status: 204 })
    }
    attentionRequested ||= url.searchParams.get('attentionOnly') === 'true'
    const items = url.searchParams.get('attentionOnly') === 'true' ? attention : [...attention, ...queued]
    return route.fulfill({ json: { success: true, data: { items, page: 1, pageSize: 10, totalCount: items.length } } })
  })
  const html = await readFile(new URL('./fixtures/web-ops.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/web-ops.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/web-ops.html')
  await openEmailDelivery(page)
  await page.getByRole('button', { name: 'Pause email delivery', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/Public intake and manual recovery still queue messages/)).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Investigating provider failures')
  await dialog.getByRole('button', { name: 'Pause email delivery', exact: true }).click()
  await expect(dialog.getByText(/The processing setting changed/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Reload delivery status; keep reason' }).click()
  await expect(dialog.getByText('Reloading delivery status…')).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Reason' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Pause email delivery', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  finishRead()
  await expect(dialog.getByText(/The current status was reloaded/)).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Reason' })).toHaveValue('Investigating provider failures')
  await expect(dialog.getByRole('button', { name: 'Pause email delivery', exact: true })).toBeEnabled()
  // Scan the completed enabled state, after the shared button's disabled-opacity transition finishes.
  await dialog.evaluate(async element => { await Promise.allSettled(element.getAnimations({ subtree: true }).map(animation => animation.finished)) })
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('email-processing-review.png') })
  await dialog.getByRole('button', { name: 'Pause email delivery', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Email delivery is paused', { exact: true })).toBeVisible()
  await expect(page.getByText(/New messages remain queued/)).toBeVisible()
  expect(state.pendingCount).toBe(2)
  await page.getByRole('button', { name: 'Needs attention (2)' }).click()
  await expect.poll(() => attentionRequested).toBe(true)
  await expect(page.getByText('Interrupted', { exact: true })).toBeVisible()
  await expect(page.getByText('Queued', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Sending', { exact: true }).locator('..')).toContainText('0')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('email-processing-paused.png'), fullPage: true })
  await page.getByRole('button', { name: 'Resume email delivery', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Reason' }).fill('Provider service restored')
  await dialog.getByRole('button', { name: 'Resume email delivery', exact: true }).click()
  await expect(page.getByText('Email delivery is running', { exact: true })).toBeVisible()
  expect(payloads).toEqual([{ version: 'control-1', isPaused: true, reason: 'Investigating provider failures' }, { version: 'control-2', isPaused: true, reason: 'Investigating provider failures' }, { version: 'control-3', isPaused: false, reason: 'Provider service restored' }])
  expect(errors).toEqual([])
})
