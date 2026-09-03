import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CrmShell } from './CrmShell'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: '/crm/opportunities/opportunity-id' } }),
}))

describe('CrmShell', () => {
  beforeEach(() => {
    navigate.mockReset()
    window.localStorage.clear()
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '(min-width: 64rem)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('uses the shared sidebar and preserves route-based section selection', () => {
    render(
      <CrmShell>
        <h1>Opportunity detail</h1>
      </CrmShell>,
    )

    const navigation = screen.getByRole('navigation', {
      name: 'CRM sections',
    })
    expect(
      within(navigation)
        .getByRole('button', { name: /^Opportunities/ })
        .getAttribute('aria-current'),
    ).toBe('page')
    expect(
      within(navigation).getAllByRole('button').map((button) =>
        button.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual([
      'HomeAttention, search, and recent commercial activity',
      'CompaniesOrganizations and relationship context',
      'ContactsPeople and Company associations',
      'LeadsQualification and conversion work',
      'OpportunitiesPipelines, stages, and commercial pursuits',
      'TasksOwned follow-up and reminders',
      'RequestsCompany requests and approvals',
      'ReportsPipeline, conversion, and activity reporting',
      'AdministrationPipelines, views, imports, and data quality',
    ])
    expect(
      within(navigation).getAllByRole('heading').map((heading) =>
        heading.textContent,
      ),
    ).toEqual([
      'Relationships',
      'Sales',
      'Follow-up',
      'Insights',
      'Administration',
    ])

    fireEvent.click(
      within(navigation).getByRole('button', { name: /^Companies/ }),
    )

    expect(navigate).toHaveBeenCalledWith({ to: '/crm/companies' })
  })
})
