import { z } from 'zod'
import type { VendorSequencingRunCapture } from '#/api/lab-operations'
import type { ScientificMetadata } from '#/api/lab-scientific-evidence'

export const runCaptureSchema = z.object({
  setId: z.string().nullable(), groupNumber: z.number().nullable(), runReference: z.string().trim().max(255),
  start: z.string(), end: z.string(), instrument: z.string().trim().max(1000), flowcell: z.string().trim().max(1000),
  lane: z.string().trim().max(1000), pool: z.string().trim().max(1000), indexMapping: z.string().trim().max(1000),
  softwareName: z.string().trim().max(255), softwareVersion: z.string().trim().max(1000), softwareSha256: z.string().trim(), parameters: z.string().trim(),
  documentReference: z.string().trim().max(1000), documentSha256: z.string().trim(), documentBytes: z.string(),
  evidence: z.custom<ScientificMetadata>(),
})
export type RunCaptureValues = z.infer<typeof runCaptureSchema>
const utcInput = (v?: string) => v?.replace(/Z$/, '').slice(0, 19) ?? ''
export function runCaptureValues(setId: string | null, groupNumber: number | null, saved?: VendorSequencingRunCapture): RunCaptureValues {
  const e = saved?.scientificEvidence ?? { schemaVersion: 1 as const }
  const document = e.documents?.find(d => d.role === 'vendor-run')
  return { setId, groupNumber, runReference: saved?.runReference ?? '', start: utcInput(e.runStartedAtUtc), end: utcInput(e.runCompletedAtUtc),
    instrument: e.instrument ?? '', flowcell: e.flowcell ?? '', lane: e.lane ?? '', pool: e.pool ?? '', indexMapping: e.indexMapping ?? '',
    softwareName: e.software?.[0]?.name ?? '', softwareVersion: e.software?.[0]?.version ?? '', softwareSha256: e.software?.[0]?.sha256 ?? '', parameters: e.parametersSha256 ?? '',
    documentReference: document?.externalFileReference ?? '', documentSha256: document?.sha256 ?? '', documentBytes: document ? String(document.sizeBytes) : '', evidence: e }
}
const utc = (value: string, stored?: string) => stored && value === utcInput(stored) ? stored : `${value}Z`
export function captureRun(row: RunCaptureValues): VendorSequencingRunCapture {
  return { setId: row.setId, groupNumber: row.groupNumber, runReference: row.runReference, scientificEvidence: {
    ...row.evidence, schemaVersion: 1, runStartedAtUtc: utc(row.start, row.evidence.runStartedAtUtc), runCompletedAtUtc: utc(row.end, row.evidence.runCompletedAtUtc),
    instrument: row.instrument || undefined, flowcell: row.flowcell || undefined, lane: row.lane || undefined, pool: row.pool || undefined,
    indexMapping: row.indexMapping || undefined, parametersSha256: row.parameters || undefined,
    software: [...(row.softwareName ? [{ name: row.softwareName, version: row.softwareVersion, ...(row.softwareSha256 ? { sha256: row.softwareSha256 } : {}) }] : []), ...(row.evidence.software?.slice(1) ?? [])],
    documents: [...(row.evidence.documents?.filter((_, i) => i !== row.evidence.documents?.findIndex(d => d.role === 'vendor-run')) ?? []), ...(row.documentReference ? [{ role: 'vendor-run', externalFileReference: row.documentReference, sha256: row.documentSha256, sizeBytes: Number(row.documentBytes) }] : [])],
  } }
}
export function runCaptureIssue(row: RunCaptureValues): string | undefined {
  if (!row.runReference) return 'Enter the actual sequencing run reference for each file group.'
  if (![row.start, row.end].every(v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(v) && Number.isFinite(Date.parse(`${v}Z`)))) return 'Enter actual run start and completion in UTC.'
  if (Date.parse(`${row.start}Z`) > Date.parse(`${row.end}Z`) || Date.parse(`${row.end}Z`) > Date.now()) return 'Run completion must follow start and cannot be in the future.'
  if (Boolean(row.softwareName) !== Boolean(row.softwareVersion)) return 'Record both the demultiplexing software name and version.'
  if (row.softwareSha256 && (!row.softwareName || !/^[a-f\d]{64}$/i.test(row.softwareSha256))) return 'A software fingerprint requires its name/version and complete SHA-256.'
  if (row.parameters && !/^[a-f\d]{64}$/i.test(row.parameters)) return 'Enter the complete settings SHA-256.'
  if ([row.documentReference, row.documentSha256, row.documentBytes].some(Boolean) && (!row.documentReference || !/^[a-f\d]{64}$/i.test(row.documentSha256) || !Number.isSafeInteger(Number(row.documentBytes)) || Number(row.documentBytes) <= 0)) return 'Supporting evidence requires its reference, complete SHA-256 and positive byte size.'
}
