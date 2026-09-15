import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ServiceWorkflowVersionBuilderPage } from './ServiceWorkflowVersionBuilderPage'

const api = vi.hoisted(() => ({ dashboard: vi.fn(), update: vi.fn(), navigate: vi.fn() }))
vi.mock('#/api/lab-operations', () => ({ getLabOperationsDashboard: api.dashboard, updateLabServiceWorkflowVersion: api.update, createLabServiceWorkflowVersion: vi.fn(), getLabOperationsError: (_: unknown, fallback: string) => fallback }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canManageLabProtocols: true } } }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => api.navigate, Link: ({ children }: { children: ReactNode }) => <a href="#workflows">{children}</a> }))

describe('empty Invalid workflow recovery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts a new workflow with one blank stage', async () => {
    api.dashboard.mockResolvedValue({ protocols: [], serviceWorkflows: [{ id: 'w', name: 'New workflow', serviceKey: 'test-only', latestVersion: 0, version: 1, versions: [] }] })
    render(<StrictMode><QueryClientProvider client={new QueryClient()}><ServiceWorkflowVersionBuilderPage workflowId="w" /></QueryClientProvider></StrictMode>)
    await screen.findByRole('heading', { name: 'New workflow · workflow v1' })
    await waitFor(() => expect(screen.getAllByLabelText(/^Stage name/)).toHaveLength(1))
    expect((screen.getByLabelText(/^Stage name/) as HTMLInputElement).value).toBe('')
    expect(api.update).not.toHaveBeenCalled()
  })

  it('adds exactly one stage and saves it without an extra blank stage', async () => {
    const dashboard = { protocols: [{ id: 'p', name: 'Eligible protocol', retiredAtUtc: null, versions: [{ id: 'pv', protocolVersion: 1, status: 'Approved' }] }], serviceWorkflows: [{ id: 'w', name: 'Recover workflow', serviceKey: 'test-only', latestVersion: 2, version: 5, versions: [{ id: 'v', workflowVersion: 2, status: 'Invalid', stages: [] }] }] }
    api.dashboard.mockResolvedValue(dashboard)
    api.update.mockResolvedValue(dashboard.serviceWorkflows[0])
    render(<StrictMode><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ServiceWorkflowVersionBuilderPage workflowId="w" draftVersionId="v" /></QueryClientProvider></StrictMode>)
    await screen.findByRole('heading', { name: 'Recover workflow · workflow v2' })
    await waitFor(() => expect(screen.queryAllByLabelText(/^Stage name/)).toHaveLength(0))
    fireEvent.click(screen.getByRole('button', { name: 'Add stage' }))
    expect(screen.getAllByLabelText(/^Stage name/)).toHaveLength(1)
    fireEvent.change(screen.getByLabelText(/^Stage name/), { target: { value: 'Replacement' } })
    fireEvent.change(screen.getByLabelText(/^Protocol version/), { target: { value: 'pv' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('v', { workflowVersion: 5, stages: [{ name: 'Replacement', labProtocolVersionId: 'pv', requirement: 'Required', condition: null, handoffCriteria: null }] }))
    expect(api.update).toHaveBeenCalledTimes(1)
  })
})
