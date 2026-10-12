import { render, screen, fireEvent, waitFor } from '#/test-helpers/render-portal'
import { beforeEach, expect, it, vi } from 'vitest'
import { SampleShippingPage } from './SampleShippingPage'
import { shippingFixture } from '#/test-helpers/sample-shipping'
const state = vi.hoisted(() => ({ page: vi.fn(), navigate: vi.fn(), search: { listPage: 11, listSearch: '', listStatus: '' } }))
vi.mock('#/api/sample-shipping', () => ({ getSampleShipmentPage: state.page }))
vi.mock('@tanstack/react-router', async original => ({ ...await original<typeof import('@tanstack/react-router')>(), useNavigate: () => state.navigate,
  useRouterState: ({ select }: { select: (state: { location: { search: unknown } }) => unknown }) => select({ location: { search: state.search } }),
}))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', selectedOrganizationId: 'customer', selectedDepartmentId: 'research', session: { capabilities: { canViewSampleShipping: true } } }) }))
beforeEach(() => {
  vi.clearAllMocks()
  state.search = { listPage: 11, listSearch: '', listStatus: '' }
  state.page.mockResolvedValue({ items: [{ ...shippingFixture, shipmentNumber: 'SHIP-OLDER-251' }], totalCount: 276, page: 11, pageSize: 25 })
})
it('discovers a record beyond the former ceiling and retains filters for the detail link', async () => {
  render(<SampleShippingPage />)
  const link = await screen.findByRole('link', { name: 'SHIP-OLDER-251' })
  expect(link.getAttribute('href')).toContain('listPage=11')
  expect(state.page).toHaveBeenCalledWith('', '', 11)
  expect(screen.getByText(/276 records/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(state.navigate).toHaveBeenCalled())
  expect(state.navigate.mock.lastCall![0].search(state.search)).toMatchObject({ listPage: 12 })
})
it('resets the page when search or status changes', async () => {
  render(<SampleShippingPage />)
  await screen.findByRole('link', { name: 'SHIP-OLDER-251' })
  fireEvent.change(screen.getByLabelText('Search shipments or Job reference'), { target: { value: 'JOB-42' } })
  expect(state.navigate.mock.lastCall![0].search(state.search)).toMatchObject({ listPage: 1, listSearch: 'JOB-42' })
  fireEvent.change(screen.getByLabelText('Shipment status'), { target: { value: 'Received' } })
  expect(state.navigate.mock.lastCall![0].search(state.search)).toMatchObject({ listPage: 1, listStatus: 'Received' })
})
