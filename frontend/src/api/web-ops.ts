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
  technicalBriefDeliveryRecorded?: boolean
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

async function getWebOpsPage<T>(url: string, page: number, filters?: { attentionOnly: boolean }) {
  const response = await api.get<ApiEnvelope<WebOpsPage<T>>>(url, {
    params: { page, ...filters },
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


export type WebOpsNotification = {
  isProcessingExpired?: boolean
  id: string
  kind: 'MailingListAlert' | 'TechnicalBrief' | 'DemoRequestAlert'
  state: 'Pending' | 'Processing' | 'Accepted' | 'Failed' | 'Cancelled'
  intakeId: string
  contactName: string
  recipientEmail: string | null
  organizationName: string
  attemptCount: number
  createdAtUtc: string
  lastAttemptAtUtc: string | null
  acceptedAtUtc: string | null
  nextAttemptAtUtc: string | null
  lastError: string | null
  version: string
  canResend: boolean
}

export type WebOpsNotificationAttempt = {
  attemptNumber: number
  startedAtUtc: string
  finishedAtUtc: string | null
  outcome: string
  error: string | null
  staffRequested: boolean
}

export function getWebOpsNotifications(page: number, attentionOnly = false) {
  return getWebOpsPage<WebOpsNotification>('/web-ops/notifications', page, { attentionOnly })
}

export type WebOpsNotificationSummary = {
  isPaused: boolean
  version: string
  updatedAtUtc: string | null
  updatedByName: string | null
  reason: string | null
  pendingCount: number
  processingCount: number
  failedCount: number
  oldestPendingAtUtc: string | null
  expiredProcessingCount: number
}

export async function getWebOpsNotificationSummary() {
  const response = await api.get<ApiEnvelope<WebOpsNotificationSummary>>('/web-ops/notifications/summary')
  if (!response.data.success || !response.data.data) throw new Error(response.data.error?.message ?? 'Email processing status could not be loaded.')
  return response.data.data
}

export async function updateWebOpsNotificationProcessing(request: { version: string; isPaused: boolean; reason: string }) {
  await api.post('/web-ops/notifications/processing', request)
}

export async function getWebOpsNotificationAttempts(id: string) {
  const response = await api.get<ApiEnvelope<WebOpsNotificationAttempt[]>>(`/web-ops/notifications/${id}/attempts`)
  if (!response.data.success) throw new Error(response.data.error?.message ?? 'Email history could not be loaded.')
  return response.data.data
}

export async function resendWebOpsNotification(notification: WebOpsNotification) {
  await api.post(`/web-ops/notifications/${notification.id}/resend`, { version: notification.version })
}

export async function queueWebOpsTechnicalBrief(id: string) {
  await api.post(`/web-ops/mailing-list/${id}/technical-brief`)
}
