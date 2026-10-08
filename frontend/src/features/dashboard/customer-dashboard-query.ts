import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getCustomerLabDashboard, type CustomerLabDashboardResponse, type CustomerLabDashboardView } from '#/api/order-management'

export type CustomerDashboardQuery = Pick<UseQueryResult<CustomerLabDashboardResponse, Error>,
  'data' | 'isError' | 'isPending' | 'isFetching' | 'refetch'>

export function useCustomerDashboardQuery(view: CustomerLabDashboardView, page: number,
  organizationId: string | null | undefined, departmentId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['lab-service-orders', 'dashboard-work', organizationId, departmentId, view, page],
    queryFn: () => getCustomerLabDashboard(view, page),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 30_000,
  })
}
