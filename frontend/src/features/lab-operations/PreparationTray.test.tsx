import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PreparationDetail, PreparationMember } from '#/api/lab-preparation'
import { PreparationTray } from './PreparationTray'

vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }))
const tube = (position: string, barcode: string) => ({ id: position, position, barcode, state: 'Planned' }) as PreparationMember
const batch = (overrides: Partial<PreparationDetail> = {}): PreparationDetail => ({
  id: 'batch', trayBarcode: 'TRAY-001', name: 'PSeq-20260917-001329', status: 'Draft', version: 1, startedAtUtc: null, completedAtUtc: null,
  layout: { name: 'Test 2 × 3', rows: 2, columns: 3, labels: 'grid', unavailable: ['A2', 'B3'] },
  labServiceWorkflowVersionId: 'workflow', members: [tube('A3', 'EXISTING')], stages: [], records: [], canOperate: true, canCorrect: true, roles: ['Operator'], ...overrides,
})
function submit(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
  fireEvent.submit(input.closest('form')!)
}
function TestTray(props: Omit<ComponentProps<typeof PreparationTray>, 'onTrayScan'> & { onTrayScan?: ComponentProps<typeof PreparationTray>['onTrayScan'] }) {
  return <PreparationTray {...props} onTrayScan={props.onTrayScan ?? (async barcode => ({ ...props.batch, trayBarcode: barcode }))} />
}
beforeEach(() => vi.clearAllMocks())

describe('inline tray scanning', () => {
  it('retains a failed tube in its original occupied position for inspection', () => {
    render(<TestTray batch={batch({ status: 'InProgress', members: [{ ...tube('A3', 'FAILED-TUBE'), state: 'Failed' }] })} pending={false} onScan={vi.fn()}>{id => <p>Failure details for {id}</p>}</TestTray>)
    fireEvent.click(screen.getByRole('button', { name: 'Tray (1 tube)' }))
    expect(screen.getByText(/0 active · 1 failed/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'View A3, tube FAILED-TUBE, Failed' }))
    expect(screen.getByText('Failure details for A3')).toBeTruthy()
    expect(screen.queryByLabelText(/Tube barcode for A3/)).toBeNull()
  })

  it('keeps a confirmed draft locked on reload while retaining tube inspection', () => {
    render(<TestTray batch={batch({ trayConfirmed: true })} pending={false} onScan={vi.fn()} onConfirmTray={vi.fn()}>{id => <p>Details for {id}</p>}</TestTray>)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Confirm tray' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View A3, tube EXISTING' }))
    expect(screen.getByText('Details for A3')).toBeTruthy()
  })

  it('uses the saved identity and blocks assembly confirmation while tube entries are unsaved', async () => {
    const onConfirm = vi.fn()
    render(<TestTray batch={batch()} pending={false} onScan={vi.fn()} onConfirmTray={onConfirm} />)
    fireEvent.change(screen.getByLabelText(/Tube barcode for A1/), { target: { value: 'UNSAVED' } })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    const disabledConfirm = await screen.findByRole('menuitem', { name: 'Confirm tray' })
    expect(disabledConfirm.getAttribute('aria-disabled')).toBe('true')
    fireEvent.keyDown(disabledConfirm, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menuitem')).toBeNull())
    fireEvent.change(screen.getByLabelText(/Tube barcode for A1/), { target: { value: '' } })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Confirm tray' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
  it('restores a saved tray on remount without rescanning or writing another assignment', async () => {
    const save = vi.fn()
    const props = { batch: batch(), pending: false, onScan: vi.fn(), onTrayScan: save, onConfirmTray: vi.fn() }
    const { unmount } = render(<TestTray {...props} />)
    expect(screen.getByLabelText('Physical tray barcode')).toHaveProperty('value', 'TRAY-001')
    expect(screen.getByLabelText('Physical tray barcode')).toHaveProperty('readOnly', true)
    expect(screen.getByLabelText(/Tube barcode for A1/)).toHaveProperty('disabled', false)
    expect(screen.queryByRole('button', { name: 'Verify tray' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Change tray' })).toBeNull()
    unmount()
    render(<TestTray {...props} />)
    expect(screen.getByLabelText(/Tube barcode for A1/)).toHaveProperty('disabled', false)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    expect((await screen.findByRole('menuitem', { name: 'Confirm tray' })).getAttribute('aria-disabled')).not.toBe('true')
    expect(save).not.toHaveBeenCalled()
  })
  it('waits for acknowledged saving, rejects duplicate submissions and skips filled/unavailable cells', async () => {
    let resolve!: () => void
    const saved = new Promise<void>(done => { resolve = done })
    const scan = vi.fn(async () => { await saved })
    function Harness() {
      const [data, setData] = useState(batch())
      return <TestTray batch={data} pending={false} onScan={async (position, barcode) => {
        await scan()
        const updated = { ...data, version: data.version + 1, members: [...data.members, tube(position, barcode)] }
        setData(updated)
        return updated
      }} />
    }
    render(<Harness />)
    const input = screen.getByLabelText(/Tube barcode for A1/)
    input.focus()
    submit(input, 'TUBE-1')
    fireEvent.submit(input.closest('form')!)
    expect(scan).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(input)
    expect(input).toHaveProperty('readOnly', true)
    await act(async () => resolve())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Tube barcode for B1/)))
    expect(screen.queryByLabelText(/Tube barcode for A1/)).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('A1 saved')
  })

  it('preserves a rejected scan and focus, then prevents a duplicate tube from being submitted', async () => {
    const scan = vi.fn().mockRejectedValue(new Error('Rejected'))
    render(<TestTray batch={batch()} pending={false} onScan={scan} />)
    const input = screen.getByLabelText(/Tube barcode for A1/)
    submit(input, 'UNKNOWN')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(input).toHaveProperty('value', 'UNKNOWN')
    expect(document.activeElement).toBe(input)
    submit(input, 'EXISTING')
    expect(screen.getByRole('alert').textContent).toContain('already in the tray')
    expect(scan).toHaveBeenCalledTimes(1)
  })

  it('announces a full tray without starting preparation', async () => {
    const data = batch({ members: [tube('A3', 'EXISTING'), tube('B1', 'B1'), tube('B2', 'B2')] })
    const scan = vi.fn(async (position: string, barcode: string) => ({ ...data, members: [...data.members, tube(position, barcode)] }))
    render(<TestTray batch={data} pending={false} onScan={scan} />)
    submit(screen.getByLabelText(/Tube barcode for A1/), 'LAST')
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('All available positions are filled'))
    expect(document.activeElement).toBe(screen.getByRole('status'))
    expect(scan).toHaveBeenCalledWith('A1', 'LAST')
  })

  it('shows no scan controls when the batch is running or the operator has read-only access', () => {
    const { rerender } = render(<TestTray batch={batch({ status: 'InProgress' })} pending={false} onScan={vi.fn()} />)
    expect(screen.queryByRole('region', { name: 'Tray positions' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tray (1 tube)' }))
    expect(screen.getByRole('region', { name: 'Tray positions' })).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
    rerender(<TestTray batch={batch({ canOperate: false })} pending={false} onScan={vi.fn()} />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('previews the assigned physical tray label separately from the batch identity', () => {
    render(<TestTray batch={batch()} pending={false} onScan={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Print tray label' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Physical tray barcode TRAY-001' })).toBeTruthy()
    expect(screen.getByText('TRAY-001')).toBeTruthy()
  })
  it('shows only the selected tube details and omits repetitive Planned cell labels', () => {
    render(<TestTray batch={batch({ members: [tube('A1', 'ONE'), tube('A3', 'THREE')] })} pending={false} onScan={vi.fn()}>{id => <p>Details for {id}</p>}</TestTray>)
    expect(screen.queryByText('Planned')).toBeNull()
    expect(screen.queryByText('Details for A1')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View A1, tube ONE' }))
    expect(screen.getByText('Details for A1')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'View A3, tube THREE' }))
    expect(screen.queryByText('Details for A1')).toBeNull()
    expect(screen.getByText('Details for A3')).toBeTruthy()
  })

  it('keeps tube entry locked until a new physical tray assignment is acknowledged', async () => {
    let resolve!: (value: PreparationDetail) => void
    const assigned = new Promise<PreparationDetail>(done => { resolve = done })
    const save = vi.fn<(barcode: string) => Promise<PreparationDetail>>().mockReturnValue(assigned)
    function Harness() {
      const [data, setData] = useState(batch({ trayBarcode: null, members: [] }))
      return <TestTray batch={data} pending={false} onScan={vi.fn()} onTrayScan={async barcode => { const updated = await save(barcode); setData(updated); return updated }} />
    }
    render(<Harness />)
    submit(screen.getByLabelText(/Scan physical tray barcode/), 'TRAY-001')
    expect(screen.getByLabelText(/Tube barcode for A1/)).toHaveProperty('disabled', true)
    expect(save).toHaveBeenCalledWith('TRAY-001')
    await act(async () => resolve(batch({ trayBarcode: 'TRAY-001', members: [] })))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Tube barcode for A1/)))
  })

  it('retains the saved empty tray after a failed change and explicit cancellation', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Tray already assigned'))
    render(<TestTray batch={batch({ members: [] })} pending={false} onScan={vi.fn()} onTrayScan={save} />)
    fireEvent.click(screen.getByRole('button', { name: 'Change tray' }))
    expect(screen.getByLabelText(/Tube barcode for A1/)).toHaveProperty('disabled', true)
    submit(screen.getByLabelText(/Scan physical tray barcode/), 'REPLACEMENT')
    await screen.findByRole('alert')
    expect(screen.getByLabelText(/Scan physical tray barcode/)).toHaveProperty('value', 'REPLACEMENT')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Physical tray barcode')).toHaveProperty('value', 'TRAY-001')
    expect(screen.getByLabelText(/Tube barcode for A1/)).toHaveProperty('disabled', false)
    expect(save).toHaveBeenCalledTimes(1)
  })

})
