import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deliveryLocationFixture as location } from '#/test-helpers/transportation-kit-requests'
import { DeliveryLocationEditor } from './DeliveryLocationEditor'
import { DeliveryLocationDetailPage, DeliveryLocationsPage } from './DeliveryLocationsPage'

const mocks = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn(), navigate: vi.fn(), inventory: vi.fn(), receive: vi.fn(), staff: false, admin: true, departmentAdmin: false, wrongDepartment: false, shipmentId: undefined as string | undefined, returnOrderId: undefined as string | undefined }))
vi.mock('#/api/transportation-kit-requests', () => ({ getLocationKitInventory: mocks.inventory, confirmLocationKitsReceived: mocks.receive }))
vi.mock('#/api/customer-delivery-locations', () => ({ getCustomerDeliveryLocations: mocks.list, getCustomerDeliveryLocation: mocks.get, createCustomerDeliveryLocation: mocks.create, updateCustomerDeliveryLocation: mocks.update, deactivateCustomerDeliveryLocation: mocks.deactivate }))
vi.mock('#/api/organization-management', () => ({ listDepartments: async () => [{ id: '10000000-0000-4000-8000-000000000003', name: 'Research' }], getOrganization: async () => ({ name: 'Example Customer' }) }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { state: 'ready', isPlatformAdmin: mocks.staff, capabilities: { canManageOrderConfiguration: mocks.staff }, memberships: [{ organizationId: '10000000-0000-4000-8000-000000000002', organizationName: 'Example Customer', organizationKind: 'Customer', isOrganizationAdmin: mocks.admin, departments: mocks.wrongDepartment ? [] : [{ departmentId: '10000000-0000-4000-8000-000000000003', departmentName: 'Research', isDepartmentAdmin: mocks.departmentAdmin }] }] } }) }))
vi.mock('#/features/orders/use-order-draft-guard', () => ({ useOrderDraftGuard: () => vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate, useSearch: () => ({ organizationId: '10000000-0000-4000-8000-000000000002', departmentId: '10000000-0000-4000-8000-000000000003', shipmentId: mocks.shipmentId, returnOrderId: mocks.returnOrderId }), Link: ({ children, to, params, search }: { children: ReactNode; to: string; params?: Record<string, string>; search?: Record<string, unknown> }) => <a data-search={JSON.stringify(search)} href={Object.entries(params ?? {}).reduce((path, [key, value]) => path.replace(`$${key}`, value), to)}>{children}</a> }))
function mount(node: ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{node}</QueryClientProvider>) }
function fill(label: string, value: string) { fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } }) }
const scope = { organizationId: location.organizationId, departmentId: location.departmentId }
beforeEach(() => { vi.clearAllMocks(); mocks.staff = false; mocks.admin = true; mocks.departmentAdmin = false; mocks.wrongDepartment = false; mocks.shipmentId = undefined; mocks.returnOrderId = undefined; mocks.inventory.mockResolvedValue({ location, kits: [], requests: [], canManageInventory: false }); mocks.list.mockResolvedValue([location]); mocks.get.mockResolvedValue(location); mocks.create.mockResolvedValue(location); mocks.update.mockResolvedValue(location); mocks.deactivate.mockResolvedValue({ ...location, isActive: false, isDefault: false }) })

describe('customer department delivery locations', () => {
  it('returns to the originating Job and selected container without automatically ordering kits', async () => {
    mocks.shipmentId = '30000000-0000-4000-8000-000000000001'
    mocks.returnOrderId = '30000000-0000-4000-8000-000000000002'
    mount(<DeliveryLocationDetailPage locationId={location.id} />)
    await screen.findByText('100 Science Avenue')
    const link = screen.getByRole('link', { name: 'Return to Lab Job' })
    expect(link.getAttribute('href')).toBe(`/lab-services/${mocks.returnOrderId}`)
    expect(JSON.parse(link.getAttribute('data-search')!)).toEqual({ shipmentId: mocks.shipmentId, shippingView: 'tubes' })
    expect(screen.queryByRole('link', { name: 'Return to shipment' })).toBeNull()
    expect(mocks.receive).not.toHaveBeenCalled()
  })
  it('returns from location inventory to the shipment without opening another kit order', async () => {
    mocks.shipmentId = '30000000-0000-4000-8000-000000000001'
    mount(<DeliveryLocationDetailPage locationId={location.id} />)
    await screen.findByText('100 Science Avenue')
    const link = screen.getByRole('link', { name: 'Return to shipment' })
    expect(link.getAttribute('href')).toBe(`/sample-shipping/${mocks.shipmentId}`)
    expect(link.getAttribute('data-search')).toBeNull()
    expect(mocks.receive).not.toHaveBeenCalled()
  })
  it('routes Phaeno staff to their inventory without loading Customer receipt or inventory', async () => {
    mocks.staff = true
    mocks.admin = false
    mount(<DeliveryLocationDetailPage locationId={location.id} />)
    expect((await screen.findByRole('link', { name: 'View Phaeno kit inventory' })).getAttribute('href')).toBe('/lab-operations')
    expect(screen.getByText(/The Customer acknowledges arrival at this location/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Confirm kits received' })).toBeNull()
    expect(mocks.inventory).not.toHaveBeenCalled()
    expect(mocks.receive).not.toHaveBeenCalled()
  })
  it('keeps discovery form-free and opens a dedicated location record', async () => { mount(<DeliveryLocationsPage />); expect((await screen.findByRole('link', { name: location.label })).getAttribute('href')).toBe(`/delivery-locations/${location.id}`); expect(screen.queryByLabelText(/Street address/)).toBeNull(); expect(mocks.list).toHaveBeenCalledWith(scope) })
  it.each(['staff', 'departmentAdmin'] as const)('permits the supported %s management entry point', async role => { mocks.admin = false; mocks[role] = true; mount(<DeliveryLocationsPage />); expect(await screen.findByRole('button', { name: 'Add delivery location' })).toBeTruthy() })
  it('keeps an ordinary department member view-only', async () => { mocks.admin = false; mount(<DeliveryLocationDetailPage locationId={location.id} />); expect(await screen.findByText('100 Science Avenue')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Edit location' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Location actions' })).toBeNull() })
  it('does not load another department when the viewer has no access', () => { mocks.admin = false; mocks.wrongDepartment = true; mount(<DeliveryLocationsPage />); expect(screen.getByText('Delivery locations unavailable')).toBeTruthy(); expect(mocks.list).not.toHaveBeenCalled() })
  it('validates the required delivery address and country before any write', async () => { mount(<DeliveryLocationEditor scope={scope} source={null} departmentName="Research" onClose={vi.fn()} onSaved={vi.fn()} />); fireEvent.click(screen.getByRole('button', { name: 'Add delivery location' })); expect(await screen.findByText('Enter a location name.')).toBeTruthy(); expect(screen.getByText('Enter the two-letter country code, such as US.')).toBeTruthy(); expect(mocks.create).not.toHaveBeenCalled() })
  it('saves a department-owned address using the displayed version and normalized optional fields', async () => { mount(<DeliveryLocationEditor scope={scope} source={location} departmentName="Research" onClose={vi.fn()} onSaved={vi.fn()} />); fill('Location name', '  Receiving desk  '); fill('Suite, floor, or building', ''); fill('Country code', 'us'); fireEvent.click(screen.getByRole('button', { name: 'Save changes' })); await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(location.id, expect.objectContaining({ ...scope, version: 2, label: 'Receiving desk', line2: null, countryCode: 'US', isDefault: true }))) })
  it('retains entered data after a concurrency failure and protects dirty close', async () => { const close = vi.fn(); vi.spyOn(window, 'confirm').mockReturnValue(false); mocks.update.mockRejectedValue(new Error('Location changed. Refresh before saving.')); mount(<DeliveryLocationEditor scope={scope} source={location} departmentName="Research" onClose={close} onSaved={vi.fn()} />); fill('Street address', '200 New Address'); fireEvent.click(screen.getByRole('button', { name: 'Save changes' })); expect(await screen.findByText('Delivery location was not saved')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).not.toHaveBeenCalled(); expect((screen.getByLabelText(/Street address/) as HTMLInputElement).value).toBe('200 New Address') })
})
