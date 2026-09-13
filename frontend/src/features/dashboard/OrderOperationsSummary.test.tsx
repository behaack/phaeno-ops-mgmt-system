import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionCapabilities } from '#/api/session'
import { OrderOperationsSummary } from './OrderOperationsSummary'

const mocks = vi.hoisted(() => ({ commercial: vi.fn() }))
vi.mock('./ConnectedOperationsSummary', () => ({ ConnectedOperationsSummary: (props: unknown) => { mocks.commercial(props); return <p>Commercial intake summary</p> } }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, search }: { children: ReactNode; search: { orderSection: string } }) => <a href={`/order-operations?orderSection=${search.orderSection}`}>{children}</a> }))
beforeEach(() => vi.clearAllMocks())
const capabilities = (values: Partial<SessionCapabilities>) => ({ canViewAllOperationalOrders: true, ...values }) as SessionCapabilities

describe('Order dashboard role access', () => {
  it.each(['canManagePSeqBilling', 'canManagePSeqCash', 'canReconcilePSeqCash'] as const)('shows Finance workspaces for %s without mounting commercial queries', role => {
    render(<OrderOperationsSummary capabilities={capabilities({ [role]: true })} />)
    expect(screen.getByRole('link', { name: 'Finance' }).getAttribute('href')).toContain('orderSection=finance')
    expect(screen.queryByRole('link', { name: 'Order intake' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Result release' })).toBeNull()
    expect(mocks.commercial).not.toHaveBeenCalled()
  })
  it('preserves release navigation without granting commercial intake', () => {
    render(<OrderOperationsSummary capabilities={capabilities({ canReleasePSeqResults: true })} />)
    expect(screen.getByRole('link', { name: 'Result release' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Finance' })).toBeNull()
    expect(mocks.commercial).not.toHaveBeenCalled()
  })
  it('retains administrator intake with separately gated Attention', () => {
    render(<OrderOperationsSummary capabilities={capabilities({ canManageOrderConfiguration: true })} />)
    expect(screen.getByText('Commercial intake summary')).toBeTruthy()
    expect(mocks.commercial).toHaveBeenCalledWith({ section: 'orders', canViewAttention: false })
  })
  it('does not load commercial data before capabilities are available', () => {
    render(<OrderOperationsSummary />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(mocks.commercial).not.toHaveBeenCalled()
  })
})
