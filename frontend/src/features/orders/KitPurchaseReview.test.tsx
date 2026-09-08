import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ReagentOrderCreatePage } from './ReagentOrderCreatePage'
import { bundleConfiguration, bundleIds, bundleKitOrder } from '#/test-helpers/bundled-orders'
import type { ReagentOrder } from '#/api/order-management'

const mocks = vi.hoisted(() => ({ orgAdmin: true, get: vi.fn(), offerings: vi.fn(), addresses: vi.fn(), update: vi.fn(), place: vi.fn(), navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>, useBlocker: vi.fn(), useNavigate: () => mocks.navigate }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canCreateReagentOrders: true }, selectedOrganization: { organizationId: bundleIds.organization }, memberships: [{ organizationId: bundleIds.organization, isOrganizationAdmin: mocks.orgAdmin }] } }) }))
vi.mock('#/api/order-management', async original => ({ ...await original<typeof import('#/api/order-management')>(), getReagentOrder: mocks.get, listReagentOfferings: mocks.offerings, listShippingAddresses: mocks.addresses, updateReagentOrder: mocks.update, placeReagentOrder: mocks.place }))
const draft: ReagentOrder = { ...bundleKitOrder, status: 'Draft', canEdit: true, canPlace: true, placedAt: null, shippingAddressId: bundleIds.unit, lines: [{ id: bundleIds.offering, offeringId: bundleIds.offering, qboCatalogItemId: bundleIds.catalog, externalItemId: 'TRAINING-KIT', description: 'Training PSeq Kit', quantity: 1, unit: 'kit', unitPrice: 100, currency: 'USD', lineTotal: 100, note: null, shippedQuantity: 0, cancelledQuantity: 0, remainingQuantity: 1, estimatedShipDate: null, version: 1, includedOfferingVersion: 5, includedAssemblyProfileId: bundleIds.profile, includedAssemblyProfileVersion: 2 }] }
beforeEach(() => {
  vi.clearAllMocks(); mocks.orgAdmin = true
  mocks.get.mockResolvedValue(structuredClone(draft))
  mocks.offerings.mockResolvedValue(structuredClone(bundleConfiguration.reagentOfferings))
  mocks.addresses.mockResolvedValue([{ id: bundleIds.unit, label: 'Training receiving', recipient: 'Training laboratory', line1: '100 Example Lane', city: 'Example', region: 'CA', postalCode: '90000', countryCode: 'US', version: 1 }])
})
function show() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><ReagentOrderCreatePage orderId={bundleIds.order} /></QueryClientProvider>) }

it('requires a new review when the included profile changed without a price change', async () => {
  mocks.update.mockResolvedValue({ ...draft, version: 4, lines: [{ ...draft.lines[0], includedAssemblyProfileVersion: 3 }] })
  show()
  await waitFor(() => expect(screen.getByRole('combobox', { name: /Shipping address/ })).toHaveProperty('value', bundleIds.unit))
  fireEvent.click(screen.getByRole('button', { name: 'Review PSeq Kit order' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect(dialog.getByText(/Training transcript assembly version 2/)).toBeTruthy()
  fireEvent.click(dialog.getByRole('button', { name: 'Place PSeq Kit order' }))
  expect(await dialog.findByText('Kit order was not placed')).toBeTruthy()
  expect(dialog.getByText(/kit price or included scope changed/)).toBeTruthy()
  expect(mocks.place).not.toHaveBeenCalled()
  expect(mocks.update).toHaveBeenCalledTimes(1)
})

it('lets a Department administrator prepare a draft while requiring an organization administrator to place it', async () => {
  mocks.orgAdmin = false
  mocks.get.mockResolvedValue({ ...draft, canPlace: false })
  show()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save draft' })).toHaveProperty('disabled', false))
  expect(screen.getByRole('button', { name: 'Review PSeq Kit order' })).toHaveProperty('disabled', true)
  expect(screen.getByText(/Department administrators may prepare and save a draft/)).toBeTruthy()
  expect(mocks.place).not.toHaveBeenCalled()
})
