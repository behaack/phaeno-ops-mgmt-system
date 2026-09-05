import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PhaenoSessionContext } from '#/features/auth/session-context'
import { api } from '#/api/client'
import { documentationSearchParams, useDocumentationSearch } from './documentation-search'
import version from './documentation-version.json'

vi.mock('#/api/client', () => ({ api: { get: vi.fn() } }))

describe('documentation search request scope', () => {
  it('cancels old requests and clears results when the organization or department changes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const requests: Array<{ signal: AbortSignal; headers: Record<string, string>; resolve: (value: unknown) => void }> = []
    vi.mocked(api.get).mockImplementation((_url, config) => new Promise(resolve => {
      requests.push({ signal: config!.signal as AbortSignal, headers: config!.headers as Record<string, string>, resolve })
    }))
    let changeScope: (value: { organization: string; department: string }) => void = () => undefined
    function Wrapper({ children }: { children: ReactNode }) {
      const [scope, setScope] = useState({ organization: 'organization-a', department: 'department-a' })
      changeScope = setScope
      return <QueryClientProvider client={client}><PhaenoSessionContext.Provider value={{
        authConfigured: true, authProvider: 'mock', clerkLoaded: true, signedIn: true, session: null,
        isLoading: false, error: null, selectedOrganizationId: scope.organization, selectedDepartmentId: scope.department,
        setSelectedOrganizationId: () => undefined,
      }}>{children}</PhaenoSessionContext.Provider></QueryClientProvider>
    }
    const { result } = renderHook(() => useDocumentationSearch('customer', { q: 'shipping', page: 1 }), { wrapper: Wrapper })
    await waitFor(() => expect(requests).toHaveLength(1))
    act(() => changeScope({ organization: 'organization-b', department: 'department-b' }))
    await waitFor(() => expect(requests).toHaveLength(2))
    expect(requests[0].signal.aborted).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(requests[1].headers['X-Organization-Id']).toBe('organization-b')
    expect(requests[1].headers['X-Department-Id']).toBe('department-b')
    await act(async () => requests[0].resolve({ data: { success: true, data: { items: [{ id: 'old-scope' }], metadata: { corpusHash: version.corpusHash } } } }))
    expect(result.current.data).toBeUndefined()
    act(() => changeScope({ organization: 'organization-b', department: 'department-c' }))
    await waitFor(() => expect(requests).toHaveLength(3))
    expect(requests[1].signal.aborted).toBe(true)
    client.clear()
  })

  it('normalizes untrusted route parameters and bounds paging and input', () => {
    expect(documentationSearchParams({ q: 'x'.repeat(250), page: -1, topic: '../private', workflow: 'lab-operations' })).toEqual({
      q: 'x'.repeat(200), page: 1, topic: undefined, workflow: 'lab-operations', contentType: undefined,
    })
  })
})
