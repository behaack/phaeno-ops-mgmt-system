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
      'Home Attention, search, and recent commercial activity',
      'Companies Organizations and relationship context',
      'Contacts People and Company associations',
      'Leads Qualification and conversion work',
      'Opportunities Pipelines, stages, and commercial pursuits',
      'Tasks Owned follow-up and reminders',
      'Reports Pipeline, conversion, and activity reporting',
      'Administration Pipelines, views, imports, and data quality',
    ])

    fireEvent.click(
      within(navigation).getByRole('button', { name: /^Companies/ }),
    )

    expect(navigate).toHaveBeenCalledWith({ to: '/crm/companies' })
  })
})
