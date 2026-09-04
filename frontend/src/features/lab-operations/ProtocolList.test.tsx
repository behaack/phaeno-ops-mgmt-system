import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { LabProtocol } from '#/api/lab-operations'

import { ProtocolList } from './LabOperationsPage'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#protocol">{children}</a>,
  useNavigate: () => vi.fn(),
}))

const unconfiguredProtocol: LabProtocol = {
  id: '11111111-1111-4111-8111-111111111111',
  key: 'example-protocol',
  name: 'Example protocol',
  description: 'Example controlled procedure.',
  latestVersion: 0,
  versions: [],
  version: 1,
}

describe('ProtocolList', () => {
  it('presents a protocol without a definition as unconfigured', () => {
    renderList(unconfiguredProtocol)

    expect(screen.getAllByText('Example protocol')).toHaveLength(1)
    expect(screen.queryByText('example-protocol')).toBeNull()
    expect(screen.queryByText(/latest vnone/i)).toBeNull()
    expect(screen.getByText('Setup incomplete')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Actions' })).toBeTruthy()
    expect(screen.queryByText('Add version')).toBeNull()
  })

  it('labels a controlled version as approved without exposing production terminology', () => {
    renderList({
      ...unconfiguredProtocol,
      latestVersion: 1,
      versions: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          protocolVersion: 1,
          status: 'Active',
          definitionJson: '{"steps":[]}',
          authoredByUserId: '33333333-3333-4333-8333-333333333333',
          authoredAtUtc: '2026-09-03T12:00:00Z',
          approvedByUserId: '44444444-4444-4444-8444-444444444444',
          approvedAtUtc: '2026-09-03T13:00:00Z',
        },
      ],
    })

    expect(screen.getByText('Approved v1')).toBeTruthy()
    expect(screen.getByText('Approved')).toBeTruthy()
    expect(screen.queryByText(/production/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'Actions' })).toBeTruthy()
  })

  it('shows that a saved unapproved definition is a draft awaiting approval', () => {
    renderList({
      ...unconfiguredProtocol,
      latestVersion: 1,
      versions: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          protocolVersion: 1,
          status: 'Draft',
          definitionJson: '{"steps":[]}',
          authoredByUserId: '33333333-3333-4333-8333-333333333333',
          authoredAtUtc: '2026-09-03T12:00:00Z',
          approvedByUserId: null,
          approvedAtUtc: null,
        },
      ],
    })

    expect(screen.getByText('Draft v1')).toBeTruthy()
    expect(screen.getByText('Draft')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Actions' })).toBeTruthy()
  })
})

function renderList(protocol: LabProtocol) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ProtocolList
        protocols={[protocol]}
        canManage
        onCreate={vi.fn()}
        refresh={vi.fn().mockResolvedValue(undefined)}
      />
    </QueryClientProvider>,
  )
}
