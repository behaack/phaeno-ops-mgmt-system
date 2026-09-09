import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LabQuoteDeclineDialog } from './LabQuoteDeclineDialog'

const mocks = vi.hoisted(() => ({ decline: vi.fn(), blocker: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: mocks.blocker }))
beforeEach(() => { vi.clearAllMocks(); mocks.decline.mockReset() })
afterEach(() => vi.restoreAllMocks())

function Harness() {
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  return <><button type="button" onClick={() => { setError(null); setOpen(true) }}>Open decline</button>{open ? <LabQuoteDeclineDialog orderNumber="DEMO-Q-001" busy={busy} error={error} onClose={() => setOpen(false)} onDecline={async reason => {
    setBusy(true); setError(null)
    try { await mocks.decline(reason); setOpen(false) }
    catch (failure) { setError(failure); throw failure }
    finally { setBusy(false) }
  }} /> : null}</>
}
function show() { render(<Harness />) }
function choose(reason: string) { fireEvent.change(screen.getByRole('combobox', { name: /Reason/ }), { target: { value: reason } }) }
function submit() { fireEvent.click(screen.getByRole('button', { name: 'Decline quote and close request' })) }

describe('quote decline reasons', () => {
  it('starts with no choice and validates/focuses the required reason when submitted', async () => {
    show()
    const select = screen.getByRole('combobox', { name: /Reason/ })
    expect(select).toHaveProperty('value', '')
    expect(select).toHaveProperty('required', true)
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(['Select a reason', 'Our needs changed', 'Cost is too high', 'Selected another vendor', 'Prefer not to say', 'Other'])
    expect(screen.queryByLabelText(/Please explain/)).toBeNull()
    expect(screen.getByText('Required')).toBeTruthy()
    submit()
    expect(await screen.findByText('Select a reason.')).toHaveProperty('id', select.getAttribute('aria-describedby'))
    await waitFor(() => expect(document.activeElement).toBe(select))
    expect(mocks.decline).not.toHaveBeenCalled()
  })

  it.each(['Our needs changed', 'Cost is too high', 'Selected another vendor', 'Prefer not to say'])('sends the canonical %s reason without requiring an explanation', async reason => {
    show()
    choose(reason)
    expect(screen.queryByLabelText(/Please explain/)).toBeNull()
    mocks.decline.mockResolvedValueOnce(undefined)
    submit()
    await waitFor(() => expect(mocks.decline).toHaveBeenCalledExactlyOnceWith(reason))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('requires a nonblank Other explanation and sends its trimmed value with the reason prefix', async () => {
    show()
    choose('Other')
    const explanation = screen.getByLabelText(/Please explain/)
    expect(explanation).toHaveProperty('required', true)
    fireEvent.change(explanation, { target: { value: '   \n  ' } })
    submit()
    expect(await screen.findByText('Please explain why you are declining this quote.')).toHaveProperty('id', explanation.getAttribute('aria-describedby'))
    expect(mocks.decline).not.toHaveBeenCalled()
    fireEvent.change(explanation, { target: { value: '  Project approval was delayed.\n ' } })
    mocks.decline.mockResolvedValueOnce(undefined)
    submit()
    await waitFor(() => expect(mocks.decline).toHaveBeenCalledExactlyOnceWith('Other: Project approval was delayed.'))
  })

  it('validates the existing total reason length without truncating the Other explanation', async () => {
    show()
    choose('Other')
    const explanation = screen.getByLabelText(/Please explain/)
    fireEvent.change(explanation, { target: { value: 'x'.repeat(1994) } })
    submit()
    await screen.findByText('Use 1,993 characters or fewer.')
    expect(explanation).toHaveProperty('value', 'x'.repeat(1994))
    expect(mocks.decline).not.toHaveBeenCalled()
    fireEvent.change(explanation, { target: { value: 'x'.repeat(1993) } })
    mocks.decline.mockResolvedValueOnce(undefined)
    submit()
    await waitFor(() => expect(mocks.decline).toHaveBeenCalledExactlyOnceWith(`Other: ${'x'.repeat(1993)}`))
    expect(mocks.decline.mock.calls[0][0]).toHaveLength(2000)
  })

  it('retains Other text when switching choices but never validates or sends it for a named reason', async () => {
    show()
    choose('Other')
    fireEvent.change(screen.getByLabelText(/Please explain/), { target: { value: 'hidden draft '.repeat(200) } })
    submit()
    await screen.findByText('Use 1,993 characters or fewer.')
    choose('Our needs changed')
    expect(screen.queryByLabelText(/Please explain/)).toBeNull()
    expect(screen.queryByText('Use 1,993 characters or fewer.')).toBeNull()
    choose('Other')
    expect(screen.getByLabelText(/Please explain/)).toHaveProperty('value', 'hidden draft '.repeat(200))
    choose('Prefer not to say')
    mocks.decline.mockResolvedValueOnce(undefined)
    submit()
    await waitFor(() => expect(mocks.decline).toHaveBeenCalledExactlyOnceWith('Prefer not to say'))
  })

  it('locks choices, explanation and dismissal while pending, retains failed draft, and permits retry', async () => {
    show()
    choose('Other')
    fireEvent.change(screen.getByLabelText(/Please explain/), { target: { value: 'Research postponed' } })
    let reject!: (error: Error) => void
    mocks.decline.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
    submit()
    await waitFor(() => expect(mocks.decline).toHaveBeenCalledOnce())
    expect(screen.getByRole('combobox', { name: /Reason/ })).toHaveProperty('disabled', true)
    expect(screen.getByLabelText(/Please explain/)).toHaveProperty('disabled', true)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Keep reviewing' })).toHaveProperty('disabled', true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Updating…' }))
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(mocks.blocker.mock.lastCall![0].enableBeforeUnload()).toBe(true)
    expect(mocks.decline).toHaveBeenCalledOnce()
    await act(async () => reject(new Error('Connection lost. Try again.')))
    await screen.findByText('Connection lost. Try again.')
    expect(screen.getByRole('combobox', { name: /Reason/ })).toHaveProperty('value', 'Other')
    expect(screen.getByLabelText(/Please explain/)).toHaveProperty('value', 'Research postponed')
    mocks.decline.mockResolvedValueOnce(undefined)
    submit()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.decline).toHaveBeenNthCalledWith(2, 'Other: Research postponed')
  })

  it.each(['Close', 'Keep reviewing', 'Escape'])('protects selected reason and explanation on %s until explicitly discarded', async action => {
    show()
    choose('Other')
    fireEvent.change(screen.getByLabelText(/Please explain/), { target: { value: 'Keep this explanation' } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const close = () => action === 'Escape' ? fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) : fireEvent.click(screen.getByRole('button', { name: action }))
    close()
    expect(confirm).toHaveBeenCalledWith('Discard unsaved order changes?')
    expect(screen.getByRole('combobox', { name: /Reason/ })).toHaveProperty('value', 'Other')
    expect(screen.getByLabelText(/Please explain/)).toHaveProperty('value', 'Keep this explanation')
    expect(mocks.blocker.mock.lastCall![0].shouldBlockFn()).toBe(true)
    confirm.mockReturnValue(true)
    close()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open decline' }))
    expect(screen.getByRole('combobox', { name: /Reason/ })).toHaveProperty('value', '')
    expect(screen.queryByLabelText(/Please explain/)).toBeNull()
    expect(mocks.blocker.mock.lastCall![0].enableBeforeUnload()).toBe(false)
    expect(mocks.decline).not.toHaveBeenCalled()
  })
})
