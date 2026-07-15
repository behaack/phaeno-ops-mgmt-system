import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

import type { ServiceEntitlement } from '../src/api/organization-management'

const organizationId = '00000000-0000-0000-0000-000000000101'
const membershipId = '00000000-0000-0000-0000-000000000201'
const entitlementId = '00000000-0000-0000-0000-000000000301'
const apiRequestPattern = /^https:\/\/127\.0\.0\.1:\d+\/api\//

test('confirms organization deactivation in an accessible dialog', async ({ page }) => {
  let organization = customerOrganization()
  await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'))
  await page.route(apiRequestPattern, async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (method === 'GET' && url.pathname === '/api/organizations') {
      return json(route, [organization])
    }
    if (method === 'GET' && url.pathname === '/api/platform/relationships/requests') {
      return envelope(route, [])
    }
    if (method === 'POST' && url.pathname === `/api/organizations/${organizationId}/deactivate`) {
      organization = { ...organization, isActive: false, version: organization.version + 1 }
      return json(route, organization)
    }

    return notFound(route)
  })

  await page.goto('/customers')
  await expect(page.getByRole('heading', { name: 'Organizations' })).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)

  const deactivate = page.getByRole('button', { name: 'Deactivate' })
  await deactivate.focus()
  await deactivate.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Deactivate organization' })
  await expect(dialog).toContainText('Atlas Research')
  await expect(dialog).toContainText('Existing memberships will stop granting access')
  await expectNoSeriousAccessibilityViolations(page, dialog)

  await dialog.getByRole('button', { name: 'Keep active' }).click()
  await expect(deactivate).toBeFocused()

  await deactivate.click()
  await dialog.getByRole('button', { name: 'Deactivate organization' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Atlas Research' })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Show inactive' }).click()
  await expect(page.getByRole('button', { name: 'Reactivate' })).toBeVisible()
})

test('selects an eligible source request and uses lifecycle dialogs in the organization workspace', async ({ page }) => {
  const eligibleRequest = relationshipRequest({
    id: '00000000-0000-0000-0000-000000000401',
    requestNumber: 'PRQ-SERVICE',
    requestedServices: ['PSeqLabService'],
  })
  const onboardingRequest = relationshipRequest({
    id: '00000000-0000-0000-0000-000000000402',
    requestNumber: 'PRQ-ONBOARDING',
    requestedServices: [],
  })
  let entitlement: ServiceEntitlement = serviceEntitlement()

  await page.route(apiRequestPattern, async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()

    if (method === 'GET' && url.pathname === `/api/organizations/${organizationId}`) {
      return json(route, customerOrganization())
    }
    if (method === 'GET' && url.pathname === `/api/platform/relationships/organizations/${organizationId}/summary`) {
      return envelope(route, organizationSummary())
    }
    if (method === 'GET' && url.pathname === `/api/users/organization/${organizationId}`) {
      return json(route, [organizationUser()])
    }
    if (method === 'GET' && url.pathname === '/api/invitations') {
      return json(route, [])
    }
    if (method === 'GET' && url.pathname === `/api/platform/relationships/organizations/${organizationId}/entitlements`) {
      return envelope(route, [entitlement])
    }
    if (method === 'GET' && url.pathname === '/api/platform/relationships/requests') {
      return envelope(route, [eligibleRequest, onboardingRequest])
    }
    if (method === 'POST' && url.pathname === `/api/platform/relationships/organizations/${organizationId}/entitlements/${entitlementId}/end`) {
      const body = route.request().postDataJSON() as { reason: string }
      expect(body.reason).toBe('Commercial term ended.')
      entitlement = {
        ...entitlement,
        effectiveTo: '2026-07-16T12:00:00Z',
        endReason: body.reason,
        isEffective: false,
        isUsable: false,
        version: entitlement.version + 1,
      }
      return envelope(route, entitlement)
    }
    if (method === 'POST' && url.pathname === `/api/memberships/${membershipId}/deactivate`) {
      return json(route, {})
    }

    return notFound(route)
  })

  await page.goto(`/customers/${organizationId}`)
  await expect(page.getByRole('heading', { name: 'Atlas Research' })).toBeVisible()

  await page.getByRole('tab', { name: 'Services' }).click()
  await page.getByRole('button', { name: 'Add entitlement' }).click()
  const entitlementDialog = page.getByRole('dialog', { name: 'Add service entitlement' })
  const requestSelect = entitlementDialog.getByLabel('Approved source request')
  await expect(requestSelect.getByRole('option', { name: /PRQ-SERVICE/ })).toHaveCount(1)
  await expect(requestSelect.getByRole('option', { name: /PRQ-ONBOARDING/ })).toHaveCount(0)
  await requestSelect.selectOption(eligibleRequest.id)
  await expect(requestSelect).toHaveValue(eligibleRequest.id)
  await expectNoSeriousAccessibilityViolations(page, entitlementDialog)
  await entitlementDialog.getByRole('button', { name: 'Cancel' }).click()

  await page.getByRole('button', { name: 'End now' }).click()
  const endDialog = page.getByRole('dialog', { name: 'End service entitlement' })
  await expectNoSeriousAccessibilityViolations(page, endDialog)
  await endDialog.getByRole('button', { name: 'End entitlement' }).click()
  await expect(endDialog.getByRole('alert')).toContainText('Record why the entitlement is ending.')
  await endDialog.getByLabel(/End reason/).fill('Commercial term ended.')
  await endDialog.getByRole('button', { name: 'End entitlement' }).click()
  await expect(endDialog).toHaveCount(0)
  await expect(page.getByText('Commercial term ended.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'End now' })).toHaveCount(0)

  await page.getByRole('tab', { name: 'Members' }).click()
  await page.getByRole('button', { name: 'Deactivate' }).click()
  const memberDialog = page.getByRole('dialog', { name: 'Deactivate membership' })
  await expect(memberDialog).toContainText('member@example.com')
  await expect(memberDialog).toContainText('Atlas Research')
  await memberDialog.getByRole('button', { name: 'Keep membership' }).click()
  await expect(page.getByRole('button', { name: 'Deactivate' })).toBeFocused()
})

async function expectNoSeriousAccessibilityViolations(page: Page, locator: ReturnType<Page['getByRole']>) {
  const results = await new AxeBuilder({ page })
    .include(await locator.evaluate((element) => `#${element.id}`))
    .analyze()
  const seriousViolations = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(seriousViolations).toEqual([])
}

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
}

async function envelope(route: Route, data: unknown) {
  await json(route, { success: true, data, error: null })
}

async function notFound(route: Route) {
  await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Unhandled test route' }) })
}

function customerOrganization() {
  return {
    id: organizationId,
    name: 'Atlas Research',
    description: 'Synthetic customer for organization-management browser coverage.',
    kind: 'Customer',
    portalReadiness: 'Ready',
    portalReadinessNote: 'Configured for test coverage.',
    isActive: true,
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
    version: 1,
  }
}

function organizationSummary() {
  return {
    organizationId,
    organizationName: 'Atlas Research',
    organizationKind: 'Customer',
    isActive: true,
    portalReadiness: 'Ready',
    portalReadinessNote: 'Configured for test coverage.',
    administratorStatus: 'Active',
    activeMemberCount: 1,
    pendingInvitationCount: 0,
    effectiveServices: ['PSeqLabService'],
    pendingRequestCount: 0,
  }
}

function organizationUser() {
  return {
    id: '00000000-0000-0000-0000-000000000501',
    email: 'member@example.com',
    firstName: 'Portal',
    lastName: 'Member',
    isActive: true,
    status: 'Active',
    memberships: [{
      id: membershipId,
      organizationId,
      organizationName: 'Atlas Research',
      organizationKind: 'Customer',
      isActive: true,
      isOrganizationAdmin: false,
      createdAt: '2026-07-15T10:00:00Z',
      updatedAt: '2026-07-15T10:00:00Z',
      version: 1,
    }],
    version: 1,
  }
}

function serviceEntitlement(): ServiceEntitlement {
  return {
    id: entitlementId,
    organizationId,
    service: 'PSeqLabService',
    effectiveFrom: '2026-07-15T12:00:00Z',
    effectiveTo: null,
    configurationStatus: 'Ready',
    sourceRequestId: null,
    approvedByUserId: '00000000-0000-0000-0000-000000000601',
    notes: 'Configured service.',
    endReason: null,
    isEffective: true,
    isUsable: true,
    createdAt: '2026-07-15T12:00:00Z',
    updatedAt: '2026-07-15T12:00:00Z',
    version: 1,
  }
}

function relationshipRequest({ id, requestNumber, requestedServices }: { id: string; requestNumber: string; requestedServices: string[] }) {
  return {
    id,
    requestNumber,
    organizationId,
    candidateOrganizationName: 'Atlas Research',
    requestType: 'ServiceChange',
    source: 'Manual',
    status: 'Approved',
    requestedOrganizationKind: 'Customer',
    sourceReference: null,
    summary: `${requestNumber} test request`,
    internalNotes: null,
    requestedByUserId: '00000000-0000-0000-0000-000000000701',
    reviewedByUserId: '00000000-0000-0000-0000-000000000702',
    reviewedAt: '2026-07-15T12:00:00Z',
    decisionReason: 'Approved.',
    appliedByUserId: null,
    appliedAt: null,
    applicationNotes: null,
    requestedServices,
    createdAt: '2026-07-15T11:00:00Z',
    updatedAt: '2026-07-15T12:00:00Z',
    version: 2,
  }
}
