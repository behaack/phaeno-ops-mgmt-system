import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import { phasedLabOrder, phasedLabQuote } from '#/test-helpers/phased-lab-quote'
import { LabQuoteProposalDialog } from './LabQuoteProposalDialog'

const mocks = vi.hoisted(() => ({ propose: vi.fn(), close: vi.fn(), focus: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), proposeLabQuoteChanges: mocks.propose }))
const order: LabServiceOrder = { ...phasedLabOrder, status: 'QuoteIssued', canProposeQuoteChanges: true }
beforeEach(() => { vi.clearAllMocks(); mocks.propose.mockReset() })
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = (current: LabServiceOrder) => <QueryClientProvider client={client}><LabQuoteProposalDialog order={current} quote={phasedLabQuote} onClose={mocks.close} onCloseFocus={mocks.focus} /></QueryClientProvider>
  const result = render(view(order))
  return (current: LabServiceOrder) => result.rerender(view(current))
}

describe('simple quote proposal', () => {
  it('uses one multiline field, explains the acceptance pause and validates whitespace and length', async () => {
    show()
    const dialog = screen.getByRole('dialog', { name: 'Propose changes' })
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(1)
    expect(within(dialog).getByRole('textbox')).toHaveProperty('tagName', 'TEXTAREA')
    expect(dialog.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('pauses acceptance')
    expect(screen.getByRole('button', { name: 'Keep reviewing' })).toBe(document.activeElement)
    const field = screen.getByRole('textbox', { name: /Proposed changes/ })
    fireEvent.change(field, { target: { value: ' \n ' } }); fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    expect(await screen.findByText('Describe the changes you would like Phaeno to review.')).toBeTruthy()
    fireEvent.change(field, { target: { value: 'x'.repeat(2001) } }); fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    expect(await screen.findByText('Use 2,000 characters or fewer.')).toBeTruthy()
    expect(mocks.propose).not.toHaveBeenCalled()
  })

  it('keeps text on failure and reuses the same retry identity without accepting or closing the request', async () => {
    show()
    const field = screen.getByRole('textbox', { name: /Proposed changes/ })
    fireEvent.change(field, { target: { value: '  Review Phase 2 price.\nKeep Phase 1.  ' } })
    mocks.propose.mockRejectedValueOnce(new Error('Connection lost'))
    fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    expect(await screen.findByText('Connection lost')).toBeTruthy()
    expect(field).toHaveProperty('value', '  Review Phase 2 price.\nKeep Phase 1.  ')
    expect(mocks.close).not.toHaveBeenCalled()
    const first = mocks.propose.mock.calls[0]
    mocks.propose.mockResolvedValueOnce({ ...order, status: 'QuoteInPreparation', version: order.version + 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    await waitFor(() => expect(mocks.close).toHaveBeenCalledOnce())
    expect(mocks.propose.mock.calls[1]).toEqual(first)
    expect(first).toEqual([order.id, phasedLabQuote.id, order.version, 'Review Phase 2 price.\nKeep Phase 1.', expect.any(String)])
  })

  it('retains the proposal but blocks sending when a newer quote replaces the reviewed one', async () => {
    const update = show()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this proposal' } })
    update({ ...order, version: order.version + 1, quotes: [{ ...phasedLabQuote, id: 'replacement', revision: 2 }] })
    expect(screen.getByRole('button', { name: 'Send proposal' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('textbox')).toHaveProperty('value', 'Keep this proposal')
    fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    expect(mocks.propose).not.toHaveBeenCalled()
  })

  it('keeps dismissal and repeat submission unavailable during the request', async () => {
    show()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Review turnaround' } })
    let finish!: (value: LabServiceOrder) => void
    mocks.propose.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    fireEvent.click(screen.getByRole('button', { name: 'Send proposal' }))
    await waitFor(() => expect(mocks.propose).toHaveBeenCalledOnce())
    expect(screen.getByRole('textbox')).toHaveProperty('disabled', true)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Sending proposal…' }))
    expect(mocks.close).not.toHaveBeenCalled(); expect(mocks.propose).toHaveBeenCalledOnce()
    await act(async () => finish({ ...order, status: 'QuoteInPreparation' }))
  })

  it('uses a separate discard dialog and keeps the proposal when dismissal is cancelled', async () => {
    show(); fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep this proposal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Keep reviewing' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Discard unsaved quote decision?' })
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Keep reviewing' }))
    expect(screen.getByRole('textbox')).toHaveProperty('value', 'Keep this proposal')
    expect(mocks.close).not.toHaveBeenCalled(); expect(mocks.propose).not.toHaveBeenCalled()
  })
})
