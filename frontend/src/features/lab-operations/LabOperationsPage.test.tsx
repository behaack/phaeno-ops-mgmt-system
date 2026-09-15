import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { LabOperationsPage } from './LabOperationsPage'

const api = vi.hoisted(() => ({ dashboard: vi.fn().mockRejectedValue(new Error('Laboratory role required')) }))
vi.mock('#/api/lab-operations', async importOriginal => ({ ...await importOriginal<object>(), getLabOperationsDashboard: api.dashboard }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageLabOperations: true, canManageOrderConfiguration: true, canOperateLabWork: false } } }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), Link: ({ children }: { children: ReactNode }) => <a href="#test">{children}</a> }))
vi.mock('#/components/WorkspaceSidebar', () => ({ WorkspaceSidebar: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('./LabReceiptAccessionPanel', () => ({ LabReceiptAccessionPanel: ({ canManageKitSupply, apiEnabled }: { canManageKitSupply: boolean; apiEnabled: boolean }) => canManageKitSupply && apiEnabled ? <p>Authorized kit queues</p> : null }))

it('opens fulfillment queues without requiring a laboratory dashboard role', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><LabOperationsPage section="receipt" receiptTab="kit-requests" onSectionChange={vi.fn()} /></QueryClientProvider>)
  expect(await screen.findByText('Authorized kit queues')).toBeTruthy()
  expect(api.dashboard).not.toHaveBeenCalled()
})
