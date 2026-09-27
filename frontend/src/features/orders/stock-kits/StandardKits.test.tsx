import { supplierCatalogFixture as baseCatalog, tubeSupplierId, tubeProductId, shipperProductId } from '#/test-helpers/supplier-catalog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shippingFixture } from '#/test-helpers/sample-shipping'
import { containerDefinition as baseDefinition, standardKit as kit } from '#/test-helpers/shipping-containers'
import { DispatchStandardKitDialog, PrepareStandardKitDialog, RegisterStockKitTubesDialog } from './StandardKitDialogs'
import { StandardKitDetailPage } from './StandardKitDetailPage'
import { StandardKitInventoryPanel } from './StandardKitInventoryPanel'

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), create: vi.fn(), register: vi.fn(), dispatch: vi.fn(), list: vi.fn(), get: vi.fn(), definitions: vi.fn(), shipments: vi.fn(), navigate: vi.fn(), search: {} as Record<string, string>, allowed: true }))
const kitProductId = '83000000-0000-4000-8000-000000000010'
const supplierCatalogFixture = [...baseCatalog, { id: '83000000-0000-4000-8000-000000000011', name: 'Phaeno', isInternalProducer: true, isActive: true, version: 1, products: [{ id: kitProductId, supplierId: '83000000-0000-4000-8000-000000000011', productNumber: baseDefinition.sku, description: baseDefinition.commonName, kind: 'Other' as const, productTypeId: '83000000-0000-4000-8000-000000000012', productTypeName: 'Transportation kit', productTypeIsActive: true, isActive: true, version: 1 }] }]
const definition = { ...baseDefinition, finishedKitProductId: kitProductId, kitContents: [
  { supplierProductId: tubeProductId, supplierId: tubeSupplierId, supplierName: baseCatalog[0].name, productNumber: baseCatalog[0].products[0].productNumber, productDescription: baseCatalog[0].products[0].description, productTypeName: 'Tube', kind: 'Tube' as const, quantity: 20 },
  { supplierProductId: shipperProductId, supplierId: baseCatalog[1].id, supplierName: baseCatalog[1].name, productNumber: baseCatalog[1].products[0].productNumber, productDescription: baseCatalog[1].products[0].description, productTypeName: 'Shipping Container', kind: 'ShippingContainer' as const, quantity: 1 },
] }
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
    fill(/Kit specification/, definition.id)
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

  it('shows the specification contents and fixes the tube and shipper products during preparation', () => {
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    fill(/Kit specification/, definition.id)
    expect(screen.getByRole('heading', { name: 'Required contents per kit' })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Tubes' })).getByText(/Tube maker · T-001/)).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Shipping Container' })).getByText(/Synthetic supplier · PRODUCT-20/)).toBeTruthy()
    expect(screen.queryByLabelText(/Supplier/)).toBeNull()
    expect(screen.queryByLabelText(/Product name/)).toBeNull()
  })

  it('does not allow an inactive catalog component to be substituted during Phaeno assembly', async () => {
    const catalog = supplierCatalogFixture.map(supplier => supplier.id === tubeSupplierId
      ? { ...supplier, products: supplier.products.map(product => ({ ...product, productTypeIsActive: false })) }
      : supplier)
    mocks.catalog.mockReturnValue({ data: catalog, isPending: false, isError: false })
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    fill(/Kit specification/, definition.id)
    expect(within(screen.getByRole('group', { name: 'Tubes' })).getByText('Choose a Kit specification with approved contents.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' }))
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('requires a complete approved specification for preparation', async () => {
    mount(<PrepareStandardKitDialog definitions={[{ ...definition, kitContents: [] }]} {...callbacks} />)
    fill(/Kit specification/, definition.id)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' }))
    expect(mocks.create).not.toHaveBeenCalled()
    expect(screen.getByText(/Missing a supplier or product/)).toBeTruthy()
  })

  it('prefills fixed components and submits their exact catalog identities', async () => {
    mount(<PrepareStandardKitDialog definitions={[definition]} {...callbacks} />)
    fill(/Kit specification/, definition.id)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      containerDefinitionId: definition.id,
      tubeSupplierProductId: tubeProductId,
      shipperSupplierProductId: shipperProductId,
    })))
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
  it('hides shipped and in-use kits from the initial list while offering a shipped filter', async () => {
    mocks.list.mockResolvedValue([kit, { ...kit, id: 'shipped', kitNumber: 'KIT-SHIPPED', status: 'OnTheWay' }, { ...kit, id: 'used', kitNumber: 'KIT-USED', status: 'InUse' }])
    mount(<StandardKitInventoryPanel apiEnabled />)
    expect(await screen.findByRole('link', { name: kit.kitNumber })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'KIT-SHIPPED' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'KIT-USED' })).toBeNull()
    expect((screen.getByRole('combobox', { name: 'Status' }) as HTMLSelectElement).value).toBe('inventory')
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'shipped' } })
    expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({ search: expect.objectContaining({ kitStatus: 'shipped', kitPage: 1 }) }))
  })
  it('requires an active kit specification and uses its fixed shipper reference', async () => {
    mount(<PrepareStandardKitDialog definitions={[definition, { ...definition, id: 'draft', isActive: false, commonName: 'Draft size' }]} {...callbacks} />)
    expect(screen.queryByRole('option', { name: /Draft size/ })).toBeNull()
    fill(/Kit specification/, definition.id)
    expect(within(screen.getByRole('group', { name: 'Shipping Container' })).getByText(/Synthetic supplier · PRODUCT-20/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Prepare standard kit' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ containerDefinitionId: definition.id, tubeSupplierProductId: tubeProductId, shipperSupplierProductId: shipperProductId, tubeLotNumber: null })))
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('shipmentId')
  })
  it('blocks duplicate barcode scans and capacity excess without registering', async () => { mount(<RegisterStockKitTubesDialog kit={{ ...kit, container: { ...kit.container, capacity: 2 } }} {...callbacks} />); fill(/Permanent tube barcodes/, 'A\na'); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); expect(await screen.findByText('A barcode appears more than once. Scan each physical tube once.')).toBeTruthy(); fill(/Permanent tube barcodes/, 'A\nB\nC'); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); expect(await screen.findByText('Only 2 more tubes fit in this kit.')).toBeTruthy(); expect(mocks.register).not.toHaveBeenCalled() })
  it('registers scanned permanent identities using the displayed kit version', async () => { mount(<RegisterStockKitTubesDialog kit={kit} {...callbacks} />); fill(/Permanent tube barcodes/, '  BARCODE-1\nBARCODE-2  '); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); await waitFor(() => expect(mocks.register).toHaveBeenCalledWith(kit.id, { supplierBarcodes: ['BARCODE-1', 'BARCODE-2'], version: kit.version })) })
  it('keeps Customer location deliveries out of the legacy picker and requires full capacity', async () => { const shipment = { ...shippingFixture, authorizationSource: 'ProspectTrialProject' as const, id: '77777777-7777-4777-8777-777777777771' }; mount(<DispatchStandardKitDialog kit={kit} shipments={[shippingFixture, shipment, { ...shipment, id: '77777777-7777-4777-8777-777777777772' }]} {...callbacks} />); expect(screen.getAllByRole('option')).toHaveLength(2); expect((screen.getByRole('button', { name: 'Record dispatch' }) as HTMLButtonElement).disabled).toBe(true); expect(mocks.dispatch).not.toHaveBeenCalled() })
  it('preserves Trial dispatch with its shipment version and timestamp after tube verification', async () => { const shipment = { ...shippingFixture, authorizationSource: 'ProspectTrialProject' as const, id: '77777777-7777-4777-8777-777777777771' }; const full = { ...kit, container: { ...kit.container, capacity: 1 }, tubes: [{ id: 'tube', supplierBarcode: 'BARCODE-1' }], tubesVerifiedAt: '2026-09-24T12:00:00Z' }; mount(<DispatchStandardKitDialog kit={full} shipments={[shipment]} initialShipmentId={shipment.id} {...callbacks} />); fill(/Carrier/, 'Synthetic carrier'); fill(/Tracking number/, 'TRACK-001'); fireEvent.click(screen.getByRole('button', { name: 'Record dispatch' })); await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledWith(kit.id, expect.objectContaining({ shipmentId: shipment.id, version: kit.version, outboundCarrier: 'Synthetic carrier', outboundTrackingNumber: 'TRACK-001', fulfilledAt: expect.stringMatching(/Z$/) }))) })
  it('retains Partner shipments even when they share the Lab Service authorization source', () => {
    const partner = { ...shippingFixture, organizationKind: 'Partner', authorizationReference: 'PARTNER-JOB' }
    mount(<DispatchStandardKitDialog kit={kit} shipments={[{ ...shippingFixture, organizationKind: 'Customer', authorizationSourceId: 'customer-job' }, partner]} {...callbacks} />)
    expect(screen.getByRole('option', { name: /PARTNER-JOB/ })).toBeTruthy(); expect(screen.getAllByRole('option')).toHaveLength(2)
  })
  it('keeps unsuccessful registration drafts and blocks accidental dirty close', async () => { mocks.register.mockRejectedValue(new Error('Kit changed.')); const close = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false); mount(<RegisterStockKitTubesDialog kit={kit} onClose={close} onSaved={vi.fn()} />); fill(/Permanent tube barcodes/, 'BARCODE-1'); fireEvent.click(screen.getByRole('button', { name: 'Register tubes' })); expect(await screen.findByText('Kit changes were not saved')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).not.toHaveBeenCalled(); expect((screen.getByLabelText(/Permanent tube barcodes/) as HTMLTextAreaElement).value).toBe('BARCODE-1') })
  it('shows dispatched kit facts without registration or dispatch actions', async () => { mocks.get.mockResolvedValue({ ...kit, status: 'OnTheWay', authorizationReference: 'JOB-1' }); mount(<StandardKitDetailPage kitId={kit.id} />); await screen.findByRole('heading', { name: kit.kitNumber }); expect(screen.getByText('On the way')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Register tubes' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Record dispatch' })).toBeNull() })
  it('does not load standard kits for a user without configuration access', () => { mocks.allowed = false; mount(<StandardKitDetailPage kitId={kit.id} />); expect(screen.getByText('A Phaeno configuration administrator is required.')).toBeTruthy(); expect(mocks.get).not.toHaveBeenCalled() })
})
