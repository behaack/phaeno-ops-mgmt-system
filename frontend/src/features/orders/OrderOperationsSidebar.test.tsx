import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noSessionCapabilities } from '#/test-helpers/session'
import { OrderOperationsSidebar } from './OrderOperationsSidebar'

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), capabilities: {} }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ session: { capabilities: mocks.capabilities } }) }))

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mocks.capabilities = { ...noSessionCapabilities, canManageOrderConfiguration: true, canViewTrialProjects: true }
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})
afterEach(() => vi.unstubAllGlobals())

describe('Order operations sidebar', () => {
  it('uses the two CRM-style groups and omits moved auxiliary sections', () => {
    render(<OrderOperationsSidebar section="intake"><p>Order content</p></OrderOperationsSidebar>)
    const navigation = screen.getByRole('navigation', { name: 'Order operations sections' })
    expect(within(navigation).getByRole('heading', { name: 'LAB SERVICES' })).toBeTruthy()
    expect(within(navigation).getByRole('heading', { name: 'PARTNER SERVICES' })).toBeTruthy()
    expect(within(navigation).getAllByRole('button').map(button => button.textContent)).toEqual([
      'Order intakeCommercial intake, pricing, and quotes', 'Trial projectsNo-charge PSeq evaluations',
      'PSeq kitsCommercial status and Lab fulfillment', 'Data assemblyCommercial status and Lab processing',
    ])
    expect(within(navigation).queryByText('Finance')).toBeNull()
    expect(within(navigation).queryByText('Attention')).toBeNull()
    expect(within(navigation).queryByText('Result release')).toBeNull()
    expect(within(navigation).queryByText('Legacy integrations')).toBeNull()
    fireEvent.click(within(navigation).getByRole('button', { name: /^Data assembly/ }))
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/order-operations/partner-services', search: { section: 'assembly' } })
  })

  it('shows only Trials for Business Development without broad queue access', () => {
    mocks.capabilities = { ...noSessionCapabilities, canViewTrialProjects: true }
    render(<OrderOperationsSidebar section="trials"><p>Trial content</p></OrderOperationsSidebar>)
    const navigation = screen.getByRole('navigation', { name: 'Order operations sections' })
    expect(within(navigation).getAllByRole('button')).toHaveLength(1)
    expect(within(navigation).getByRole('button', { name: /^Trial projects/ })).toBeTruthy()
    expect(within(navigation).queryByRole('heading', { name: 'PARTNER SERVICES' })).toBeNull()
  })
})
