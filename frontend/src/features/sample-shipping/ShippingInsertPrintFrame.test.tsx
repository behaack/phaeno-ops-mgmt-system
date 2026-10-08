import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ShippingInsertPrintFrame } from './ShippingInsertPrintFrame'
import type { ShippingInsertIdentity } from './shipping-insert-acknowledgement'

vi.mock('./SampleShippingPacketPage', () => ({
  SampleShippingPacketPage: ({ onAutoPrint }: { onAutoPrint: (insert: ShippingInsertIdentity) => void }) => <article className="shipping-packet" data-packet-id="verified-insert" data-packet-revision="2"><button onClick={() => onAutoPrint({ id: 'verified-insert', revision: 2, packetNumber: 'SP-2' })}>Prepare verified print</button></article>,
}))

describe('ShippingInsertPrintFrame', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns the validated insert identity after the native dialog closes without claiming physical printing', async () => {
    const finished = vi.fn()
    const failure = vi.fn()
    render(<ShippingInsertPrintFrame shipmentId="shipment-1" onFinished={finished} onFailure={failure} />)
    const frame = screen.getByTitle('Shipping insert print document') as HTMLIFrameElement
    const target = frame.contentWindow!
    const print = vi.spyOn(target, 'print').mockImplementation(() => undefined)
    vi.spyOn(target, 'focus').mockImplementation(() => undefined)
    fireEvent.load(frame)
    fireEvent.click(await within(frame.contentDocument!.body).findByRole('button', { name: 'Prepare verified print' }))
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
    expect(finished).not.toHaveBeenCalled()
    target.dispatchEvent(new Event('afterprint'))
    expect(finished).toHaveBeenCalledWith({ id: 'verified-insert', revision: 2, packetNumber: 'SP-2' })
    target.dispatchEvent(new Event('afterprint'))
    expect(finished).toHaveBeenCalledOnce()
    expect(failure).not.toHaveBeenCalled()
  })

  it('refuses to print if the rendered insert changes while its formatting is being prepared', async () => {
    const finished = vi.fn()
    const failure = vi.fn()
    render(<ShippingInsertPrintFrame shipmentId="shipment-1" onFinished={finished} onFailure={failure} />)
    const frame = screen.getByTitle('Shipping insert print document') as HTMLIFrameElement
    const print = vi.spyOn(frame.contentWindow!, 'print').mockImplementation(() => undefined)
    fireEvent.load(frame)
    fireEvent.click(await within(frame.contentDocument!.body).findByRole('button', { name: 'Prepare verified print' }))
    frame.contentDocument!.querySelector<HTMLElement>('.shipping-packet')!.dataset.packetRevision = '3'
    await waitFor(() => expect(failure).toHaveBeenCalledWith(expect.stringContaining('changed while it was being prepared')))
    expect(print).not.toHaveBeenCalled()
    expect(finished).not.toHaveBeenCalled()
  })
})
