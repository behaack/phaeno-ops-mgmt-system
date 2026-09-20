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
