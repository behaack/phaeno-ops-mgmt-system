import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { shippingFixture, shippingContainers, shippingTube } from '../src/test-helpers/sample-shipping'
import { deliveryLocationFixture } from '../src/test-helpers/transportation-kit-requests'

const location = { ...deliveryLocationFixture, id: 'location-1', organizationId: 'org-1', departmentId: 'department-1' }
const container = shippingContainers.find(item => item.tubeCapacity === 5)!
const kit = {
  stockKitId: 'stock-1', kitNumber: 'KIT-RECEIVED-FROM-JOB-A', version: 5,
  container: { definitionId: container.id, commonName: container.commonName, sku: container.sku, capacity: 5 },
  status: 'Available', deliveryLocationId: location.id, requestId: 'old-request',
  originatingJobId: 'cancelled-job-a', originatingJobNumber: 'JOB-A', assignedJobId: null,
  assignedJobNumber: null, reservedShipmentId: null, boundShipmentId: null,
  dispatchedAt: '2026-09-08T12:00:00Z', receivedAt: '2026-09-09T12:00:00Z',
}
const pool = { ...shippingFixture, id: 'pool-1', shipmentNumber: 'SHIP-POOL', container: null, isPackingPool: true, crosswalk: [shippingTube(1), shippingTube(2), shippingTube(3)] }
const assigned = { ...pool, id: 'prepared-1', shipmentNumber: 'SHIP-PREPARED', isPackingPool: false, container: kit.container, departureDeliveryLocationId: location.id, assignedContainer: { ...kit, status: 'Assigned', assignedJobId: 'order-1', assignedJobNumber: 'JOB-1', reservedShipmentId: 'prepared-1' } }
const recommendation = {
  tubeCount: 3, containerCount: 1, totalCapacity: 5, unusedCapacity: 2, unallocatedTubes: 0, isComplete: true,
  containers: [{ containerDefinitionId: container.id, sku: container.sku, commonName: container.commonName, capacity: 5, quantity: 1, assignedTubes: 3, unusedCapacity: 2 }],
  explanation: 'One received container holds all three tubes.',
}

async function fixture(page: Page, options: { location?: boolean; member?: boolean; assigned?: boolean; onTheWay?: boolean } = {}) {
  const state = { refreshFails: false, claimConflicts: false, calls: [] as { path: string; body: Record<string, unknown>; key?: string }[], unexpected: [] as string[], received: !options.onTheWay, prepared: Boolean(options.assigned) }
  const inventory = () => ({ location, kits: [{ ...kit, status: state.received ? 'Available' : 'OnTheWay', receivedAt: state.received ? kit.receivedAt : null }], requests: [], canManageInventory: !options.member })
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.hostname !== '127.0.0.1') { state.unexpected.push(request.url()); await route.abort(); return }
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return }
    const path = url.pathname.substring(4), method = request.method()
    const respond = (data: unknown) => route.fulfill({ json: { success: true, data, error: null, meta: {} } })
    const fail = (message: string, status = 409) => route.fulfill({ status, json: { success: false, data: null, error: { code: 'CONFLICT', message }, meta: {} } })
    if (method !== 'GET') state.calls.push({ path, body: request.postDataJSON() as Record<string, unknown>, key: request.headers()['idempotency-key'] })
    if (path === '/customer-delivery-locations/location-1/transportation-kits') return respond(inventory())
    if (path.endsWith('/transportation-kits/received')) { state.received = true; return respond(inventory()) }
    if (path.endsWith('/kit-supply')) {
      if (state.refreshFails) return fail('Inventory refresh is temporarily unavailable.', 503)
      return respond({ shipmentId: state.prepared ? assigned.id : pool.id, shipmentVersion: 3, jobId: 'order-1', jobNumber: 'JOB-1', tubeCount: 3, deliveryLocationId: location.id, locations: [location], recommendation, recordedStock: [{ containerDefinitionId: container.id, availableQuantity: state.prepared ? 0 : 1, inTransitQuantity: 0 }], inventoryStatus: 'RecordedForLocation', request: null, inventoryKits: inventory().kits, canManageInventory: !options.member, containerTypes: [container], canRequestKits: true, requestBlockedReason: null, canPrepareSamples: true, preparationBlockedReason: null })
    }
    if (path.endsWith('/packing/reset')) return respond({ canReset: true, blockedReason: null, containerCount: 1, tubeCount: 3, shipments: [{ shipmentId: assigned.id, version: 3 }] })
    if (path.endsWith('/packing/preview')) return respond(recommendation)
    if (path.endsWith('/packing')) {
      if (method === 'POST') {
        if (state.claimConflicts) return fail('This container was assigned to another Job. Choose an available container.')
        state.prepared = true
        return respond([assigned])
      }
      if (state.refreshFails) return fail('Inventory refresh is temporarily unavailable.', 503)
      return respond({ shipmentId: pool.id, version: 3, tubeCount: 3, containerTypes: [container], canPack: true, blockedReason: null, deliveryLocationId: location.id, locations: [location], availableKits: [kit] })
    }
    if (path === '/sample-shipping') return respond([state.prepared ? assigned : pool])
    if (path === '/sample-shipping/pool-1') return respond(pool)
    if (path === '/sample-shipping/prepared-1') return respond(assigned)
    if (path.endsWith('/tube') && method === 'PUT') return fail('This tube does not belong to the assigned container.')
    state.unexpected.push(`${method} ${path}`)
    return fail('Unexpected fixture request', 500)
  })
  await page.goto(`/e2e/fixtures/transportation-inventory.html?${new URLSearchParams({ ...(options.location ? { location: 'true' } : {}), ...(options.member ? { role: 'member' } : {}), ...(options.assigned ? { shipment: assigned.id } : {}) })}`)
  return state
}

test('location receipt remains available independently of the originating cancelled Job', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: info.project.name === 'mobile-chrome' ? 'dark' : 'light', reducedMotion: 'reduce' })
  const state = await fixture(page, { location: true, onTheWay: true })
  await expect(page.getByText('Originally requested for JOB-A')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm kits received', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm received kits', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Select the kits that have arrived.')
  await page.getByRole('checkbox', { name: kit.kitNumber }).check()
  await page.getByRole('button', { name: 'Confirm received kits', exact: true }).click()
  await expect(page.getByText('Available: 1', { exact: true })).toBeVisible()
  expect(state.calls).toHaveLength(1)
  expect(state.calls[0]).toMatchObject({ path: '/customer-delivery-locations/location-1/transportation-kits/received', body: { kits: [{ stockKitId: kit.stockKitId, version: kit.version }] } })
  expect(state.calls[0].key).toBeTruthy()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('location-inventory.png'), fullPage: true })
  expect(state.unexpected).toEqual([])
})

test('exact container claim preserves the scanned barcode across conflicts and failed refreshes', async ({ page }, info) => {
  const state = await fixture(page)
  await page.getByRole('button', { name: 'Adjust containers', exact: true }).click()
  const dialog = page.getByRole('dialog'), barcode = dialog.getByLabel('Container 1 barcode', { exact: false })
  await barcode.fill(kit.kitNumber)
  await barcode.press('Tab')
  await expect(dialog.getByText('Container identified. It will be reserved when you confirm.')).toBeVisible()
  state.claimConflicts = true
  await dialog.getByRole('button', { name: 'Confirm containers', exact: true }).click()
  await expect(dialog.getByText('This container was assigned to another Job. Choose an available container.')).toBeVisible()
  await expect(barcode).toHaveValue(kit.kitNumber)
  expect(state.calls.find(call => call.path === '/sample-shipping/pool-1/packing')?.body).toMatchObject({ deliveryLocationId: location.id, stockKits: [{ stockKitId: kit.stockKitId, version: 5 }], containerTubeCounts: [3] })
  state.refreshFails = true
  await page.evaluate(() => window.dispatchEvent(new Event('test-inventory-refresh')))
  await expect(dialog.getByRole('button', { name: 'Confirm containers', exact: true })).toBeDisabled()
  await expect(barcode).toHaveValue(kit.kitNumber)
  await expect(dialog.getByText('Current inventory must be verified before confirming. Your selections are retained.')).toBeVisible()
  await page.screenshot({ path: info.outputPath('preserved-container-draft.png'), fullPage: true })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  state.refreshFails = false
  state.claimConflicts = false
  await page.evaluate(() => window.dispatchEvent(new Event('test-inventory-refresh')))
  await expect(dialog.getByRole('button', { name: 'Confirm containers', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Confirm containers', exact: true }).click()
  await expect(page.getByRole('heading', { name: assigned.shipmentNumber, exact: true })).toBeVisible()
  await expect(page.getByLabel('Scan tube barcode', { exact: false })).toBeVisible()
  expect(state.unexpected).toEqual([])
})

test('a Member can inspect assigned-container and tube history without write controls', async ({ page }) => {
  const state = await fixture(page, { assigned: true, member: true })
  await expect(page.getByText(kit.kitNumber, { exact: true }).first()).toBeVisible()
  await expect(page.getByText('RNA-1', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save scan', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reset container configuration', exact: true })).toHaveCount(0)
  expect(state.calls).toHaveLength(0)
  expect(state.unexpected).toEqual([])
})

test('a wrong-container tube scan retains the barcode for correction', async ({ page }) => {
  const state = await fixture(page, { assigned: true })
  const barcode = page.getByLabel('Scan tube barcode', { exact: false })
  await barcode.fill('TUBE-FROM-ANOTHER-CONTAINER')
  await barcode.press('Enter')
  await expect(page.getByText('This tube does not belong to the assigned container.')).toBeVisible()
  await expect(barcode).toHaveValue('TUBE-FROM-ANOTHER-CONTAINER')
  expect(state.calls.filter(call => call.path.endsWith('/tube'))).toHaveLength(1)
  expect(state.unexpected).toEqual([])
})
