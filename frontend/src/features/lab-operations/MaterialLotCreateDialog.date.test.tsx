import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createLabMaterialLot } from '#/api/lab-operations'
import { MaterialLotCreateDialog } from './MaterialLotCreateDialog'

vi.mock('#/api/lab-operations', () => ({
  createLabMaterialLot: vi.fn().mockResolvedValue({}),
  getLabOperationsError: () => 'Save failed',
}))

describe('material lot native date submission', () => {
  it('submits the displayed date even before a change event reaches form state', async () => {
    render(<MaterialLotCreateDialog open definitions={[]} suppliers={[]} storageLocations={[]} materialLots={[]} onOpenChange={vi.fn()} onSaved={vi.fn().mockResolvedValue(undefined)} />)

    for (const [selection, field, value, action] of [
      ['Material', 'Material name', 'TEST ONLY reagent', 'Use material'],
      ['Supplier', 'Supplier name', 'TEST ONLY supplier', 'Use supplier'],
      ['Storage location', 'Storage location name', 'TEST ONLY storage', 'Use storage location'],
    ]) {
      fireEvent.change(screen.getByRole('combobox', { name: selection }), { target: { value: '__create__' } })
      fireEvent.change(screen.getByRole('textbox', { name: field }), { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: action }))
    }
    fireEvent.change(screen.getByRole('textbox', { name: 'Lot number' }), { target: { value: 'TEST-DATE-001' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Available quantity' }), { target: { value: '100' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Unit' }), { target: { value: 'mL' } })
    const date = screen.getByLabelText('Expiration or retest date') as HTMLInputElement
    // Deliberately omit the change event to reproduce stale form-library state.
    date.value = '2099-12-31'
    fireEvent.click(screen.getByRole('button', { name: 'Create material lot' }))

    await waitFor(() => expect(createLabMaterialLot).toHaveBeenCalledWith(expect.objectContaining({ expirationOrRetestDate: '2099-12-31' })))
  })
})
