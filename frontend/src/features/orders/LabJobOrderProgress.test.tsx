import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bundleLabDraft } from '#/test-helpers/bundled-orders'
import type { LabJobProgress, LabJobProgressStep } from './lab-job-progress'
import { LabJobOrderProgress } from './LabJobOrderProgress'

const mocks = vi.hoisted(() => ({ progress: undefined as LabJobProgress | undefined }))
// Business evidence mapping has its own tests; these exercise the real information panels.
vi.mock('./lab-job-progress', async original => ({
  ...await original<typeof import('./lab-job-progress')>(),
  buildLabJobProgress: () => mocks.progress!,
}))

beforeEach(() => {
  const steps: LabJobProgressStep[] = [
    { id: 'confirm-order', label: 'Review and confirm the order', state: 'complete', owner: 'You', detail: 'The order is confirmed.' },
    { id: 'samples', label: 'Enter and finalize samples', state: 'complete', owner: 'You', detail: 'Nine samples are finalized.' },
    { id: 'kits', label: 'Have transportation kits ready', state: 'complete', owner: 'You', detail: 'A registered container is assigned.' },
    { id: 'containers', label: 'Assign containers', state: 'complete', owner: 'You', detail: 'All eighteen tubes have container slots.' },
    { id: 'tubes', label: 'Match tubes', state: 'waiting-for-you', owner: 'You', detail: 'Five of eighteen tubes are matched.' },
    { id: 'send', label: 'Send and record your shipment', state: 'not-started', owner: 'You', detail: 'Confirm the current shipping insert before recording shipment.' },
  ]
  mocks.progress = { steps, nextStep: steps[4], allSent: false, exception: null, shipmentCount: 1 }
})

function show() {
  const select = vi.fn()
  render(<LabJobOrderProgress order={bundleLabDraft} shipments={[]} shippingState="ready" canManageShipping canAcceptOrder onStepSelect={select} />)
  return select
}

describe('Lab Job step information', () => {
  it('hosts the selected shipment command for Send instead of linking back to completed tube work', () => {
    const select = vi.fn()
    const sendTarget = vi.fn()
    mocks.progress!.nextStep = mocks.progress!.steps[5]
    render(<LabJobOrderProgress order={bundleLabDraft} shipments={[]} shippingState="ready" canManageShipping canAcceptOrder onStepSelect={select} sendActionTargetRef={sendTarget} />)
    expect(sendTarget).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    expect(screen.queryByRole('button', { name: /Show shipping work/ })).toBeNull()
    expect(screen.getByText('Your next step')).toBeTruthy()
    expect(select).not.toHaveBeenCalled()
  })

  it('shows six equal-width information steps without visible state labels or navigation links', () => {
    show()
    const strip = screen.getByRole('list', { name: 'Ordering and shipping steps' })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(6)
    expect(within(strip).getAllByRole('button')).toHaveLength(6)
    expect(strip.className).toContain('repeat(6,')
    expect(within(strip).queryByRole('link')).toBeNull()
    expect(within(strip).queryByText('Complete')).toBeNull()
    expect(within(strip).queryByText('Waiting for you')).toBeNull()
    expect(within(strip).queryByText(/Shipping insert/)).toBeNull()
    expect(within(strip).getByRole('button', { name: /Information about step 5: Match tubes. Waiting for you/ }).closest('li')?.getAttribute('aria-current')).toBe('step')
    expect(within(strip).getByRole('button', { name: /Information about step 6:/ }).className).toContain('text-muted-foreground')
    expect(within(strip).getAllByRole('button').every(button => !button.hasAttribute('title'))).toBe(true)
  })

  it('opens completed-step purpose and recorded evidence on focus without assigning a current actor or navigating', async () => {
    const select = show()
    const trigger = screen.getByRole('button', { name: /Information about step 1:/ })
    act(() => trigger.focus())
    const panel = await screen.findByRole('dialog', { name: 'Review and confirm the order' })
    expect(document.activeElement).toBe(trigger)
    expect(within(panel).getByText('Complete')).toBeTruthy()
    expect(within(panel).getByText(/Review the scope and price/)).toBeTruthy()
    expect(within(panel).getByText('The order is confirmed.')).toBeTruthy()
    expect(within(panel).queryByText(/With:/)).toBeNull()
    expect(trigger.getAttribute('aria-describedby')).toBe(panel.getAttribute('aria-describedby'))
    fireEvent.click(trigger)
    expect(select).not.toHaveBeenCalled()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('shows future Send instructions on an information tap and keeps work navigation in Your next step', async () => {
    const select = show()
    fireEvent.click(screen.getByRole('button', { name: /Information about step 6:/ }))
    const panel = await screen.findByRole('dialog', { name: 'Send and record your shipment' })
    expect(within(panel).getByText('Not started')).toBeTruthy()
    expect(within(panel).getByText(/Review and confirm the current shipping insert, print it and pack/)).toBeTruthy()
    expect(within(panel).getByText('Confirm the current shipping insert before recording shipment.')).toBeTruthy()
    expect(within(panel).getByText('With: You')).toBeTruthy()
    expect(select).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Show shipping work: Match tubes' }))
    expect(select).toHaveBeenCalledExactlyOnceWith('tubes')
  })

  it('shows only the latest hovered panel and ignores an earlier step’s delayed close', async () => {
    const select = show()
    const first = screen.getByRole('button', { name: /Information about step 1:/ })
    const second = screen.getByRole('button', { name: /Information about step 2:/ })
    act(() => first.focus())
    await screen.findByRole('dialog', { name: 'Review and confirm the order' })
    fireEvent.pointerOut(first, { pointerType: 'mouse', relatedTarget: document.body })
    fireEvent.pointerOver(second, { pointerType: 'mouse' })
    await screen.findByRole('dialog', { name: 'Enter and finalize samples' })
    act(() => first.blur())
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)) })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Enter and finalize samples' })).toBeTruthy()
    expect(select).not.toHaveBeenCalled()
  })
})
