import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WebOpsDashboardContent } from './WebOpsDashboardContent'
import type { WebOpsDashboard } from '#/api/web-ops'

const dashboard: WebOpsDashboard = {
  mailingListCount: 8,
  demoRequestCount: 3,
  mailingListContacts: [
    {
      id: 'contact-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      organizationName: 'Analytical Engines',
      email: 'ada@example.com',
      technicalBriefRequested: true,
      createdAtUtc: '2026-07-17T17:00:00Z',
    },
  ],
  demoRequests: [
    {
      id: 'request-1',
      firstName: 'Grace',
      lastName: 'Hopper',
      organizationName: 'Compiler Labs',
      email: 'grace@example.com',
      description: 'Please arrange a PSeq demonstration.',
    },
  ],
}

describe('WebOpsDashboardContent', () => {
  it('shows bounded mailing-list and demo-request intake', () => {
    render(
      <WebOpsDashboardContent
        data={dashboard}
        error={null}
        isLoading={false}
        isMockData
        onRetry={() => undefined}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Web Operations' }),
    ).toBeTruthy()
    expect(screen.getByText('Mailing List')).toBeTruthy()
    expect(screen.getByText('Demo Requests')).toBeTruthy()
    expect(screen.getByText('Mock data')).toBeTruthy()
    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(screen.getByText('Technical brief')).toBeTruthy()
    expect(screen.getByText('Compiler Labs')).toBeTruthy()
    expect(
      screen.getByText('Please arrange a PSeq demonstration.'),
    ).toBeTruthy()
    expect(screen.getByText('Showing 1 of 8 signups.')).toBeTruthy()
    expect(screen.getByText('Showing 1 of 3 requests.')).toBeTruthy()
  })

  it('offers a retry when secured intake cannot be loaded', () => {
    const retry = vi.fn()

    render(
      <WebOpsDashboardContent
        error={new Error('Unavailable')}
        isLoading={false}
        onRetry={retry}
      />,
    )

    expect(
      screen.getByRole('alert').textContent,
    ).toContain('Web Operations intake could not be loaded')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
