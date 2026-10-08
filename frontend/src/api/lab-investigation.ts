import { api } from './client'
import axios from 'axios'
import type { LabExecutionStepRecord } from './lab-operations'

export type EvidenceRow = { id: string; [key: string]: unknown }
export type Investigation = {
  formatVersion: number; workOrderId: string; specimenId: string; capturedAtUtc: string
  coverage: { area: string; status: string; explanation: string }[]
  evidence: Record<string, EvidenceRow[]>; limitedSections: string[]
}
export type InvestigationReport = { id: string; generatedAtUtc: string; generatedByUserId: string; formatVersion: number; sha256: string }
export type ResultLineage = {
  resultId: string; resultKind: string; coverage: string; analysisRunId: string | null
  attemptId: string | null; sourceContainerId: string | null; sourceBarcode: string | null
  analysisRun: EvidenceRow | null; inputs: EvidenceRow[]; artifacts: EvidenceRow[]
}
const base = (work: string, specimen: string) => `/platform/lab-operations/work-orders/${work}/specimens/${specimen}`
async function read<T>(url: string): Promise<T> { return (await api.get<{ data: T }>(url)).data.data }
export const getSampleInvestigation = (work: string, specimen: string) => read<Investigation>(`${base(work, specimen)}/investigation`)
export type EventCursor = { through: string; before?: string; beforeId?: string }
export const getInvestigationEvents = (work: string, specimen: string, cursor: EventCursor) => read<{ through: string; rows: EvidenceRow[]; next: { before: string; beforeId: string } | null }>(`${base(work, specimen)}/investigation/events?${new URLSearchParams(cursor)}`)
export const getInvestigationReports = (work: string, specimen: string, page: number) => read<InvestigationReport[]>(`${base(work, specimen)}/investigation/reports?page=${page}`)
export const getResultLineage = (work: string, specimen: string, result: string) => read<ResultLineage>(`${base(work, specimen)}/results/${result}/lineage`)
export async function generateInvestigationReport(work: string, specimen: string, requestId: string) {
  return (await api.post<{ data: InvestigationReport }>(`${base(work, specimen)}/investigation/reports`, { requestId })).data.data
}
export async function downloadInvestigationReport(work: string, specimen: string, report: string, format: 'json' | 'html') {
  return downloadEvidence(`${base(work, specimen)}/investigation/reports/${report}?${new URLSearchParams({ format })}`)
}
export async function downloadInvestigationAttachment(work: string, specimen: string, record: string, role: string) {
  return downloadEvidence(`${base(work, specimen)}/investigation/attachments/${record}/${encodeURIComponent(role)}`)
}
async function downloadEvidence(url: string) {
  try {
    return (await api.get<Blob>(url, { responseType: 'blob' })).data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const data: unknown = await error.response.data.text().then(text => { try { return JSON.parse(text) as unknown } catch { return null } })
      if (data && typeof data === 'object' && 'error' in data && data.error && typeof data.error === 'object' && 'message' in data.error && typeof data.error.message === 'string') throw new Error(data.error.message, { cause: error })
    }
    throw error
  }
}
export const relatedInvestigationSamples = (work: string, kind: string, reference: string, page: number) =>
  read<{ id: string; labWorkOrderId: string; accessionNumber: string | null }[]>(`/platform/lab-operations/work-orders/${work}/investigation/related-samples?${new URLSearchParams({ kind, reference, page: String(page) })}`)

export function executionSteps(row: EvidenceRow): LabExecutionStepRecord[] {
  const parsed = JSON.parse(String(row.capturedResultsJson || '{}')) as { records?: LabExecutionStepRecord[] }
  return parsed.records ?? []
}
