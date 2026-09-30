import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import type { CatalogSupplier, ProductWrite, SupplierProduct } from '../src/api/supplier-catalog'
import type { ShippingStockKit } from '../src/api/shipping-containers'

const shippingContainerProductTypeId = '90000000-0000-4000-8000-000000000002'
const containerSupplier: CatalogSupplier = { id: 'shipping-supplier', name: 'Shipping supplier', isActive: true, isInternalProducer: false, version: 1, products: [] }
const container = { definitionId: 'container-1', sku: 'SHIPPER-1', commonName: 'Sample shipper', capacity: 1 }
function kit(id: number, status: ShippingStockKit['status']): ShippingStockKit {
  const atPhaeno = status === 'Preparing'
  return {
    id: `kit-${id}`, kitNumber: `KIT-${String(id).padStart(3, '0')}`, container,
    status, version: 1, assemblyCompletedAt: '2026-09-24T11:00:00Z',
    tubeSupplierName: 'Tube supplier', tubeProductNumber: 'TUBE-1', tubeLotNumber: 'LOT-1',
    shipperSupplierName: 'Shipper supplier', shipperProductNumber: 'SHIPPER-1',
    organizationId: atPhaeno ? null : 'customer-1', authorizationSourceId: null, authorizationReference: null,
    boundSampleShipmentId: null, outboundCarrier: atPhaeno ? null : 'Test carrier',
    outboundTrackingNumber: atPhaeno ? null : `TRACK-${id}`, fulfilledAt: atPhaeno ? null : '2026-09-24T12:00:00Z',
    deliveryLocationLabel: atPhaeno ? null : 'Customer laboratory', customerReceivedAt: status === 'Fulfilled' ? null : '2026-09-24T13:00:00Z',
    tubes: [{ id: `tube-${id}`, supplierBarcode: `TUBE-${id}` }],
    tubesVerifiedAt: atPhaeno ? '2026-09-24T11:00:00Z' : null,
    inventoryBlockedReason: status === 'NeedsReview' ? 'Location discrepancy.' : null,
  }
}
const kits = [kit(1, 'Preparing'), kit(2, 'Preparing'), ...Array.from({ length: 13 }, (_, index) => kit(index + 3, (['OnTheWay', 'Available', 'Assigned', 'Bound', 'NeedsReview'] as const)[index] ?? 'Fulfilled'))]

async function fixture(page: Page, start: 'catalog' | 'inventory') {
  const html = await readFile(new URL('./fixtures/phaeno-kit-acceptance.html', import.meta.url), 'utf8')
  const state = { products: [] as SupplierProduct[], writes: [] as { path: string; method: string; body: ProductWrite }[], unexpected: [] as string[] }
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.hostname !== '127.0.0.1') { state.unexpected.push(request.url()); await route.abort(); return }
    if (url.pathname === '/e2e/fixtures/phaeno-kit-acceptance.html') return route.fulfill({ contentType: 'text/html', body: html })
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return }
    const path = url.pathname.substring(4), method = request.method()
    const respond = (data: unknown) => route.fulfill({ json: { success: true, data, error: null, meta: {} } })
    if (path === '/platform/lab-operations/suppliers' && method === 'GET') return respond([{ ...containerSupplier, products: state.products }])
    if (path.startsWith('/platform/lab-operations/suppliers/shipping-supplier/products') && (method === 'POST' || method === 'PUT')) {
      const body = request.postDataJSON() as ProductWrite
      state.writes.push({ path, method, body })
      const previous = state.products[0]
      const saved: SupplierProduct = {
        id: previous?.id ?? 'shipping-container-1', supplierId: containerSupplier.id, productNumber: body.productNumber,
        description: body.description, kind: 'ShippingContainer', tubeCapacity: body.tubeCapacity, productTypeId: body.productTypeId,
        productTypeName: 'Shipping Container',
        productTypeIsActive: true, defaultQuantityUnit: body.defaultQuantityUnit, canExpire: body.canExpire,
        isActive: body.isActive, version: (previous?.version ?? 0) + 1,
      }
      state.products = [saved]
      return respond(saved)
    }
    if (path === '/platform/lab-operations/product-types' && method === 'GET') return respond([{ id: shippingContainerProductTypeId, name: 'Shipping Container', description: 'Purchased outer containers', kitUse: 'ShippingContainer', isActive: true, version: 1, productCount: state.products.length }])
    if (path === '/platform/sample-shipping/stock-kits' && method === 'GET') return respond(kits)
    if (path.startsWith('/platform/sample-shipping/stock-kits/') && method === 'GET') return respond(kits.find(item => item.id === path.split('/').at(-1)))
    if (path === '/platform/sample-shipping/container-types' && method === 'GET') return respond([])
    state.unexpected.push(`${method} ${path}`)
    return route.fulfill({ status: 500, json: { success: false, data: null, error: { code: 'UNEXPECTED', message: 'Unexpected fixture request' }, meta: {} } })
  })
  await page.goto(`/e2e/fixtures/phaeno-kit-acceptance.html?start=${start}`)
  return state
}

test('signed-in Phaeno staff can create a purchased container with capacity and correct its catalog name', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: info.project.name === 'mobile-chrome' ? 'dark' : 'light', reducedMotion: 'reduce' })
  const state = await fixture(page, 'catalog')
  await expect(page.getByRole('heading', { name: 'Shipping supplier' })).toBeVisible()
  await page.getByRole('button', { name: 'New product' }).click()
  const create = page.getByRole('dialog', { name: 'New product' })
  await create.getByRole('button', { name: 'Units for Inventory unit' }).click()
  await page.getByRole('menuitem', { name: 'mL', exact: true }).click()
  await expect(create.getByRole('textbox', { name: 'Inventory unit' })).toHaveValue('mL')
  await create.getByRole('textbox', { name: 'Inventory unit' }).fill('vials')
  await expect(create.getByRole('textbox', { name: 'Inventory unit' })).toHaveValue('vials')
  await create.getByRole('combobox', { name: 'Product type' }).selectOption(shippingContainerProductTypeId)
  await create.getByRole('textbox', { name: 'Inventory unit' }).fill('each')
  await create.getByRole('spinbutton', { name: 'Tube capacity' }).fill('20')
  await create.getByRole('textbox', { name: 'Product name' }).fill('KIT-ALPHA')
  await create.getByRole('textbox', { name: 'Product description' }).fill('Alpha shipping container')
  await create.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('list', { name: 'Products' }).getByText('KIT-ALPHA')).toBeVisible()
  expect(state.writes[0]).toMatchObject({ method: 'POST', path: '/platform/lab-operations/suppliers/shipping-supplier/products', body: { productNumber: 'KIT-ALPHA', description: 'Alpha shipping container', productTypeId: shippingContainerProductTypeId, defaultQuantityUnit: 'each', tubeCapacity: 20 } })
  await page.getByRole('button', { name: 'Actions for KIT-ALPHA' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit product' })
  await expect(edit.getByRole('textbox', { name: 'Product name' })).toHaveValue('KIT-ALPHA')
  await edit.getByRole('textbox', { name: 'Product description' }).fill('Alpha shipping container, corrected')
  await edit.getByRole('spinbutton', { name: 'Tube capacity' }).fill('24')
  await edit.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('list', { name: 'Products' }).getByText('Alpha shipping container, corrected')).toBeVisible()
  expect(state.writes[1]).toMatchObject({ method: 'PUT', path: '/platform/lab-operations/suppliers/shipping-supplier/products/shipping-container-1', body: { productNumber: 'KIT-ALPHA', description: 'Alpha shipping container, corrected', defaultQuantityUnit: 'each', tubeCapacity: 24, version: 1 } })
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(state.unexpected).toEqual([])
})

test('signed-in kit inventory keeps shipped status and page through detail and reset', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: info.project.name === 'mobile-chrome' ? 'dark' : 'light', reducedMotion: 'reduce' })
  const state = await fixture(page, 'inventory')
  await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('inventory')
  await expect(page.getByRole('link', { name: 'KIT-001' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'KIT-003' })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Status' }).selectOption('shipped')
  await expect(page.getByText('13 kits · Page 1 of 2')).toBeVisible()
  await expect(page.getByRole('link', { name: 'KIT-001' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'KIT-006' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'KIT-007' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('13 kits · Page 2 of 2')).toBeVisible()
  await page.getByRole('link', { name: 'KIT-015' }).click()
  await expect(page.getByRole('heading', { name: container.commonName })).toBeVisible()
  await expect(page.getByText('Kit KIT-015', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Back to kit inventory' }).click()
  await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('shipped')
  await expect(page.getByText('13 kits · Page 2 of 2')).toBeVisible()
  await page.getByRole('combobox', { name: 'Status' }).selectOption('NeedsReview')
  await expect(page.getByRole('link', { name: 'KIT-007' })).toBeVisible()
  await page.getByRole('link', { name: 'KIT-007' }).click()
  await expect(page.getByText('Inventory needs review')).toBeVisible()
  await page.getByRole('link', { name: 'Back to kit inventory' }).click()
  await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('NeedsReview')
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue('inventory')
  await expect(page.getByRole('link', { name: 'KIT-001' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'KIT-007' })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(state.unexpected).toEqual([])
})
