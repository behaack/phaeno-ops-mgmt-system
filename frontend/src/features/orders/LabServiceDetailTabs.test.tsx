import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { phaseShippingOrder, shippedPhasePairs, shippingPhasePlan, sentPhaseShipment } from '#/test-helpers/lab-phase-shipping'
import { LabServiceDetailPage } from './LabServiceDetailPage'

const mocks = vi.hoisted(() => ({ order: vi.fn(), pairs: vi.fn(), plan: vi.fn(), supply: vi.fn(), packages: vi.fn(), source: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#job">{children}</a>, useNavigate: () => vi.fn(), useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewLabServiceOrders: true, canManageSampleShipping: true } } }) }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), getLabOrder: mocks.order, getLabSampleTubePairs: mocks.pairs }))
vi.mock('#/api/lab-phases', async original => ({ ...await original<typeof import('#/api/lab-phases')>(), getLabPhasePlan: mocks.plan }))
vi.mock('#/api/transportation-kit-requests', async original => ({ ...await original<typeof import('#/api/transportation-kit-requests')>(), getLabPhaseKitSupply: mocks.supply }))
vi.mock('#/api/pseq-order-to-cash', () => ({ listCustomerInvoices: async () => [], listCustomerResultPackages: mocks.packages, downloadCustomerInvoicePdf: vi.fn(), downloadCustomerResultArtifact: vi.fn() }))
vi.mock('#/features/sample-shipping/use-source-sample-shipments', () => ({ useSourceSampleShipments: mocks.source }))
vi.mock('./LabJobPhaseShipping', () => ({ LabJobPhaseShipping: () => <h2>Current phase task</h2> }))
vi.mock('./LabJobOrderProgress', () => ({ LabJobOrderProgress: () => <h2>Review and Accept Order</h2> }))
vi.mock('./LabJobShippingWorkspace', () => ({ LabJobShippingWorkspace: function Preparation() { const [value, setValue] = useState(''); return <input aria-label="Unsaved sample ID" value={value} onChange={event => setValue(event.target.value)} /> } }))
vi.mock('./LabPhasesPanel', () => ({ LabPhasesPanel: () => <p>Ordered phase list</p> }))
vi.mock('./LabJobTrackingSummary', () => ({ LabJobHoldNotice: () => null, LabJobTrackingSummary: () => null }))
vi.mock('./StandardLabServicePanel', () => ({ StandardLabServicePanel: () => null }))
vi.mock('./LabChangeQuotes', () => ({ LabChangeQuotes: () => null }))
vi.mock('./LabOrderQuoteReview', () => ({ LabOrderQuoteReview: () => <p>Commercial review</p> }))
vi.mock('./GovernedResultPackagePanel', () => ({ GovernedResultPackagePanel: ({ sampleName }: { sampleName: string }) => <p>Released package: {sampleName}</p> }))

const order = { ...phaseShippingOrder, canEdit: false, canSubmit: false, canAcceptQuote: false,
  samples: phaseShippingOrder.samples.map((sample, index) => ({ ...sample, customerSampleId: `RNA-${index + 1}` })) }
const pairs = { ...shippedPhasePairs, kits: [{ id: 'phase-2-kit', phaseId: 'phase-2', isUsable: true, availableTubeCount: 20 }] }
const source = { allowed: true, related: [sentPhaseShipment], retired: [], receiptState: 'ready', shipments: { data: [sentPhaseShipment], error: null, isFetching: false } }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.order.mockResolvedValue(order); mocks.pairs.mockResolvedValue(pairs); mocks.plan.mockResolvedValue(shippingPhasePlan)
  mocks.supply.mockResolvedValue({ requests: [], phases: [] }); mocks.source.mockReturnValue(source)
  mocks.packages.mockResolvedValue([{ id: 'package-1', labSampleId: order.samples[0].id }, { id: 'package-2', labSampleId: order.samples[5].id }])
})
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><LabServiceDetailPage orderId={order.id} /></QueryClientProvider>)
  return { client, ...view }
}

describe('Customer Job detail organization', () => {
  it('keeps unsaved preparation mounted while tabs and background queries change', async () => {
    const { client } = show()
    const input = await screen.findByLabelText('Unsaved sample ID')
    fireEvent.change(input, { target: { value: 'RNA-IN-PROGRESS' } })
    expect(screen.getByRole('tab', { name: 'Progress' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: 'History' }))
    expect(screen.getByLabelText('Unsaved sample ID')).toBe(input)
    expect(input).toHaveProperty('value', 'RNA-IN-PROGRESS')
    let finish!: (value: typeof pairs) => void
    mocks.pairs.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    mocks.source.mockReturnValue({ ...source, receiptState: 'loading', shipments: { ...source.shipments, isFetching: true } })
    let refresh!: Promise<void>
    act(() => { refresh = client.refetchQueries({ queryKey: ['lab-sample-tube-pairs', order.id] }) })
    await waitFor(() => expect(mocks.pairs).toHaveBeenCalledTimes(2))
    expect(screen.getByLabelText('Unsaved sample ID')).toBe(input)
    await act(async () => { finish(pairs); await refresh })
    expect(input).toHaveProperty('value', 'RNA-IN-PROGRESS')
  })

  it('filters result packages by the exact phase sample IDs', async () => {
    show()
    fireEvent.click(await screen.findByRole('tab', { name: 'Files and results' }))
    await screen.findByText('Released package: RNA-1')
    fireEvent.change(await screen.findByLabelText('Phase'), { target: { value: 'phase-2' } })
    expect(screen.queryByText('Released package: RNA-1')).toBeNull()
    expect(screen.getByText('Released package: RNA-6')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Files and results' }))
    expect(screen.getByLabelText('Phase')).toHaveProperty('value', 'phase-2')
  })

  it('starts unaccepted orders in commercial review without shipping controls', async () => {
    mocks.order.mockResolvedValue({ ...order, placedAt: null, quotes: [], status: 'Submitted' })
    show()
    await screen.findByText('Commercial review')
    expect(screen.getByRole('tab', { name: 'Order and billing' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByLabelText('Unsaved sample ID')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Review and Accept Order' })).toBeTruthy()
  })
})
