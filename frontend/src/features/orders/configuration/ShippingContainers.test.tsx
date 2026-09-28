import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { shippingContainerProductTypeId, type CatalogSupplier, type SupplierProduct } from '#/api/supplier-catalog'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { containerConfiguration as configuration, containerDefinition as baseDefinition } from '#/test-helpers/shipping-containers'
import { ContainerSizesPanel } from './ContainerSizesPanel'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { ShippingContainerDetailPage } from './ShippingContainerDetailPage'
import { containerEffectiveState, latestContainerRevisions } from './shipping-container-utils'

const mocks = vi.hoisted(() => ({ create: vi.fn(), revise: vi.fn(), update: vi.fn(), discard: vi.fn(), preview: vi.fn(), list: vi.fn(), get: vi.fn(), history: vi.fn(), activate: vi.fn(), deactivate: vi.fn(), navigate: vi.fn(), configuration: vi.fn(), catalog: vi.fn(), workflows: vi.fn(), allowed: true, search: {} as Record<string, unknown> }))
vi.mock('#/api/supplier-catalog', async importOriginal => ({ ...await importOriginal<typeof import('#/api/supplier-catalog')>(), useSupplierCatalog: mocks.catalog }))
vi.mock('#/api/lab-kit-assembly', async importOriginal => ({ ...await importOriginal<typeof import('#/api/lab-kit-assembly')>(), getKitAssemblyWorkflows: mocks.workflows }))
vi.mock('#/api/shipping-containers', () => ({ createShippingContainerDefinition: mocks.create, reviseShippingContainerDefinition: mocks.revise, updateShippingContainerDraft: mocks.update, discardShippingContainerDraft: mocks.discard, previewContainerRecommendation: mocks.preview, getShippingContainerDefinitions: mocks.list, getShippingContainerDefinition: mocks.get, getShippingContainerRevisions: mocks.history, activateShippingContainerDefinition: mocks.activate, deactivateShippingContainerDefinition: mocks.deactivate }))
vi.mock('#/api/sample-shipping', () => ({ getSampleShippingConfiguration: mocks.configuration }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageOrderConfiguration: mocks.allowed } } }) }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate, useSearch: () => mocks.search, Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { containerId: string } }) => <a href={to.replace('$containerId', params?.containerId ?? '')}>{children}</a> }))
function mount(node: ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{node}</QueryClientProvider>) }
function fill(label: RegExp | string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
const product: SupplierProduct = { id: '77777777-7777-4777-8777-777777777771', supplierId: '88888888-8888-4888-8888-888888888881', productNumber: 'PRODUCT-20', description: 'Insulated shipper', kind: 'ShippingContainer', tubeCapacity: 20, defaultQuantityUnit: 'each', productTypeId: 'shipper-type', productTypeName: 'Shipping Container', productTypeIsActive: true, isActive: true, version: 1 }
const selectedContainerProduct: SupplierProduct = { ...product, id: '77777777-7777-4777-8777-777777777775', supplierId: '88888888-8888-4888-8888-888888888885', productNumber: '000-20', description: 'Approved 20-tube container', kind: 'ShippingContainer', productTypeId: shippingContainerProductTypeId, productTypeName: 'Shipping Container', productTypeIsActive: true }
const suppliers: CatalogSupplier[] = [
  { id: '88888888-8888-4888-8888-888888888881', name: 'Synthetic supplier', isActive: true, version: 1, products: [product,
    { ...product, id: '77777777-7777-4777-8777-777777777772', productNumber: 'TUBE', kind: 'Tube' },
    { ...product, id: '77777777-7777-4777-8777-777777777774', productNumber: 'LABEL', kind: 'Other', productTypeName: 'Labels' },
    { ...product, id: 'retired', productNumber: 'RETIRED', isActive: false },
    { ...product, id: 'inactive-type', productNumber: 'INACTIVE-TYPE', productTypeIsActive: false }] },
  { id: '88888888-8888-4888-8888-888888888882', name: 'Other supplier', isActive: true, version: 1, products: [{ ...product, id: '77777777-7777-4777-8777-777777777773', supplierId: '88888888-8888-4888-8888-888888888882', productNumber: 'OTHER-10' }] },
  { id: 'inactive', name: 'Inactive supplier', isActive: false, version: 1, products: [product] },
  { id: selectedContainerProduct.supplierId, name: 'Containers R US', isInternalProducer: false, isActive: true, version: 1, products: [selectedContainerProduct] },
]
const definition = { ...baseDefinition, kitContents: [{ supplierProductId: product.id, supplierId: product.supplierId, supplierName: 'Synthetic supplier', productNumber: product.productNumber, productDescription: product.description, productTypeName: product.productTypeName, kind: product.kind, quantity: 1 }] }
const named = { ...definition, shippingContainerProductId: selectedContainerProduct.id }
const draft = { ...named, id: 'draft-revision', revision: 2, supersedesDefinitionId: named.id, commonName: 'Revised kit', lifecycle: 'Draft' as const, isActive: false }
const catalogState = () => ({ data: suppliers, isPending: false, isError: false, isFetching: false, error: null, refetch: vi.fn() })
beforeEach(() => { vi.clearAllMocks(); mocks.search = {}; mocks.catalog.mockReturnValue(catalogState()); mocks.workflows.mockResolvedValue([]); mocks.allowed = true; mocks.list.mockResolvedValue([definition]); mocks.get.mockResolvedValue(definition); mocks.history.mockResolvedValue([definition]); mocks.configuration.mockResolvedValue(configuration); mocks.create.mockResolvedValue(draft); mocks.revise.mockResolvedValue(draft); mocks.update.mockResolvedValue(draft); mocks.discard.mockResolvedValue(draft); mocks.activate.mockResolvedValue({ ...draft, lifecycle: 'Released', isActive: true }); mocks.deactivate.mockResolvedValue({ ...definition, isActive: false, deactivatedAt: new Date().toISOString() }) })

describe('controlled shipping container configuration', () => {
  it('keeps discovery form-free and opens a dedicated record', async () => { mount(<ContainerSizesPanel apiEnabled configuration={configuration} />); const link = await screen.findByRole('link', { name: definition.commonName }); expect(link.getAttribute('href')).toBe(`/sample-shipping-settings/kit-specifications/${definition.id}`); const identityCell = link.closest('td')!; expect(within(identityCell).getByText(`SKU ${definition.sku} · rev ${definition.revision}`)).toBeTruthy(); expect(within(identityCell).getByText('Active')).toBeTruthy(); expect(screen.queryByRole('columnheader', { name: 'Status' })).toBeNull(); expect(screen.queryByLabelText(/SKU number/)).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Add Transportation kit' })); expect(screen.getByRole('dialog')).toBeTruthy() })
  it('puts Preview recommendation first in row Actions', async () => {
    mount(<ContainerSizesPanel apiEnabled configuration={configuration} />)
    fireEvent.keyDown(await screen.findByRole('button', { name: `Actions for ${definition.commonName}` }), { key: 'ArrowDown' })
    expect((await screen.findAllByRole('menuitem'))[0].textContent).toBe('Preview recommendation')
  })
  it('retains the draft and disables choices when the catalog fails, with a retry action', () => {
    const failed = { ...catalogState(), data: undefined, isError: true, error: new Error('Catalog offline') }
    mocks.catalog.mockReturnValue(failed)
    mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('Supplier catalog unavailable')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry supplier catalog' }))
    expect(failed.refetch).toHaveBeenCalledOnce()
  })
  it('previews draft context with explicit zero availability while blank stays unknown', async () => {
    mocks.preview.mockResolvedValue({ tubeCount: 30, containerCount: 0, totalCapacity: 0, unusedCapacity: 0, unallocatedTubes: 30, isComplete: false, containers: [], explanation: 'No containers are available.' })
    const second = { ...definition, id: '66666666-6666-4666-8666-666666666661', definitionKey: 'another', commonName: 'Small size', sku: '000-5' }
    mount(<ContainerRecommendationDialog definitions={[definition, second]} configuration={configuration} draftDefinition={{ ...definition, isActive: false }} onClose={vi.fn()} />)
    fill(/Tubes to ship/, '30'); fill(`Available quantity of ${definition.commonName} (${definition.sku})`, '0'); fireEvent.click(screen.getByRole('button', { name: 'Calculate recommendation' }))
    expect(await screen.findByText('30 tubes unallocated')).toBeTruthy()
    expect(mocks.preview).toHaveBeenCalledWith({ tubeCount: 30, contexts: [{ sampleTypeDefinitionId: configuration.sampleTypes[0].id }], availability: [{ containerDefinitionId: definition.id, quantity: 0 }], includeDraftDefinitionId: definition.id })
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
  it('hides inactive latest specifications by default and offers Show inactive', async () => {
    const inactive = { ...definition, id: 'inactive-kit', definitionKey: 'inactive-kit', commonName: 'Inactive kit', isActive: false }
    mocks.list.mockResolvedValue([definition, inactive])
    mount(<ContainerSizesPanel apiEnabled configuration={configuration} />)
    expect(await screen.findByRole('link', { name: definition.commonName })).toBeTruthy()
    expect(screen.queryByRole('link', { name: inactive.commonName })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show inactive' }))
    expect(mocks.navigate).toHaveBeenCalledWith(expect.objectContaining({ search: expect.objectContaining({ containerShowInactive: true, containerPage: 1 }) }))
  })
  it('requires confirmation and sends the displayed revision version for deactivation', async () => { mount(<ShippingContainerDetailPage containerId={definition.id} />); await screen.findByRole('heading', { name: definition.commonName }); fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' }); fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' })); expect(screen.getByRole('dialog', { name: 'Deactivate kit specification?' })).toBeTruthy(); expect(mocks.deactivate).not.toHaveBeenCalled(); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' })); await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith(definition.id, definition.version)) })
  it('offers the active predecessor in detail Actions when the latest revision is a draft', async () => {
    const draft = { ...definition, id: 'draft', revision: 2, isActive: false }
    mocks.get.mockResolvedValue(draft)
    mocks.history.mockResolvedValue([draft, definition])
    mocks.list.mockResolvedValue([draft, definition])
    mount(<ShippingContainerDetailPage containerId={draft.id} />)
    await screen.findByRole('heading', { name: draft.commonName })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate active specification (rev 1)' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Deactivate kit specification?' })).getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith(definition.id, definition.version))
  })
  it('does not fetch configuration through an unauthorized detail route', () => { mocks.allowed = false; mount(<ShippingContainerDetailPage containerId={definition.id} />); expect(screen.getByText('A Phaeno configuration administrator is required.')).toBeTruthy(); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled() })
  it('distinguishes draft, scheduled, ended, deactivated, and active revisions without mutating history', () => { const draft = { ...definition, id: 'draft', revision: 2, isActive: false }; const all = [definition, draft]; expect(latestContainerRevisions(all)).toEqual([draft]); expect(all).toEqual([definition, draft]); expect(containerEffectiveState(draft)).toBe('Draft'); expect(containerEffectiveState({ ...definition, effectiveFrom: '2099-01-01' })).toBe('Scheduled'); expect(containerEffectiveState({ ...definition, effectiveTo: '2021-01-01' })).toBe('Ended'); expect(containerEffectiveState({ ...draft, deactivatedAt: '2026-01-01' })).toBe('Deactivated'); expect(containerEffectiveState(definition)).toBe('Active now') })
  it('creates an incomplete Draft and chooses its Sample type in the editor', async () => {
    mount(<ShippingContainerEditor source={null} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill(/Kit specification name/, 'Complete kit')
    fill(/Kit SKU/, 'KIT-20')
    fill(/^Container supplier/, selectedContainerProduct.supplierId)
    fill(/^Shipping Container/, selectedContainerProduct.id)
    fill('Sample type', configuration.sampleTypes[0].id)
    fill(/Usable tube capacity/, '20')
    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ shippingContainerProductId: selectedContainerProduct.id, sku: 'KIT-20', commonName: 'Complete kit', sampleTypeDefinitionId: configuration.sampleTypes[0].id, tubeCapacity: 20, isActive: false })))
  })
  it('saves a Draft before a Sample type or assembly workflow is ready', async () => {
    mount(<ShippingContainerEditor source={null} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill(/Kit specification name/, 'Draft kit')
    fill(/Kit SKU/, 'DRAFT-20')
    fill(/^Container supplier/, selectedContainerProduct.supplierId)
    fill(/^Shipping Container/, selectedContainerProduct.id)
    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ sampleTypeDefinitionId: null, isActive: false })))
    expect(mocks.activate).not.toHaveBeenCalled()
  })
  it('edits a Draft in place with its original version', async () => {
    mount(<ShippingContainerEditor source={draft} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill(/Kit specification name/, 'Updated kit name')
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(draft.id, draft.version, expect.objectContaining({ commonName: 'Updated kit name', isActive: false })))
    expect(mocks.revise).not.toHaveBeenCalled()
  })
  it('retains an unsuccessful Draft edit', async () => {
    mocks.update.mockRejectedValue(new Error('Revision changed.'))
    mount(<ShippingContainerEditor source={draft} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill(/Kit specification name/, 'Retained name')
    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
    expect(await screen.findByText('Kit specification was not saved')).toBeTruthy()
    expect((screen.getByLabelText(/Kit specification name/) as HTMLInputElement).value).toBe('Retained name')
  })
  it('keeps an active predecessor visible and offers Draft activation in row Actions', async () => {
    mocks.list.mockResolvedValue([named, draft])
    mount(<ContainerSizesPanel apiEnabled configuration={configuration} />)
    expect(await screen.findByRole('link', { name: named.commonName })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Draft revision 2' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: `Actions for ${named.commonName}` }), { key: 'ArrowDown' })
    expect(await screen.findByRole('menuitem', { name: 'Edit Draft revision 2' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Activate revision 2' }))
    expect(mocks.activate).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Activate kit specification?' })).getByRole('button', { name: 'Activate' }))
    await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith(draft.id, draft.version))
  })
  it('requires a selected Sample type before activating a Draft', async () => {
    const unlinked = { ...draft, sampleTypeAnchorId: null }
    mocks.list.mockResolvedValue([unlinked])
    mount(<ContainerSizesPanel apiEnabled configuration={configuration} />)
    fireEvent.keyDown(await screen.findByRole('button', { name: `Actions for ${unlinked.commonName}` }), { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: 'Activate (select Sample type first)' }).getAttribute('data-disabled')).toBe('')
  })
  it('shows an amber workflow warning while allowing kit orders', async () => {
    mocks.list.mockResolvedValue([{ ...named, assemblyWorkflowReady: false }])
    mount(<ContainerSizesPanel apiEnabled configuration={configuration} />)
    expect(await screen.findByText(/Assembly workflow pending/)).toBeTruthy()
    expect(screen.getByText(/Orders can be placed, but new physical Phaeno kits cannot be prepared yet/)).toBeTruthy()
  })
  it('shows an activation action on a Draft detail page', async () => {
    mocks.get.mockResolvedValue(draft); mocks.history.mockResolvedValue([draft, named]); mocks.list.mockResolvedValue([draft, named])
    mount(<ShippingContainerDetailPage containerId={draft.id} />)
    await screen.findByRole('heading', { name: draft.commonName })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Activate kit specification?' })).getByRole('button', { name: 'Activate' }))
    await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith(draft.id, draft.version))
  })
})
