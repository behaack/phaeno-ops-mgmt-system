import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productTypesFixture } from '#/test-helpers/supplier-catalog'
import { ProductTypesPage } from './ProductTypesPage'
const mocks = vi.hoisted(() => ({ types: vi.fn(), save: vi.fn() }))
vi.mock('#/api/supplier-catalog', async importOriginal => ({ ...await importOriginal<typeof import('#/api/supplier-catalog')>(), useProductTypes: () => mocks.types(), saveProductType: mocks.save }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageOrderConfiguration: true } } }) }))
vi.mock('#/features/orders/use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({}), Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { productTypeId: string } }) => <a href={to.replace('$productTypeId', params?.productTypeId ?? '')}>{children}</a> }))
function mount(id?: string) { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><ProductTypesPage productTypeId={id} /></QueryClientProvider>) }
beforeEach(() => { vi.clearAllMocks(); mocks.types.mockReturnValue({ data: productTypesFixture, isPending: false, isError: false }); mocks.save.mockResolvedValue(productTypesFixture[2]) })
describe('product type management', () => {
  it('edits a product type directly from its row menu', async () => {
    mount(); fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Tube' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByLabelText(/Type name/)).toHaveProperty('value', 'Tube')
  })
  it('confirms deactivation and preserves the type details and version', async () => {
    mocks.save.mockResolvedValue({ ...productTypesFixture[0], isActive: false })
    mount(); fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Tube' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    expect(screen.getByRole('dialog', { name: 'Deactivate Tube?' })).toBeTruthy()
    expect(mocks.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ name: 'Tube', description: productTypesFixture[0].description, kitUse: 'Tube', isActive: false, version: 1 }, productTypesFixture[0].id))
  })
  it('offers activation for an inactive type', async () => {
    mocks.types.mockReturnValue({ data: productTypesFixture.map(t => ({ ...t, isActive: false })), isPending: false, isError: false })
    mount(); fireEvent.click(screen.getByLabelText('Show inactive'))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Shipping Container' }), { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: true, version: 1 }), productTypesFixture[1].id))
  })

  it('shows the seeded Reagent type without edit or deactivate actions', () => {
    mount(productTypesFixture[2].id)
    expect(screen.getByText(/Built-in Phaeno product type/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Actions for Reagent' })).toBeNull()
  })

  it('lists reagent and shipping types with dedicated detail links', () => {
    mount(); expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('link', { name: 'Reagent' }).getAttribute('href')).toContain(productTypesFixture[2].id)
  })
  it('defaults new types to non-kit use and requires a description', async () => {
    mount(); fireEvent.click(screen.getByRole('button', { name: 'New product type' }))
    fireEvent.change(screen.getByLabelText(/Type name/), { target: { value: 'Enzyme' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter a description.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Enzymes for laboratory work' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ name: 'Enzyme', description: 'Enzymes for laboratory work', kitUse: 'Other', isActive: true, version: undefined }, undefined))
  })
  it('retains kit use when editing an assigned type and allows inactivation', async () => {
    mount(productTypesFixture[0].id); fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for Tube' }), { button: 0, ctrlKey: false }); fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByLabelText(/Use in transportation kits/)).toHaveProperty('readOnly', true)
    fireEvent.click(screen.getByLabelText('Active product type'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ kitUse: 'Tube', isActive: false, version: 1 }), productTypesFixture[0].id))
  })
  it('reveals inactive types for reactivation', () => {
    mocks.types.mockReturnValue({ data: productTypesFixture.map(t => ({ ...t, isActive: false })), isPending: false, isError: false })
    mount(); expect(screen.queryByRole('link', { name: 'Reagent' })).toBeNull()
    fireEvent.click(screen.getByLabelText('Show inactive'))
    expect(screen.getByRole('link', { name: 'Reagent' })).toBeTruthy()
  })
})
