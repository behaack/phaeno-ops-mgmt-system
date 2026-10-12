import { render, screen, fireEvent, waitFor } from '#/test-helpers/render-portal'
import { beforeEach, expect, it, vi } from 'vitest'
import { ReagentManufacturingWorkspace } from './ReagentManufacturingWorkspace'
import type { ReagentRun } from '#/api/lab-reagent-manufacturing'

const state = vi.hoisted(() => ({ page: vi.fn(), navigate: vi.fn(), search: { section: 'reagent-runs', reagentPage: 11, reagentSearch: 'buffer', reagentStatus: 'InProgress' } }))
vi.mock('#/api/lab-reagent-manufacturing', async original => ({ ...await original<typeof import('#/api/lab-reagent-manufacturing')>(), listReagentRunsPage: state.page, listReagentWorkflows: async () => [] }))
vi.mock('@tanstack/react-router', async original => ({ ...await original<typeof import('@tanstack/react-router')>(), useNavigate: () => state.navigate,
  useRouterState: ({ select }: { select: (state: { location: { search: unknown } }) => unknown }) => select({ location: { search: state.search } }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  state.page.mockResolvedValue({ items: [{ id: 'older-run', materialName: 'Buffer', lotNumber: 'OLDER-261', workflowName: 'Buffer procedure', workflowRevision: 1, startedAtUtc: '2026-10-01T12:00:00Z', status: 'InProgress' } as ReagentRun], page: 11, pageSize: 25, totalCount: 276 })
})
it('reaches an older run with exact filtered counts and retains its own selection in the detail link', async () => {
  render(<ReagentManufacturingWorkspace enabled canOperate={false} />)
  const link = await screen.findByRole('link', { name: 'Buffer · OLDER-261' })
  expect(state.page).toHaveBeenCalledWith('buffer', 'InProgress', 11)
  expect(link.getAttribute('href')).toContain('reagentPage=11')
  expect(link.getAttribute('href')).toContain('reagentSearch=buffer')
  expect(screen.getByText(/276 records/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(state.navigate).toHaveBeenCalled())
  expect(state.navigate.mock.lastCall![0].search(state.search)).toMatchObject({ section: 'reagent-runs', reagentPage: 12 })
})
it('starts the first filtered page without overwriting another collection selection', async () => {
  render(<ReagentManufacturingWorkspace enabled canOperate={false} />)
  await screen.findByRole('link', { name: 'Buffer · OLDER-261' })
  fireEvent.change(screen.getByLabelText('Search lot or procedure'), { target: { value: 'OLDER-261' } })
  expect(state.navigate.mock.lastCall![0].search({ ...state.search, listPage: 3 })).toMatchObject({ reagentPage: 1, reagentSearch: 'OLDER-261', listPage: 3 })
  fireEvent.change(screen.getByLabelText('Run status'), { target: { value: 'Completed' } })
  expect(state.navigate.mock.lastCall![0].search(state.search)).toMatchObject({ reagentPage: 1, reagentStatus: 'Completed' })
})
