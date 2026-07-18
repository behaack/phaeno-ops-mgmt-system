import { api } from './client'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | { code: string; message: string; details?: unknown }
}

export type WebOpsMailingListContact = {
  id: string
  firstName: string
  lastName: string
  organizationName: string
  email: string
  technicalBriefRequested: boolean
  createdAtUtc: string
}

export type WebOpsDemoRequest = {
  id: string
  firstName: string
  lastName: string
  organizationName: string
  email: string
  description: string
}

export type WebOpsDashboard = {
  mailingListCount: number
  demoRequestCount: number
  mailingListContacts: WebOpsMailingListContact[]
  demoRequests: WebOpsDemoRequest[]
}

export async function getWebOpsDashboard() {
  const response = await api.get<ApiEnvelope<WebOpsDashboard>>(
    '/web-ops/dashboard',
  )
  const envelope = response.data
  if (!envelope.success || !envelope.data) {
    throw new Error(
      envelope.error?.message
        ?? 'The Web Operations dashboard could not be loaded.',
    )
  }

  return envelope.data
}
