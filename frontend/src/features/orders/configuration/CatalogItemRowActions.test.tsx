import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OrderConfiguration } from '#/api/order-management'
import { CatalogItemRowActions } from './CatalogItemRowActions'

const api = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('#/api/order-management', () => ({
  saveCatalogItem: api.save,
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
}))

type CatalogItem = OrderConfiguration['catalogItems'][number]
const item = {
  id: 'service', externalItemId: 'ITEM-service', name: 'PSeq RNA Sequencing',
  description: 'RNA service', salesUnit: 'specimen', basePrice: 1250, currency: 'USD',
  isActive: true, isPSeqLabService: true, maximumCustomerSamples: 100, version: 4,
} as CatalogItem

function setup(value = item, apiEnabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onEdit = vi.fn()
  const view = render(<QueryClientProvider client={client}>
    <CatalogItemRowActions item={value} apiEnabled={apiEnabled} onEdit={onEdit} />
  </QueryClientProvider>)
  return { ...view, client, onEdit }
}

async function openStatus(action: 'Activate' | 'Deactivate') {
  const trigger = screen.getByRole('button', { name: `Actions for ${item.name}` })
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('menuitem', { name: action }))
  await screen.findByRole('dialog')
  return trigger
}

describe('service catalog row actions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.save.mockImplementation(async (_id, input) => ({ ...item, ...input, version: 5 }))
  })

  it.each([true, false])('offers Edit and the applicable status action for active=%s', async isActive => {
    const { onEdit } = setup({ ...item, isActive })
    const trigger = screen.getByRole('button', { name: `Actions for ${item.name}` })
    expect(trigger.querySelectorAll('[data-slot="action-menu-indicator"]')).toHaveLength(1)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(await screen.findByRole('menuitem', { name: isActive ? 'Deactivate' : 'Activate' })).toBeTruthy()
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith(trigger)
    expect(api.save).not.toHaveBeenCalled()
  })

  it('disables the menu when configuration writes are unavailable', () => {
    setup(item, false)
    expect(screen.getByRole('button', { name: `Actions for ${item.name}` })).toHaveProperty('disabled', true)
    expect(api.save).not.toHaveBeenCalled()
  })

  it('names the service, explains the effect, focuses Cancel and restores the row on cancellation', async () => {
    setup()
    const trigger = await openStatus('Deactivate')
    const dialog = screen.getByRole('dialog', { name: `Deactivate ${item.name}?` })
    expect(dialog.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('Existing orders and quotes retain their saved service details and prices.')
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' })))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(api.save).not.toHaveBeenCalled()
  })

  it.each([true, false])('preserves the reviewed fields and version when changing active=%s', async isActive => {
    const { client } = setup({ ...item, isActive })
    client.setQueryData(['order-configuration'], { catalogItems: [{ ...item, isActive }] })
    const action = isActive ? 'Deactivate' : 'Activate'
    await openStatus(action)
    fireEvent.click(screen.getByRole('button', { name: action }))
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('service', {
      externalItemId: 'ITEM-service', name: 'PSeq RNA Sequencing', description: 'RNA service',
      salesUnit: 'specimen', basePrice: 1250, currency: 'USD', isActive: !isActive,
      serviceFamily: 'PSeqLabService', maximumCustomerSamples: 100, version: 4,
    }))
    await waitFor(() => expect(client.getQueryData<OrderConfiguration>(['order-configuration'])?.catalogItems[0].isActive).toBe(!isActive))
  })

  it('keeps a failed confirmation open and blocks a status write after the reviewed version changes', async () => {
    api.save.mockRejectedValue(new Error('stale_write'))
    const { rerender, client, onEdit } = setup()
    await openStatus('Deactivate')
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'The item status was not changed. Review the latest item and try again.')
    rerender(<QueryClientProvider client={client}>
      <CatalogItemRowActions item={{ ...item, version: 5 }} apiEnabled onEdit={onEdit} />
    </QueryClientProvider>)
    expect(screen.getByRole('status').textContent).toContain('This item changed.')
    expect(screen.getByRole('button', { name: 'Deactivate' })).toHaveProperty('disabled', true)
    expect(api.save).toHaveBeenCalledOnce()
  })

  it('prevents duplicate writes and dismissal while a status save is pending', async () => {
    let finish!: (saved: CatalogItem) => void
    api.save.mockReturnValue(new Promise<CatalogItem>(resolve => { finish = resolve }))
    setup()
    await openStatus('Deactivate')
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saving…' })).toHaveProperty('disabled', true))
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(api.save).toHaveBeenCalledOnce()
    finish({ ...item, isActive: false, version: 5 })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('returns focus to search when deactivation removes the row from the active-only list', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    client.setQueryData(['order-configuration'], { catalogItems: [item] })
    function ActiveList() {
      const configuration = useQuery<OrderConfiguration>({ queryKey: ['order-configuration'], enabled: false })
      return <><input id="catalog-search" aria-label="Search service catalog" />
        {configuration.data?.catalogItems.filter(entry => entry.isActive).map(entry =>
          <CatalogItemRowActions key={entry.id} item={entry} apiEnabled onEdit={vi.fn()} />)}
      </>
    }
    render(<QueryClientProvider client={client}><ActiveList /></QueryClientProvider>)
    await openStatus('Deactivate')
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: `Actions for ${item.name}` })).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search service catalog' })))
  })
})
