import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listCrmHandoffs } from '#/api/crm'
import { getOperationalReadiness, getOrganizationSummary, getRequestCompletionReadiness, reconcileOnlineAccessRequest, listDepartments, listEntitlements, type RelationshipRequest } from '#/api/organization-management'
import { getTrial } from '#/api/trials'
import { getOrderConfiguration } from '#/api/order-management'
import { usePhaenoSession } from '#/features/auth/session-context'
import { buildRequestWork, requestNeedsReadiness } from './crm-request-work'

const refreshOptions = {
  staleTime: 0,
  refetchInterval: 15_000,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: 'always' as const,
  refetchOnReconnect: 'always' as const,
}

export function useCrmRequestWork(request: RelationshipRequest) {
  const { session } = usePhaenoSession()
  const enabled = request.status === 'Approved'
  const handoffs = useQuery({
    queryKey: ['crm-handoffs', request.companyId],
    queryFn: () => listCrmHandoffs(request.companyId!),
    enabled: enabled && Boolean(request.companyId),
    ...refreshOptions,
  })
  const handoff = handoffs.data?.find(item => item.relationshipRequestId === request.id)
  const summary = useQuery({
    queryKey: ['organization-summary', request.organizationId],
    queryFn: () => getOrganizationSummary(request.organizationId!),
    enabled: enabled && Boolean(request.organizationId),
    ...refreshOptions,
  })
  const needsServices = enabled && Boolean(request.organizationId) && request.requestType !== 'SalesAssistedOrder' && request.requestedServices.length > 0
  const entitlements = useQuery({
    queryKey: ['organization-entitlements', request.organizationId],
    queryFn: () => listEntitlements(request.organizationId!),
    enabled: needsServices,
    ...refreshOptions,
  })
  const departments = useQuery({
    queryKey: ['organization-departments', request.organizationId, false],
    queryFn: () => listDepartments(request.organizationId!, false),
    enabled: needsServices,
    ...refreshOptions,
  })
  const needsReadiness = enabled && Boolean(request.organizationId) && requestNeedsReadiness(request)
  const readiness = useQuery({
    queryKey: ['organization-operational-readiness', request.organizationId],
    queryFn: () => getOperationalReadiness(request.organizationId!),
    enabled: needsReadiness,
    ...refreshOptions,
  })
  // Optional setup context is restricted to the existing configuration capability.
  // Its loading or failure must not replace authoritative Company readiness.
  const canReadCatalog = needsReadiness && session?.capabilities.canManageOrderConfiguration === true
  const catalog = useQuery({
    queryKey: ['order-configuration'],
    queryFn: getOrderConfiguration,
    enabled: canReadCatalog,
    ...refreshOptions,
  })
  const trial = useQuery({
    queryKey: ['crm-request-trial', handoff?.trialProjectId],
    queryFn: () => getTrial(handoff!.trialProjectId!),
    enabled: enabled && handoff?.type === 'TrialProject' && Boolean(handoff.trialProjectId),
    ...refreshOptions,
  })
  const completion = useQuery({
    queryKey: ['request-completion-readiness', request.id, request.version],
    queryFn: () => getRequestCompletionReadiness(request.id),
    enabled,
    ...refreshOptions,
  })
  const queries = [
    completion,
    ...(request.companyId ? [handoffs] : []),
    ...(request.organizationId ? [summary] : []),
    ...(needsServices ? [entitlements, departments] : []),
    ...(needsReadiness ? [readiness] : []),
    ...(handoff?.type === 'TrialProject' && handoff.trialProjectId ? [trial] : []),
  ]
  const isPending = queries.some(query => query.isPending)
  const isError = queries.some(query => query.isError)
  const client = useQueryClient()
  const lastCompletionCheck = useRef<number | null>(null)
  const { mutate: reconcile, isPending: isCompleting, isError: completionFailed } = useMutation({
    mutationFn: () => reconcileOnlineAccessRequest(request.id, request.version),
    retry: false,
    onSuccess: async updated => {
      client.setQueriesData<RelationshipRequest[]>({ queryKey: ['relationship-requests'] }, current =>
        Array.isArray(current) ? current.map(item => item.id === updated.id ? { ...item, ...updated, companyId: item.companyId } : item) : current)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['relationship-requests'] }),
        client.invalidateQueries({ queryKey: ['crm-handoffs'] }),
        client.invalidateQueries({ queryKey: ['crm-company'] }),
      ])
    },
  })
  useEffect(() => {
    if (!enabled || isPending || isError || isCompleting || !completion.data?.completesAutomatically
      || !completion.data.canComplete || lastCompletionCheck.current === completion.dataUpdatedAt) return
    lastCompletionCheck.current = completion.dataUpdatedAt
    reconcile()
  }, [enabled, isPending, isError, isCompleting, completion.data, completion.dataUpdatedAt, reconcile])

  return {
    handoff,
    completion: completion.data,
    isPending,
    isError,
    isCompleting,
    completionFailed,
    refetch: () => Promise.all([...queries, ...(canReadCatalog ? [catalog] : [])].map(query => query.refetch())),
    steps: buildRequestWork(request, {
      summary: summary.data,
      handoff,
      entitlements: entitlements.data,
      departments: departments.data,
      readiness: readiness.data,
      trial: trial.data,
      catalogItems: canReadCatalog && !catalog.isError ? catalog.data?.catalogItems : undefined,
    }),
  }
}
