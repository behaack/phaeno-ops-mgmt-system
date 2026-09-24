import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supplierCatalogFixture, productTypesFixture } from '#/test-helpers/supplier-catalog'
import { SupplierCatalogPage } from './SupplierCatalogPage'
const mocks = vi.hoisted(() => ({ catalog: vi.fn(), types: vi.fn(), supplier: vi.fn(), product: vi.fn(), allowed: true }))
vi.mock('#/api/supplier-catalog', async importOriginal => ({ ...await importOriginal<typeof import('#/api/supplier-catalog')>(), useSupplierCatalog: () => mocks.catalog(), useProductTypes: () => mocks.types(), saveSupplier: mocks.supplier, saveSupplierProduct: mocks.product }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageOrderConfiguration: mocks.allowed } } }) }))
vi.mock('#/features/orders/use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({}), Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { supplierId: string } }) => <a href={to.replace('$supplierId', params?.supplierId ?? '')}>{children}</a> }))
function mount(supplierId?: string) { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><SupplierCatalogPage supplierId={supplierId} /></QueryClientProvider>) }
beforeEach(() => { vi.clearAllMocks(); mocks.types.mockReturnValue({ data: productTypesFixture, isPending: false, isError: false }); mocks.allowed = true; mocks.catalog.mockReturnValue({ data: supplierCatalogFixture, isPending: false, isError: false }); mocks.supplier.mockResolvedValue(supplierCatalogFixture[0]); mocks.product.mockResolvedValue(supplierCatalogFixture[0].products[0]) })
describe('supplier catalog', () => {
  it('edits the selected supplier directly from its row', async () => {
    mount(); fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Tube maker' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByLabelText(/Supplier name/)).toHaveProperty('value', 'Tube maker')
  })
  it('confirms supplier deactivation with the selected version', async () => {
    mocks.supplier.mockResolvedValue({ ...supplierCatalogFixture[0], isActive: false })
    mount(); fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Tube maker' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    expect(mocks.supplier).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(mocks.supplier).toHaveBeenCalledWith({ name: 'Tube maker', isActive: false, version: 1 }, supplierCatalogFixture[0].id))
  })
  it('keeps a failed product deactivation open without losing its details', async () => {
    mocks.product.mockRejectedValue(new Error('Unavailable'))
    mount(supplierCatalogFixture[0].id)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for T-001' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByText('Status could not be confirmed')).toBeTruthy()
    expect(mocks.product).toHaveBeenCalledWith(supplierCatalogFixture[0].id, { productNumber: 'T-001', description: 'Sterile transport tube', productTypeId: productTypesFixture[0].id, canExpire: false, isActive: false, version: 1 }, supplierCatalogFixture[0].products[0].id)
  })
  it('offers Activate for an inactive product', async () => {
    mocks.catalog.mockReturnValue({ data: supplierCatalogFixture.map(s => ({ ...s, products: s.products.map(p => ({ ...p, isActive: false })) })), isPending: false, isError: false })
    mount(supplierCatalogFixture[0].id); fireEvent.click(screen.getByLabelText('Show inactive'))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for T-001' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))
    await waitFor(() => expect(mocks.product).toHaveBeenCalledWith(supplierCatalogFixture[0].id, expect.objectContaining({ isActive: true, version: 1 }), supplierCatalogFixture[0].products[0].id))
  })

  it('retains and saves the product expiration requirement', async () => {
    mocks.catalog.mockReturnValue({ data: supplierCatalogFixture.map(s => ({ ...s, products: s.products.map(p => ({ ...p, canExpire: true })) })), isPending: false, isError: false })
    mount(supplierCatalogFixture[0].id)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for T-001' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByLabelText('Can expire')).toHaveProperty('checked', true)
    fireEvent.click(screen.getByLabelText('Can expire'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.product).toHaveBeenCalledWith(supplierCatalogFixture[0].id, expect.objectContaining({ canExpire: false, version: 1 }), supplierCatalogFixture[0].products[0].id))
  })

  it('opens suppliers as view-first records and searches product descriptions', () => {
    mount()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.change(screen.getByLabelText('Search suppliers or products'), { target: { value: 'Sterile' } })
    expect(screen.getByRole('link', { name: 'Tube maker' }).getAttribute('href')).toContain(supplierCatalogFixture[0].id)
    expect(screen.queryByRole('link', { name: supplierCatalogFixture[1].name })).toBeNull()
  })
  it('saves suppliers through a bounded modal', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'New supplier' }))
    fireEvent.change(screen.getByLabelText(/Supplier name/), { target: { value: 'New supplier' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.supplier).toHaveBeenCalledWith({ name: 'New supplier', isActive: true, version: undefined }, undefined))
  })
  it('requires a description and retains product edits after a failed save', async () => {
    mocks.product.mockRejectedValue(new Error('Save failed'))
    mount(supplierCatalogFixture[0].id); fireEvent.click(screen.getByRole('button', { name: 'New product' }))
    fireEvent.change(screen.getByLabelText(/Product name/), { target: { value: 'T-NEW' } })
    fireEvent.change(screen.getByLabelText(/Product type/), { target: { value: productTypesFixture[0].id } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter a product description.')).toBeTruthy()
    expect(mocks.product).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Product description/), { target: { value: 'New tube' } })
    fireEvent.change(screen.getByLabelText(/Inventory unit/), { target: { value: 'each' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Changes were not saved')).toBeTruthy()
    expect(screen.getByLabelText(/Product name/)).toHaveProperty('value', 'T-NEW')
  })
  it('can reveal inactive suppliers for reactivation', () => {
    mocks.catalog.mockReturnValue({ data: supplierCatalogFixture.map(s => ({ ...s, isActive: false })), isPending: false, isError: false })
    mount(); expect(screen.queryByRole('link', { name: 'Tube maker' })).toBeNull()
    fireEvent.click(screen.getByLabelText('Show inactive'))
    expect(screen.getByRole('link', { name: 'Tube maker' })).toBeTruthy()
  })
})
