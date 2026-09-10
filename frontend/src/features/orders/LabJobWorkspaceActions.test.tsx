import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ShipmentHeaderAction } from '#/features/sample-shipping/SampleShippingDetailPage'
import { LabJobWorkspaceActions } from './LabJobWorkspaceActions'

const command = (label: string, onSelect = vi.fn(), disabled = false): ShipmentHeaderAction => ({ kind: 'command', label, onSelect, disabled })

describe('Lab Job workspace actions', () => {
  it('does not invent commands and keeps a single eligible action directly available', () => {
    const triggerRef = createRef<HTMLButtonElement>()
    const onSelect = vi.fn()
    const rendered = render(<LabJobWorkspaceActions orderActions={[]} triggerRef={triggerRef} />)
    expect(screen.queryByRole('button')).toBeNull()
    rendered.rerender(<LabJobWorkspaceActions orderActions={[]} shipmentActions={[command('Print shipping insert', onSelect)]} triggerRef={triggerRef} />)
    expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Print shipping insert' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(triggerRef.current).toBe(screen.getByRole('button', { name: 'Print shipping insert' }))
  })

  it('groups multiple eligible commands and preserves disabled state without executing it', async () => {
    const print = vi.fn()
    const cancel = vi.fn()
    render(<LabJobWorkspaceActions orderActions={[command('Request cancellation', cancel, true)]} shipmentActions={[command('Print shipping insert', print)]} shipmentLabel="SHIP-2" triggerRef={createRef<HTMLButtonElement>()} />)
    expect(screen.queryByRole('button', { name: 'Print shipping insert' })).toBeNull()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Print shipping insert' })).toBeTruthy()
    expect(screen.getByText('Selected shipment · SHIP-2')).toBeTruthy()
    expect(screen.getByText('This order')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Request cancellation' }).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Request cancellation' }))
    expect(cancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Print shipping insert' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('keeps read-only print and download commands without offering shipment mutations', async () => {
    render(<LabJobWorkspaceActions orderActions={[]} shipmentActions={[command('Print shipping insert'), command('Download tube list (CSV)')]} triggerRef={createRef<HTMLButtonElement>()} />)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Print shipping insert' })).toBeTruthy()
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    expect(screen.queryByRole('menuitem', { name: 'Record shipment' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Request cancellation' })).toBeNull()
  })
})
