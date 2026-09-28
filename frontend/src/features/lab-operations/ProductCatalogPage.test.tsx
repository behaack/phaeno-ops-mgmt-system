import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supplierCatalogFixture, productTypesFixture } from '#/test-helpers/supplier-catalog'
import { ProductCatalogPage } from './ProductCatalogPage'

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), navigate: vi.fn(), search: {} as Record<string, unknown> }))
vi.mock('#/api/supplier-catalog', async importOriginal => ({ ...await importOriginal<typeof import('#/api/supplier-catalog')>(), useSupplierCatalog: () => mocks.catalog() }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageOrderConfiguration: true } } }) }))
vi.mock('@tanstack/react-router', () => ({ useSearch: () => mocks.search, useNavigate: () => mocks.navigate, Link: ({ children, to, params, search }: { children: ReactNode; to: string; params?: Record<string, string>; search?: Record<string, string | boolean | undefined> }) => {
  let path = to
  for (const [key, value] of Object.entries(params ?? {})) path = path.replace('$' + key, value)
  const query = new URLSearchParams(Object.entries(search ?? {}).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))
  return <a href={path + '?' + query.toString()}>{children}</a>
} }))
function mount(supplierId?: string, productId?: string) {
  render(<QueryClientProvider client={new QueryClient()}><ProductCatalogPage supplierId={supplierId} productId={productId} /></QueryClientProvider>)
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.search = {}
  mocks.catalog.mockReturnValue({ data: supplierCatalogFixture.map(supplier => supplier.id === supplierCatalogFixture[0].id ? { ...supplier, products: [...supplier.products, { ...supplier.products[0], id: '82000000-0000-4000-8000-000000000099', productNumber: 'T-RETIRED', description: 'Sterile retired tube', isActive: false }] } : supplier), isPending: false, isError: false })
})

describe('product catalog filters', () => {
  it('combines product type, search, and inactive visibility and clears them together', () => {
    mount()
    expect(screen.queryByRole('link', { name: 'T-RETIRED' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Product type' }), { target: { value: productTypesFixture[0].id } })
    expect(screen.queryByRole('link', { name: supplierCatalogFixture[1].products[0].productNumber })).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'retired' } })
    expect(screen.getByText('No products match these filters.')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show inactive' }))
    expect(screen.getByRole('link', { name: 'T-RETIRED' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'T-001' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/purchasing', replace: true }))
    expect(screen.getByRole('combobox', { name: 'Product type' })).toHaveProperty('value', '')
    expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveProperty('value', '')
    expect(screen.getByRole('checkbox', { name: 'Show inactive' })).toHaveProperty('checked', false)
    expect(screen.getByRole('link', { name: supplierCatalogFixture[1].products[0].productNumber })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'T-RETIRED' })).toBeNull()
  })

  it('carries the combined list filters into product details', () => {
    mount()
    fireEvent.change(screen.getByRole('combobox', { name: 'Product type' }), { target: { value: productTypesFixture[0].id } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Search products' }), { target: { value: 'Sterile' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show inactive' }))
    const href = screen.getByRole('link', { name: 'T-001' }).getAttribute('href')!
    const search = new URL(href, 'https://portal.test').searchParams
    expect(search.get('productTypeFilter')).toBe(productTypesFixture[0].id)
    expect(search.get('productSearch')).toBe('Sterile')
    expect(search.get('productInactive')).toBe('true')
  })

  it('returns to the products list with its saved filters', () => {
    mocks.search = { productSearch: 'Sterile', productTypeFilter: productTypesFixture[0].id, productInactive: true }
    mount(supplierCatalogFixture[0].id, supplierCatalogFixture[0].products[0].id)
    const href = screen.getByRole('link', { name: '← Back to products' }).getAttribute('href')!
    const search = new URL(href, 'https://portal.test').searchParams
    expect(search.get('productTypeFilter')).toBe(productTypesFixture[0].id)
    expect(search.get('productSearch')).toBe('Sterile')
    expect(search.get('productInactive')).toBe('true')
  })
})
