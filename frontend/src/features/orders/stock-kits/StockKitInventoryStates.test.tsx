import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { standardKit } from '#/test-helpers/shipping-containers'
import { StockKitFacts } from './StockKitFacts'
import { StockKitBarcodeDialog } from './StockKitBarcodeDialog'
import { parseStockKitListSearch, stockKitState, stockKitStatus } from './stock-kit-utils'

vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to, params }: { children: ReactNode; to: string; params?: Record<string, string> }) => <a href={Object.entries(params ?? {}).reduce((path, [key, value]) => path.replace(`$${key}`, value), to)}>{children}</a> }))
describe('staff location inventory and physical identity', () => {
  it('distinguishes complete Phaeno stock from unfinished preparation', () => {
    expect(stockKitState(standardKit)).toBe('Preparing')
    expect(stockKitStatus(stockKitState({ ...standardKit, container: { ...standardKit.container, capacity: 1 }, tubes: [{ id: 'one', supplierBarcode: 'TUBE-001' }] }))).toBe('Ready at Phaeno')
  })
  it.each([['OnTheWay', 'On the way'], ['Available', 'Available'], ['Assigned', 'Assigned'], ['InUse', 'In use'], ['NeedsReview', 'Needs review']] as const)('preserves the authoritative %s state', (status, label) => {
    expect(stockKitStatus(stockKitState({ ...standardKit, status }))).toBe(label)
    expect(parseStockKitListSearch({ kitStatus: status }).kitStatus).toBe(status)
  })
  it('keeps origin provenance distinct from the assigned Job and receipt', () => {
    render(<StockKitFacts kit={{ ...standardKit, status: 'Assigned', deliveryLocationId: 'location-a', deliveryLocationLabel: 'Main laboratory', originatingJobNumber: 'JOB-A', transportationKitRequestId: 'request-a', customerReceivedAt: '2026-09-09T12:00:00Z', assignedJobId: 'job-b', assignedJobNumber: 'JOB-B', reservedSampleShipmentId: 'shipment-b', organizationName: 'Example Customer', departmentName: 'Research' }} />)
    expect(screen.getByText('Main laboratory')).toBeTruthy(); expect(screen.getByText('JOB-A')).toBeTruthy(); expect(screen.getByRole('link', { name: 'JOB-B' }).getAttribute('href')).toBe('/order-operations/lab/job-b')
    expect(screen.getByRole('link', { name: 'Request REQUEST-' }).getAttribute('href')).toBe('/lab-operations/kit-requests/request-a')
    expect(screen.queryByText('Not acknowledged')).toBeNull(); expect(screen.getByText(/Resetting its configuration before tube scanning releases/)).toBeTruthy()
  })
  it('shows received unused location stock as unassigned even when an originating Job exists', () => {
    render(<StockKitFacts kit={{ ...standardKit, status: 'Available', deliveryLocationId: 'location-a', deliveryLocationLabel: 'Main laboratory', originatingJobNumber: 'CANCELLED-JOB', customerReceivedAt: '2026-09-09T12:00:00Z' }} />)
    expect(screen.getByText('Not assigned')).toBeTruthy(); expect(screen.getByText(/eligible Job at this location can use this container/)).toBeTruthy(); expect(screen.queryByRole('link', { name: 'Open assigned shipment' })).toBeNull()
  })
  it('prints the existing permanent kit identity without changing or assigning stock', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {}), close = vi.fn()
    render(<StockKitBarcodeDialog kit={standardKit} onClose={close} />)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('img', { name: `Container barcode ${standardKit.kitNumber}` })).toBeTruthy()
    expect(within(dialog).getByText(standardKit.kitNumber)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Print barcode' })); expect(print).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByText(standardKit.kitNumber)).toBeTruthy(); print.mockRestore()
  })
})
