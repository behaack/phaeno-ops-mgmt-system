import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trialConfiguration } from '#/test-helpers/trials'
import { TrialConfigurationPage } from './TrialConfigurationPage'

const mocks = vi.hoisted(() => ({ queries: vi.fn(), mutate: vi.fn(), refetch: vi.fn() }))
vi.mock('./trial-hooks', () => ({ useTrialQueries: mocks.queries, useTrialMutation: () => ({ mutateAsync: mocks.mutate }) }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a> }))

describe('Trial configuration recovery', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retains an open assignment draft when a background refresh fails', () => {
    const config = { ...trialConfiguration, canAssignPrimary: true, staff: [{ id: 'user-id', name: 'Approver' }] }
    const query = { data: config, error: null as Error | null, isFetching: false, refetch: mocks.refetch }
    mocks.queries.mockImplementation(() => ({ staff: true, config: query }))
    const view = render(<TrialConfigurationPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Assign primary' }))
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Preserve this assignment note' } })
    query.error = new Error('Configuration refresh failed')
    view.rerender(<TrialConfigurationPage />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByLabelText('Note (optional)')).toHaveProperty('value', 'Preserve this assignment note')
    expect(screen.getByRole('button', { name: 'Retry configuration', hidden: true })).toBeTruthy()
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('provides a return link and retry when configuration could not load initially', () => {
    mocks.queries.mockReturnValue({ staff: true, config: { data: undefined, error: new Error('Unavailable'), isFetching: false, refetch: mocks.refetch } })
    render(<TrialConfigurationPage />)
    expect(screen.getByRole('link', { name: 'Back to Trial projects' }).getAttribute('href')).toBe('/trial-projects')
    fireEvent.click(screen.getByRole('button', { name: 'Retry configuration' }))
    expect(mocks.refetch).toHaveBeenCalledOnce()
  })
})
