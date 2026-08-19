import axios from 'axios'

import { api } from './client'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | { code: string; message: string; details?: unknown }
}

export type ReleasedDeliverablePolicyValues = {
  standardRetentionDays: number
  undownloadedWarningLeadDays: number
  undownloadedGraceDays: number
}

export type ReleasedDeliverablePolicyVersion = {
  id: string
  revision: number
  values: ReleasedDeliverablePolicyValues
  changeReason: string
  supersedesPolicyId: string | null
  isActive: boolean
  deactivatedAt: string | null
  deactivatedByUserId: string | null
  deactivationReason: string | null
  createdAt: string
  createdByUserId: string | null
  version: number
}

export type OrganizationReleasedDeliverablePolicyOverride = {
  id: string
  organizationId: string
  revision: number
  standardRetentionDays: number | null
  undownloadedWarningLeadDays: number | null
  undownloadedGraceDays: number | null
  changeReason: string
  supersedesOverrideId: string | null
  isActive: boolean
  deactivatedAt: string | null
  deactivatedByUserId: string | null
  deactivationReason: string | null
  createdAt: string
  createdByUserId: string | null
  version: number
}

export type EffectiveReleasedDeliverablePolicy = {
  standardRetentionDays: number
  standardRetentionSource: 'global' | 'organizationOverride'
  undownloadedWarningLeadDays: number
  undownloadedWarningLeadSource: 'global' | 'organizationOverride'
  undownloadedGraceDays: number
  undownloadedGraceSource: 'global' | 'organizationOverride'
}

export type ReleasedDeliverablePolicyConfiguration = {
  global: ReleasedDeliverablePolicyVersion
  globalHistory: ReleasedDeliverablePolicyVersion[]
}

export type OrganizationReleasedDeliverablePolicy = {
  organizationId: string
  organizationName: string
  organizationKind: 'Prospect' | 'Customer' | 'Partner'
  global: ReleasedDeliverablePolicyVersion
  override: OrganizationReleasedDeliverablePolicyOverride | null
  effective: EffectiveReleasedDeliverablePolicy
  overrideHistory: OrganizationReleasedDeliverablePolicyOverride[]
}

export async function getReleasedDeliverablePolicy() {
  const response = await api.get<ApiEnvelope<ReleasedDeliverablePolicyConfiguration>>(
    '/file-management/released-deliverable-policy',
  )
  return unwrap(response.data)
}

export async function updateReleasedDeliverablePolicy(input: {
  standardRetentionDays: number
  undownloadedWarningLeadDays: number
  undownloadedGraceDays: number
  reason: string
  version: number
}) {
  const response = await api.patch<ApiEnvelope<ReleasedDeliverablePolicyConfiguration>>(
    '/file-management/released-deliverable-policy',
    input,
  )
  return unwrap(response.data)
}

export async function getOrganizationReleasedDeliverablePolicy(organizationId: string) {
  const response = await api.get<ApiEnvelope<OrganizationReleasedDeliverablePolicy>>(
    `/organizations/${organizationId}/released-deliverable-policy`,
  )
  return unwrap(response.data)
}

export async function upsertOrganizationReleasedDeliverablePolicyOverride(
  organizationId: string,
  input: {
    standardRetentionDays: number | null
    undownloadedWarningLeadDays: number | null
    undownloadedGraceDays: number | null
    reason: string
    globalVersion: number
    overrideVersion: number | null
  },
) {
  const response = await api.put<ApiEnvelope<OrganizationReleasedDeliverablePolicy>>(
    `/organizations/${organizationId}/released-deliverable-policy/override`,
    input,
  )
  return unwrap(response.data)
}

export async function removeOrganizationReleasedDeliverablePolicyOverride(
  organizationId: string,
  input: { reason: string; version: number },
) {
  const response = await api.delete<ApiEnvelope<OrganizationReleasedDeliverablePolicy>>(
    `/organizations/${organizationId}/released-deliverable-policy/override`,
    { data: input },
  )
  return unwrap(response.data)
}

export function fileManagementErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiEnvelope<unknown> | undefined
    return envelope?.error?.message ?? error.message
  }

  return error instanceof Error ? error.message : fallback
}

function unwrap<T>(envelope: ApiEnvelope<T>) {
  if (!envelope.success || !envelope.data) {
    throw new Error(envelope.error?.message ?? 'The request could not be completed.')
  }

  return envelope.data
}
