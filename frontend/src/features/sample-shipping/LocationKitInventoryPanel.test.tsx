import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { locationInventory } from '#/test-helpers/location-kit-inventory'
import { LocationKitInventoryPanel } from './LocationKitInventoryPanel'

const mocks = vi.hoisted(() => ({ get: vi.fn(), receive: vi.fn() }))
vi.mock('#/api/transportation-kit-requests', () => ({ getLocationKitInventory: mocks.get, confirmLocationKitsReceived: mocks.receive }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(locationInventory); mocks.receive.mockResolvedValue(locationInventory) })
afterEach(() => vi.restoreAllMocks())
function show(canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const { location } = locationInventory
  render(<QueryClientProvider client={client}><LocationKitInventoryPanel locationId={location.id} organizationId={location.organizationId} departmentId={location.departmentId} canManage={canManage} /></QueryClientProvider>)
  return client
}
describe('location-owned transportation kits', () => {
  it('shows available stock from an old Job independently and keeps Members read-only', async () => {
    show(false)
    expect(await screen.findByText('KIT-20')).toBeTruthy()
    expect(screen.getByText('Available: 1')).toBeTruthy()
    expect(screen.getByText('On the way: 1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirm kits received' })).toBeNull()
    expect(mocks.get).toHaveBeenCalledWith(locationInventory.location.id)
    expect(mocks.receive).not.toHaveBeenCalled()
  })
  it('validates selection then acknowledges exact arrival versions without an originating Job', async () => {
    const client = show(), invalidate = vi.spyOn(client, 'invalidateQueries')
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm kits received' }))
    expect(screen.queryByRole('checkbox', { name: /KIT-20/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm received kits' }))
    expect(await screen.findByText('Select the kits that have arrived.')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: /KIT-10/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm received kits' }))
    await waitFor(() => expect(mocks.receive).toHaveBeenCalledWith(locationInventory.location.id, { kits: [{ stockKitId: 'stock-10', version: 4 }] }, expect.any(String)))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['platform-transportation-kit-requests'] }))
  })
  it('keeps the arrival draft mounted during refresh failure and saves nothing until refreshed', async () => {
    const client = show()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm kits received' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /KIT-10/ }))
    mocks.get.mockRejectedValue(new Error('Inventory offline'))
    await act(async () => { await client.invalidateQueries({ queryKey: ['location-kit-inventory'] }) })
    expect(screen.getByRole('checkbox', { name: /KIT-10/ })).toHaveProperty('checked', true)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm received kits' })).toHaveProperty('disabled', true))
    expect(mocks.receive).not.toHaveBeenCalled()
  })
  it('retains failure selection and retry identity, protects discard, and blocks busy dismissal', async () => {
    mocks.receive.mockRejectedValue(new Error('Please retry'))
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm kits received' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /KIT-10/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm received kits' }))
    await screen.findByText('Receipt could not be saved')
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('checkbox', { name: /KIT-10/ })).toHaveProperty('checked', true)
    mocks.receive.mockImplementation(() => new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm received kits' }))
    await waitFor(() => expect(mocks.receive).toHaveBeenCalledTimes(2))
    expect(mocks.receive.mock.calls[0][2]).toBe(mocks.receive.mock.calls[1][2])
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
