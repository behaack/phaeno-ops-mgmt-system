import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreparationBatchPage } from './PreparationBatchPage'

const state = vi.hoisted(() => ({ canAccess: false, sessionAvailable: true, batch: vi.fn(), resources: vi.fn(), tubes: vi.fn() }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({
  session: state.sessionAvailable ? { capabilities: { canManageLabOperations: state.canAccess } } : null, authProvider: 'clerk',
}) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }))
vi.mock('#/api/lab-preparation', async original => ({ ...await original<typeof import('#/api/lab-preparation')>(), getPreparation: state.batch, findPreparationTubes: state.tubes }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof import('#/api/lab-operations')>(), getLabOperationsDashboard: state.resources }))

function show(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(<QueryClientProvider client={client}><PreparationBatchPage batchId="saved-preparation" /></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks(); state.canAccess = false; state.sessionAvailable = true })

describe('preparation access feedback', () => {
  it('shows the role requirement instead of a disabled-query loading state', () => {
    show()
    expect(screen.getByRole('alert').textContent).toContain('An assigned Phaeno laboratory role is required.')
    expect(screen.getByRole('link', { name: 'Back to dashboard' }).getAttribute('href')).toBe('/')
    expect(screen.queryByText('Loading preparation batch…')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull()
    expect(state.batch).not.toHaveBeenCalled()
  })

  it('does not expose cached staff data or fetch supporting resources without access', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['lab-preparation', 'saved-preparation'], { name: 'STAFF-ONLY-CACHED-BATCH', status: 'Draft', canOperate: true })
    show(client)
    expect(screen.getByRole('alert').textContent).toContain('laboratory role')
    expect(screen.queryByText('STAFF-ONLY-CACHED-BATCH')).toBeNull()
    expect(state.batch).not.toHaveBeenCalled()
    expect(state.resources).not.toHaveBeenCalled()
    expect(state.tubes).not.toHaveBeenCalled()
  })

  it('still requests the batch for an authorized session and shows genuine loading', async () => {
    state.canAccess = true
    state.batch.mockReturnValue(new Promise(() => {}))
    show()
    await waitFor(() => expect(state.batch).toHaveBeenCalledWith('saved-preparation'))
    expect(screen.getByRole('status').textContent).toBe('Loading preparation batch…')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('withholds cached data while the current session is unresolved', () => {
    state.sessionAvailable = false
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['lab-preparation', 'saved-preparation'], { name: 'STAFF-ONLY-CACHED-BATCH', status: 'Draft', canOperate: true })
    show(client)
    expect(screen.getByRole('status').textContent).toBe('Checking laboratory access…')
    expect(screen.queryByText('STAFF-ONLY-CACHED-BATCH')).toBeNull()
    expect(state.resources).not.toHaveBeenCalled()
    expect(state.tubes).not.toHaveBeenCalled()
  })
})
