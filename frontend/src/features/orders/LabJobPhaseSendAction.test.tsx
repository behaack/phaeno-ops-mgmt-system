import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useRef, useState, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SampleShippingDetailPage } from '#/features/sample-shipping/SampleShippingDetailPage'
import type { LabServiceOrder } from '#/api/order-management'
import { phasedLabOrder } from '#/test-helpers/phased-lab-quote'
import { shippingPhasePlan, emptyPhasePairs } from '#/test-helpers/lab-phase-shipping'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { LabJobPhaseShipping } from './LabJobPhaseShipping'
import { LabJobShippingWorkspace } from './LabJobShippingWorkspace'

const mocks = vi.hoisted(() => ({ source: vi.fn(), supply: vi.fn(), confirm: vi.fn(), navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/transportation-kit-requests', () => ({ getLabPhaseKitSupply: mocks.supply, requestLabPhaseKits: vi.fn() }))
vi.mock('#/features/sample-shipping/use-source-sample-shipments', () => ({ useSourceSampleShipments: mocks.source }))
vi.mock('./LabJobKitDeliveryPanel', () => ({ LabJobKitDeliveryPanel: () => null }))
vi.mock('#/features/sample-shipping/SampleShippingDetailPage', () => ({
  SampleShippingDetailPage: function SelectedShipment(props: ComponentProps<typeof SampleShippingDetailPage>) {
    const trigger = useRef<HTMLButtonElement>(null)
    return <>{props.embedded?.renderSendAction?.({ kind: 'command', label: 'Review and confirm shipment contents', onSelect: mocks.confirm }, trigger)}{props.embedded?.showKitDelivery !== false ? <p>Kit delivery controls</p> : null}</>
  },
}))

const order = { ...phasedLabOrder, usesPairedPreparation: true, placedAt: '2026-10-01T12:00:00Z',
  organizationId: shippingFixture.organizationId, samples: [{ id: 'sample-1', phaseId: 'phase-1', biologicalSource: 'Human PBMCs', customerSampleId: 'RNA-1' } as LabServiceOrder['samples'][number]] }
const shipment = { ...shippingFixture, authorizationSourceId: order.id, crosswalk: [shippingTube(1)] }
const pairs = { ...emptyPhasePairs, preparedPhaseIds: ['phase-1'] }
const supply = { locations: [], requests: [], phases: [{ phaseId: 'phase-1', phaseName: 'Phase 1', sampleCount: 5, canRequest: false }] }

function View({ navigationLocked = false, taskOnly = false }: { navigationLocked?: boolean; taskOnly?: boolean }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>
    <LabJobPhaseShipping order={order} phasePlan={shippingPhasePlan} phaseState="ready" onPhaseRefresh={vi.fn()} pairs={pairs} shipments={[shipment]} shippingReady canManage requestOpen={false} onRequestOpenChange={vi.fn()} onModalChange={vi.fn()} onStepSelect={mocks.navigate} sendActionTargetRef={setTarget} />
    <LabJobShippingWorkspace order={order} taskOnly={taskOnly} workspace={{ phaseId: 'phase-1' }} onWorkspaceChange={mocks.navigate} headerTarget={null} sendActionTarget={target} orderActions={[]} orderDialogOpen={false} navigationLocked={navigationLocked} onActivityChange={vi.fn()} pairWorkspace={pairs} pairState="ready" />
  </QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.supply.mockResolvedValue(supply)
  mocks.source.mockReturnValue({ allowed: true, related: [shipment], retired: [], receiptState: 'ready', shipments: { isFetching: false, error: null } })
})

describe('Selected shipment action in phased next step', () => {
  it('keeps the current Send workspace free of duplicated kit delivery and preparation controls', async () => {
    render(<View taskOnly />)
    fireEvent.click(await screen.findByRole('button', { name: 'Review and confirm shipment contents' }))
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Kit delivery controls')).toBeNull()
    expect(screen.queryByText('Samples and shipping')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Prepare sample shipment' })).toBeNull()
  })

  it('keeps the Send title and invokes the selected shipment command directly', async () => {
    render(<View />)
    const action = await screen.findByRole('button', { name: 'Review and confirm shipment contents' })
    const nextStep = screen.getByText('Next step', { selector: '[aria-live] p' }).closest('[aria-live]') as HTMLElement
    expect(within(nextStep).getByText('Send and record shipments')).toBeTruthy()
    expect(within(nextStep).queryByRole('button', { name: 'Review shipments' })).toBeNull()
    fireEvent.click(action)
    expect(mocks.confirm).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('preserves the selected workspace navigation lock', async () => {
    render(<View navigationLocked />)
    const action = await screen.findByRole('button', { name: 'Review and confirm shipment contents' })
    await waitFor(() => expect(action).toHaveProperty('disabled', true))
    fireEvent.click(action)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })
})
