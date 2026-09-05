import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Chromium's local-network check otherwise blocks the HMR socket for intercepted localhost fixture documents.
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--disable-features=LocalNetworkAccessChecks'] } })

test('Company People and Sales recover failed reads without inviting duplicate work', async ({ page }, testInfo) => {
  const errors: string[] = []
  const writes: string[] = []
  const counts = { people: 0, contacts: 0, opportunities: 0 }
  page.on('pageerror', error => errors.push(error.message))
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const person = { recordKind: 'Contact', contactAssociationId: 'association-1', contactId: 'contact-1', contactVersion: 1, portalUserId: null, organizationMembershipId: null, invitationId: null, contactUserLinkId: null, contactUserLinkVersion: null, displayName: 'Ada Synthetic', firstName: 'Ada', lastName: 'Synthetic', email: 'ada.synthetic@example.test', jobTitle: 'Scientific lead', relationshipRole: 'Technical evaluator', isPrimaryCompany: false, isContactActive: true, portalAccessState: 'NotInvited', isOrganizationAdmin: false, departments: [], suggestedPortalUserId: null, suggestedInvitationId: null, requiresIdentityReview: false }
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() !== 'GET') { writes.push(`${request.method()} ${url.pathname}`); return route.abort() }
    const kind = url.pathname.endsWith('/people') ? 'people' : url.pathname.endsWith('/companies/synthetic-company/contacts') ? 'contacts' : url.pathname.endsWith('/opportunities') ? 'opportunities' : null
    if (kind && counts[kind]++ === 0) return route.fulfill({ status: 503, json: { success: false, data: null, error: { code: 'synthetic_unavailable', message: 'Synthetic service unavailable. Please retry.' } } })
    const data = kind === 'people' ? [person] : kind === 'contacts' ? [{ id: 'association-1', companyId: 'synthetic-company', companyName: 'Synthetic Research Company', contactId: 'contact-1', contactName: 'Ada Synthetic', jobTitle: 'Scientific lead', relationshipRole: 'Technical evaluator', isPrimaryCompany: false, effectiveFrom: '2026-09-01', effectiveTo: null, isActive: true, version: 1 }]
      : kind === 'opportunities' ? { items: [{ id: 'opportunity-1', name: 'Synthetic PSeq evaluation', ownerName: 'Research Sales', stageName: 'Discovery' }], totalCount: 1, page: 1, pageSize: 100 }
        : { items: [], totalCount: 0, page: 1, pageSize: 20 }
    return route.fulfill({ json: { success: true, data, error: null } })
  })
  const html = await readFile(new URL('./fixtures/crm-company-recovery.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/crm-company-recovery.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/crm-company-recovery.html')
  await expect(page.getByText('Could not load people', { exact: true })).toBeVisible()
  await expect(page.getByText('Could not load contacts', { exact: true })).toBeVisible()
  await expect(page.getByText('Could not load opportunities', { exact: true })).toBeVisible()
  await expect(page.getByText('No people are associated with this Company.', { exact: true })).toHaveCount(0)
  await expect(page.getByText('No opportunities recorded.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Associate contact', exact: true })).toBeDisabled()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('crm-company-load-failures.png'), fullPage: true })
  await page.getByRole('button', { name: 'Retry people', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('link', { name: 'Ada Synthetic', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Associate contact', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Retry contacts', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Associate contact', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Retry opportunities', exact: true }).click()
  await expect(page.getByRole('link', { name: /Synthetic PSeq evaluation/ })).toBeVisible()
  await expect(page.getByText(/Could not load/)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('crm-company-recovered.png'), fullPage: true })
  await page.getByRole('button', { name: 'Associate contact', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Associate contact' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('combobox', { name: 'Contact', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(counts).toEqual({ people: 2, contacts: 2, opportunities: 2 })
  expect(writes).toEqual([])
  expect(errors).toEqual([])
})
