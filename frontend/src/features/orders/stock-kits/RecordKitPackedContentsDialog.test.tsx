import { AssembleTransportationKitDialog } from './AssembleTransportationKitDialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KitAssemblyRun } from '#/api/lab-kit-assembly'
import type { LabMaterialLot } from '#/api/lab-operations'
import type { ShippingStockKit } from '#/api/shipping-containers'
import { standardKit } from '#/test-helpers/shipping-containers'
import { RecordKitPackedContentsDialog } from './RecordKitPackedContentsDialog'
import { useKitAssemblyRun } from './use-kit-assembly-run'

const mocks = vi.hoisted(() => ({ read: vi.fn(), record: vi.fn(), inventory: vi.fn(), saved: vi.fn(), print: vi.fn(), stock: vi.fn() }))
vi.mock('#/api/lab-kit-assembly', async original => ({ ...await original<typeof import('#/api/lab-kit-assembly')>(), getKitAssemblyRun: mocks.read, saveKitAssemblySession: mocks.record, requestKitAssemblyLabelPrint: mocks.print }))
vi.mock('#/api/shipping-containers', async original => ({ ...await original<typeof import('#/api/shipping-containers')>(), getShippingStockKit: mocks.stock }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof import('#/api/lab-operations')>(), getLabOperationsDashboard: mocks.inventory }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
const kit = { ...standardKit, assemblyWorkflowRevisionId: 'workflow', tubes: [] }
const run: KitAssemblyRun = {
  id: 'run', stockKitId: kit.id, kitNumber: kit.kitNumber, status: 'InProgress', version: 7,
  workflowRevisionId: 'workflow', steps: [{ labStepVersionId: 'step-version', name: 'Pack RNA kit', instructions: 'Pack the scanned tubes and seal the shipper.' }], stepRecords: [], uses: [], startedAtUtc: '2026-09-28T00:00:00Z', finishedAtUtc: null, abandonmentReason: null,
  components: [
    { supplierProductId: 'shipper', kind: 'ShippingContainer', quantity: 1, supplierName: 'Boxes', productNumber: 'Box', productDescription: '20-tube box' },
    { supplierProductId: 'tube', kind: 'Tube', quantity: 20, supplierName: 'Tubes', productNumber: 'Tube', productDescription: 'RNA tube' },
  ],
}
function Harness({ currentKit, writesBlocked = false }: { currentKit: ShippingStockKit; writesBlocked?: boolean }) {
  const assembly = useKitAssemblyRun(currentKit.id, currentKit, true, mocks.saved)
  return assembly.run ? <RecordKitPackedContentsDialog kit={currentKit} assembly={assembly} writesBlocked={writesBlocked} /> : null
}
async function mount(currentKit: ShippingStockKit = kit) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const tree = (value: ShippingStockKit, writesBlocked = false) => <QueryClientProvider client={client}><Harness currentKit={value} writesBlocked={writesBlocked} /></QueryClientProvider>
  const view = render(tree(currentKit))
  await screen.findByRole('dialog', { name: 'Assemble transportation kit' })
  await waitFor(() => expect((screen.getByRole('button', { name: 'Save for later' }) as HTMLButtonElement).disabled).toBe(false))
  return { updateKit: (value: ShippingStockKit, writesBlocked = false) => view.rerender(tree(value, writesBlocked)) }
}
function scans(value: string) { fireEvent.change(screen.getByRole('textbox', { name: 'Permanent tube barcodes' }), { target: { value } }) }
function lot(overrides: Partial<LabMaterialLot> = {}): LabMaterialLot {
  return { id: 'lot', supplierProductId: 'tube', kind: 'SupplierLot', materialDefinitionId: 'material', materialKey: 'material', name: 'Tube', lotNumber: 'LOT-1', supplierId: 'supplier', supplier: 'Tubes', expirationOrRetestDate: '2099-01-01', storageLocationId: 'shelf', storageLocation: 'Shelf', availableQuantity: 20, quantityUnit: 'each', qcDisposition: 'Passed', qcPerformedOn: null, qcFailureReason: null, components: [], version: 1, ...overrides }
}
function quantity(product = 'Box') { return within(screen.getByRole('group', { name: product })).getByRole('spinbutton', { name: 'Quantity' }) as HTMLInputElement }
function submit() { fireEvent.click(screen.getByRole('button', { name: 'Save for later' })) }
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); mocks.stock.mockResolvedValue(kit); mocks.read.mockResolvedValue(run); mocks.record.mockResolvedValue(run); mocks.inventory.mockResolvedValue({ materialLots: [] }); mocks.saved.mockResolvedValue(undefined); mocks.print.mockResolvedValue({ ...run, version: 8, labelPrintRequestedAtUtc: '2026-09-29T00:00:00Z' }); vi.spyOn(window, 'print').mockImplementation(() => {}) })

describe('combined physical-kit packing', () => {
  it('completes after one tube scan, exact contents and the printed attached label', async () => {
    await mount()
    expect(screen.getByText('Pack the scanned tubes and seal the shipper.')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Assembly completion notes' })).toBeNull()
    expect(screen.queryByText('Enter assembly completion notes.')).toBeNull()
    const complete = screen.getByRole('button', { name: 'Complete' }) as HTMLButtonElement
    expect(complete.disabled).toBe(true)
    const codes = Array.from({ length: 20 }, (_, index) => `FINAL-${index.toString().padStart(4, '0')}`)
    scans(codes.join('\n'))
    expect(complete.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Print container barcode' }))
    await waitFor(() => expect(window.print).toHaveBeenCalledOnce())
    expect(complete.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: 'Attached container barcode' }), { target: { value: kit.kitNumber } })
    expect(screen.queryByRole('textbox', { name: 'Packed tube verification barcodes' })).toBeNull()
    await waitFor(() => expect(complete.disabled).toBe(false))
    fireEvent.click(complete)
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, expect.objectContaining({ version: 8, complete: true, containerBarcode: kit.kitNumber, assemblyNotes: null })))
    expect(mocks.record).toHaveBeenCalledOnce()
  })
  it('retains assembly entries through a failed Save and failed record refresh in the resume modal', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const saved = vi.fn()
    render(<QueryClientProvider client={client}><AssembleTransportationKitDialog initialKit={kit} onClose={vi.fn()} onSaved={saved} /></QueryClientProvider>)
    await screen.findByRole('textbox', { name: 'Permanent tube barcodes' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save for later' })).toHaveProperty('disabled', false))
    scans('KEEP-THIS-TUBE')
    mocks.record.mockRejectedValueOnce(new Error('Save response interrupted.'))
    mocks.read.mockRejectedValueOnce(new Error('Refresh interrupted.'))
    submit()
    expect(await screen.findByText('Assembly refresh failed')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Permanent tube barcodes' })).toHaveProperty('value', 'KEEP-THIS-TUBE')
    expect(screen.queryByRole('textbox', { name: 'Assembly completion notes' })).toBeNull()
    expect(saved).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save for later' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry assembly check' }))
    await waitFor(() => expect(screen.queryByText('Assembly refresh failed')).toBeNull())
    expect(screen.getByRole('textbox', { name: 'Permanent tube barcodes' })).toHaveProperty('value', 'KEEP-THIS-TUBE')
  })
  it('restores label evidence and retains saved notes without requiring a rescan', async () => {
    mocks.read.mockResolvedValue({ ...run, draftNotes: 'Saved packing notes.', draftVerificationBarcodes: ['SAVED-TUBE-1'], labelPrintRequestedAtUtc: '2026-09-29T00:00:00Z', containerBarcodeVerifiedAtUtc: '2026-09-29T00:01:00Z' })
    await mount()
    expect(screen.queryByRole('textbox', { name: 'Assembly completion notes' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Packed tube verification barcodes' })).toBeNull()
    expect(screen.getByText('Attached container barcode verified.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Complete' })).toHaveProperty('disabled', true)
    expect(window.print).not.toHaveBeenCalled()
    submit()
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, expect.objectContaining({ complete: false, assemblyNotes: 'Saved packing notes.' })))
  })
  it('saves a fully packed draft without notes or additional consumption', async () => {
    mocks.read.mockResolvedValue({ ...run, uses: run.components.map(component => ({ id: component.supplierProductId, supplierProductId: component.supplierProductId, sourceMaterialLotId: null, quantity: component.quantity, quantityUnit: 'each', recordedByUserId: 'operator', recordedAtUtc: '2026-09-28T00:00:00Z' })) })
    await mount({ ...kit, tubes: Array.from({ length: 20 }, (_, index) => ({ id: String(index), supplierBarcode: `OLD-${index}` })) })
    expect(screen.queryByRole('spinbutton')).toBeNull()
    submit()
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, { version: 7, stockKitVersion: kit.version, supplierBarcodes: [], components: [], complete: false, containerBarcode: null, assemblyNotes: null }))
  })
  it('resumes fully packed contents and completes without rescanning or consuming them again', async () => {
    mocks.read.mockResolvedValue({ ...run, labelPrintRequestedAtUtc: '2026-09-29T00:00:00Z', containerBarcodeVerifiedAtUtc: '2026-09-29T00:01:00Z', uses: run.components.map(component => ({ id: component.supplierProductId, supplierProductId: component.supplierProductId, sourceMaterialLotId: null, quantity: component.quantity, quantityUnit: 'each', recordedByUserId: 'operator', recordedAtUtc: '2026-09-28T00:00:00Z' })) })
    await mount({ ...kit, tubes: Array.from({ length: 20 }, (_, index) => ({ id: String(index), supplierBarcode: `OLD-${index}` })) })
    expect(screen.getByRole('heading', { name: 'Recorded tubes · 20 of 20' })).toBeTruthy()
    fireEvent.click(screen.getByText('View recorded tube IDs'))
    expect(screen.getByRole('region', { name: 'Registered tube barcodes' })).toBeTruthy()
    expect(screen.getByText('OLD-19')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Packed tube verification barcodes' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, expect.objectContaining({ complete: true, supplierBarcodes: [], components: [] })))
    expect(mocks.record).toHaveBeenCalledOnce()
  })
  it('records normalized scans and their derived quantity in one versioned request', async () => {
    await mount()
    scans(' *tube-0001*\nTUBE-0002 ')
    await waitFor(() => expect((within(screen.getByRole('group', { name: 'Tube' })).getByRole('spinbutton', { name: 'Quantity' }) as HTMLInputElement).value).toBe('2'))
    fireEvent.click(screen.getByRole('button', { name: 'Save for later' }))
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, {
      version: 7, stockKitVersion: kit.version, supplierBarcodes: ['TUBE-0001', 'TUBE-0002'], assemblyNotes: null, complete: false, containerBarcode: null,
      components: [{ supplierProductId: 'shipper', quantity: 1, sourceMaterialLotId: null }, { supplierProductId: 'tube', quantity: 2, sourceMaterialLotId: null }],
    }))
    expect(mocks.record).toHaveBeenCalledTimes(1)
  })
  it('blocks completion when recorded quantities are full but a tube ID is missing', async () => {
    mocks.read.mockResolvedValue({ ...run, labelPrintRequestedAtUtc: '2026-09-29T00:00:00Z', containerBarcodeVerifiedAtUtc: '2026-09-29T00:01:00Z', uses: run.components.map(component => ({ id: component.supplierProductId, supplierProductId: component.supplierProductId, sourceMaterialLotId: null, quantity: component.quantity, quantityUnit: 'each', recordedByUserId: 'operator', recordedAtUtc: '2026-09-28T00:00:00Z' })) })
    await mount({ ...kit, tubes: Array.from({ length: 19 }, (_, index) => ({ id: String(index), supplierBarcode: `OLD-${index}` })) })
    expect(screen.getByRole('button', { name: 'Complete' })).toHaveProperty('disabled', true)
    expect(screen.getByText('Record all 20 unique tube IDs as the tubes are packed.')).toBeTruthy()
    expect(mocks.record).not.toHaveBeenCalled()
  })
  it('blocks duplicate scans and clears their error after correction', async () => {
    await mount()
    scans('TUBE-0001\n*tube-0001*')
    fireEvent.click(screen.getByRole('button', { name: 'Save for later' }))
    expect(await screen.findByText('A barcode appears more than once. Scan each physical tube once.')).toBeTruthy()
    expect(mocks.record).not.toHaveBeenCalled()
    scans('TUBE-0001\nTUBE-0002')
    await waitFor(() => expect(screen.queryByText('A barcode appears more than once. Scan each physical tube once.')).toBeNull())
  })
  it('blocks scans exceeding the BoM tube capacity', async () => {
    await mount()
    scans(Array.from({ length: 21 }, (_, index) => `TUBE-${index.toString().padStart(4, '0')}`).join('\n'))
    fireEvent.click(screen.getByRole('button', { name: 'Save for later' }))
    expect(await screen.findByText('Only 20 more tubes fit in this kit.')).toBeTruthy()
    expect(mocks.record).not.toHaveBeenCalled()
  })
  it('retains scans after a failed save and warns before dirty dismissal', async () => {
    mocks.record.mockRejectedValue(new Error('Kit changed.'))
    await mount()
    scans('TUBE-0001')
    fireEvent.click(screen.getByRole('button', { name: 'Save for later' }))
    expect(await screen.findByText('Packed contents need review')).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Permanent tube barcodes' }) as HTMLTextAreaElement).value).toBe('TUBE-0001')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    const confirmation = screen.getByRole('dialog', { name: 'Discard unsaved assembly entries?' })
    expect(confirmation.querySelector('[data-slot="dialog-body"]')?.textContent).toContain(kit.kitNumber)
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect((screen.getByRole('textbox', { name: 'Permanent tube barcodes' }) as HTMLTextAreaElement).value).toBe('TUBE-0001')
  })
  it.each(['abc', 'TUBE 0001', '*TUBE-0001'])('rejects incomplete or malformed barcode %s', async code => {
    await mount()
    scans(code)
    submit()
    expect(await screen.findByText('Scan complete barcodes of 4–100 letters, numbers, dots, hyphens, underscores or slashes.')).toBeTruthy()
    expect(mocks.record).not.toHaveBeenCalled()
  })
  it('records previously registered but unused tubes without scanning them again', async () => {
    const currentKit = { ...kit, tubes: Array.from({ length: 8 }, (_, index) => ({ id: String(index), supplierBarcode: `OLD-${index}` })) }
    await mount(currentKit)
    expect(quantity('Tube').value).toBe('8')
    scans('NEW-0001\nNEW-0002')
    submit()
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, expect.objectContaining({
      supplierBarcodes: ['NEW-0001', 'NEW-0002'], components: expect.arrayContaining([expect.objectContaining({ supplierProductId: 'tube', quantity: 10 })]),
    })))
  })
  it('requires an eligible lot and clears lot errors when selecting it', async () => {
    mocks.inventory.mockResolvedValue({ materialLots: [lot(), lot({ id: 'short', lotNumber: 'SHORT', availableQuantity: 19 }), lot({ id: 'hold', lotNumber: 'HOLD', quantityHoldReason: 'Reconcile stock' }), lot({ id: 'expired', lotNumber: 'EXPIRED', expirationOrRetestDate: '2000-01-01' }), lot({ id: 'failed', lotNumber: 'FAILED', qcDisposition: 'Failed' })] })
    await mount()
    scans(Array.from({ length: 20 }, (_, index) => `TUBE-${index.toString().padStart(4, '0')}`).join('\n'))
    submit()
    expect(await screen.findByText('Choose an available source lot with enough stock.')).toBeTruthy()
    expect(mocks.record).not.toHaveBeenCalled()
    const picker = screen.getByRole('combobox', { name: 'Source lot' })
    expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual(['Select source lot', 'LOT-1 · 20 each available'])
    fireEvent.change(picker, { target: { value: 'lot' } })
    await waitFor(() => expect(screen.queryByText('Choose an available source lot with enough stock.')).toBeNull())
    submit()
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, expect.objectContaining({ components: expect.arrayContaining([expect.objectContaining({ supplierProductId: 'tube', quantity: 20, sourceMaterialLotId: 'lot' })]) })))
  })
  it('rejects fractional containers but allows saving an empty assembly for later', async () => {
    await mount()
    fireEvent.change(quantity(), { target: { value: '0.5' } })
    submit()
    expect(await screen.findByText('Count whole tubes and containers.')).toBeTruthy()
    fireEvent.change(quantity(), { target: { value: '0' } })
    submit()
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, expect.objectContaining({ complete: false, supplierBarcodes: [], components: [] })))
  })
  it('does not offer a new tube lot when earlier tubes had no source lot', async () => {
    mocks.read.mockResolvedValue({ ...run, uses: [{ id: 'prior', supplierProductId: 'tube', sourceMaterialLotId: null, quantity: 1, quantityUnit: 'each', recordedByUserId: 'operator', recordedAtUtc: '2026-09-28T00:00:00Z' }] })
    mocks.inventory.mockResolvedValue({ materialLots: [lot()] })
    await mount({ ...kit, tubes: [{ id: 'old', supplierBarcode: 'OLD-0001' }] })
    scans('NEW-0001')
    const picker = screen.getByRole('combobox', { name: 'Source lot' })
    expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual(['Select source lot'])
    expect(screen.getByText('Earlier tubes were recorded without a source lot. Review their recorded use before packing more tubes.')).toBeTruthy()
    submit()
    expect(await screen.findByText('Choose an available source lot with enough stock.')).toBeTruthy()
    expect(mocks.record).not.toHaveBeenCalled()
  })
  it('records only the remaining scans and restricts tubes to the previously used lot', async () => {
    mocks.read.mockResolvedValue({ ...run, version: 8, uses: [
      { id: 'shipper-use', supplierProductId: 'shipper', sourceMaterialLotId: null, quantity: 1, quantityUnit: 'each', recordedByUserId: 'operator', recordedAtUtc: '2026-09-28T00:00:00Z' },
      { id: 'tube-use', supplierProductId: 'tube', sourceMaterialLotId: 'lot', quantity: 18, quantityUnit: 'each', recordedByUserId: 'operator', recordedAtUtc: '2026-09-28T00:00:00Z' },
    ] })
    mocks.inventory.mockResolvedValue({ materialLots: [lot({ availableQuantity: 2 }), lot({ id: 'other', lotNumber: 'OTHER' })] })
    await mount({ ...kit, version: 3, tubes: Array.from({ length: 18 }, (_, index) => ({ id: String(index), supplierBarcode: `OLD-${index}` })) })
    expect(screen.queryByRole('group', { name: 'Box' })).toBeNull()
    scans('NEW-0001\nNEW-0002')
    await waitFor(() => expect(quantity('Tube').value).toBe('2'))
    const picker = screen.getByRole('combobox', { name: 'Source lot' })
    expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual(['Select source lot', 'LOT-1 · 2 each available'])
    fireEvent.change(picker, { target: { value: 'lot' } })
    submit()
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(kit.id, { version: 8, stockKitVersion: 3, supplierBarcodes: ['NEW-0001', 'NEW-0002'], complete: false, containerBarcode: null, components: [{ supplierProductId: 'tube', quantity: 2, sourceMaterialLotId: 'lot' }], assemblyNotes: null }))
  })
  it('offers only source lots matching the kit recorded tube lot', async () => {
    mocks.inventory.mockResolvedValue({ materialLots: [lot(), lot({ id: 'other', lotNumber: 'OTHER' })] })
    await mount({ ...kit, tubeLotNumber: 'lot-1' })
    scans('TUBE-0001')
    const picker = screen.getByRole('combobox', { name: 'Source lot' })
    expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual(['Select source lot', 'LOT-1 · 20 each available'])
    expect(screen.getByText('Use the kit’s recorded tube lot: lot-1.')).toBeTruthy()
  })
  it('prevents repeated submissions while a save is pending', async () => {
    let resolve!: (value: KitAssemblyRun) => void
    mocks.record.mockImplementation(() => new Promise<KitAssemblyRun>(done => { resolve = done }))
    await mount()
    scans('TUBE-0001')
    submit()
    submit()
    await waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1))
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true)
    resolve(run)
    await waitFor(() => expect(mocks.saved).toHaveBeenCalledOnce())
  })
  it('retains scans after a lost successful response and rejects replaying them against the full refreshed roster', async () => {
    const { updateKit } = await mount()
    const codes = Array.from({ length: 20 }, (_, index) => `TUBE-${index.toString().padStart(4, '0')}`)
    scans(codes.join('\n'))
    const savedRun = { ...run, version: 8, stepRecords: [{ sequence: 0, labStepVersionId: 'step-version', notes: 'Packed and sealed according to instructions.', performedByUserId: 'operator', performedAtUtc: '2026-09-28T00:00:00Z' }], uses: run.components.map(component => ({ id: component.supplierProductId, supplierProductId: component.supplierProductId, sourceMaterialLotId: null, quantity: component.quantity, quantityUnit: 'each', recordedByUserId: 'operator', recordedAtUtc: '2026-09-28T00:00:00Z' })) }
    mocks.read.mockResolvedValue(savedRun)
    mocks.record.mockRejectedValue(new Error('Response lost.'))
    mocks.saved.mockImplementation(async () => { updateKit({ ...kit, version: 3, tubes: codes.map(code => ({ id: code, supplierBarcode: code })) }) })
    submit()
    expect(await screen.findByText('Packed contents need review')).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Permanent tube barcodes' }) as HTMLTextAreaElement).value).toBe(codes.join('\n'))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save for later' }) as HTMLButtonElement).disabled).toBe(false))
    submit()
    expect(await screen.findByText('A tube is already registered to this kit. Remove its scan before saving again.')).toBeTruthy()
    expect(mocks.record).toHaveBeenCalledTimes(1)
  })
})
