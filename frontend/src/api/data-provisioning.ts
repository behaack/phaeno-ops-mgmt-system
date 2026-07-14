import axios from 'axios'

import { api } from './client'
import type { OrganizationKind } from './session'

export type SourceSampleStatus = 'Draft' | 'Ready' | 'Archived'
export type ManagedFileScanStatus =
  | 'Pending'
  | 'Clean'
  | 'Rejected'
  | 'Unavailable'
export type DatasetVersionStatus =
  | 'Draft'
  | 'Published'
  | 'Quarantined'
  | 'Withdrawn'
  | 'Retired'
export type DatasetGrantStatus = 'Active' | 'Revoked' | 'Superseded'

type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: null | {
    code: string
    message: string
    details?: unknown
  }
}

export type ManagedFile = {
  id: string
  fileName: string
  fileKind: string
  contentType: string
  sizeBytes: number
  sha256: string
  scanStatus: ManagedFileScanStatus
  scanMessage: string | null
}

export type SourceSample = {
  id: string
  label: string
  description: string | null
  biologicalContext: string | null
  assayContext: string | null
  analysisSummary: string | null
  qcStatus: string | null
  provenance: string | null
  isSynthetic: boolean
  revision: number
  status: SourceSampleStatus
  ownershipBasis: string | null
  ownershipEvidenceReference: string | null
  ownershipConfirmedByUserId: string | null
  ownershipConfirmedAt: string | null
  deidentificationMethod: string | null
  deidentificationNotes: string | null
  deidentificationConfirmedByUserId: string | null
  deidentificationConfirmedAt: string | null
  readyAt: string | null
  archivedAt: string | null
  files: ManagedFile[]
  createdAt: string
  updatedAt: string
  version: number
}

export type CuratedDatasetVersion = {
  id: string
  curatedDatasetId: string
  versionNumber: number
  status: DatasetVersionStatus
  sourceSampleId: string
  sourceRevision: number
  sourceSnapshotAt: string
  isSynthetic: boolean
  sampleLabel: string
  description: string
  biologicalContext: string
  assayContext: string
  analysisSummary: string
  qcStatus: string
  provenance: string
  ownershipBasis: string
  ownershipEvidenceReference: string | null
  ownershipConfirmedAt: string
  deidentificationMethod: string
  deidentificationNotes: string | null
  deidentificationConfirmedAt: string
  releaseNotes: string
  contentChecksum: string
  publishedAt: string | null
  files: ManagedFile[]
  version: number
}

export type CuratedDataset = {
  id: string
  name: string
  description: string
  isActive: boolean
  eligibleVersionId: string | null
  eligibilityApprovedAt: string | null
  versions: CuratedDatasetVersion[]
  createdAt: string
  updatedAt: string
  version: number
}

export type Organization = {
  id: string
  name: string
  description: string | null
  kind: OrganizationKind
  isActive: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export type DatasetGrant = {
  id: string
  organizationId: string
  organizationName: string
  organizationKind: OrganizationKind
  curatedDatasetId: string
  datasetName: string
  curatedDatasetVersionId: string
  datasetVersionNumber: number
  status: DatasetGrantStatus
  grantedAt: string
  revokedAt: string | null
  revocationReason: string | null
  version: number
}

export type TenantDataset = {
  grantId: string
  datasetId: string
  name: string
  description: string
  datasetVersionId: string
  versionNumber: number
  sampleLabel: string
  biologicalContext: string
  assayContext: string
  analysisSummary: string
  qcStatus: string
  provenance: string
  contentChecksum: string
  publishedAt: string
  files: ManagedFile[]
}

export type DownloadAudit = {
  id: string
  userId: string
  userEmail: string
  datasetVersionId: string
  kind: 'File' | 'Archive'
  managedFileId: string | null
  downloadedAt: string
}

export async function listSourceSamples() {
  const response = await api.get<ApiEnvelope<SourceSample[]>>(
    '/data-provisioning/source-samples',
  )
  return unwrap(response.data)
}

export async function getSourceSample(id: string) {
  const response = await api.get<ApiEnvelope<SourceSample>>(
    `/data-provisioning/source-samples/${id}`,
  )
  return unwrap(response.data)
}

export async function createSourceSample(input: {
  label: string
  isSynthetic: boolean
}) {
  const response = await api.post<ApiEnvelope<SourceSample>>(
    '/data-provisioning/source-samples',
    input,
  )
  return unwrap(response.data)
}

export async function updateSourceSample(
  id: string,
  input: {
    label: string
    description: string
    biologicalContext: string
    assayContext: string
    analysisSummary: string
    qcStatus: string
    provenance: string
    ownershipBasis: string
    ownershipEvidenceReference?: string
    deidentificationMethod: string
    deidentificationNotes?: string
    version: number
  },
) {
  const response = await api.put<ApiEnvelope<SourceSample>>(
    `/data-provisioning/source-samples/${id}`,
    input,
  )
  return unwrap(response.data)
}

export async function uploadSourceFile(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const response = await api.post<ApiEnvelope<ManagedFile>>(
    `/data-provisioning/source-samples/${id}/files`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return unwrap(response.data)
}

export async function markSourceReady(id: string, version: number) {
  const response = await api.post<ApiEnvelope<SourceSample>>(
    `/data-provisioning/source-samples/${id}/ready`,
    { version },
  )
  return unwrap(response.data)
}

export async function archiveSource(id: string, version: number) {
  const response = await api.post<ApiEnvelope<SourceSample>>(
    `/data-provisioning/source-samples/${id}/archive`,
    { version },
  )
  return unwrap(response.data)
}

export async function listDatasets() {
  const response = await api.get<ApiEnvelope<CuratedDataset[]>>(
    '/data-provisioning/datasets',
  )
  return unwrap(response.data)
}

export async function createDataset(input: {
  name: string
  description: string
}) {
  const response = await api.post<ApiEnvelope<CuratedDataset>>(
    '/data-provisioning/datasets',
    input,
  )
  return unwrap(response.data)
}

export async function createDatasetVersion(
  datasetId: string,
  input: {
    sourceSampleId: string
    releaseNotes: string
    datasetVersion: number
  },
) {
  const response = await api.post<ApiEnvelope<CuratedDatasetVersion>>(
    `/data-provisioning/datasets/${datasetId}/versions`,
    input,
  )
  return unwrap(response.data)
}

export async function publishDatasetVersion(
  datasetId: string,
  version: CuratedDatasetVersion,
) {
  const response = await api.post<ApiEnvelope<CuratedDatasetVersion>>(
    `/data-provisioning/datasets/${datasetId}/versions/${version.id}/publish`,
    { version: version.version },
  )
  return unwrap(response.data)
}

export async function setDatasetEligibility(
  dataset: CuratedDataset,
  datasetVersionId: string,
  isEligible: boolean,
) {
  const response = await api.post<ApiEnvelope<CuratedDataset>>(
    `/data-provisioning/datasets/${dataset.id}/eligibility`,
    {
      datasetVersionId,
      isEligible,
      version: dataset.version,
    },
  )
  return unwrap(response.data)
}

export async function listOrganizations() {
  const response = await api.get<Organization[]>('/organizations')
  return response.data.filter((organization) => organization.kind !== 'Phaeno')
}

export async function listOrganizationGrants(organizationId: string) {
  const response = await api.get<ApiEnvelope<DatasetGrant[]>>(
    `/data-provisioning/organizations/${organizationId}/grants`,
  )
  return unwrap(response.data)
}

export async function grantDataset(input: {
  organizationId: string
  datasetVersionId: string
  idempotencyKey: string
}) {
  const response = await api.post<
    ApiEnvelope<{ grant: DatasetGrant; provisioningRunId: string }>
  >(`/data-provisioning/organizations/${input.organizationId}/grants`, {
    datasetVersionId: input.datasetVersionId,
    idempotencyKey: input.idempotencyKey,
  })
  return unwrap(response.data)
}

export async function revokeGrant(input: {
  grantId: string
  reason: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<DatasetGrant>>(
    `/data-provisioning/grants/${input.grantId}/revoke`,
    { reason: input.reason, version: input.version },
  )
  return unwrap(response.data)
}

export async function listTenantDatasets() {
  const response = await api.get<ApiEnvelope<TenantDataset[]>>('/curated-data')
  return unwrap(response.data)
}

export async function getTenantDataset(datasetId: string) {
  const response = await api.get<ApiEnvelope<TenantDataset>>(
    `/curated-data/${datasetId}`,
  )
  return unwrap(response.data)
}

export async function listDownloadHistory() {
  const response = await api.get<ApiEnvelope<DownloadAudit[]>>(
    '/curated-data/downloads',
  )
  return unwrap(response.data)
}

export async function downloadTenantFile(
  datasetId: string,
  file: ManagedFile,
) {
  await downloadBlob(
    `/curated-data/${datasetId}/files/${file.id}`,
    file.fileName,
  )
}

export async function downloadTenantArchive(
  datasetId: string,
  fileName: string,
) {
  await downloadBlob(`/curated-data/${datasetId}/archive`, fileName)
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const envelope = error.response?.data as Partial<ApiEnvelope<unknown>> | undefined
  return envelope?.error?.message ?? fallback
}

function unwrap<T>(envelope: ApiEnvelope<T>) {
  if (!envelope.success) {
    throw new Error(envelope.error?.message ?? 'The request failed.')
  }
  return envelope.data
}

async function downloadBlob(url: string, fileName: string) {
  const response = await api.get<Blob>(url, { responseType: 'blob' })
  const objectUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}
