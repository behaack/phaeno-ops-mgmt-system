import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const companyId = '00000000-0000-0000-0000-000000000901'
const organizationId = '00000000-0000-0000-0000-000000000905'
const generalId = '00000000-0000-0000-0000-000000000906'
const researchId = '00000000-0000-0000-0000-000000000907'
const now = '2026-09-04T12:00:00Z'
const general = { id: generalId, organizationId, name: 'General', code: 'GENERAL', description: null, isDefault: true, isActive: true, activeMemberCount: 1, purchaseOrderRequired: null, billingContactEmail: null, notificationEmail: null, shippingInstructions: null, resultDeliveryInstructions: null, createdAt: now, updatedAt: now, version: 1 }
const research = { ...general, id: researchId, name: 'Research', code: 'RESEARCH', isDefault: false }

async function fixture(page: Page, options: { conflict?: boolean } = {}) {
  const writes: { path: string; data: Record<string, unknown> }[] = []
  let departments = [general, research]
  let hasConflicted = false
  await page.route(/^https:\/\/127\.0\.0\.1:\d+\/api\//, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const reply = (data: unknown, raw = false, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(raw ? data : { success: true, data, error: null }) })
    if (request.method() !== 'GET') {
      const data = request.postDataJSON() as Record<string, unknown>
      writes.push({ path, data })
      if (path === `/api/organizations/${organizationId}/departments/${researchId}`) {
        if (options.conflict && !hasConflicted) {
          hasConflicted = true
          departments = [general, { ...research, version: 2 }]
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'The department changed.' }) })
        }
        departments = [general, { ...research, ...data, version: Number(data.version) + 1 }]
        return reply(departments[1], true)
      }
      if (path.endsWith('/deactivate')) {
        departments = [general, { ...departments[1], isActive: false, version: departments[1].version + 1 }]
        return reply(departments[1], true)
      }
      if (path === '/api/invitations') return reply({ id: 'invitation', ...data, status: 'Pending' }, true)
      return reply({}, true)
    }
    if (path === `/api/platform/crm/companies/${companyId}`) return reply({ id: companyId, name: 'Atlas Research', websiteUrl: null, domainName: null, phone: null, industry: 'Biotechnology', description: null, addressLine1: null, addressLine2: null, city: null, region: null, postalCode: null, countryCode: null, employeeCount: null, lifecycleState: 'Customer', source: 'Internal', tags: [], aliases: [], mergedIntoCompanyId: null, ownerUserId: null, ownerName: null, accessOrganizationId: organizationId, isActive: true, createdAt: now, updatedAt: now, version: 1 })
    if (path.endsWith(`/companies/${companyId}/people`)) return reply([{ recordKind: 'Contact', contactAssociationId: 'association', contactId: 'contact', contactVersion: 1, portalUserId: null, organizationMembershipId: null, invitationId: null, contactUserLinkId: null, contactUserLinkVersion: null, displayName: 'Ada Researcher', firstName: 'Ada', lastName: 'Researcher', email: 'ada@example.test', jobTitle: 'Scientist', relationshipRole: null, isPrimaryCompany: true, isContactActive: true, portalAccessState: 'NotInvited', isOrganizationAdmin: false, departments: [], suggestedPortalUserId: null, suggestedInvitationId: null, requiresIdentityReview: false }])
    if (path === `/api/organizations/${organizationId}`) return reply({ id: organizationId, name: 'Atlas Research', kind: 'Partner', description: null, portalReadiness: 'Ready', portalReadinessNote: null, isActive: true, version: 1 }, true)
    if (path === `/api/organizations/${organizationId}/departments`) return reply(departments.filter((d) => new URL(request.url()).searchParams.get('includeInactive') !== 'false' || d.isActive), true)
    if (path === '/api/invitations' || path.startsWith('/api/users/organization/') || path.endsWith('/members')) return reply([], true)
    if (path.endsWith('/summary')) return reply({ administratorStatus: 'Active', activeMemberCount: 1, effectiveServices: [], pendingRequestCount: 0 })
    if (/\/(opportunities|activities|tasks)$/.test(path)) return reply({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    return reply([])
  })
  await page.goto(`/crm/companies/${companyId}`)
  await expect(page.getByRole('heading', { name: 'Atlas Research', exact: true })).toBeVisible()
  return writes
}

async function accessibleDialog(page: Page) {
  const result = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(result.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const dialog = page.getByRole('dialog')
  const box = await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
}

test('department edit validates, preserves entries on conflict, restores focus, and confirms lifecycle changes', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const writes = await fixture(page, { conflict: true })
  await page.getByRole('tab', { name: 'Departments & services' }).click()
  const actions = page.getByRole('button', { name: 'Actions for Research' })
  await actions.click()
  await page.getByRole('menuitem', { name: 'Edit settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Research' })
  await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await dialog.getByLabel('Billing contact email').fill('not-an-email')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByText('Enter a valid email address.')).toBeVisible()
  expect(writes).toHaveLength(0)
  await dialog.getByLabel('Billing contact email').fill('billing@example.test')
  await accessibleDialog(page)
  await page.screenshot({ path: testInfo.outputPath('department-edit.png') })
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByText(/Its latest version is loaded/)).toBeVisible()
  await expect(dialog.getByLabel('Billing contact email')).toHaveValue('billing@example.test')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toHaveCount(0)
  expect(writes.map((write) => write.data.version)).toEqual([1, 2])
  await expect(actions).toBeFocused()
  await actions.click()
  await page.getByRole('menuitem', { name: 'Deactivate', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Existing records are retained.')
  expect(writes).toHaveLength(2)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(writes).toHaveLength(2)
  await page.getByRole('button', { name: 'Add department' }).click()
  await page.getByLabel('Name', { exact: false }).fill('Unsaved')
  await page.keyboard.press('Escape')
  await expect(page.getByText('Discard your unsaved department changes?')).toBeVisible()
  await page.getByRole('button', { name: 'Discard changes' }).click()
  await expect(page.getByRole('button', { name: 'Add department' })).toBeFocused()
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
})

test('People and Sales remain separate and invitation requires explicit department access', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const writes = await fixture(page)
  await page.getByRole('tab', { name: 'People', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Ada Researcher' })).toBeVisible()
  await expect(page.getByRole('tabpanel', { name: 'People', exact: true }).getByText('Opportunities', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Invite to Portal' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox', { name: 'General (default)' }).uncheck()
  await dialog.getByRole('button', { name: 'Send invitation' }).click()
  await expect(dialog.getByText('Select at least one department before sending the invitation.')).toBeVisible()
  expect(writes).toHaveLength(0)
  await expect(dialog.getByRole('checkbox', { name: 'General (default)' })).toBeFocused()
  await dialog.getByRole('checkbox', { name: 'Research', exact: true }).check()
  await accessibleDialog(page)
  await page.screenshot({ path: testInfo.outputPath('people-invite.png') })
  await dialog.getByRole('button', { name: 'Send invitation' }).click()
  await expect(dialog).toHaveCount(0)
  expect(writes[0].data.departments).toEqual([{ departmentId: researchId, isDepartmentAdmin: false }])
  expect(errors).toEqual([])
})
