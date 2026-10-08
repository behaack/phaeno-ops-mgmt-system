import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { sequencingServiceProductTypeId, type CatalogSupplier, type SupplierShipmentAddress } from '#/api/supplier-catalog'
import { supplierCatalogFixture } from '#/test-helpers/supplier-catalog'
import { SupplierShipmentAddresses } from './SupplierShipmentAddresses'

vi.mock('#/features/orders/use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
const address = (id: string): SupplierShipmentAddress => ({ id, supplierId: supplierCatalogFixture[0].id, label: `Dock ${id}`, recipient: null, addressLine1: '1 Test Street', addressLine2: null, city: 'Test City', region: null, postalCode: null, countryCode: 'US', phone: null, instructions: null, destination: '1 Test Street\nTest City\nUS', version: 1, isActive: true })
function show(addresses: SupplierShipmentAddress[]) {
  const supplier: CatalogSupplier = { ...supplierCatalogFixture[0], shipmentAddresses: addresses, products: [{ ...supplierCatalogFixture[0].products[0], productTypeId: sequencingServiceProductTypeId, productTypeName: 'Sequencing service', kind: 'Other', defaultQuantityUnit: null }] }
  render(<QueryClientProvider client={new QueryClient()}><SupplierShipmentAddresses supplier={supplier} /></QueryClientProvider>)
}
it('explains why the last required address cannot be deactivated while retaining Edit', async () => {
  show([address('A')])
  fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Dock A' }), { key: 'ArrowDown' })
  expect((await screen.findByRole('menuitem', { name: 'Deactivate' })).getAttribute('aria-disabled')).toBe('true')
  expect(screen.getByRole('menuitem', { name: 'Edit' }).getAttribute('aria-disabled')).toBeNull()
  expect(screen.getByText(/Add another active address/)).toBeTruthy()
})
it('offers address retirement once a second active destination is available', async () => {
  show([address('A'), address('B')])
  fireEvent.keyDown(screen.getByRole('button', { name: 'Actions for Dock A' }), { key: 'ArrowDown' })
  expect((await screen.findByRole('menuitem', { name: 'Deactivate' })).getAttribute('aria-disabled')).toBeNull()
})
