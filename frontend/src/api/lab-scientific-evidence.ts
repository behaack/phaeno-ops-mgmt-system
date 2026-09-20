import { isAxiosError } from 'axios'
import { api } from './client'

export type ScientificMetadata = {
  schemaVersion: 1; instrument?: string; flowcell?: string; lane?: string; pool?: string; indexMapping?: string; workflowVersion?: string
  software?: { name: string; version: string; sha256?: string }[]
  referenceData?: { name: string; version: string; sha256?: string }[]
  parametersSha256?: string; inputRoles?: { sequencingOutputId: string; role: string }[]
  runStartedAtUtc?: string; runCompletedAtUtc?: string; qcSummary?: string
  submittedAtUtc?: string; receivedAtUtc?: string
  qcMetrics?: Record<string, { value: number; unit: string }>
  documents?: { role: string; externalFileReference: string; sha256: string; sizeBytes: number }[]
  notApplicable?: Record<string, string>
}
export type SequencingRecord = {
  sequencingRunNumber?: number | null; libraryPreparationChoice?: string | null
  id: string; labWorkOrderId: string; labSpecimenId: string; labSpecimenAttemptId: string; sourceContainerId: string
  labLibraryId: string; labNgsSendoutId: string; providerKey: string; providerRunReference: string
  sampleMappingReference: string; externalFileReference: string; sha256: string; sizeBytes: number
  correctsOutputId: string | null; correctionReason: string | null; scientificEvidenceJson: string | null; recordedAtUtc: string
}
export type AnalysisRecord = {
  id: string; labWorkOrderId: string; labSpecimenId: string; labSpecimenAttemptId: string; providerKey: string; runReference: string
  previousAnalysisRunId: string | null; reanalysisReason: string | null; scientificEvidenceJson: string | null; requirementsSnapshotJson: string | null; recordedAtUtc: string
}
export type ScientificWorkspace = {
  sequencingRunCount?: number
  workOrderId: string; specimenId: string; accessionNumber: string | null; canRecord: boolean; canManualUpload: boolean; governedResults: boolean; orderId: string; submittedSampleId: string
  libraries: { id: string; libraryKey: string; barcode: string; status: string; labSpecimenAttemptId: string | null }[]
  outputs: SequencingRecord[]; analyses: AnalysisRecord[]; inputs: { labAnalysisRunId: string; labSequencingOutputId: string }[]
}
export type ScientificSendout = { id: string; providerName: string; providerReference: string | null; status: string }
export type SequencingInput = Omit<SequencingRecord, 'labSpecimenAttemptId' | 'sourceContainerId' | 'scientificEvidenceJson' | 'recordedAtUtc'> & { scientificEvidence: ScientificMetadata }
export type AnalysisInput = { id: string; labWorkOrderId: string; labSpecimenId: string; providerKey: string; runReference: string; sequencingOutputIds: string[]; previousAnalysisRunId: string | null; reanalysisReason: string | null; scientificEvidence: ScientificMetadata; requirementsVersion: 1 }
const base = (work: string, specimen: string) => `/platform/lab-operations/work-orders/${work}/specimens/${specimen}/scientific-evidence`
export const scientificKey = (work: string, specimen: string) => ['lab-scientific-evidence', work, specimen] as const
export const getScientificWorkspace = async (work: string, specimen: string) => (await api.get<{ data: ScientificWorkspace }>(base(work, specimen))).data.data
export const getScientificSendouts = async (work: string, specimen: string, libraryId: string) => (await api.get<{ data: ScientificSendout[] }>(`${base(work, specimen)}/sendouts`, { params: { libraryId } })).data.data
export const recordSequencing = async (input: SequencingInput) => (await api.post<{ data: SequencingRecord }>('/platform/lab-operations/pseq-results/sequencing-outputs', input)).data.data
export const recordAnalysis = async (input: AnalysisInput) => (await api.post<{ data: AnalysisRecord }>('/platform/lab-operations/pseq-results/analysis-runs', input)).data.data

export type ScientificFile = { id: string; fileName: string; sha256: string; sizeBytes: number; externalFileReference: string; recordedAtUtc: string }
export const scientificFilesKey = (work: string, specimen: string) => ['lab-scientific-files', work, specimen] as const
export const getScientificFiles = async (work: string, specimen: string) =>
  (await api.get<{ data: { maximumBytes: number; files: ScientificFile[] } }>(`${base(work, specimen)}/files`)).data.data
type ScientificUpload = { id: string; chunkBytes: number; receivedBytes: number; expiresAtUtc: string; file: ScientificFile | null }
const uploadHints = new Map<string, { id: string; expires: number }>()
export const uploadScientificFile = async (work: string, specimen: string, file: File, progress: (value: number) => void) => {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())))
    .map(value => value.toString(16).padStart(2, '0')).join('')
  const key = `scientific-upload:${work}:${specimen}:${encodeURIComponent(file.name)}:${hash}`
  // Only a random upload identity and expiry are retained; never file bytes or storage keys.
  let prior = uploadHints.get(key)
  try { prior = JSON.parse(sessionStorage.getItem(key) || 'null') ?? prior } catch { /* storage can be unavailable */ }
  let id = prior && prior.expires > Date.now() ? prior.id : crypto.randomUUID()
  const url = `${base(work, specimen)}/uploads`
  const begin = async () => (await api.post<{ data: ScientificUpload }>(url,
    { id, fileName: file.name, sizeBytes: file.size, sha256: hash })).data.data
  let state: ScientificUpload
  try { state = await begin() } catch (error) {
    // Expired/deleted sessions and an account change cannot reuse another actor's upload.
    if (!prior || !isAxiosError(error) || !(error.response?.status === 404 || error.response?.data?.error?.code === 'scientific_upload_expired')) throw error
    id = crypto.randomUUID()
    state = await begin()
  }
  uploadHints.set(key, { id, expires: Date.parse(state.expiresAtUtc) })
  try { sessionStorage.setItem(key, JSON.stringify(uploadHints.get(key))) } catch { /* in-page retry still works */ }
  if (state.file) {
    uploadHints.delete(key)
    try { sessionStorage.removeItem(key) } catch { /* optional hint */ }
    return state.file
  }
  let offset = state.receivedBytes
  while (offset < file.size) {
    const start = offset
    const chunk = file.slice(start, Math.min(start + state.chunkBytes, file.size))
    const response = await api.put<{ data: ScientificUpload }>(`${url}/${id}/chunks/${start}`, chunk, {
      headers: { 'Content-Type': 'application/octet-stream' },
      onUploadProgress: event => progress(Math.min(99, Math.round((start + event.loaded) / file.size * 100))),
    })
    offset = response.data.data.receivedBytes
    if (offset <= start) throw new Error('The upload did not advance. Resume the upload to try again.')
  }
  progress(100)
  const completed = (await api.post<{ data: ScientificUpload }>(`${url}/${id}/complete`)).data.data.file
  if (!completed) throw new Error('The file has not finished verification. Resume to retry verification.')
  uploadHints.delete(key)
  try { sessionStorage.removeItem(key) } catch { /* optional retry hint */ }
  return completed
}
export const downloadScientificFile = async (work: string, specimen: string, id: string) =>
  (await api.get<Blob>(`${base(work, specimen)}/files/${id}`, { responseType: 'blob' })).data
export const scientificFileLabel = (reference: string, files?: ScientificFile[]) =>
  files?.find(f => f.externalFileReference === reference)?.fileName ?? (reference.startsWith('poms-file:') ? 'Uploaded sequencing file' : reference)
