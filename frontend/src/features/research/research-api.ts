import { api } from '#/api/client'
import { apiErrorMessage } from '#/api/api-error'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePhaenoSession } from '#/features/auth/session-context'

export type ResearchBlock = { id: string; kind: 'text' | 'table' | 'file'; section: string; label: string; text: string | null; columns: string[] | null; rows: string[][] | null; attachmentId: string | null }
export type Project = { id: string; name: string; description: string | null; updatedAt: string; version: number; experimentCount?: number }
export type Experiment = { id: string; researchProjectId: string; projectName?: string; title: string; experimentDate: string | null; status: 'Active' | 'Completed'; lastActivityAtUtc: string; version: number }
export type Entry = { id: string; researchExperimentId: string; title: string; entryDate: string; blocks: ResearchBlock[]; createdByUserId: string | null; createdAt: string; updatedByUserId: string | null; updatedAt: string; version: number }
export type ExperimentDetail = { experiment: Experiment; project: Project; entryCount: number }
export type EntrySummary = Omit<Entry, 'blocks' | 'createdByUserId' | 'updatedByUserId'> & { createdByName: string | null; updatedByName: string | null }
export type EntryDetail = { experiment: Experiment; entry: Entry; authors: { id: string; name: string }[] }
export type Attachment = { id: string; researchEntryId: string; fileName: string; contentType: string; sizeBytes: number; sha256: string; recordedAtUtc: string }
export type Revision = { id: string; revision: number; action: string; recordedAtUtc: string; recordedByUserId: string; authorName: string | null }
export type Page<T> = { items: T[]; totalCount: number; page: number; pageSize: number }
type Envelope<T> = { data: T }
export const researchError = (error: unknown) => apiErrorMessage(error)

export async function readResearch<T>(path: string, params?: object, signal?: AbortSignal): Promise<T> {
  return (await api.get<Envelope<T>>(`/research/${path}`, { params, signal })).data.data
}
export async function writeResearch<T>(path: string, body: unknown, method: 'post' | 'put' = 'post'): Promise<T> {
  return (await api[method]<Envelope<T>>(`/research/${path}`, body)).data.data
}
export function useResearchQuery<T>(path: string, params?: object, enabled = true) {
  const { session, selectedOrganizationId, authProvider } = usePhaenoSession()
  return useQuery({ queryKey: ['research', selectedOrganizationId, path, params ?? null],
    queryFn: ({ signal }) => readResearch<T>(path, params, signal),
    enabled: enabled && session?.state === 'ready' && Boolean(session.capabilities.canAccessResearch) && authProvider !== 'mock' })
}
export function useResearchMutation<T, V>(mutationFn: (values: V) => Promise<T>) {
  const client = useQueryClient()
  const { selectedOrganizationId } = usePhaenoSession()
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: ['research', selectedOrganizationId] }) })
}
export async function downloadResearchAttachment(file: Attachment, preview = false): Promise<Blob> {
  return (await api.get(`/research/attachments/${file.id}`, { params: { preview }, responseType: 'blob' })).data
}
export async function uploadResearchAttachment(experimentId: string, entryId: string, file: File, progress: (percent: number) => void) {
  return (await api.post<Envelope<Attachment>>(`/research/experiments/${experimentId}/entries/${entryId}/attachments`, file,
    { params: { fileName: file.name }, headers: { 'Content-Type': 'application/octet-stream' }, onUploadProgress: e => progress(Math.round((e.loaded / (e.total || file.size)) * 100)) })).data.data
}
export function newBlock(kind: 'text' | 'table', section = 'custom', label = kind === 'table' ? 'Results table' : 'Notes'): ResearchBlock {
  return { id: crypto.randomUUID(), kind, section, label, text: kind === 'text' ? '' : null,
    columns: kind === 'table' ? ['Condition', 'Measurement (unit)'] : null, rows: kind === 'table' ? [['', '']] : null, attachmentId: null }
}
