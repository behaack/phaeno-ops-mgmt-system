import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { getLabPhasePlan, writeLabPhases } from '#/api/lab-phases'
import { usePhaenoSession } from '#/features/auth/session-context'

export function useLabPhasePlan(orderId: string, internal: boolean, enabled = true) {
  const { authProvider, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  return useQuery({ queryKey: ['lab-phases', internal, selectedOrganizationId, selectedDepartmentId, orderId],
    queryFn: () => getLabPhasePlan(orderId, internal), enabled: enabled && authProvider !== 'mock', refetchInterval: 60_000 })
}
export function useLabPhaseWrite(orderId: string, internal: boolean, onSaved: () => Promise<unknown>) {
  const client = useQueryClient()
  const attempt = useRef<{ payload: string; key: string } | null>(null)
  return useMutation({
    mutationFn: ({ path, input }: { path: string; input: unknown }) => {
      const payload = JSON.stringify({ path, input })
      if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() }
      return writeLabPhases(orderId, internal, path, input, attempt.current.key)
    },
    onSuccess: async () => {
      attempt.current = null
      await Promise.all([client.invalidateQueries({ queryKey: ['lab-phases'] }), client.invalidateQueries({ queryKey: ['lab-jobs'] }), client.invalidateQueries({ queryKey: ['accounts-receivable'] }), onSaved()])
    },
  })
}
