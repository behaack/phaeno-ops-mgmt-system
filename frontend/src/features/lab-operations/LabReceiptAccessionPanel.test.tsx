import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabReceiptAccessionPanel } from './LabReceiptAccessionPanel'
import { LabKitRequestQueues } from './LabKitRequestQueues'

const api = vi.hoisted(() => ({ packet: vi.fn(), tube: vi.fn(), identity: vi.fn(), queue: vi.fn(), history: vi.fn(), receive: vi.fn(), work: vi.fn(), accession: vi.fn(), batch: vi.fn(), samples: vi.fn() }))
const route = vi.hoisted(() => ({ search: {} as Record<string, unknown>, listeners: new Set<() => void>() }))
vi.mock('#/api/lab-operations', () => ({ getLabWorkOrder: api.work, getLabAccessionedSamples: api.samples, accessionShipmentTube: api.accession, acceptRemainingLabTubes: api.batch, getLabOperationsError: (_: unknown, fallback: string) => fallback, getLabIntakeReasons: async () => [{ code: 'damaged_container', label: 'Damaged container' }] }))
vi.mock('#/api/lab-shipment-receipt', () => ({ getLabShipmentQueue: api.queue, getLabShipmentHistory: api.history, receiveLabShipment: api.receive }))
vi.mock('#/api/shipping-containers', () => ({ scanShippingIdentity: api.identity }))
vi.mock('#/api/sample-shipping', () => ({ scanSampleShippingPacket: api.packet, scanRegisteredSampleTube: api.tube }))
vi.mock('#/features/orders/ReturnKitFulfillmentPanel', () => ({ ReturnKitFulfillmentPanel: () => <p>Return-kit queue</p> }))
vi.mock('#/features/orders/stock-kits/StandardKitInventoryPanel', () => ({ StandardKitInventoryPanel: () => <p>Standard-kit queue</p> }))
vi.mock('#/features/orders/kit-requests/KitRequestsPanel', () => ({ KitRequestsPanel: () => <p>Kit-request queue</p> }))
vi.mock('@tanstack/react-router', async () => {
  const { useSyncExternalStore } = await import('react')
  return {
  useBlocker: vi.fn(() => ({ status: 'idle', reset: vi.fn(), proceed: vi.fn() })),
  useSearch: () => useSyncExternalStore(callback => { route.listeners.add(callback); return () => { route.listeners.delete(callback) } }, () => route.search),
  useNavigate: () => ({ search }: { search: Record<string, unknown> | ((previous: Record<string, unknown>) => Record<string, unknown>) }) => { route.search = typeof search === 'function' ? search(route.search) : search; route.listeners.forEach(listener => listener()) },
  Link: ({ children, search }: { children: ReactNode; search?: Record<string, string> }) => <a href={`#work?${new URLSearchParams(search).toString()}`}>{children}</a>,
  }
})

describe('LabReceiptAccessionPanel navigation', () => {
  beforeEach(() => {
    route.search = {}
    api.work.mockResolvedValue({ containers: [], workOrder: { version: 1, status: 'Received' } })
    api.samples.mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    api.accession.mockReset()
    api.batch.mockReset()
    api.queue.mockReset().mockResolvedValue([])
    api.history.mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    api.receive.mockReset()
    api.packet.mockReset()
    api.tube.mockReset()
    api.identity.mockReset()
    api.packet.mockResolvedValue({
      packetNumber: 'PACKET-1', barcode: 'PH-P-23456789AB-C', packetRevision: 1, isVoided: false,
      containerReceivedAt: '2026-09-10T18:00:00Z', shipmentId: 'shipment-1', shipmentNumber: 'SHIP-1', shipmentStatus: 'Delivered', organizationName: 'Example Customer',
      authorizationSource: 'CustomerLabServiceOrder', authorizationReference: 'LAB-1',
      expectedSampleCount: 1, receivedSampleCount: 0, receiptState: 'AwaitingReceipt',
      labWorkOrderId: 'work-1', labWorkStatus: 'AwaitingSpecimens', destinationName: 'Lab', crosswalk: [],
    })
  })

  it('switches accession views without losing the package lookup draft or recording intake', async () => {
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled tab="accession" workOrders={[]} /></QueryClientProvider>)
    const lookup = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(lookup, { target: { value: 'PH-P-DRAFT' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Accessioned samples' }))
    expect(await screen.findByText('No samples have been accessioned.')).toBeTruthy()
    expect(screen.queryByLabelText('Shipping insert barcode')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Received packages' }))
    expect(screen.getByLabelText('Shipping insert barcode')).toHaveProperty('value', 'PH-P-DRAFT')
    expect(api.packet).not.toHaveBeenCalled()
    expect(api.accession).not.toHaveBeenCalled()
  })

  it('pages and filters accessioned samples while preserving unrelated list context', async () => {
    route.search = { accessionView: 'samples', kitSearch: 'preserved' }
    api.samples.mockImplementation(async (search: string, page: number, status?: string, useStatus?: string) => ({
      items: search ? [] : [{ id: 'sample', labWorkOrderId: 'work', customerSampleId: `SAMPLE-PAGE-${page}`, accessionNumber: 'ACC-1', organizationName: 'Customer', jobReference: 'JOB-1', intakeDisposition: status ?? 'Accepted', receivedAtUtc: null, useStatus: useStatus ?? 'NotUsed', tubes: [{ id: 'tube', barcode: 'TUBE-1', location: 'FB-1', intakeDisposition: 'Accepted', status: 'Available', useStatus: useStatus ?? 'NotUsed' }] }], page, pageSize: 20, totalCount: search ? 0 : 21,
    }))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LabReceiptAccessionPanel apiEnabled tab="accession" workOrders={[]} /></QueryClientProvider>)
    await screen.findByRole('link', { name: 'SAMPLE-PAGE-1' })
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('link', { name: 'SAMPLE-PAGE-2' })
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('Sample intake status'), { target: { value: 'OnHold' } })
    await waitFor(() => expect(api.samples).toHaveBeenCalledWith('', 1, 'OnHold', undefined))
    fireEvent.change(screen.getByLabelText('Sample use', { selector: 'select' }), { target: { value: 'Used' } })
    await waitFor(() => expect(api.samples).toHaveBeenCalledWith('', 1, 'OnHold', 'Used'))
    expect(screen.getByText('1 of 1 tubes used')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Search accessioned samples'), { target: { value: 'missing' } })
    expect(await screen.findByText('No samples match your filters.')).toBeTruthy()
    expect(route.search).toMatchObject({ accessionStatus: 'OnHold', accessionUse: 'Used', accessionPage: 1, kitSearch: 'preserved' })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(api.samples).toHaveBeenCalledWith('', 1, undefined, undefined))
    expect(route.search.kitSearch).toBe('preserved')
    expect(api.accession).not.toHaveBeenCalled()
  })

  it('keeps unused reserves, exhaustion and unidentified historical sources visible', async () => {
    route.search = { accessionView: 'samples' }
    api.samples.mockResolvedValue({ items: [
      { id: 'mixed', labWorkOrderId: 'work', customerSampleId: 'Mixed sample', accessionNumber: 'ACC-MIXED', organizationName: 'Customer', jobReference: 'JOB-1', intakeDisposition: 'Accepted', useStatus: 'Used', tubes: [
        { id: 'used', barcode: 'USED-TUBE', intakeDisposition: 'Accepted', status: 'Consumed', useStatus: 'Used', location: 'FB-1' },
        { id: 'reserve', barcode: 'RESERVE-TUBE', intakeDisposition: 'Accepted', status: 'Available', useStatus: 'NotUsed', location: 'FB-2' },
      ] },
      { id: 'historical', labWorkOrderId: 'work', customerSampleId: 'Historical sample', accessionNumber: 'ACC-HISTORY', organizationName: 'Customer', jobReference: 'JOB-1', intakeDisposition: 'Accepted', useStatus: 'Used', tubes: [
        { id: 'unknown', barcode: 'UNKNOWN-TUBE', intakeDisposition: 'Accepted', status: 'Available', useStatus: 'Unknown', location: 'FB-3' },
      ] },
    ], page: 1, pageSize: 20, totalCount: 2 })
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled tab="accession" workOrders={[]} /></QueryClientProvider>)
    expect(await screen.findByText('1 of 2 tubes used')).toBeTruthy()
    expect(screen.getByText('Historical source not recorded')).toBeTruthy()
    fireEvent.click(screen.getByText('2 recorded tubes'))
    expect(screen.getByText('Used · Material exhausted')).toBeTruthy()
    expect(screen.getByText('Not used', { selector: 'p' })).toBeTruthy()
    fireEvent.click(screen.getByText('1 recorded tube'))
    expect(screen.getByText('Use unknown')).toBeTruthy()
  })

  it('records container receipt only in Receive shipments, then opens separate tube accession', async () => {
    api.receive.mockResolvedValue({ shipmentId: 'shipment-1', shipmentNumber: 'SHIP-1', barcode: 'PH-P-23456789AB-C', receivedAt: '2026-09-10T18:00:00Z', alreadyReceived: false })
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="receiving" workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Receive shipments' }).getAttribute('aria-selected')).toBe('true')
    expect(api.receive).not.toHaveBeenCalled()
    const input = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(input, { target: { value: 'PH-P-23456789AB-C' } })
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByText(/Shipment received.*SHIP-1/)).toBeTruthy()
    expect(api.receive).toHaveBeenCalledTimes(1)
    expect(api.tube).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Accession samples' }))
    expect(await screen.findByRole('dialog', { name: 'Accession tubes in SHIP-1' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Accession samples', hidden: true }).getAttribute('aria-selected')).toBe('true')
    expect(api.receive).toHaveBeenCalledTimes(1)
  })

  it('lists separate expected containers and tracking numbers for the same Job', async () => {
    api.queue.mockResolvedValue([
      { id: 'one', shipmentNumber: 'SHIP-ONE', organizationName: 'Customer', authorizationReference: 'JOB-1', labWorkOrderId: 'work-1', destinationName: 'Lab', status: 'Shipped', carrier: 'Carrier', trackingNumber: 'TRACK-ONE', expectedTubeCount: 10 },
      { id: 'two', shipmentNumber: 'SHIP-TWO', organizationName: 'Customer', authorizationReference: 'JOB-1', labWorkOrderId: 'work-1', destinationName: 'Lab', status: 'Shipped', carrier: 'Carrier', trackingNumber: 'TRACK-TWO', expectedTubeCount: 5 },
    ])
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled tab="receiving" workOrders={[]} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('radio', { name: 'Expected shipments' }))
    expect(await screen.findByText('TRACK-ONE')).toBeTruthy()
    expect(screen.getByText('TRACK-TWO')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'SHIP-ONE' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'SHIP-TWO' })).toBeTruthy()
    expect(api.receive).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Receive shipment' })).toBeNull()
  })

  it('retains the receipt scan draft across receiving views and includes completed containers in history without recording arrival', async () => {
    api.history.mockResolvedValue({ items: [{ id: 'complete', shipmentNumber: 'SHIP-COMPLETE', organizationName: 'Customer', authorizationReference: 'JOB-1', labWorkOrderId: 'work-1', destinationName: 'Lab', status: 'Received', carrier: 'Carrier', trackingNumber: 'TRACK-COMPLETE', containerReceivedAt: '2026-10-02T12:00:00Z', expectedTubeCount: 5, accessionedTubeCount: 5 }], page: 1, pageSize: 20, totalCount: 1 })
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="receiving" workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('radio', { name: 'Receive a shipment' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.change(screen.getByLabelText('Shipping insert barcode'), { target: { value: 'PH-P-UNFINISHED' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Shipments received' }))
    expect(await screen.findByRole('link', { name: 'SHIP-COMPLETE' })).toBeTruthy()
    expect(screen.getByText('5 of 5 accessioned')).toBeTruthy()
    expect(api.history).toHaveBeenCalledWith('', 1)
    expect(screen.queryByLabelText('Shipping insert barcode')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Expected shipments' }))
    await waitFor(() => expect(api.queue).toHaveBeenCalledWith(false))
    fireEvent.click(screen.getByRole('radio', { name: 'Receive a shipment' }))
    expect(screen.getByLabelText('Shipping insert barcode')).toHaveProperty('value', 'PH-P-UNFINISHED')
    expect(api.receive).not.toHaveBeenCalled()
    expect(api.packet).not.toHaveBeenCalled()
    expect(api.accession).not.toHaveBeenCalled()
  })

  it('paginates history on the server, resets search to page one and retains filters across view switches', async () => {
    route.search = { receiptView: 'received', shipmentHistoryPage: 2, requestSearch: 'KEEP' }
    const historyItem = { id: 'history-1', shipmentNumber: 'SHIP-HISTORY', organizationName: 'Customer', authorizationReference: 'JOB-1', labWorkOrderId: 'work-1', destinationName: 'Lab', status: 'Received', expectedTubeCount: 1, accessionedTubeCount: 1, containerReceivedAt: '2026-10-02T12:00:00Z' }
    api.history.mockImplementation((search, page) => Promise.resolve({ items: search ? [] : [historyItem], page, pageSize: 20, totalCount: search ? 0 : 45 }))
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="receiving" workOrders={[]} /></QueryClientProvider>)
    expect(await screen.findByText('45 shipments · Page 2 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }))
    await waitFor(() => expect(api.history).toHaveBeenCalledWith('', 3))
    expect(await screen.findByText('45 shipments · Page 3 of 3')).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Next$/ })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search received shipments' }), { target: { value: 'NO-MATCH' } })
    expect(route.search).toMatchObject({ shipmentHistoryPage: 1, shipmentHistorySearch: 'NO-MATCH', requestSearch: 'KEEP' })
    expect(await screen.findByText('No shipments match your search.')).toBeTruthy()
    expect(api.history).toHaveBeenCalledWith('NO-MATCH', 1)
    fireEvent.click(screen.getByRole('radio', { name: 'Expected shipments' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Shipments received' }))
    expect(screen.getByRole('searchbox', { name: 'Search received shipments' })).toHaveProperty('value', 'NO-MATCH')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(screen.getByText('45 shipments · Page 1 of 3')).toBeTruthy())
    expect(api.receive).not.toHaveBeenCalled()
    expect(api.accession).not.toHaveBeenCalled()
  })

  it.each([false, true])('loads box placement only if accession remains open (%s)', async dismissDuringLoad => {
    let resolveWork!: (value: unknown) => void
    api.work.mockImplementationOnce(() => new Promise(resolve => { resolveWork = resolve }))
    const packet = await api.packet()
    packet.crosswalk = [{ shipmentItemId: 'item-1', supplierTubeBarcode: 'TUBE-1', customerSampleId: 'SAMPLE-1' }]
    api.packet.mockResolvedValue(packet)
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: packet.barcode } })
    fireEvent.submit(scanner.closest('form')!)
    const loading = await screen.findByRole('dialog', { name: 'Accession tubes in SHIP-1' })
    expect(within(loading).getByText('Loading shipment details…')).toBeTruthy()
    expect(screen.queryByLabelText(/Freezer box barcode/)).toBeNull()
    if (dismissDuringLoad) fireEvent.click(within(loading).getAllByRole('button', { name: 'Close' })[0])
    await act(async () => resolveWork({ containers: [], workOrder: { version: 1, status: 'Received' } }))
    if (dismissDuringLoad) await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    else {
      const box = await screen.findByLabelText(/Freezer box barcode/)
      await waitFor(() => expect(document.activeElement).toBe(box))
    }
    expect(api.tube).not.toHaveBeenCalled()
    expect(api.accession).not.toHaveBeenCalled()
  })

  it('shows one task at a time and preserves an accession scan draft across tabs', async () => {
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled tab="accession" workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Accession samples' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByLabelText('Shipping insert barcode').closest('[data-slot="card-header"]')?.textContent).toContain('Received containers awaiting accession')
    expect(screen.getByRole('button', { name: 'Open container' })).toBeTruthy()
    expect(screen.queryByText('Open a received container')).toBeNull()
    fireEvent.change(screen.getByLabelText('Shipping insert barcode'), { target: { value: 'UNFINISHED-SCAN' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Receive shipments' }), { button: 0, ctrlKey: false })
    expect(screen.getByRole('tab', { name: 'Receive shipments' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByLabelText('Shipping insert barcode')).toBeNull()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Accession samples' }), { button: 0, ctrlKey: false })
    expect(screen.getByLabelText('Shipping insert barcode')).toHaveProperty('value', 'UNFINISHED-SCAN')
    expect(api.packet).not.toHaveBeenCalled()
    expect(api.tube).not.toHaveBeenCalled()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })

  it('shows one kit queue at a time in the separate requests section', () => {
    const client = new QueryClient()
    const view = render(<QueryClientProvider client={client}><LabKitRequestQueues apiEnabled /></QueryClientProvider>)
    expect(screen.getByRole('radio', { name: 'Kit requests' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByText('Return-kit queue')).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Prepare kits' })).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Fulfilled requests' }))
    view.rerender(<QueryClientProvider client={client}><LabKitRequestQueues apiEnabled /></QueryClientProvider>)
    expect(screen.getByText('Return-kit queue')).toBeTruthy()
    expect(screen.queryByText('Kit-request queue')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Kit requests' }))
    view.rerender(<QueryClientProvider client={client}><LabKitRequestQueues apiEnabled /></QueryClientProvider>)
    expect(screen.getByText('Kit-request queue')).toBeTruthy()
    expect(screen.queryByText('Return-kit queue')).toBeNull()
    expect(route.search).toMatchObject({ section: 'kit-requests', kitQueue: 'requests' })
  })

  it('keeps receiving and accession keyboard navigation without kit task tabs', async () => {
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Receive shipments' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('tab', { name: 'Kit requests' })).toBeNull()
    const accession = screen.getByRole('tab', { name: 'Accession samples' })
    fireEvent.mouseDown(accession, { button: 0, ctrlKey: false })
    act(() => accession.focus())
    fireEvent.keyDown(accession, { key: 'ArrowLeft' })
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Receive shipments' }).getAttribute('aria-selected')).toBe('true'))
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })

  it('selects the sent-kit queue for a shipment link while preserving request filters', () => {
    route.search = { requestSearch: 'JOB-1', requestPage: 2 }
    render(<QueryClientProvider client={new QueryClient()}><LabKitRequestQueues apiEnabled shipmentId="shipment-1" /></QueryClientProvider>)
    expect(screen.getByRole('radio', { name: 'Fulfilled requests' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByText('Kit-request queue')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Kit requests' }))
    expect(route.search).toMatchObject({ kitQueue: 'requests', requestSearch: 'JOB-1', requestPage: 2 })
  })

  it('opens explicitly selected shipment-specific receipt in Receive shipments', () => {
    route.search = { shipmentId: 'shipment-1', receiptTab: 'receiving' }
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled tab="receiving" workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Receive shipments' }).getAttribute('aria-selected')).toBe('true')
  })

  it('records a broken expected tube without storage, then scans an acceptable tube once into its box', async () => {
    const packet = await api.packet()
    packet.crosswalk = ['TUBE-1', 'TUBE-2', 'TUBE-3'].map((barcode, index) => ({ shipmentItemId: 'item-1', tubeSlotId: `slot-${index}`, supplierTubeBarcode: barcode, customerSampleId: 'SAMPLE-1', sampleName: 'Sample', tubeStatus: 'Assigned', tubeOrdinal: index + 1, tubeCount: 3 }))
    api.packet.mockResolvedValue(packet)
    api.tube.mockImplementation((_packet, barcode) => Promise.resolve({ isExpected: true, isAccessioned: false, supplierTubeBarcode: barcode, customerSampleId: 'SAMPLE-1' }))
    const rejected = { barcode: 'TUBE-1', location: null, status: 'Rejected', intakeDisposition: 'Rejected' }
    api.accession.mockImplementation(() => {
      const work = { workOrder: { version: 2, status: 'Received' }, containers: [rejected] }
      api.work.mockResolvedValue(work)
      return Promise.resolve(work)
    })
    api.batch.mockImplementation(() => {
      const work = { workOrder: { version: 3, status: 'Received' }, containers: [rejected, { barcode: 'TUBE-2', location: 'BOX-2', status: 'Available', intakeDisposition: 'Accepted' }] }
      api.work.mockResolvedValue(work)
      return Promise.resolve(work)
    })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: packet.barcode } }); fireEvent.submit(scanner.closest('form')!)
    await screen.findByRole('dialog', { name: 'Accession tubes in SHIP-1' })
    const exception = await screen.findByRole('button', { name: 'Record exception for TUBE-1' })
    await waitFor(() => expect(exception).not.toHaveProperty('disabled', true))
    fireEvent.click(exception)
    const reason = await screen.findByLabelText(/Intake reason/)
    await screen.findByRole('option', { name: 'Damaged container' })
    fireEvent.change(reason, { target: { value: 'damaged_container' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I have identified/ }))
    fireEvent.submit(reason.closest('form')!)
    await waitFor(() => expect(api.accession).toHaveBeenCalledWith('work-1', 'shipment-1', expect.objectContaining({ supplierTubeBarcode: 'TUBE-1', freezerBoxBarcode: null, intakeDisposition: 'Rejected', intakeReasonCode: 'damaged_container' })))
    expect(await screen.findByText('Not stored')).toBeTruthy()
    expect(screen.getByText('1 with exceptions | 0 to be accepted')).toBeTruthy()
    const box = await screen.findByLabelText(/Freezer box barcode/)
    fireEvent.submit(box.closest('form')!)
    expect(await screen.findByText('Scan the freezer box barcode.')).toBeTruthy()
    expect(api.batch).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: 'BOX-2' } })
    fireEvent.submit(box.closest('form')!)
    const placement = await screen.findByLabelText(/Supplier tube barcode/)
    fireEvent.change(placement, { target: { value: 'TUBE-2' } })
    fireEvent.submit(placement.closest('form')!)
    const finish = screen.getByRole('button', { name: 'Review and finish box' })
    await waitFor(() => expect(finish).toHaveProperty('disabled', false))
    expect(screen.getByText('1 with exceptions | 1 to be accepted')).toBeTruthy()
    expect(api.tube).toHaveBeenCalledTimes(1)
    fireEvent.click(finish)
    fireEvent.click(screen.getByRole('checkbox', { name: /I inspected all 1 tube/ }))
    fireEvent.submit(screen.getByRole('checkbox', { name: /I inspected all 1 tube/ }).closest('form')!)
    await waitFor(() => expect(api.batch).toHaveBeenCalledTimes(1))
    expect(api.batch).toHaveBeenCalledWith('work-1', 'shipment-1', { requestId: expect.any(String), packetBarcode: packet.barcode, workOrderVersion: 2, inspectionConfirmed: true, tubes: [{ supplierTubeBarcode: 'TUBE-2', freezerBoxBarcode: 'BOX-2' }] })
    expect(await screen.findByText('2 of 3 expected tubes have an intake decision')).toBeTruthy()
    expect(screen.getByText('Not stored')).toBeTruthy()
    expect(screen.getByText('BOX-2')).toBeTruthy()
    expect(screen.getByText('1 with exceptions | 0 to be accepted')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Review and finish box' })).toHaveProperty('disabled', true)
    expect(api.receive).not.toHaveBeenCalled()
  })

  it('keeps an unexpected tube out of the open box group', async () => {
    const packet = await api.packet()
    packet.crosswalk = [{ shipmentItemId: 'item-1', supplierTubeBarcode: 'TUBE-1', customerSampleId: 'SAMPLE-1' }]
    api.packet.mockResolvedValue(packet)
    api.tube.mockResolvedValue({ isExpected: false, isAccessioned: false, supplierTubeBarcode: 'WRONG' })
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: 'PH-P-23456789AB-C' } })
    fireEvent.submit(scanner.closest('form')!)
    const box = await screen.findByLabelText(/Freezer box barcode/)
    expect(screen.queryByLabelText(/Supplier tube barcode/)).toBeNull()
    fireEvent.change(box, { target: { value: 'BOX-1' } }); fireEvent.submit(box.closest('form')!)
    const tube = await screen.findByLabelText(/Supplier tube barcode/)
    await waitFor(() => expect(api.work).toHaveBeenCalled())
    fireEvent.change(tube, { target: { value: 'WRONG' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Scan and place tube' })).not.toHaveProperty('disabled', true))
    fireEvent.submit(tube.closest('form')!)
    expect(await screen.findByText(/not an expected, undecided tube/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Review and finish box' })).toHaveProperty('disabled', true)
    expect(api.batch).not.toHaveBeenCalled()
    expect(api.accession).not.toHaveBeenCalled()
  })

  it('guards unsaved placed tubes before closing the unified accession dialog', async () => {
    const packet = await api.packet()
    packet.crosswalk = [{ shipmentItemId: 'item-1', tubeSlotId: 'slot-1', supplierTubeBarcode: 'TUBE-1', customerSampleId: 'SAMPLE-1', sampleName: 'Sample' }]
    api.packet.mockResolvedValue(packet)
    api.tube.mockResolvedValue({ isExpected: true, isAccessioned: false, supplierTubeBarcode: 'TUBE-1' })
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: packet.barcode } }); fireEvent.submit(scanner.closest('form')!)
    const box = await screen.findByLabelText(/Freezer box barcode/)
    fireEvent.change(box, { target: { value: 'UNSAVED-BOX' } })
    fireEvent.submit(box.closest('form')!)
    const tube = await screen.findByLabelText(/Supplier tube barcode/)
    fireEvent.change(tube, { target: { value: 'TUBE-1' } }); fireEvent.submit(tube.closest('form')!)
    await screen.findByText('Placement pending confirmation')
    fireEvent.click(screen.getByRole('button', { name: /^Close — continue later$/ }))
    expect(await screen.findByRole('dialog', { name: 'Discard unsaved box placement?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep reviewing' }))
    expect(screen.getByLabelText(/Rescan freezer box barcode/)).toHaveProperty('value', '')
    expect(screen.getByText('UNSAVED-BOX (pending)')).toBeTruthy()
    expect(api.batch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^Close — continue later$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => expect(screen.queryByLabelText(/Freezer box barcode/)).toBeNull())
    expect(screen.queryByRole('dialog', { name: 'Accession tubes in SHIP-1' })).toBeNull()
    expect(api.accession).not.toHaveBeenCalled()
  })

  it.each(['PH-O-11111111111141118111111111111111', 'PH-M-22222222222242228222222222222222'])('resolves %s to a manifest before comparing registered tubes', async barcode => {
    api.identity.mockResolvedValue({ kind: barcode.startsWith('PH-O') ? 'Order' : 'Sample', id: 'identity', reference: 'REFERENCE-1', shipments: [{ id: 'shipment-1', shipmentNumber: 'SHIP-1', organizationName: 'Example Customer', destinationName: 'Lab', status: 'ReadyToShip', currentPacket: { barcode: 'PH-P-23456789AB-C', packetNumber: 'PACKET-1' } }] })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><LabReceiptAccessionPanel apiEnabled tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: barcode } }); fireEvent.submit(scanner.closest('form')!)
    fireEvent.click(await screen.findByRole('button', { name: 'Open manifest PACKET-1' }))
    expect(await screen.findByRole('dialog', { name: 'Accession tubes in SHIP-1' })).toBeTruthy()
    expect(api.identity).toHaveBeenCalledWith(barcode, expect.anything())
    expect(api.packet).toHaveBeenCalledWith('PH-P-23456789AB-C', expect.anything())
    expect(api.tube).not.toHaveBeenCalled()
  })
})
