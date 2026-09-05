import { api } from './client'
import type { ReleasedDeliverableRetention } from './order-management'

type Envelope<T> = { data: T }
export type RetainedRelease = { id: string; organizationId: string; organizationName: string; packageType: string; packageId: string; releasedAtUtc: string; downloadAccessClosedAtUtc: string | null; byteDeletedAtUtc: string | null; deletionOutcome: string | null; isQuarantined: boolean }
export type ReleaseHold = { id: string; kind: 'Preservation' | 'Quarantine'; reason: string; placedAtUtc: string; releasedAtUtc: string | null; releaseReason: string | null; version: number }
export type ReleaseReceipt = { release: RetainedRelease; retention: ReleasedDeliverableRetention; workflowId: string; workflowPath: string; version: number; canManage: boolean; canQuarantine: boolean; generatedAtUtc: string; deletionDueAtUtc: string; lineage: { scope: string; customerSampleIds: string[]; supplierTubeBarcodes: string[]; accessionId: string | null } | null;
  files: { id: string; name: string; sizeBytes: number; sha256: string; downloadedAtUtc: string | null }[];
  downloads: { id: string; fileId: string; userId: string; userName: string; scope: string; outcome: string; startedAtUtc: string; completedAtUtc: string | null; completedAfterCutoff: boolean }[];
  holds: ReleaseHold[];
  reissues: { id: string; originalSnapshotId: string; replacementSnapshotId: string; authorizedAtUtc: string; reason: string | null }[] }
const root = '/file-management/releases'
export async function listRetainedReleases(search: string, skip: number) { return (await api.get<Envelope<RetainedRelease[]>>(root, { params: { search: search || undefined, skip, take: 50 } })).data.data }
export async function readReleaseReceipt(id: string) { return (await api.get<Envelope<ReleaseReceipt>>(`${root}/${id}`)).data.data }
export async function listReissueCandidates(id: string) { return (await api.get<Envelope<RetainedRelease[]>>(`${root}/${id}/reissue-candidates`)).data.data }
export async function placeReleaseHold(id: string, input: { version: number; kind: string; reason: string }) { return (await api.post<Envelope<ReleaseReceipt>>(`${root}/${id}/holds`, input)).data.data }
export async function releasePreservationHold(id: string, holdId: string, input: { version: number; reason: string }) { return (await api.post<Envelope<ReleaseReceipt>>(`${root}/${id}/holds/${holdId}/release`, input)).data.data }
export async function linkReleaseReissue(id: string, input: { version: number; replacementSnapshotId: string; reason: string }) { return (await api.post<Envelope<ReleaseReceipt>>(`${root}/${id}/reissues`, input)).data.data }
