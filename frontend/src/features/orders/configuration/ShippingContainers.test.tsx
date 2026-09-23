import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { CatalogSupplier, SupplierProduct } from '#/api/supplier-catalog'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { containerConfiguration as configuration, containerDefinition as baseDefinition } from '#/test-helpers/shipping-containers'
import { ContainerSizesPanel } from './ContainerSizesPanel'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { ShippingContainerDetailPage } from './ShippingContainerDetailPage'
import { containerEffectiveState, latestContainerRevisions } from './shipping-container-utils'

const mocks = vi.hoisted(() => ({ create: vi.fn(), revise: vi.fn(), preview: vi.fn(), list: vi.fn(), get: vi.fn(), history: vi.fn(), deactivate: vi.fn(), navigate: vi.fn(), configuration: vi.fn(), catalog: vi.fn(), allowed: true }))
vi.mock('#/api/supplier-catalog', () => ({ useSupplierCatalog: mocks.catalog }))
vi.mock('#/api/shipping-containers', () => ({ createShippingContainerDefinition: mocks.create, reviseShippingContainerDefinition: mocks.revise, previewContainerRecommendation: mocks.preview, getShippingContainerDefinitions: mocks.list, getShippingContainerDefinition: mocks.get, getShippingContainerRevisions: mocks.history, deactivateShippingContainerDefinition: mocks.deactivate }))
vi.mock('#/api/sample-shipping', () => ({ getSampleShippingConfiguration: mocks.configuration }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageOrderConfiguration: mocks.allowed } } }) }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate, useSearch: () => ({}), Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { containerId: string } }) => <a href={to.replace('$containerId', params?.containerId ?? '')}>{children}</a> }))
function mount(node: ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{node}</QueryClientProvider>) }
function fill(label: RegExp | string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
const product: SupplierProduct = { id: '77777777-7777-4777-8777-777777777771', supplierId: '88888888-8888-4888-8888-888888888881', productNumber: 'PRODUCT-20', description: 'Insulated shipper', kind: 'ShippingContainer', productTypeId: 'shipper-type', productTypeName: 'Shipping Container', productTypeIsActive: true, isActive: true, version: 1 }
const suppliers: CatalogSupplier[] = [
  { id: '88888888-8888-4888-8888-888888888881', name: 'Synthetic supplier', isActive: true, version: 1, products: [product,
    { ...product, id: '77777777-7777-4777-8777-777777777772', productNumber: 'TUBE', kind: 'Tube' },
    { ...product, id: '77777777-7777-4777-8777-777777777774', productNumber: 'LABEL', kind: 'Other', productTypeName: 'Labels' },
    { ...product, id: 'retired', productNumber: 'RETIRED', isActive: false },
    { ...product, id: 'inactive-type', productNumber: 'INACTIVE-TYPE', productTypeIsActive: false }] },
  { id: '88888888-8888-4888-8888-888888888882', name: 'Other supplier', isActive: true, version: 1, products: [{ ...product, id: '77777777-7777-4777-8777-777777777773', supplierId: '88888888-8888-4888-8888-888888888882', productNumber: 'OTHER-10' }] },
  { id: 'inactive', name: 'Inactive supplier', isActive: false, version: 1, products: [product] },
]
const definition = { ...baseDefinition, kitContents: [{ supplierProductId: product.id, supplierId: product.supplierId, supplierName: 'Synthetic supplier', productNumber: product.productNumber, productDescription: product.description, productTypeName: product.productTypeName, kind: product.kind, quantity: 1 }] }
const catalogState = () => ({ data: suppliers, isPending: false, isError: false, isFetching: false, error: null, refetch: vi.fn() })
beforeEach(() => { vi.clearAllMocks(); mocks.catalog.mockReturnValue(catalogState()); mocks.allowed = true; mocks.list.mockResolvedValue([definition]); mocks.get.mockResolvedValue(definition); mocks.history.mockResolvedValue([definition]); mocks.configuration.mockResolvedValue(configuration); mocks.create.mockResolvedValue(definition); mocks.revise.mockResolvedValue({ ...definition, revision: 2 }); mocks.deactivate.mockResolvedValue({ ...definition, isActive: false, deactivatedAt: new Date().toISOString() }) })

describe('controlled shipping container configuration', () => {
  it('keeps discovery form-free and opens a dedicated record', async () => { mount(<ContainerSizesPanel apiEnabled configuration={configuration} />); const link = await screen.findByRole('link', { name: definition.commonName }); expect(link.getAttribute('href')).toBe(`/order-configuration/shipping-containers/${definition.id}`); expect(screen.queryByLabelText(/SKU number/)).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Add container size' })); expect(screen.getByRole('dialog')).toBeTruthy() })
  it('creates a draft preserving leading-zero SKU and exact compatibility pairs', async () => {
    mount(<ShippingContainerEditor source={null} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill(/SKU number/, '000-20'); fill(/Common name/, 'Approved size'); fill(/Usable tube capacity/, '20')
    fireEvent.click(screen.getByRole('checkbox', { name: /Extracted RNA/ }))
    expect((screen.getByRole('checkbox', { name: /Activate this revision/ }) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Save container size' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ sku: '000-20', tubeCapacity: 20, isActive: false, compatibilities: definition.compatibilities.map(pair => ({ ...pair, temperatureControlInstructions: null, packingInstructions: null })) }))
  })
  it.each(['Regular ice: approved container amount.', 'No cooling required.'])('saves flexible control with its exact sample/container combination: %s', async control => {
    const sharedConfiguration = { ...configuration, instructionRules: configuration.instructionRules.map(rule => ({ ...rule, shippingProcedureId: '44444444-4444-4444-8444-444444444444' })) }
    mount(<ShippingContainerEditor source={definition} configuration={sharedConfiguration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    expect(await screen.findByText('Enter the approved temperature control, including when no cooling is needed.')).toBeTruthy()
    expect(mocks.revise).not.toHaveBeenCalled()
    fill(/Temperature control for this container/, control)
    fill(/Packing steps for this combination/, 'Approved sample insert steps.')
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    await waitFor(() => expect(mocks.revise).toHaveBeenCalledWith(definition.id, expect.objectContaining({ compatibilities: [expect.objectContaining({ temperatureControlInstructions: control, packingInstructions: 'Approved sample insert steps.' })] })))
  })
  it('rejects invalid capacity and missing compatibility before saving', async () => { mount(<ShippingContainerEditor source={null} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />); fill(/SKU number/, '002'); fill(/Common name/, 'Size'); fill(/Usable tube capacity/, '0'); fireEvent.click(screen.getByRole('button', { name: 'Save container size' })); expect(await screen.findByText('Enter a usable capacity greater than zero.')).toBeTruthy(); expect(screen.getByText('Select at least one sample and destination assignment.')).toBeTruthy(); expect(mocks.create).not.toHaveBeenCalled() })
  it('revises with the source version, immutable SKU, and retains an unsuccessful draft', async () => { mocks.revise.mockRejectedValue(new Error('Revision changed.')); const close = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false); mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={close} onSaved={vi.fn()} />); expect((screen.getByLabelText(/SKU number/) as HTMLInputElement).disabled).toBe(true); expect(screen.getByRole('region', { name: 'Kit contents' })).toBeTruthy(); fill(/Common name/, 'Updated common name'); fireEvent.click(screen.getByRole('button', { name: 'Save revision' })); expect(await screen.findByText('Container size was not saved')).toBeTruthy(); expect(mocks.revise).toHaveBeenCalledWith(definition.id, expect.objectContaining({ version: definition.version, commonName: 'Updated common name' })); expect(mocks.revise.mock.calls[0][1]).not.toHaveProperty('sku'); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).not.toHaveBeenCalled(); expect((screen.getByLabelText(/Common name/) as HTMLInputElement).value).toBe('Updated common name') })
  it('keeps invalid earlier notes visible and retains the draft', async () => {
    mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill('Earlier container notes', 'N'.repeat(4001))
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    expect((screen.getByLabelText('Earlier container notes') as HTMLTextAreaElement).value).toBe('N'.repeat(4001))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Earlier container notes')))
    expect(mocks.revise).not.toHaveBeenCalled()
  })
  it('offers all active product types and clears a product when its supplier changes', async () => {
    mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    const productSelect = screen.getByRole('combobox', { name: /Product name/ }) as HTMLSelectElement
    expect(productSelect.value).toBe(product.id)
    expect(within(productSelect).getAllByRole('option').map(option => option.textContent)).toEqual(['Select product', 'PRODUCT-20 — Insulated shipper', 'TUBE — Insulated shipper', 'LABEL — Insulated shipper'])
    expect(screen.queryByRole('option', { name: 'Inactive supplier' })).toBeNull()
    fill(/Supplier/, suppliers[1].id)
    expect(productSelect.value).toBe('')
    fill(/Product name/, suppliers[1].products[0].id)
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    await waitFor(() => expect(mocks.revise).toHaveBeenCalledWith(definition.id, expect.objectContaining({ kitContents: [{ supplierProductId: suppliers[1].products[0].id, quantity: 1 }] })))
  })
  it('saves several products across suppliers with independent quantities and removes rows', async () => {
    mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    for (const [supplier, selectedProduct, quantity] of [[suppliers[0], suppliers[0].products[1], '10'], [suppliers[1], suppliers[1].products[0], '3']] as const) {
      fireEvent.click(screen.getByRole('button', { name: 'Add product' }))
      const rows = screen.getAllByRole('group', { name: /^Product / })
      const row = within(rows[rows.length - 1])
      fireEvent.change(row.getByLabelText(/Supplier/), { target: { value: supplier.id } })
      fireEvent.change(row.getByLabelText(/Product name/), { target: { value: selectedProduct.id } })
      fireEvent.change(row.getByLabelText(/Quantity/), { target: { value: quantity } })
    }
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove product 4' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    await waitFor(() => expect(mocks.revise).toHaveBeenCalledWith(definition.id, expect.objectContaining({ kitContents: [
      { supplierProductId: product.id, quantity: 1 }, { supplierProductId: suppliers[0].products[1].id, quantity: 10 }, { supplierProductId: suppliers[1].products[0].id, quantity: 3 },
    ] })))
  })
  it('requires contents for activation but allows an empty draft', async () => {
    mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove product 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    expect(await screen.findByText('Add at least one product before activating this revision.')).toBeTruthy()
    expect(mocks.revise).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText(/Activate this revision/))
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    await waitFor(() => expect(mocks.revise).toHaveBeenCalledWith(definition.id, expect.objectContaining({ isActive: false, kitContents: [] })))
  })
  it('retains unavailable saved products for explanation but rejects a new revision using them', async () => {
    mocks.catalog.mockReturnValue({ ...catalogState(), data: [] })
    mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'PRODUCT-20 (unavailable)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save revision' }))
    expect(await screen.findByText('Choose an active supplier from the catalog.')).toBeTruthy()
    expect(mocks.revise).not.toHaveBeenCalled()
  })
  it('retains the draft and disables choices when the catalog fails, with a retry action', () => {
    const failed = { ...catalogState(), data: undefined, isError: true, error: new Error('Catalog offline') }
    mocks.catalog.mockReturnValue(failed)
    mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Supplier catalog unavailable')).toBeTruthy()
    expect((screen.getByLabelText(/Supplier/) as HTMLSelectElement).disabled).toBe(true)
    expect((screen.getByLabelText(/Product name/) as HTMLSelectElement).value).toBe(product.id)
    fireEvent.click(screen.getByRole('button', { name: 'Retry supplier catalog' }))
    expect(failed.refetch).toHaveBeenCalledOnce()
  })
  it('previews draft context with explicit zero availability while blank stays unknown', async () => {
    mocks.preview.mockResolvedValue({ tubeCount: 30, containerCount: 0, totalCapacity: 0, unusedCapacity: 0, unallocatedTubes: 30, isComplete: false, containers: [], explanation: 'No containers are available.' })
    const second = { ...definition, id: '66666666-6666-4666-8666-666666666661', definitionKey: 'another', commonName: 'Small size', sku: '000-5' }
    mount(<ContainerRecommendationDialog definitions={[definition, second]} configuration={configuration} draftDefinition={{ ...definition, isActive: false }} onClose={vi.fn()} />)
    fill(/Tubes to ship/, '30'); fill(`Available quantity of ${definition.commonName} (${definition.sku})`, '0'); fireEvent.click(screen.getByRole('button', { name: 'Calculate recommendation' }))
    expect(await screen.findByText('30 tubes unallocated')).toBeTruthy()
    expect(mocks.preview).toHaveBeenCalledWith({ tubeCount: 30, contexts: definition.compatibilities, availability: [{ containerDefinitionId: definition.id, quantity: 0 }], includeDraftDefinitionId: definition.id })
    fill(/Tubes to ship/, '20'); await waitFor(() => expect(screen.queryByText('30 tubes unallocated')).toBeNull())
  })
  it.each([false, true])('never overrides eligibility for an active or deactivated revision (deactivated=%s)', async deactivated => {
    mocks.preview.mockResolvedValue({ tubeCount: 1, containerCount: 0, totalCapacity: 0, unusedCapacity: 0, unallocatedTubes: 1, isComplete: false, containers: [], explanation: 'No matching containers.' })
    const source = deactivated ? { ...definition, isActive: false, deactivatedAt: '2026-01-01T00:00:00Z' } : definition
    mount(<ContainerRecommendationDialog definitions={[source]} configuration={configuration} draftDefinition={source} onClose={vi.fn()} />)
    fill(/Tubes to ship/, '1'); fireEvent.click(screen.getByRole('button', { name: 'Calculate recommendation' }))
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledOnce())
    expect(mocks.preview.mock.calls[0][0]).not.toHaveProperty('includeDraftDefinitionId')
    if (deactivated) expect(screen.queryByLabelText(`Available quantity of ${definition.commonName} (${definition.sku})`)).toBeNull()
  })
  it('keeps the live predecessor visible when the newest revision is a draft', async () => {
    mocks.list.mockResolvedValue([definition, { ...definition, id: 'draft', revision: 2, isActive: false }])
    mount(<ContainerSizesPanel apiEnabled configuration={configuration} />)
    expect(await screen.findByText('Revision 1 active')).toBeTruthy()
    expect(screen.getByText('Draft')).toBeTruthy()
  })
  it('requires confirmation and sends the displayed revision version for deactivation', async () => { mount(<ShippingContainerDetailPage containerId={definition.id} />); await screen.findByRole('heading', { name: definition.commonName }); fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' }); fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate revision' })); expect(screen.getByRole('dialog')).toBeTruthy(); expect(mocks.deactivate).not.toHaveBeenCalled(); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate revision' })); await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith(definition.id, definition.version)) })
  it('does not fetch configuration through an unauthorized detail route', () => { mocks.allowed = false; mount(<ShippingContainerDetailPage containerId={definition.id} />); expect(screen.getByText('A Phaeno configuration administrator is required.')).toBeTruthy(); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled() })
  it('distinguishes draft, scheduled, ended, deactivated, and active revisions without mutating history', () => { const draft = { ...definition, id: 'draft', revision: 2, isActive: false }; const all = [definition, draft]; expect(latestContainerRevisions(all)).toEqual([draft]); expect(all).toEqual([definition, draft]); expect(containerEffectiveState(draft)).toBe('Draft'); expect(containerEffectiveState({ ...definition, effectiveFrom: '2099-01-01' })).toBe('Scheduled'); expect(containerEffectiveState({ ...definition, effectiveTo: '2021-01-01' })).toBe('Ended'); expect(containerEffectiveState({ ...draft, deactivatedAt: '2026-01-01' })).toBe('Deactivated'); expect(containerEffectiveState(definition)).toBe('Active now') })
})
