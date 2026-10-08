import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreparationFormDialog } from './preparation-ui'

describe('preparation confirmation checkbox', () => {
  it('requires an explicit check and submits the existing confirmation value', async () => {
    const submit = vi.fn()
    render(<PreparationFormDialog title="Confirm tray" description="Review the tray." fields={[{ key: 'confirm', label: 'I reviewed the tray identities and positions', required: true, type: 'checkbox' }]} onClose={vi.fn()} onSubmit={submit} pending={false} submitLabel="Confirm tray" />)
    const checkbox = screen.getByRole('checkbox', { name: /I reviewed the tray identities and positions/ })
    expect(checkbox).toHaveProperty('checked', false)
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm tray' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Check this box to confirm.')
    expect(submit).not.toHaveBeenCalled()
    fireEvent.click(checkbox)
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm tray' }))
    await waitFor(() => expect(checkbox.getAttribute('aria-invalid')).toBe('true'))
    expect(submit).not.toHaveBeenCalled()
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm tray' }))
    await waitFor(() => expect(submit).toHaveBeenCalled())
    expect(submit.mock.calls[0][0]).toEqual({ confirm: 'yes' })
  })
})
