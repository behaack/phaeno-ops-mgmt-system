import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePhaenoSession } from '#/features/auth/session-context'
import { changeTrial, getTrial, getTrialConfiguration, getTrialOutputPackages, listTrials } from '#/api/trials'

export function useTrialQueries(id?: string, search = '', status = '', ownerId = '') {
  const { session, selectedOrganizationId, selectedDepartmentId, authProvider } = usePhaenoSession()
  const allowed = Boolean(session?.capabilities.canViewTrialProjects)
  const staff = Boolean(session?.capabilities.canManageTrialProjects)
  const enabled = allowed && authProvider !== 'mock'
  const scope = [selectedOrganizationId, selectedDepartmentId]
  const list = useQuery({ queryKey: ['trials', ...scope, search, status, ownerId], queryFn: () => listTrials(search, status, ownerId), enabled: enabled && !id })
  const detail = useQuery({ queryKey: ['trial', ...scope, id], queryFn: () => getTrial(id!), enabled: enabled && Boolean(id) })
  const config = useQuery({ queryKey: ['trial-configuration', ...scope, detail.data?.companyId], queryFn: () => getTrialConfiguration(staff ? detail.data?.companyId : undefined), enabled })
  const packages = useQuery({ queryKey: ['trial-packages', ...scope, id], queryFn: () => getTrialOutputPackages(id!), enabled: enabled && staff && Boolean(id) })
  return { allowed, staff, enabled, list, detail, config, packages }
}
export function useTrialMutation<T>() {
  const cache = useQueryClient()
  return useMutation({ mutationFn: ({ path, payload, key }: { path: string; payload: unknown; key: string }) => changeTrial<T>(path, payload, key),
    onSuccess: async () => { await Promise.all(['trials', 'trial', 'trial-configuration', 'trial-packages', 'trial-requests', 'crm-handoffs', 'crm-activities', 'sample-shipments'].map(key => cache.invalidateQueries({ queryKey: [key] }))) } })
}
