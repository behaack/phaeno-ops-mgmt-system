import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState, type ReactNode } from 'react'
import { phaseShippingOrder, shippingPhasePlan, shippedPhasePairs, sentPhaseShipment, singleShippingOrder, singleShippingPlan, singleShippingPairs } from '#/test-helpers/lab-phase-shipping'
import { kitRequestFixture } from '#/test-helpers/transportation-kit-requests'
import { LabJobPhaseList } from './LabJobPhaseList'
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#shipment">{children}</a> }))
vi.mock('./SpecimenHolds', () => ({ SpecimenHolds: ({ sampleIds }: { sampleIds: string[] }) => <div aria-label="Hold sample IDs">{sampleIds.join(',')}</div> }))

function View({ receiving = false, onResults = vi.fn() }: { receiving?: boolean; onResults?: (id: string) => void }) {
  const [expandedPhaseId, onExpand] = useState<string | undefined>()
  const plan = { ...shippingPhasePlan, phases: shippingPhasePlan.phases.map(p => p.position === 1 ? { ...p, deliveredSamples: 2 } : p) }
  return <LabJobPhaseList order={phaseShippingOrder} plan={plan} canCancel onCancel={vi.fn()} tracking={{ expandedPhaseId, onExpand, onResults, disabled: false, onHoldModalChange: vi.fn(), shippingReady: true,
    pairs: shippedPhasePairs, shipments: [sentPhaseShipment], requests: receiving ? [{ ...kitRequestFixture, phaseId: 'phase-2', status: 'Dispatched' }] : [] }} />
}
describe('Consolidated phase tracking', () => {
  it('shows single-order details immediately and keeps cancellation in a destructive menu item', async () => {
    render(<LabJobPhaseList order={singleShippingOrder} plan={singleShippingPlan} canCancel onCancel={vi.fn()} tracking={{
      onExpand: vi.fn(), onResults: vi.fn(), disabled: false, onHoldModalChange: vi.fn(), shippingReady: true,
      pairs: singleShippingPairs, shipments: [], requests: [],
    }} />)
    expect(screen.getByRole('region', { name: 'Samples and shipment progress' })).toBeTruthy()
    expect(screen.getByText('14 business days after all required samples are received')).toBeTruthy()
    expect(screen.getByText('Human liver:').parentElement?.textContent).toBe('Human liver: 1 sample')
    expect(screen.getAllByText('Awaiting sample shipment')).toHaveLength(2)
    expect(screen.getByText('Sample IDs will appear after preparation.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Request cancellation' })).toBeNull()
    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger.querySelectorAll('[data-slot="action-menu-indicator"]')).toHaveLength(1)
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
    expect((await screen.findByRole('menuitem', { name: 'Request cancellation' })).getAttribute('data-variant')).toBe('destructive')
    expect(screen.queryByRole('button', { name: /Phase 1/ })).toBeNull()
    expect(screen.queryByText('0 of 0')).toBeNull()
  })
  it('retains actual receipt totals and the recorded shipment for a sent single-phase order', () => {
    const member = phaseShippingOrder.samples[0]
    const shipment = { ...sentPhaseShipment, crosswalk: sentPhaseShipment.crosswalk.slice(0, 1) }
    const plan = { ...singleShippingPlan, phases: [{ ...singleShippingPlan.phases[0], sampleIds: [member.id], expectedTubes: 1, receivedTubes: 1, containerCount: 1, arrivedContainers: 1 }] }
    render(<LabJobPhaseList order={{ ...singleShippingOrder, samples: [member] }} plan={plan} canCancel={false} onCancel={vi.fn()} tracking={{
      onExpand: vi.fn(), onResults: vi.fn(), disabled: false, onHoldModalChange: vi.fn(), shippingReady: true,
      pairs: { ...singleShippingPairs, preparedPhaseIds: ['phase-1'] }, shipments: [shipment], requests: [],
    }} />)
    expect(screen.getByText('Sent')).toBeTruthy()
    expect(screen.getByText('1 of 1 tubes')).toBeTruthy()
    expect(screen.getByRole('link', { name: shipment.shipmentNumber })).toBeTruthy()
    expect(screen.queryByText('Awaiting sample shipment')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Request cancellation' })).toBeNull()
  })
  it('keeps sent and current phases in one list and expands only the requested cohort', () => {
    render(<View />)
    expect(within(screen.getByRole('region', { name: 'Phase 1' })).getByText('Sent')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Phase 2' })).getByText('Kits not requested')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '1. Phase 1' }))
    expect(screen.getByRole('link', { name: sentPhaseShipment.shipmentNumber })).toBeTruthy()
    expect(screen.queryByLabelText('Hold sample IDs')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '2. Phase 2' }))
    expect(screen.queryByRole('link', { name: sentPhaseShipment.shipmentNumber })).toBeNull()
    expect(screen.getByRole('button', { name: '1. Phase 1' }).getAttribute('aria-expanded')).toBe('false')
  })
  it('labels outbound kits separately from samples sent to the laboratory', () => {
    render(<View receiving />)
    expect(within(screen.getByRole('region', { name: 'Phase 2' })).getByText('Kits sent')).toBeTruthy()
  })
  it('keeps cancellation for an expanded phase inside Actions without a standalone cancel button', async () => {
    render(<View />)
    fireEvent.click(screen.getByRole('button', { name: '2. Phase 2' }))
    const phase = within(screen.getByRole('region', { name: 'Phase 2' }))
    expect(phase.queryByRole('button', { name: 'Request cancellation' })).toBeNull()
    fireEvent.pointerDown(phase.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect((await screen.findByRole('menuitem', { name: 'Request cancellation' })).getAttribute('data-variant')).toBe('destructive')
  })
})
