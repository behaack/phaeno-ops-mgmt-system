import { supplierCatalogFixture, tubeSupplierId, tubeProductId, shipperProductId } from '#/test-helpers/supplier-catalog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shippingFixture } from '#/test-helpers/sample-shipping'
import { containerDefinition as definition, standardKit as kit } from '#/test-helpers/shipping-containers'
import { DispatchStandardKitDialog, PrepareStandardKitDialog, RegisterStockKitTubesDialog } from './StandardKitDialogs'
import { StandardKitDetailPage } from './StandardKitDetailPage'
import { StandardKitInventoryPanel } from './StandardKitInventoryPanel'

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), create: vi.fn(), register: vi.fn(), dispatch: vi.fn(), list: vi.fn(), get: vi.fn(), definitions: vi.fn(), shipments: vi.fn(), navigate: vi.fn(), search: {} as Record<string, string>, allowed: true }))
vi.mock('#/api/supplier-catalog', async importOriginal => ({ ...await importOriginal<typeof import('#/api/supplier-catalog')>(), useSupplierCatalog: () => mocks.catalog() }))
vi.mock('#/api/shipping-containers', () => ({ createShippingStockKit: mocks.create, registerShippingStockKitTubes: mocks.register, dispatchShippingStockKit: mocks.dispatch, getShippingStockKits: mocks.list, getShippingStockKit: mocks.get, getShippingContainerDefinitions: mocks.definitions }))
vi.mock('#/api/sample-shipping', () => ({ getPlatformSampleShipments: mocks.shipments }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageOrderConfiguration: mocks.allowed } } }) }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate, useSearch: () => mocks.search, Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { kitId?: string; requestId?: string } }) => <a href={to.replace('$kitId', params?.kitId ?? '').replace('$requestId', params?.requestId ?? '')}>{children}</a> }))
function mount(node: ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{node}</QueryClientProvider>) }
function fill(label: RegExp | string, value: string, group?: string) { fireEvent.change((group ? within(screen.getByRole('group', { name: group })) : screen).getByLabelText(label), { target: { value } }) }
beforeEach(() => { vi.clearAllMocks(); mocks.catalog.mockReturnValue({ data: supplierCatalogFixture, isPending: false, isError: false, error: null }); mocks.allowed = true; mocks.search = {}; mocks.create.mockResolvedValue(kit); mocks.register.mockResolvedValue(kit); mocks.dispatch.mockResolvedValue({ ...kit, status: 'Fulfilled' }); mocks.list.mockResolvedValue([kit]); mocks.get.mockResolvedValue(kit); mocks.definitions.mockResolvedValue([definition]); mocks.shipments.mockResolvedValue([]) })
const callbacks = { onClose: vi.fn(), onSaved: vi.fn() }
describe('standard kit preparation and dispatch', () => {
  it('requires expiration for additional configured products and submits the displayed past date', async () => {
    const extra = { ...supplierCatalogFixture[0].products[0], id: '83000000-0000-4000-8000-000000000099', productNumber: 'EXTRA-99', kind: 'Other' as const, canExpire: true }
    const catalog = supplierCatalogFixture.map((supplier, index) => ({ ...supplier, products: index === 0 ? [...supplier.products, extra] : supplier.products }))
    mocks.catalog.mockReturnValue({ data: catalog, isPending: false, isError: false })
    const kitContents = catalog.flatMap(supplier => supplier.products.map(product => ({ supplierProductId: product.id, supplierId: supplier.id, supplierName: supplier.name, productNumber: product.productNumber, productDescription: product.description, productTypeName: product.productTypeName, kind: product.kind, quantity: 1 })))
    mount(<PrepareStandardKitDialog definitions={[{ ...definition, kitContents }]} {...callbacks} />)
    fill(/Container size/, definition.id)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' }))
    expect(await screen.findByText('Enter the expiration date for this product.')).toBeTruthy()
    expect(mocks.create).not.toHaveBeenCalled()
    const input = screen.getByLabelText(/Tube maker · EXTRA-99/) as HTMLInputElement
    expect(input.required).toBe(true)
    input.value = '2000-01-01' // Capture the visible date even when the browser has not sent a change event.
    fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ productExpirations: [{ supplierProductId: extra.id, expirationDate: '2000-01-01' }] })))
  })

  it('shows saved expiry evidence without introducing a stock status change', async () => {
    mocks.get.mockResolvedValue({ ...kit, productExpirations: [{ supplierProductId: tubeProductId, supplierName: 'Tube maker', productNumber: 'T-001', canExpire: true, expirationDate: '2000-01-01' }] })
    mount(<StandardKitDetailPage kitId={kit.id} />)
    expect(await screen.findByText('2000-01-01 · Expired')).toBeTruthy()
    expect(screen.queryByText('Expiration requirements and dates were not recorded for this historical kit.')).toBeNull()
  })

  it('keeps historical stock expiration evidence unknown', async () => {
    mount(<StandardKitDetailPage kitId={kit.id} />)
    expect(await screen.findByText('Expiration requirements and dates were not recorded for this historical kit.')).toBeTruthy()
    expect(screen.queryByText('Expiration not required when recorded')).toBeNull()
  })

  it('shows configured contents and prefills exact tube and container product identities', () => {
    const kitContents = supplierCatalogFixture.flatMap(supplier => supplier.products.filter(product => product.id === tubeProductId || product.id === shipperProductId).map(product => ({
      supplierProductId: product.id, supplierId: supplier.id, supplierName: supplier.name, productNumber: product.productNumber,
      productDescription: product.description, productTypeName: product.productTypeName, kind: product.kind, quantity: product.id === tubeProductId ? 10 : 1,
    })))
    mount(<PrepareStandardKitDialog definitions={[{ ...definition, kitContents }]} {...callbacks} />)
    fill(/Container size/, definition.id)
    expect(screen.getByRole('list', { name: 'Kit contents' })).toBeTruthy()
    expect((within(screen.getByRole('group', { name: 'Tubes' })).getByLabelText(/Product name/) as HTMLSelectElement).value).toBe(tubeProductId)
    expect((within(screen.getByRole('group', { name: 'Shipping Container' })).getByLabelText(/Product name/) as HTMLSelectElement).value).toBe(shipperProductId)
  })

  it('excludes reagents and inactive product types from kit selection', () => {
    mocks.catalog.mockReturnValue({ data: supplierCatalogFixture.map(s => ({ ...s, products: [...s.products.map(p => ({ ...p, productTypeIsActive: false })), { ...s.products[0], id: '83000000-0000-4000-8000-000000000001', kind: 'Other', productTypeName: 'Reagent', productTypeIsActive: true, productNumber: 'REAGENT-1', description: 'Laboratory reagent' }] })), isPending: false, isError: false })
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    fill(/Supplier/, tubeSupplierId, 'Tubes')
    expect(screen.queryByRole('option', { name: /Laboratory reagent/ })).toBeNull()
    expect(screen.queryByRole('option', { name: /Sterile transport tube/ })).toBeNull()
  })

  it('shows descriptions, filters product types and clears the product on supplier change', () => {
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    fill(/Supplier/, tubeSupplierId, 'Tubes')
    const tubes = within(screen.getByRole('group', { name: 'Tubes' }))
    expect(tubes.getByRole('option', { name: 'T-001 — Sterile transport tube' })).toBeTruthy()
    expect(tubes.queryByRole('option', { name: /Insulated shipping container/ })).toBeNull()
    fill(/Product name/, tubeProductId, 'Tubes')
    fill(/Supplier/, supplierCatalogFixture[1].id, 'Tubes')
    expect(tubes.getByLabelText(/Product name/)).toHaveProperty('value', '')
    expect(tubes.getByLabelText(/Product name/)).toHaveProperty('disabled', true)
  })
  it('clears required product errors as each product is selected before submission', async () => {
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    for (const [group, supplierId, productId, message] of [
      ['Tubes', tubeSupplierId, tubeProductId, 'Choose a tube product.'],
      ['Shipping Container', supplierCatalogFixture[1].id, shipperProductId, 'Choose a shipping container product.'],
    ]) {
      fill(/Supplier/, supplierId, group)
      expect(await screen.findByText(message)).toBeTruthy()
      fill(/Product name/, productId, group)
      await waitFor(() => expect(screen.queryByText(message)).toBeNull())
      const product = within(screen.getByRole('group', { name: group })).getByLabelText(/Product name/)
      expect(product).toHaveProperty('value', productId)
      expect(product.getAttribute('aria-invalid')).toBe('false')
      fill(/Product name/, '', group)
      expect(await screen.findByText(message)).toBeTruthy()
      fill(/Product name/, productId, group)
      await waitFor(() => expect(screen.queryByText(message)).toBeNull())
    }
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('clears required shipping supplier and product errors when a configured size prefills them', async () => {
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' }))
    expect(await screen.findByText('Choose a shipping container supplier.')).toBeTruthy()
    expect(await screen.findByText('Choose a shipping container product.')).toBeTruthy()
    fill(/Container size/, definition.id)
    await waitFor(() => {
      expect(screen.queryByText('Choose a shipping container supplier.')).toBeNull()
      expect(screen.queryByText('Choose a shipping container product.')).toBeNull()
    })
    expect(within(screen.getByRole('group', { name: 'Shipping Container' })).getByLabelText(/Product name/)).toHaveProperty('value', shipperProductId)
    expect(screen.getByText('Choose a tube product.')).toBeTruthy()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('excludes inactive suppliers and products and blocks preparation when the catalog fails', () => {
    mocks.catalog.mockReturnValue({ data: supplierCatalogFixture.map(s => ({ ...s, isActive: false })), isPending: false, isError: true, error: new Error('Unavailable'), refetch: vi.fn() })
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    expect(screen.queryByRole('option', { name: 'Tube maker' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Prepare standard kit' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Retry catalog' })).toBeTruthy()
  })

  it('returns a kit prepared for a request to that request after registration', async () => {
    mocks.search = { returnKitRequestId: '20000000-0000-4000-8000-000000000001' }
    mount(<StandardKitDetailPage kitId={kit.id} />)
    expect((await screen.findByRole('link', { name: 'Back to kit request' })).getAttribute('href')).toBe('/lab-operations/kit-requests/20000000-0000-4000-8000-000000000001')
    expect(screen.queryByRole('link', { name: 'Back to standard kits' })).toBeNull()
  })
  it('uses a dedicated record from the stock discovery list', async () => { mount(<StandardKitInventoryPanel apiEnabled />); expect((await screen.findByRole('link', { name: kit.kitNumber })).getAttribute('href')).toBe(`/lab-operations/stock-kits/${kit.id}`); expect(screen.queryByRole('group', { name: 'Tubes' })).toBeNull() })
  it('requires an active configured size and prefills its actual shipper reference', async () => { mount(<PrepareStandardKitDialog definitions={[definition, { ...definition, id: 'draft', isActive: false, commonName: 'Draft size' }]} {...callbacks} />); expect(screen.queryByRole('option', { name: /Draft size/ })).toBeNull(); fill(/Container size/, definition.id); expect((within(screen.getByRole('group', { name: 'Shipping Container' })).getByLabelText(/Product name/) as HTMLInputElement).value).toBe(shipperProductId); fill(/Supplier/, tubeSupplierId, 'Tubes'); fill(/Product name/, tubeProductId, 'Tubes'); fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' })); await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ containerDefinitionId: definition.id, tubeSupplierProductId: tubeProductId, shipperSupplierProductId: shipperProductId, tubeLotNumber: null }))); expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('shipmentId') })
  it('blocks duplicate barcode scans and capacity excess without registering', async () => { mount(<RegisterStockKitTubesDialog kit={{ ...kit, container: { ...kit.container, capacity: 2 } }} {...callbacks} />); fill(/Permanent tube barcodes/, 'A\na'); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); expect(await screen.findByText('A barcode appears more than once. Scan each physical tube once.')).toBeTruthy(); fill(/Permanent tube barcodes/, 'A\nB\nC'); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); expect(await screen.findByText('Only 2 more tubes fit in this kit.')).toBeTruthy(); expect(mocks.register).not.toHaveBeenCalled() })
  it('registers scanned permanent identities using the displayed kit version', async () => { mount(<RegisterStockKitTubesDialog kit={kit} {...callbacks} />); fill(/Permanent tube barcodes/, '  BARCODE-1\nBARCODE-2  '); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); await waitFor(() => expect(mocks.register).toHaveBeenCalledWith(kit.id, { supplierBarcodes: ['BARCODE-1', 'BARCODE-2'], version: kit.version })) })
  it('keeps Customer location deliveries out of the legacy picker and requires full capacity', async () => { const shipment = { ...shippingFixture, authorizationSource: 'ProspectTrialProject' as const, id: '77777777-7777-4777-8777-777777777771' }; mount(<DispatchStandardKitDialog kit={kit} shipments={[shippingFixture, shipment, { ...shipment, id: '77777777-7777-4777-8777-777777777772' }]} {...callbacks} />); expect(screen.getAllByRole('option')).toHaveLength(2); expect((screen.getByRole('button', { name: 'Record dispatch' }) as HTMLButtonElement).disabled).toBe(true); expect(mocks.dispatch).not.toHaveBeenCalled() })
  it('preserves Trial dispatch with its shipment version and timestamp', async () => { const shipment = { ...shippingFixture, authorizationSource: 'ProspectTrialProject' as const, id: '77777777-7777-4777-8777-777777777771' }; const full = { ...kit, container: { ...kit.container, capacity: 1 }, tubes: [{ id: 'tube', supplierBarcode: 'BARCODE-1' }] }; mount(<DispatchStandardKitDialog kit={full} shipments={[shipment]} initialShipmentId={shipment.id} {...callbacks} />); fill(/Carrier/, 'Synthetic carrier'); fill(/Tracking number/, 'TRACK-001'); fireEvent.click(screen.getByRole('button', { name: 'Record dispatch' })); await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith(kit.id, expect.objectContaining({ shipmentId: shipment.id, version: kit.version, outboundCarrier: 'Synthetic carrier', outboundTrackingNumber: 'TRACK-001', fulfilledAt: expect.stringMatching(/Z$/) }))) })
  it('retains Partner shipments even when they share the Lab Service authorization source', () => {
    const partner = { ...shippingFixture, organizationKind: 'Partner', authorizationReference: 'PARTNER-JOB' }
    mount(<DispatchStandardKitDialog kit={kit} shipments={[{ ...shippingFixture, organizationKind: 'Customer', authorizationSourceId: 'customer-job' }, partner]} {...callbacks} />)
    expect(screen.getByRole('option', { name: /PARTNER-JOB/ })).toBeTruthy(); expect(screen.getAllByRole('option')).toHaveLength(2)
  })
  it('keeps unsuccessful registration drafts and blocks accidental dirty close', async () => { mocks.register.mockRejectedValue(new Error('Kit changed.')); const close = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false); mount(<RegisterStockKitTubesDialog kit={kit} onClose={close} onSaved={vi.fn()} />); fill(/Permanent tube barcodes/, 'BARCODE-1'); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); expect(await screen.findByText('Kit changes were not saved')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).not.toHaveBeenCalled(); expect((screen.getByLabelText(/Permanent tube barcodes/) as HTMLTextAreaElement).value).toBe('BARCODE-1') })
  it('shows dispatched kit facts without registration or dispatch actions', async () => { mocks.get.mockResolvedValue({ ...kit, status: 'OnTheWay', authorizationReference: 'JOB-1' }); mount(<StandardKitDetailPage kitId={kit.id} />); await screen.findByRole('heading', { name: kit.kitNumber }); expect(screen.getByText('On the way')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Register tubes' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Record dispatch' })).toBeNull() })
  it('does not load standard kits for a user without configuration access', () => { mocks.allowed = false; mount(<StandardKitDetailPage kitId={kit.id} />); expect(screen.getByText('A Phaeno configuration administrator is required.')).toBeTruthy(); expect(mocks.get).not.toHaveBeenCalled() })
})
