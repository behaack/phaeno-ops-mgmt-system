import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/crm'
import { CrmHomePage } from './CrmHomePage'

vi.mock('#/api/crm', async original => ({ ...await original<typeof api>(), getCrmDashboard: vi.fn(), searchCrm: vi.fn() }))
vi.mock('./use-crm-permissions', () => ({ useCrmPermissions: () => ({ canAccess: true, canAdminister: false }) }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ to, search, children }: { to: string; search?: object; children: ReactNode }) => <a href={`${to}?${new URLSearchParams(Object.entries(search ?? {}).map(([key, value]) => [key, String(value)]))}`}>{children}</a> }))

function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CrmHomePage /></QueryClientProvider>) }
describe('CRM Home attention and search recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(api.getCrmDashboard).mockResolvedValue({ attention: { overdueTasks: 1, dueSoonTasks: 2, leadsNeedingNextAction: 3, staleOpportunities: 4, dataQualityWarnings: 5 }, tasks: [], recentlyChangedOpportunities: [], pipeline: { openOpportunities: 0, wonOpportunities: 0, lostOpportunities: 0, openAmount: 0, weightedForecast: 0, winRate: 0, stages: [] } } as Awaited<ReturnType<typeof api.getCrmDashboard>>)
  })
  it('opens each attention list with its exact matching filter and no administrator link', async () => {
    mount()
    expect((await screen.findByRole('link', { name: '1 Overdue tasks' })).getAttribute('href')).toBe('/crm/tasks?overdue=true&page=1')
    expect(screen.getByRole('link', { name: '2 Due in 7 days' }).getAttribute('href')).toBe('/crm/tasks?dueSoon=true&page=1')
    expect(screen.getByRole('link', { name: '3 Leads needing next action' }).getAttribute('href')).toBe('/crm/leads?needsNextAction=true&page=1')
    expect(screen.getByRole('link', { name: '4 Stale opportunities' }).getAttribute('href')).toBe('/crm/opportunities?stale=true&board=false&page=1')
    expect(screen.queryByText('Data warnings')).toBeNull()
  })
  it('keeps a failed search distinct from no matches and retries the submitted query', async () => {
    vi.mocked(api.searchCrm).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce([])
    mount()
    fireEvent.change(screen.getByLabelText('Search CRM'), { target: { value: 'Acme' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText('Could not load CRM search results')).toBeTruthy()
    expect(screen.queryByText('No CRM records match this search.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry CRM search results' }))
    expect(await screen.findByText('No CRM records match this search.')).toBeTruthy()
    expect(vi.mocked(api.searchCrm).mock.calls.map(call => call[0])).toEqual(['Acme', 'Acme'])
  })
})
