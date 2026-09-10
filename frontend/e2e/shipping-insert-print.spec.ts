import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('receiving sheet keeps large scan targets apart and prints without the full manifest', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const html = await readFile(new URL('./fixtures/shipping-insert.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/shipping-insert.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/shipping-insert.html')
  await expect(page.getByText('10 samples · 20 tubes')).toBeVisible()
  const summary = page.getByText('Full packing instructions and sample / tube list')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Sample and tube list', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Permanent tube barcode/ })).toHaveCount(20)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  if (info.project.name === 'chromium') {
    await page.getByRole('img', { name: 'Permanent tube barcode Tube_001', exact: true }).screenshot({ path: info.outputPath('mixed-case-tube.png') })
    await page.emulateMedia({ media: 'print' })
    await page.setViewportSize({ width: 816, height: 1056 })
    await expect(page.locator('.packet-full-details')).toBeHidden()
    const bars = page.locator('.packet-scan-target svg')
    await expect(bars).toHaveCount(2)
    const first = (await bars.nth(0).boundingBox())!
    const second = (await bars.nth(1).boundingBox())!
    expect(first.height).toBeGreaterThanOrEqual(120)
    expect(Math.abs(first.height - first.width)).toBeLessThan(1)
    expect(second.y - first.y - first.height).toBeGreaterThan(100)
    for (const format of ['Letter', 'A4'] as const) {
      await page.pdf({ path: info.outputPath(`receiving-${format}.pdf`), format, printBackground: true })
    }
    await page.screenshot({ path: info.outputPath('receiving-sheet.png'), fullPage: true })
  }
  expect(errors).toEqual([])
})


test('laboratory QR label fits existing 50 by 25 mm stock', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium', 'Physical label layout uses desktop print media.')
  const html = await readFile(new URL('./fixtures/shipping-insert.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/shipping-insert.html?labLabel', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/shipping-insert.html?labLabel')
  await expect(page.getByRole('img', { name: 'Container QR code PH-S-23456789AB-C' })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  expect(await page.evaluate(() => getComputedStyle(document.body).minWidth)).toBe('0px')
  const surface = page.locator('.lab-label-print-surface')
  const label = (await surface.boundingBox())!
  const qr = (await surface.locator('svg').boundingBox())!
  const caption = (await surface.locator('figcaption').boundingBox())!
  expect(Math.abs(qr.width - qr.height)).toBeLessThan(1)
  expect(qr.width).toBeGreaterThanOrEqual(67)
  expect(qr.x + qr.width).toBeLessThanOrEqual(label.x + label.width)
  expect(caption.y + caption.height).toBeLessThanOrEqual(label.y + label.height)
  await page.pdf({ path: info.outputPath('laboratory-label.pdf'), preferCSSPageSize: true, printBackground: true })
  await surface.screenshot({ path: info.outputPath('laboratory-label.png') })
})


test('stock-kit QR print preserves the physical container identity', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium', 'Physical label layout uses desktop print media.')
  const html = await readFile(new URL('./fixtures/shipping-insert.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/shipping-insert.html?stockKit', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/shipping-insert.html?stockKit')
  await expect(page.getByRole('img', { name: 'Container barcode KIT-58073414ED6C47109A3E073EE5F9311F' })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.stock-kit-print-surface')).toBeVisible()
  const qr = (await page.locator('.stock-kit-print-surface svg').boundingBox())!
  expect(Math.abs(qr.width - qr.height)).toBeLessThan(1)
  expect(qr.width).toBeGreaterThan(100)
  await page.pdf({ path: info.outputPath('stock-kit-label.pdf'), format: 'Letter', printBackground: true })
})
