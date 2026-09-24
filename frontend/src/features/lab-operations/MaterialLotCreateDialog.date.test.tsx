import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLabMaterialLot } from '#/api/lab-operations'
import { MaterialLotCreateDialog } from './MaterialLotCreateDialog'

vi.mock('#/api/lab-operations', () => ({
  createLabMaterialLot: vi.fn().mockResolvedValue({}),
  getLabOperationsError: () => 'Save failed',
}))

const catalog = vi.hoisted(() => ({ canExpire: false }))
vi.mock('#/api/lab-materials', () => ({ useLotProducts: () => ({ data: [{ id: 'supplier', products: [{ id: 'product', productNumber: 'TEST reagent', description: 'TEST ONLY', canExpire: catalog.canExpire, defaultQuantityUnit: 'mL' }] }], isPending: false, isError: false }) }))
beforeEach(() => { vi.clearAllMocks(); catalog.canExpire = false })

describe('material lot native date submission', () => {
  it('requires an expiration date for a product marked can expire', async () => {
    catalog.canExpire = true
    render(<MaterialLotCreateDialog open definitions={[]} suppliers={[{ id: 'supplier', name: 'TEST supplier', isActive: true }]} storageLocations={[]} materialLots={[]} onOpenChange={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Supplier' }), { target: { value: 'supplier' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Product name' }), { target: { value: 'product' } })
    expect(screen.getByLabelText(/Expiration date/)).toHaveProperty('required', true)
    fireEvent.click(screen.getByRole('button', { name: 'Create material lot' }))
    expect(await screen.findByText('Enter the expiration date for this product.')).toBeTruthy()
    expect(createLabMaterialLot).not.toHaveBeenCalled()
  })

  it('submits the displayed date even before a change event reaches form state', async () => {
    render(<MaterialLotCreateDialog open definitions={[]} suppliers={[{ id: 'supplier', name: 'TEST supplier', isActive: true }]} storageLocations={[]} materialLots={[]} onOpenChange={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Storage location' }), { target: { value: '__create__' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Storage location name' }), { target: { value: 'TEST ONLY storage' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use storage location' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Supplier' }), { target: { value: 'supplier' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Product name' }), { target: { value: 'product' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Lot number' }), { target: { value: 'TEST-DATE-001' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Available quantity' }), { target: { value: '100' } })
    expect(screen.getByRole('textbox', { name: 'Unit' })).toHaveProperty('value', 'mL')
    const date = screen.getByLabelText('Expiration or retest date') as HTMLInputElement
    // Deliberately omit the change event to reproduce stale form-library state.
    date.value = '2099-12-31'
    fireEvent.click(screen.getByRole('button', { name: 'Create material lot' }))

    await waitFor(() => expect(createLabMaterialLot).toHaveBeenCalledWith(expect.objectContaining({ expirationOrRetestDate: '2099-12-31' })))
  })
})
