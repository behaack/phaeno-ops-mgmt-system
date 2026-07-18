import axios from 'axios'

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

export type WebOpsPage<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
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

export function getWebOpsMailingList(page: number) {
  return getWebOpsPage<WebOpsMailingListContact>('/web-ops/mailing-list', page)
}

export function getWebOpsDemoRequests(page: number) {
  return getWebOpsPage<WebOpsDemoRequest>('/web-ops/demo-requests', page)
}

export async function unsubscribeWebOpsMailingListContact(id: string) {
  await api.post(`/web-ops/mailing-list/${id}/unsubscribe`)
}

export async function completeWebOpsDemoRequest(id: string) {
  await api.post(`/web-ops/demo-requests/${id}/complete`)
}

export function getWebOpsErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) {
    return error.response?.data.error?.message ?? fallback
  }

  return error instanceof Error ? error.message : fallback
}

async function getWebOpsPage<T>(url: string, page: number) {
  const response = await api.get<ApiEnvelope<WebOpsPage<T>>>(url, {
    params: { page },
  })
  const envelope = response.data
  if (!envelope.success || !envelope.data) {
    throw new Error(
      envelope.error?.message
        ?? 'The Web Operations list could not be loaded.',
    )
  }

  return envelope.data
}
