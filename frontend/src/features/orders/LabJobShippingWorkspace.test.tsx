import { useRef, useState, type ComponentProps } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import type { SampleShippingDetailPage, ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'
import { shippingFixture } from '#/test-helpers/sample-shipping'
import { LabJobShippingWorkspace } from './LabJobShippingWorkspace'
import type { LabJobWorkspaceSearch } from './lab-job-workspace-search'

const mocks = vi.hoisted(() => ({ source: vi.fn(), detail: vi.fn(), navigate: vi.fn(), print: vi.fn(), cancel: vi.fn(), activity: vi.fn(), retry: vi.fn() }))
vi.mock('#/features/sample-shipping/use-source-sample-shipments', () => ({ useSourceSampleShipments: mocks.source }))
vi.mock('./LabJobSamplesPanel', () => ({ LabJobSamplesPanel: ({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) => <section aria-label="Consolidated sample roster"><p>Sample page {page + 1}</p><button onClick={() => onPageChange(page + 1)}>Next sample page</button></section> }))
vi.mock('#/features/sample-shipping/SampleShippingDetailPage', () => ({
  SampleShippingDetailPage: function MockShipmentDetail(props: ComponentProps<typeof SampleShippingDetailPage>) {
    mocks.detail(props)
    const ref = useRef<HTMLButtonElement>(null)
    const actions: ShipmentHeaderAction[] = [{ kind: 'command', label: 'Print shipping insert', onSelect: mocks.print }]
    const sendRef = useRef<HTMLButtonElement>(null)
    return <section aria-label="Embedded shipment"><p>Shipment {props.shipmentId}</p>{props.embedded?.renderActions(actions, ref, false)}{props.embedded?.renderSendAction?.(actions[0], sendRef)}{props.embedded?.renderSamples?.()}{props.embedded?.showPreparation ? <p>Tube preparation</p> : null}</section>
  },
}))

const order = { id: 'job-1', organizationId: shippingFixture.organizationId, sampleRosterFinalizedAt: '2026-09-10T00:00:00Z', samples: [{ id: 'sample-1', biologicalSource: 'Human PBMCs' }] } as LabServiceOrder
const active = { ...shippingFixture, authorizationSourceId: order.id }
const another = { ...active, id: 'shipment-2', shipmentNumber: 'SHIP-2' }
const retired = { ...active, id: 'retired-shipment', shipmentNumber: 'RETIRED-1', status: 'Cancelled' }

function source(related = [active], overrides: Record<string, unknown> = {}) {
  return { allowed: true, related, retired: [], receiptState: 'ready', shipments: { error: null, isFetching: false, isLoading: false, refetch: mocks.retry }, ...overrides }
}

function Harness({ workspace = {}, navigationLocked = false, orderDialogOpen = false }: { workspace?: LabJobWorkspaceSearch; navigationLocked?: boolean; orderDialogOpen?: boolean }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  const [sendTarget, setSendTarget] = useState<HTMLDivElement | null>(null)
  return <><div ref={setTarget} data-testid="job-header-actions" /><div ref={setSendTarget} data-testid="next-step-action" /><LabJobShippingWorkspace order={order} workspace={workspace} onWorkspaceChange={mocks.navigate} headerTarget={target} sendActionTarget={sendTarget} orderActions={[{ kind: 'command', label: 'Request cancellation', onSelect: mocks.cancel }]} orderDialogOpen={orderDialogOpen} navigationLocked={navigationLocked} onActivityChange={mocks.activity} /></>
}

describe('Lab Job shipping host selection and navigation', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.source.mockReturnValue(source()); mocks.navigate.mockResolvedValue(undefined) })

  it('prints directly from the next-step card without leaving the sample view', () => {
    render(<Harness />)
    fireEvent.click(within(screen.getByTestId('next-step-action')).getByRole('button', { name: 'Print shipping insert' }))
    expect(mocks.print).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(screen.getByRole('region', { name: 'Consolidated sample roster' })).toBeTruthy()
    expect(screen.queryByText('Tube preparation')).toBeNull()
  })

  it('requires selection before a direct Send command for multiple shipments and identifies its target', () => {
    mocks.source.mockReturnValue(source([active, another]))
    const rendered = render(<Harness />)
    const nextStep = screen.getByTestId('next-step-action')
    expect(within(nextStep).queryByRole('button', { name: 'Print shipping insert' })).toBeNull()
    fireEvent.click(within(nextStep).getByRole('button', { name: 'Choose shipment' }))
    expect(document.activeElement).toBe(screen.getByLabelText('Shipping container'))
    expect(mocks.print).not.toHaveBeenCalled()
    rendered.rerender(<Harness workspace={{ shipmentId: another.id }} />)
    expect(within(nextStep).getByText(another.shipmentNumber)).toBeTruthy()
    fireEvent.click(within(nextStep).getByRole('button', { name: 'Print shipping insert' }))
    expect(mocks.detail.mock.lastCall?.[0].shipmentId).toBe(another.id)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it.each(['navigation', 'order dialog', 'source refresh', 'source failure'] as const)('blocks direct Send commands during %s', reason => {
    if (reason === 'source refresh') mocks.source.mockReturnValue(source([active], { shipments: { isFetching: true } }))
    if (reason === 'source failure') mocks.source.mockReturnValue(source([active], { receiptState: 'unavailable', shipments: { error: new Error('Unavailable'), isFetching: false, refetch: mocks.retry } }))
    render(<Harness navigationLocked={reason === 'navigation'} orderDialogOpen={reason === 'order dialog'} />)
    const button = within(screen.getByTestId('next-step-action')).getByRole('button', { name: 'Print shipping insert' })
    expect(button).toHaveProperty('disabled', true)
    fireEvent.click(button)
    expect(mocks.print).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('keeps shipment commands in the Job header while the Samples view is selected', async () => {
    render(<Harness />)
    expect(screen.getByRole('region', { name: 'Consolidated sample roster' })).toBeTruthy()
    expect(screen.queryByText('Tube preparation')).toBeNull()
    const header = screen.getByTestId('job-header-actions')
    fireEvent.pointerDown(within(header).getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Print shipping insert' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Request cancellation' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Print shipping insert' }))
    expect(mocks.print).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(mocks.detail.mock.lastCall?.[0].embedded.sourceId).toBe(order.id)
    expect(mocks.detail.mock.lastCall?.[0].embedded.specimenSources).toEqual({ 'sample-1': 'Human PBMCs' })
  })

  it('requires an explicit selection for multiple containers and delegates it to guarded route navigation', () => {
    mocks.source.mockReturnValue(source([active, another]))
    const rendered = render(<Harness workspace={{ shippingView: 'tubes' }} />)
    expect(mocks.detail).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Shipping container')).toHaveProperty('value', '')
    expect(screen.getByText('Select the container you are preparing before scanning.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Shipping container'), { target: { value: another.id } })
    expect(mocks.navigate).toHaveBeenCalledWith({ shipmentId: another.id, orderKits: undefined })
    expect(mocks.detail).not.toHaveBeenCalled()
    rendered.rerender(<Harness workspace={{ shipmentId: another.id, shippingView: 'tubes' }} />)
    expect(screen.getByText(`Shipment ${another.id}`)).toBeTruthy()
    expect(screen.getByText('Tube preparation')).toBeTruthy()
    expect(mocks.detail.mock.lastCall?.[0].shipmentId).toBe(another.id)
  })

  it('does not substitute a sole active container for an unknown or unrelated selected ID', () => {
    render(<Harness workspace={{ shipmentId: 'other-job-shipment', shippingView: 'tubes' }} />)
    expect(screen.getByText('Selected shipment is not available for this Job')).toBeTruthy()
    expect(mocks.detail).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Shipping container')).toHaveProperty('value', '')
    fireEvent.click(screen.getByRole('button', { name: 'Choose current container' }))
    expect(mocks.navigate).toHaveBeenCalledWith({ shipmentId: undefined, orderKits: undefined })
    expect(mocks.detail).not.toHaveBeenCalled()
  })

  it('keeps a deliberate route from retired history to the sole current container', () => {
    mocks.source.mockReturnValue(source([active], { retired: [retired] }))
    render(<Harness workspace={{ shipmentId: retired.id, shippingView: 'tubes' }} />)
    expect(mocks.detail.mock.lastCall?.[0].shipmentId).toBe(retired.id)
    expect(screen.getByLabelText('Shipping container')).toHaveProperty('value', retired.id)
    fireEvent.change(screen.getByLabelText('Shipping container'), { target: { value: active.id } })
    expect(mocks.navigate).toHaveBeenCalledWith({ shipmentId: active.id, orderKits: undefined })
    expect(mocks.detail.mock.lastCall?.[0].shipmentId).toBe(retired.id)
  })

  it('keeps the same sample roster and page when matching opens, without a view switch', () => {
    const rendered = render(<Harness workspace={{ samplePage: 3 }} />)
    expect(screen.getByText('Sample page 3')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Scan tubes' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Samples$/ })).toBeNull()
    mocks.detail.mock.lastCall?.[0].embedded.onOpenPreparation()
    expect(mocks.navigate).toHaveBeenCalledWith({ shipmentId: active.id, shippingView: 'tubes' })
    rendered.rerender(<Harness workspace={{ samplePage: 3, shippingView: 'tubes' }} />)
    expect(screen.getByText('Sample page 3')).toBeTruthy()
    expect(screen.getAllByRole('region', { name: 'Consolidated sample roster' })).toHaveLength(1)
    expect(screen.getByText('Tube preparation')).toBeTruthy()
    mocks.detail.mock.lastCall?.[0].embedded.onClosePreparation()
    expect(mocks.navigate).toHaveBeenLastCalledWith({ shippingView: undefined, orderKits: undefined })
  })

  it('does not mount shipping details or enable scanning without shipping access', () => {
    mocks.source.mockReturnValue(source([], { allowed: false, receiptState: 'unavailable' }))
    render(<Harness />)
    expect(screen.queryByRole('button', { name: 'Scan tubes' })).toBeNull()
    expect(screen.queryByLabelText('Shipping container')).toBeNull()
    expect(mocks.detail).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Request cancellation' })).toBeTruthy()
  })

  it('keeps unavailable shipping distinct from an invalid selection while showing retry', () => {
    mocks.source.mockReturnValue(source([], { receiptState: 'unavailable', shipments: { error: new Error('Unavailable'), isFetching: false, isLoading: false, refetch: mocks.retry } }))
    render(<Harness workspace={{ shipmentId: active.id }} />)
    expect(screen.queryByText('Selected shipment is not available for this Job')).toBeNull()
    expect(screen.getByText('Shipping information could not be loaded')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry shipments' }))
    expect(mocks.retry).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
