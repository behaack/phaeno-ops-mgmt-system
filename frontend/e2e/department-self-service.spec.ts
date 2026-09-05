import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function inspectDialog(page: Page) {
  // Inspect settled styles after controls become enabled and dialogs finish opening.
  await page.getByRole('dialog').evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true })
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})))
  })
  const result = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(result.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function fixture(page: Page, organizationId: string) {
  const now = '2026-09-04T12:00:00Z'
  let departments = [
    { id: `${organizationId}-general`, organizationId, name: 'General', code: 'GENERAL', description: null, isDefault: true, isActive: true, activeMemberCount: 0, purchaseOrderRequired: null, billingContactEmail: null, notificationEmail: null, shippingInstructions: null, resultDeliveryInstructions: null, createdAt: now, updatedAt: now, version: 1 },
    { id: `${organizationId}-research`, organizationId, name: 'Research', code: 'RESEARCH', description: null, isDefault: false, isActive: true, activeMemberCount: 0, purchaseOrderRequired: null, billingContactEmail: null, notificationEmail: null, shippingInstructions: null, resultDeliveryInstructions: null, createdAt: now, updatedAt: now, version: 1 },
  ]
  let configuration: Record<string, unknown> = { organizationId, purchaseOrderRequired: null, billingContactEmail: null, notificationEmail: null, shippingInstructions: null, resultDeliveryInstructions: null, version: 1 }
  let configurationConflict = true
  let members: Record<string, unknown>[] = []
  const writes: { path: string; data: Record<string, unknown> }[] = []
  const requests: string[] = []
  await page.addInitScript((id) => localStorage.setItem('phaeno.selectedOrganizationId', id), organizationId)
  await page.route(/^https:\/\/127\.0\.0\.1:\d+\/api\//, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    requests.push(path)
    const reply = (data: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) })
    if (path.endsWith('/member-lookup')) return reply([{ organizationMembershipId: 'member-1', userId: 'user-1', userName: 'Ada Researcher', userEmail: 'ada@example.test', isOrganizationAdmin: false }])
    if (request.method() !== 'GET') {
      const data = request.postDataJSON() as Record<string, unknown>
      writes.push({ path, data })
      if (path.endsWith('/configuration')) {
        if (configurationConflict) {
          configurationConflict = false
          configuration = { ...configuration, version: 2 }
          return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Configuration changed' }) })
        }
        configuration = { ...configuration, ...data, version: 3 }
        return reply(configuration)
      }
      if (path.includes('/members/')) {
        members = [{ id: 'assignment-1', organizationMembershipId: 'member-1', userId: 'user-1', userName: 'Ada Researcher', userEmail: 'ada@example.test', departmentId: `${organizationId}-general`, departmentName: 'General', isDepartmentAdmin: data.isDepartmentAdmin === true, isOrganizationAdmin: false, isActive: !path.endsWith('/deactivate'), version: writes.length }]
        return reply(members[0])
      }
      if (request.method() === 'PUT') {
        departments = departments.map((department) => path.endsWith(department.id) ? { ...department, ...data, version: department.version + 1 } : department)
        return reply(departments.find((department) => path.endsWith(department.id)))
      }
      return reply({})
    }
    if (path.endsWith('/configuration')) return reply(configuration)
    if (path.endsWith('/departments')) return reply(departments)
    if (path.endsWith('/members')) return reply(members)
    return reply([])
  })
  return { writes, requests }
}

test('department admin manages only assigned settings and reviewed member access', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const { writes, requests } = await fixture(page, 'valley-diagnostics')
  await page.goto('/departments')
  await expect(page.getByRole('heading', { name: 'Departments for Valley Diagnostics' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add department' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Research', exact: true })).toHaveCount(0)
  const actions = page.getByRole('button', { name: 'Actions for General' })
  await actions.click()
  await expect(page.getByRole('menuitem', { name: 'Make default' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: 'Deactivate', exact: true })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Edit settings' }).click()
  await page.getByLabel('Shipping instructions').fill('Keep extracted RNA frozen.')
  await inspectDialog(page)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(actions).toBeFocused()
  await actions.click()
  await page.getByRole('menuitem', { name: 'Manage members' }).click()
  await page.getByLabel('Existing organization member email').fill('ada@example.test')
  await page.getByRole('button', { name: 'Find member' }).click()
  await page.getByRole('button', { name: 'Add access', exact: true }).click()
  expect(writes).toHaveLength(1)
  await page.getByRole('button', { name: 'Confirm access change' }).click()
  await expect(page.getByRole('button', { name: 'Make department admin' })).toBeVisible()
  await page.getByRole('button', { name: 'Make department admin' }).click()
  await page.getByRole('button', { name: 'Confirm access change' }).click()
  await expect(page.getByRole('button', { name: 'Make member', exact: true })).toBeVisible()
  await inspectDialog(page)
  await page.screenshot({ path: testInfo.outputPath('department-members.png') })
  expect(writes[2].data.isDepartmentAdmin).toBe(true)
  expect(requests.some((path) => path.startsWith('/api/users/organization/'))).toBe(false)
  expect(requests.some((path) => path.endsWith('/configuration'))).toBe(false)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(actions).toBeFocused()
  expect(errors).toEqual([])
})

test('organization administrator can discover every department and create one', async ({ page }) => {
  await fixture(page, 'northline-labs')
  await page.goto('/departments')
  await expect(page.getByRole('heading', { name: 'Research', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add department' }).click()
  await expect(page.getByRole('dialog', { name: 'Add department' })).toBeVisible()
  await inspectDialog(page)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Add department' })).toBeFocused()
})

test('organization invitation reviews department intent, admin scope, and unsaved dismissal', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const { writes } = await fixture(page, 'northline-labs')
  const html = await readFile(new URL('./fixtures/organization-invitation.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/organization-invitation.html', (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/organization-invitation.html')
  const add = page.getByRole('button', { name: 'Add user', exact: true })
  await add.click()
  await page.getByLabel('First name').fill('Ada')
  await page.getByLabel('Last name').fill('Researcher')
  await page.getByLabel('Email', { exact: false }).fill('ada@example.test')
  await page.getByRole('checkbox', { name: 'General (default)' }).uncheck()
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText('Select at least one department before sending the invitation.')).toBeVisible()
  await expect(page.locator('#organization-invite-departments')).toBeFocused()
  await page.getByRole('checkbox', { name: 'Research', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Department administrator for Research' }).check()
  await inspectDialog(page)
  await page.screenshot({ path: testInfo.outputPath('organization-invitation.png') })
  await page.keyboard.press('Escape')
  await expect(page.getByText('Discard this unsent invitation?')).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(writes[0].data.departments).toEqual([{ departmentId: 'northline-labs-research', isDepartmentAdmin: true }])
  await expect(add).toBeFocused()
})


test('organization defaults preserve entries through conflict and require review before saving', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const { writes } = await fixture(page, 'northline-labs')
  await page.goto('/departments')
  const edit = page.getByRole('button', { name: 'Edit organization defaults' })
  await edit.click()
  await page.getByLabel('Purchase order rule').selectOption('required')
  await page.getByLabel('Billing contact email').fill('billing@example.test')
  await page.getByLabel('Shipping instructions').fill('Ship extracted RNA frozen.')
  await inspectDialog(page)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Organization settings changed. The latest version is loaded and your entries are preserved. Review them before saving again.')).toBeVisible()
  await expect(page.getByLabel('Shipping instructions')).toHaveValue('Ship extracted RNA frozen.')
  expect(writes).toHaveLength(1)
  await page.screenshot({ path: testInfo.outputPath('organization-defaults-conflict.png') })
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(edit).toBeFocused()
  expect(writes[1].data.version).toBe(2)
  await expect(page.getByText('Ship extracted RNA frozen.', { exact: true })).toBeVisible()
})
