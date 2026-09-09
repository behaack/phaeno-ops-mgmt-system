import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { containerConfiguration as configuration, containerDefinition as definition } from '#/test-helpers/shipping-containers'
import { ContainerSizesPanel } from './ContainerSizesPanel'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { ShippingContainerDetailPage } from './ShippingContainerDetailPage'
import { containerEffectiveState, latestContainerRevisions } from './shipping-container-utils'

const mocks = vi.hoisted(() => ({ create: vi.fn(), revise: vi.fn(), preview: vi.fn(), list: vi.fn(), get: vi.fn(), history: vi.fn(), deactivate: vi.fn(), navigate: vi.fn(), configuration: vi.fn(), allowed: true }))
vi.mock('#/api/shipping-containers', () => ({ createShippingContainerDefinition: mocks.create, reviseShippingContainerDefinition: mocks.revise, previewContainerRecommendation: mocks.preview, getShippingContainerDefinitions: mocks.list, getShippingContainerDefinition: mocks.get, getShippingContainerRevisions: mocks.history, deactivateShippingContainerDefinition: mocks.deactivate }))
vi.mock('#/api/sample-shipping', () => ({ getSampleShippingConfiguration: mocks.configuration }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageOrderConfiguration: mocks.allowed } } }) }))
vi.mock('../use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate, useSearch: () => ({}), Link: ({ children, to, params }: { children: ReactNode; to: string; params?: { containerId: string } }) => <a href={to.replace('$containerId', params?.containerId ?? '')}>{children}</a> }))
function mount(node: ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{node}</QueryClientProvider>) }
function fill(label: RegExp | string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
beforeEach(() => { vi.clearAllMocks(); mocks.allowed = true; mocks.list.mockResolvedValue([definition]); mocks.get.mockResolvedValue(definition); mocks.history.mockResolvedValue([definition]); mocks.configuration.mockResolvedValue(configuration); mocks.create.mockResolvedValue(definition); mocks.revise.mockResolvedValue({ ...definition, revision: 2 }); mocks.deactivate.mockResolvedValue({ ...definition, isActive: false, deactivatedAt: new Date().toISOString() }) })

describe('controlled shipping container configuration', () => {
  it('keeps discovery form-free and opens a dedicated record', async () => { mount(<ContainerSizesPanel apiEnabled configuration={configuration} />); const link = await screen.findByRole('link', { name: definition.commonName }); expect(link.getAttribute('href')).toBe(`/order-configuration/shipping-containers/${definition.id}`); expect(screen.queryByLabelText(/SKU number/)).toBeNull(); fireEvent.click(screen.getByRole('button', { name: 'Add container size' })); expect(screen.getByRole('dialog')).toBeTruthy() })
  it('creates a draft preserving leading-zero SKU and exact compatibility pairs', async () => {
    mount(<ShippingContainerEditor source={null} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill(/SKU number/, '000-20'); fill(/Common name/, 'Approved size'); fill(/Usable tube capacity/, '20')
    fireEvent.click(screen.getByRole('checkbox', { name: /Extracted RNA/ }))
    expect((screen.getByRole('checkbox', { name: /Activate this revision/ }) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Save container size' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ sku: '000-20', tubeCapacity: 20, isActive: false, compatibilities: definition.compatibilities }))
  })
  it('rejects invalid capacity and missing compatibility before saving', async () => { mount(<ShippingContainerEditor source={null} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />); fill(/SKU number/, '002'); fill(/Common name/, 'Size'); fill(/Usable tube capacity/, '0'); fireEvent.click(screen.getByRole('button', { name: 'Save container size' })); expect(await screen.findByText('Enter a usable capacity greater than zero.')).toBeTruthy(); expect(screen.getByText('Select at least one compatible sample and handling rule.')).toBeTruthy(); expect(mocks.create).not.toHaveBeenCalled() })
  it('revises with the source version, immutable SKU, and retains an unsuccessful draft', async () => { mocks.revise.mockRejectedValue(new Error('Revision changed.')); const close = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false); mount(<ShippingContainerEditor source={definition} configuration={configuration} onClose={close} onSaved={vi.fn()} />); expect((screen.getByLabelText(/SKU number/) as HTMLInputElement).disabled).toBe(true); expect(screen.getByText('Supplier and packing').closest('details')!.open).toBe(true); fill(/Common name/, 'Updated common name'); fireEvent.click(screen.getByRole('button', { name: 'Save revision' })); expect(await screen.findByText('Container size was not saved')).toBeTruthy(); expect(mocks.revise).toHaveBeenCalledWith(definition.id, expect.objectContaining({ version: definition.version, commonName: 'Updated common name' })); expect(mocks.revise.mock.calls[0][1]).not.toHaveProperty('sku'); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).not.toHaveBeenCalled(); expect((screen.getByLabelText(/Common name/) as HTMLInputElement).value).toBe('Updated common name') })
  it('reveals and focuses an invalid optional field while retaining the draft', async () => {
    mount(<ShippingContainerEditor source={null} configuration={configuration} onClose={vi.fn()} onSaved={vi.fn()} />)
    fill(/SKU number/, '000-20'); fill(/Common name/, 'Approved size'); fill(/Usable tube capacity/, '20'); fireEvent.click(screen.getByRole('checkbox', { name: /Extracted RNA/ }))
    const details = screen.getByText('Supplier and packing').closest('details')!
    expect(details.open).toBe(false)
    fireEvent.click(screen.getByText('Supplier and packing'))
    fill('Supplier', 'S'.repeat(256)); fireEvent.click(screen.getByText('Supplier and packing'))
    await waitFor(() => expect(details.open).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Save container size' }))
    await waitFor(() => expect(details.open).toBe(true))
    expect((screen.getByLabelText('Supplier') as HTMLInputElement).value).toBe('S'.repeat(256))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Supplier')))
    expect(mocks.create).not.toHaveBeenCalled()
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
  it('requires confirmation and sends the displayed revision version for deactivation', async () => { mount(<ShippingContainerDetailPage containerId={definition.id} />); await screen.findByRole('heading', { name: definition.commonName }); fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false }); fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate revision' })); expect(screen.getByRole('dialog')).toBeTruthy(); expect(mocks.deactivate).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Deactivate revision' })); await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith(definition.id, definition.version)) })
  it('does not fetch configuration through an unauthorized detail route', () => { mocks.allowed = false; mount(<ShippingContainerDetailPage containerId={definition.id} />); expect(screen.getByText('A Phaeno configuration administrator is required.')).toBeTruthy(); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled() })
  it('distinguishes draft, scheduled, ended, deactivated, and active revisions without mutating history', () => { const draft = { ...definition, id: 'draft', revision: 2, isActive: false }; const all = [definition, draft]; expect(latestContainerRevisions(all)).toEqual([draft]); expect(all).toEqual([definition, draft]); expect(containerEffectiveState(draft)).toBe('Draft'); expect(containerEffectiveState({ ...definition, effectiveFrom: '2099-01-01' })).toBe('Scheduled'); expect(containerEffectiveState({ ...definition, effectiveTo: '2021-01-01' })).toBe('Ended'); expect(containerEffectiveState({ ...draft, deactivatedAt: '2026-01-01' })).toBe('Deactivated'); expect(containerEffectiveState(definition)).toBe('Active now') })
})
