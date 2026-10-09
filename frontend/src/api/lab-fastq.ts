import { api } from './client'
import { reportUpload, type FileUploadProgressCallback } from './file-upload-progress'

const root = '/platform/lab-operations'
const get = async <T,>(path: string) => (await api.get<{ data: T }>(root + path)).data.data
const post = async <T,>(path: string, body: object) => (await api.post<{ data: T }>(root + path, body)).data.data
export type ResultsDraft = { id: string; version: number; expiresAtUtc: string; stale?: boolean; expired?: boolean; payload: Record<string, unknown> }
export type FastqFile = { id: string; originalFileName: string; fileName: string; groupNumber: number; readNumber: number; partNumber: number;
  groupDescription: string; sizeBytes: number; readCount: number | null; fileId: string | null; expiresAtUtc: string; chunkBytes: number; receivedBytes: number; archiveId?: string | null; archiveEntryIndex?: number | null }
export type FastqSet = { id: string; memberId: string; sequencingRunNumber: number; libraryPreparationChoice: string; readLayout: string; setVersion: number; sealedSet: boolean; files: FastqFile[] }
export type FastqArchive = { id: string; fileName: string; sizeBytes: number; expiresAtUtc: string; chunkBytes: number; receivedBytes: number; inspected: boolean; entries: { index: number; fullName: string; fileName: string; sizeBytes: number; isFastq: boolean }[] | null }
export type FastqIntake = { draft: ResultsDraft | null; tentative: boolean; s3Available?: boolean; effectiveMaximumFileBytes: number; effectiveMaximumArchiveBytes: number; archives: FastqArchive[];
  sendoutVersion: number; protectedPackages: { id: string; packageVersion: number; state: string; trialProjectId: string | null }[];
  policy: { maximumFileBytes: number; maximumFileSetBytes: number; maximumFilesPerSet: number; maximumBatchArchiveBytes: number; maximumArchiveExpandedBytes: number; maximumArchiveEntries: number; draftLifetimeHours: number; allowedReadLayouts: string[]; allowedCompression: string[]; allowMultipleGroups: boolean; allowSplitParts: boolean };
  members: { id: string; labWorkOrderId: string; labSpecimenId: string; libraryKey: string; sampleName: string; purchasedRuns: number }[]; sets: FastqSet[] }
export const getFastqIntake = (sendoutId: string) => get<FastqIntake>(`/sendouts/${sendoutId}/results/intake`)
export const saveResultsDraft = (sendoutId: string, body: { id: string; sendoutVersion: number; version?: number; payload?: object }) => post<ResultsDraft>(`/sendouts/${sendoutId}/results/drafts`, body)
export const restartResultsDraft = (sendoutId: string, body: { id: string; sourceDraftId: string; sourceVersion: number; sendoutVersion: number; payload: object }) =>
  post<{ id: string; version: number; expiresAtUtc: string }>(`/sendouts/${sendoutId}/results/drafts/restart`, body)
export const beginFastqSet = (sendoutId: string, body: { id: string; draftId: string; memberId: string; sequencingRunNumber: number; libraryPreparationChoice: string; readLayout: string }) =>
  post<{ id: string; setVersion: number }>(`/sendouts/${sendoutId}/results/fastq-sets`, body)
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
async function fileChunkFingerprint(file: File, progress: (text: string) => void, onProgress?: FileUploadProgressCallback) {
  const hashes: string[] = []
  for (let offset = 0; offset < file.size; offset += 4 * 1024 * 1024) {
    hashes.push(hex(await crypto.subtle.digest('SHA-256', await file.slice(offset, offset + 4 * 1024 * 1024).arrayBuffer())))
    progress(`Checking selected file… ${Math.round(Math.min(offset + 4 * 1024 * 1024, file.size) / file.size * 100)}%`)
    reportUpload(onProgress, file, 'checking', Math.min(offset + 4 * 1024 * 1024, file.size), 'Checking selected file', Math.min(offset + 4 * 1024 * 1024, file.size) / file.size * 100)
  }
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashes.join(''))))
}
export async function uploadFastqFile(setId: string, file: File, mapping: { groupNumber: number; readNumber: number; partNumber: number; groupDescription: string }, progress: (text: string) => void, onProgress?: FileUploadProgressCallback) {
  // Hash bounded portions, never allocate an entire FASTQ in browser memory.
  const fingerprint = await fileChunkFingerprint(file, progress, onProgress)
  const key = `fastq-upload:${setId}:${mapping.groupNumber}:${mapping.readNumber}:${mapping.partNumber}:${fingerprint}`
  let id: string | null = null
  try { id = sessionStorage.getItem(key) } catch { /* Optional resume identity only. */ }
  id ??= crypto.randomUUID()
  try { sessionStorage.setItem(key, id) } catch { /* In-page retries retain the same mapping on the server. */ }
  let state = await post<FastqFile>(`/fastq-sets/${setId}/uploads`, { id, fileName: file.name, sizeBytes: file.size, chunkManifestSha256: fingerprint, ...mapping })
  if (state.fileId) { reportUpload(onProgress, file, 'complete', file.size, 'Verified', 100); return state }
  reportUpload(onProgress, file, 'uploading', state.receivedBytes, 'Uploading resumable portions', Math.min(99, state.receivedBytes / file.size * 100))
  for (let offset = state.receivedBytes; offset < file.size;) {
    const start = offset
    const response = await api.put<{ data: FastqFile }>(`${root}/fastq-uploads/${id}/chunks/${start}`, file.slice(start, start + state.chunkBytes), {
      headers: { 'Content-Type': 'application/octet-stream' },
      onUploadProgress: event => {
        const percentage = Math.min(99, (start + event.loaded) / file.size * 100)
        progress(`Uploading… ${Math.round(percentage)}%`)
        reportUpload(onProgress, file, 'uploading', start + event.loaded, 'Uploading resumable portions', percentage)
      },
    })
    state = response.data.data; offset = state.receivedBytes
    if (offset <= start) throw new Error('Upload did not advance. Select the same file to resume.')
  }
  progress('Verifying FASTQ content, stored bytes and scan…')
  reportUpload(onProgress, file, 'verifying', file.size, 'Finalizing storage, validating FASTQ and scanning')
  state = await post<FastqFile>(`/fastq-uploads/${id}/complete`, {})
  if (!state.fileId) throw new Error('File verification is incomplete. Select the same file to retry.')
  progress('Verified')
  reportUpload(onProgress, file, 'complete', file.size, 'Verified', 100)
  return state
}

export async function uploadFastqArchive(draftId: string, file: File, progress: (text: string) => void, onProgress?: FileUploadProgressCallback) {
  const fingerprint = await fileChunkFingerprint(file, progress, onProgress)
  const key = `fastq-archive:${draftId}:${fingerprint}`
  let id: string | null = null
  try { id = sessionStorage.getItem(key) } catch { /* Only a resumable random identity is retained. */ }
  id ??= crypto.randomUUID()
  try { sessionStorage.setItem(key, id) } catch { /* Server inspection remains authoritative. */ }
  let state = await post<FastqArchive>(`/results-drafts/${draftId}/archives`, { id, fileName: file.name, sizeBytes: file.size, chunkManifestSha256: fingerprint })
  if (state.inspected) { reportUpload(onProgress, file, 'complete', file.size, 'ZIP ready for mapping review', 100); return state }
  reportUpload(onProgress, file, 'uploading', state.receivedBytes, 'Uploading ZIP portions', Math.min(99, state.receivedBytes / file.size * 100))
  for (let offset = state.receivedBytes; offset < file.size;) {
    const start = offset
    state = (await api.put<{ data: FastqArchive }>(`${root}/fastq-archives/${id}/chunks/${start}`, file.slice(start, start + state.chunkBytes), {
      headers: { 'Content-Type': 'application/octet-stream' },
      onUploadProgress: event => {
        const percentage = Math.min(99, (start + event.loaded) / file.size * 100)
        progress(`Uploading ZIP… ${Math.round(percentage)}%`)
        reportUpload(onProgress, file, 'uploading', start + event.loaded, 'Uploading ZIP portions', percentage)
      },
    })).data.data
    offset = state.receivedBytes
    if (offset <= start) throw new Error('The ZIP transfer did not advance. Select the same ZIP to resume.')
  }
  progress('Inspecting ZIP paths, file sizes and scan…')
  reportUpload(onProgress, file, 'verifying', file.size, 'Finalizing ZIP storage, scanning and inspecting')
  const completed = await post<FastqArchive>(`/fastq-archives/${id}/complete`, {})
  reportUpload(onProgress, file, 'complete', file.size, 'ZIP ready for mapping review', 100)
  return completed
}
export const importFastqArchiveEntry = (archiveId: string, body: { uploadId: string; setId: string; entryIndex: number; groupNumber: number; readNumber: number; partNumber: number; groupDescription: string }) =>
  post<FastqFile>(`/fastq-archives/${archiveId}/import`, body)

export type AssemblyQcWorkspace = { jobId: string; labWorkOrderId: string; labSpecimenId: string; version: number; state: string; labAnalysisRunId: string | null; canRecord: boolean;
  inputs: { sequencingOutputId: string; sizeBytes: number; sha256: string }[];
  packages: { id: string; packageVersion: number; version: number; state: string; artifacts: { id: string; fileName: string; logicalRole: string; sizeBytes: number; sha256: string; scanState: string }[] }[];
  reviews: { id: string; resultOutputPackageId: string; reviewVersion: number; decision: string; note: string; measurementsJson: string; inputCoverageJson: string; recordedAtUtc: string; author: string; reportFileId: string; reportFileName: string }[] }
export const getAssemblyQc = (jobId: string) => get<AssemblyQcWorkspace>(`/assembly-jobs/${jobId}/qc`)
export const recordAssemblyQc = (jobId: string, body: { id: string; jobVersion: number; packageId: string; packageVersion: number; previousReviewVersion: number; decision: string; note: string; reportFileId: string; measurements: { name: string; value: number; unit: string }[]; coversSequencingInputs: boolean }) =>
  post<AssemblyQcWorkspace>(`/assembly-jobs/${jobId}/qc`, body)
