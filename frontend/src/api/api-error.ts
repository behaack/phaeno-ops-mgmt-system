import axios from 'axios'

type ApiErrorEnvelope = {
  error?: null | { code?: string; details?: unknown; message?: string }
}

export type ExistingAccessScopeCandidate = {
  organizationId: string
  organizationKind: 'Prospect' | 'Customer' | 'Partner'
  organizationName: string
}

export function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiErrorEnvelope | undefined
    return envelope?.error?.message ?? error.message
  }

  return error instanceof Error ? error.message : 'The request could not be completed.'
}

export function existingAccessScopeCandidate(
  error: unknown,
): ExistingAccessScopeCandidate | null {
  if (!axios.isAxiosError(error)) return null

  const envelope = error.response?.data as ApiErrorEnvelope | undefined
  if (envelope?.error?.code !== 'existing_access_scope_confirmation_required') {
    return null
  }

  const details = envelope.error.details as
    | Partial<ExistingAccessScopeCandidate>
    | undefined
  if (
    !details ||
    typeof details.organizationId !== 'string' ||
    typeof details.organizationName !== 'string' ||
    (details.organizationKind !== 'Prospect' &&
      details.organizationKind !== 'Customer' &&
      details.organizationKind !== 'Partner')
  ) {
    return null
  }

  return {
    organizationId: details.organizationId,
    organizationKind: details.organizationKind,
    organizationName: details.organizationName,
  }
}
