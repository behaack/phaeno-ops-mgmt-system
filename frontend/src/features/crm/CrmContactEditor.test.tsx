import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CrmContact } from '#/api/crm'
import { CrmContactDialog } from './CrmContactDialog'

vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }))
vi.mock('./CrmOwnerSelect', () => ({ CrmOwnerSelect: () => null }))
const contact = { id: 'test', firstName: 'Joe', lastName: 'Blow', email: null, tags: [],
  communicationPreference: 'Unknown', lawfulContactBasis: null, communicationNotes: null } as unknown as CrmContact

describe('Contact outreach editor', () => {
  it('saves an email without manufacturing outreach permission', async () => {
    const onSubmit = vi.fn()
    render(<CrmContactDialog open contact={contact} pending={false} onSubmit={onSubmit} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Current status: Not established')).toBeTruthy()
    expect(screen.queryByLabelText(/Permission source/)).toBeNull()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'joe@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ email: 'joe@example.test', communicationPreference: 'Unknown' })
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('outreachDecision')
  })

  it('requires evidence and a suppression reason before submitting a reviewed decision', async () => {
    const onSubmit = vi.fn()
    render(<CrmContactDialog open contact={contact} pending={false} onSubmit={onSubmit} onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Record or update outreach decision'))
    fireEvent.change(screen.getByLabelText(/Outreach status/), { target: { value: 'Suppressed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Select why outreach is suppressed.')).toBeTruthy()
    expect(screen.getByLabelText(/Permission source/).getAttribute('aria-invalid')).toBe('true')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Permission source/), { target: { value: 'DirectRequest' } })
    fireEvent.change(screen.getByLabelText(/Evidence date/), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText(/Suppression reason/), { target: { value: 'Unsubscribed' } })
    fireEvent.change(screen.getByLabelText(/Decision explanation/), { target: { value: 'Unsubscribed from product updates' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0].outreachDecision).toMatchObject({ preference: 'Suppressed', suppressionReason: 'Unsubscribed' })
  })

  it('retains a dirty draft when discard is declined and disables controls during saving', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const props = { open: true, contact, pending: false, onSubmit: vi.fn(), onOpenChange: vi.fn() }
    try {
      const view = render(<CrmContactDialog {...props} />)
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'joe@example.test' } })
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(props.onOpenChange).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Email')).toHaveProperty('value', 'joe@example.test')
      view.rerender(<CrmContactDialog {...props} pending />)
      expect(screen.getByLabelText('Email').closest('fieldset')).toHaveProperty('disabled', true)
      expect(screen.getByRole('button', { name: 'Saving…' })).toHaveProperty('disabled', true)
    } finally { confirm.mockRestore() }
  })

  it('shows legacy permitted as needing review and keeps the old evidence', () => {
    render(<CrmContactDialog open contact={{ ...contact, communicationPreference: 'Permitted', lawfulContactBasis: 'Prior relationship' }}
      pending={false} onSubmit={vi.fn()} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Current status: Not established')).toBeTruthy()
    expect(screen.getByText(/Legacy “Permitted” is retained/)).toBeTruthy()
    expect(screen.getByText(/Legacy contact basis \(retained\): Prior relationship/)).toBeTruthy()
  })
})
