import type { QueryClient } from '@tanstack/react-query'

export function refreshCrmTaskViews(client: QueryClient) {
  return Promise.all(['crm-tasks', 'crm-record-tasks', 'crm-dashboard', 'crm-activities', 'crm-reports', 'crm-search'].map(
    key => client.invalidateQueries({ queryKey: [key] }),
  ))
}
