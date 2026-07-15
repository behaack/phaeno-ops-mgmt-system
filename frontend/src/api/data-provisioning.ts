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
export type ProvisioningRunStatus = 'Pending' | 'Succeeded' | 'Failed'
export type ProvisioningRunKind =
  | 'Grant'
  | 'Upgrade'
  | 'BulkRevocation'
  | 'OrganizationCreationGrant'
export type GovernanceConcernCategory =
  | 'Deidentification'
  | 'Ownership'
  | 'SharingRights'
  | 'Other'
export type GovernanceIncidentStatus = 'Open' | 'Cleared' | 'ConfirmedUnsafe'
export type AffectedOrganizationStatus =
  | 'Blocked'
  | 'Resumed'
  | 'AwaitingAttestation'
  | 'Attested'
  | 'Inactive'
export type ProvisioningNoticeKind =
  | 'Grant'
  | 'Upgrade'
  | 'Revocation'
  | 'Quarantine'
  | 'QuarantineCleared'
  | 'Withdrawal'
  | 'AttestationReminder'

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
  portalReadiness: 'NotReviewed' | 'Pending' | 'Ready' | 'Blocked'
  portalReadinessNote: string | null
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
  supersededAt: string | null
  version: number
}

export type ProvisioningResult = {
  provisioningRunId: string
  status: ProvisioningRunStatus
  idempotencyKey: string
  grant: DatasetGrant | null
  failureCode: string | null
  failureMessage: string | null
}

export type ProvisioningRun = {
  id: string
  organizationId: string
  datasetVersionId: string
  kind: ProvisioningRunKind
  status: ProvisioningRunStatus
  idempotencyKey: string
  requestedAt: string
  completedAt: string | null
  grantId: string | null
  previousGrantId: string | null
  failureCode: string | null
  failureMessage: string | null
}

export type ProvisioningNotice = {
  id: string
  kind: ProvisioningNoticeKind
  subject: string
  body: string
  createdAt: string
  incidentId: string | null
}

export type GovernanceAffectedOrganization = {
  organizationId: string
  organizationName: string
  organizationKind: OrganizationKind
  status: AffectedOrganizationStatus
  affectedGrantCount: number
  reminderCount: number
  lastRemindedAt: string | null
  attestedAt: string | null
  attestationSource: 'SubmittedInPortal' | 'RecordedByPhaeno' | null
  organizationContact: string | null
  evidenceSource: string | null
  attestationNotes: string | null
  version: number
}

export type GovernanceFollowUp = {
  id: string
  organizationId: string | null
  kind: string
  notes: string
  actorUserId: string
  occurredAt: string
}

export type GovernanceIncident = {
  id: string
  sourceSampleId: string
  sourceSampleLabel: string
  category: GovernanceConcernCategory
  status: GovernanceIncidentStatus
  reason: string
  externalGuidance: string
  internalNotes: string
  attestationDueAt: string
  affectedDatasetVersionIds: string[]
  affectedOrganizations: GovernanceAffectedOrganization[]
  followUps: GovernanceFollowUp[]
  resolvedAt: string | null
  resolution: string | null
  createdAt: string
  version: number
}

export type TenantGovernanceIncident = {
  id: string
  category: GovernanceConcernCategory
  status: GovernanceIncidentStatus
  externalGuidance: string
  attestationDueAt: string
  organizationStatus: AffectedOrganizationStatus
  reminderCount: number
  lastRemindedAt: string | null
  attestedAt: string | null
  createdAt: string
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

export async function discardSourceDraft(
  id: string,
  reason: string,
  version: number,
) {
  await api.delete(`/data-provisioning/source-samples/${id}`, {
    data: { reason, version },
  })
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

export async function updateDataset(input: {
  datasetId: string
  name: string
  description: string
  version: number
}) {
  const response = await api.put<ApiEnvelope<CuratedDataset>>(
    `/data-provisioning/datasets/${input.datasetId}`,
    input,
  )
  return unwrap(response.data)
}

export async function deactivateDataset(input: {
  datasetId: string
  reason: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<CuratedDataset>>(
    `/data-provisioning/datasets/${input.datasetId}/deactivate`,
    { reason: input.reason, version: input.version },
  )
  return unwrap(response.data)
}

export async function reactivateDataset(datasetId: string, version: number) {
  const response = await api.post<ApiEnvelope<CuratedDataset>>(
    `/data-provisioning/datasets/${datasetId}/reactivate`,
    { version },
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

export async function retireDatasetVersion(input: {
  datasetId: string
  datasetVersionId: string
  reason: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<CuratedDatasetVersion>>(
    `/data-provisioning/datasets/${input.datasetId}/versions/${input.datasetVersionId}/retire`,
    { reason: input.reason, version: input.version },
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

export async function removeDatasetEligibility(input: {
  datasetId: string
  version: number
  revokeAllActiveGrants: boolean
  reason?: string
}) {
  const response = await api.post<
    ApiEnvelope<{ dataset: CuratedDataset; revokedGrantCount: number }>
  >(`/data-provisioning/datasets/${input.datasetId}/remove-eligibility`, input)
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
  const response = await api.post<ApiEnvelope<ProvisioningResult>>(
    `/data-provisioning/organizations/${input.organizationId}/grants`, {
    datasetVersionId: input.datasetVersionId,
    idempotencyKey: input.idempotencyKey,
  })
  return unwrap(response.data)
}

export async function upgradeGrant(input: {
  grantId: string
  datasetVersionId: string
  idempotencyKey: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<ProvisioningResult>>(
    `/data-provisioning/grants/${input.grantId}/upgrade`,
    input,
  )
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

export async function listProvisioningRuns(organizationId?: string) {
  const response = await api.get<ApiEnvelope<ProvisioningRun[]>>(
    '/data-provisioning/provisioning-runs',
    { params: { organizationId } },
  )
  return unwrap(response.data)
}

export async function listProvisioningActivity(organizationId?: string) {
  const response = await api.get<ApiEnvelope<ProvisioningNotice[]>>(
    '/data-provisioning/activity',
    { params: { organizationId } },
  )
  return unwrap(response.data)
}

export async function createProvisionedOrganization(input: {
  name: string
  description?: string
  kind: Exclude<OrganizationKind, 'Phaeno'>
  datasetVersionIds: string[]
}) {
  const response = await api.post<
    ApiEnvelope<{ organization: Organization; packageGrants: ProvisioningResult[] }>
  >('/data-provisioning/organizations', input)
  return unwrap(response.data)
}

export async function listGovernanceIncidents(status?: GovernanceIncidentStatus) {
  const response = await api.get<ApiEnvelope<GovernanceIncident[]>>(
    '/data-provisioning/governance/incidents',
    { params: { status } },
  )
  return unwrap(response.data)
}

export async function quarantineSource(input: {
  sourceSampleId: string
  category: GovernanceConcernCategory
  reason: string
  externalGuidance: string
  internalNotes: string
  attestationDueAt: string
}) {
  const response = await api.post<ApiEnvelope<GovernanceIncident>>(
    `/data-provisioning/governance/source-samples/${input.sourceSampleId}/quarantine`,
    input,
  )
  return unwrap(response.data)
}

export async function clearGovernanceIncident(input: {
  incidentId: string
  resolution: string
  immutableContentConfirmedUnchanged: boolean
  version: number
}) {
  const response = await api.post<ApiEnvelope<GovernanceIncident>>(
    `/data-provisioning/governance/incidents/${input.incidentId}/clear`,
    input,
  )
  return unwrap(response.data)
}

export async function withdrawGovernanceIncident(input: {
  incidentId: string
  resolution: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<GovernanceIncident>>(
    `/data-provisioning/governance/incidents/${input.incidentId}/withdraw`,
    input,
  )
  return unwrap(response.data)
}

export async function addGovernanceFollowUp(incidentId: string, notes: string) {
  const response = await api.post<ApiEnvelope<GovernanceIncident>>(
    `/data-provisioning/governance/incidents/${incidentId}/follow-ups`,
    { notes },
  )
  return unwrap(response.data)
}

export async function remindAffectedOrganization(input: {
  incidentId: string
  organizationId: string
  notes: string
}) {
  const response = await api.post<ApiEnvelope<GovernanceIncident>>(
    `/data-provisioning/governance/incidents/${input.incidentId}/organizations/${input.organizationId}/remind`,
    { notes: input.notes },
  )
  return unwrap(response.data)
}

export async function recordGovernanceAttestation(input: {
  incidentId: string
  organizationId: string
  organizationContact: string
  evidenceSource: string
  notes: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<GovernanceIncident>>(
    `/data-provisioning/governance/incidents/${input.incidentId}/organizations/${input.organizationId}/attestation`,
    input,
  )
  return unwrap(response.data)
}

export async function downloadGovernanceInvestigationFile(input: {
  incidentId: string
  datasetVersionId: string
  file: ManagedFile
  reason: string
}) {
  await downloadBlob(
    `/data-provisioning/governance/incidents/${input.incidentId}/versions/${input.datasetVersionId}/files/${input.file.id}`,
    input.file.fileName,
    { 'X-Investigation-Reason': input.reason },
  )
}

export async function downloadGovernanceInvestigationArchive(input: {
  incidentId: string
  datasetVersionId: string
  fileName: string
  reason: string
}) {
  await downloadBlob(
    `/data-provisioning/governance/incidents/${input.incidentId}/versions/${input.datasetVersionId}/archive`,
    input.fileName,
    { 'X-Investigation-Reason': input.reason },
  )
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

export async function listTenantActivity() {
  const response = await api.get<ApiEnvelope<ProvisioningNotice[]>>(
    '/curated-data/activity',
  )
  return unwrap(response.data)
}

export async function listTenantGovernanceIncidents() {
  const response = await api.get<ApiEnvelope<TenantGovernanceIncident[]>>(
    '/curated-data/governance-incidents',
  )
  return unwrap(response.data)
}

export async function submitTenantGovernanceAttestation(input: {
  incidentId: string
  notes: string
  version: number
}) {
  const response = await api.post<ApiEnvelope<TenantGovernanceIncident>>(
    `/curated-data/governance-incidents/${input.incidentId}/attestation`,
    { notes: input.notes, version: input.version },
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

async function downloadBlob(
  url: string,
  fileName: string,
  headers?: Record<string, string>,
) {
  const response = await api.get<Blob>(url, { responseType: 'blob', headers })
  const objectUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}
