import { useQuery } from '@tanstack/react-query'
import { getWorkAttention, type WorkKind, type WorkView } from '#/api/work-attention'
import { usePhaenoSession } from '#/features/auth/session-context'

export function useWorkAttention(params: { view?: WorkView; kind?: WorkKind; domain?: string; page?: number; pageSize?: number; priority?: number } = {}) {
  const { session, selectedOrganizationId, selectedDepartmentId, authProvider } = usePhaenoSession()
  const request = { priority: params.priority, view: params.view ?? 'mine', kind: params.kind ?? 'action', domain: params.domain || undefined, page: params.page ?? 1, pageSize: Math.max(params.pageSize ?? 10, 10) }
  const query = useQuery({ queryKey: ['work-attention', session?.user?.id, selectedOrganizationId, selectedDepartmentId, request],
    queryFn: ({ signal }) => getWorkAttention(request, signal),
    enabled: authProvider !== 'mock' && session?.state === 'ready' && Boolean(selectedOrganizationId && selectedDepartmentId),
    staleTime: 0, refetchOnWindowFocus: 'always', refetchOnReconnect: 'always', refetchInterval: 30_000,
  })
  return { ...query, disabledByMock: authProvider === 'mock' }
}
