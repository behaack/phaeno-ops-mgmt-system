import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogItemActions } from './CatalogItemActions'
import type { OrderConfiguration } from '#/api/order-management'

const api = vi.hoisted(() => ({ eligibility: vi.fn(), remove: vi.fn(), navigate: vi.fn() }))
vi.mock('#/api/order-management', () => ({ getCatalogItemDeletion: api.eligibility, deleteCatalogItem: api.remove,
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => api.navigate }))
const item = { id: 'draft', name: 'Unused draft', isActive: false, version: 4 } as OrderConfiguration['catalogItems'][number]
function setup(value = item) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <CatalogItemActions item={value} apiEnabled onEdit={vi.fn()} />
  </QueryClientProvider>)
}
describe('unused catalog item deletion', () => {
  beforeEach(() => { vi.clearAllMocks(); api.eligibility.mockResolvedValue({ canDelete: true, reason: null, version: 4 }); api.remove.mockResolvedValue(undefined) })
  it('offers only Edit for an active item', () => {
    setup({ ...item, isActive: true })
    expect(screen.getByRole('button', { name: 'Edit item' })).toBeTruthy()
    expect(screen.queryByText('Delete item')).toBeNull()
    expect(api.eligibility).not.toHaveBeenCalled()
  })
  it('explains protected history without enabling deletion', async () => {
    api.eligibility.mockResolvedValue({ canDelete: false, reason: 'This item has been active.', version: 4 })
    setup(); fireEvent.keyDown(screen.getByRole('button', { name: /Actions/ }), { key: 'ArrowDown' })
    expect(await screen.findByText('This item has been active.')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Delete item' }).getAttribute('data-disabled')).not.toBeNull()
    expect(api.remove).not.toHaveBeenCalled()
  })
  it('requires a named confirmation, focuses Cancel and cancels without a write', async () => {
    setup()
    const trigger = screen.getByRole('button', { name: /Actions/ })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Delete item' }).getAttribute('data-disabled')).toBeNull())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete item' }))
    expect(await screen.findByRole('heading', { name: 'Delete Unused draft?' })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(api.remove).not.toHaveBeenCalled()
  })
  it('sends the reviewed item version only after confirmation', async () => {
    setup(); fireEvent.keyDown(screen.getByRole('button', { name: /Actions/ }), { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Delete item' }).getAttribute('data-disabled')).toBeNull())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete item' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete item' }))
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('draft', 4))
    await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to: '/order-configuration', search: { configurationSection: 'catalog' } }))
  })
})
