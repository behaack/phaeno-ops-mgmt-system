import { api } from './client'
import type { ScientificFile } from './lab-scientific-evidence'
import type { FastqFile } from './lab-fastq'

const root = '/platform/lab-operations'
export type S3ScientificObject = { key: string; fileName: string; sizeBytes: number; eTag: string }
export type S3ScientificPage = { available: boolean; files: S3ScientificObject[]; nextCursor: string | null; sourceLocation?: string | null }
const evidence = (work: string, specimen: string) => `${root}/work-orders/${work}/specimens/${specimen}/scientific-evidence/s3-files`
export const getScientificS3Files = async (work: string, specimen: string, cursor?: string) =>
  (await api.get<{ data: S3ScientificPage }>(evidence(work, specimen), { params: { cursor } })).data.data
export const registerScientificS3File = async (work: string, specimen: string, file: S3ScientificObject) =>
  (await api.post<{ data: ScientificFile }>(evidence(work, specimen), { key: file.key, eTag: file.eTag })).data.data
export const getFastqS3Files = async (set: string, cursor?: string) =>
  (await api.get<{ data: S3ScientificPage }>(`${root}/fastq-sets/${set}/s3-files`, { params: { cursor } })).data.data

export async function registerFastqS3File(set: string, file: S3ScientificObject,
  mapping: { groupNumber: number; readNumber: number; partNumber: number; groupDescription: string }) {
  // Stable request identity without retaining object paths or credentials in browser storage.
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ set, file, mapping }))))
  bytes[6] = (bytes[6] & 0x0f) | 0x80; bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  return (await api.post<{ data: FastqFile }>(`${root}/fastq-sets/${set}/s3-files`, { id, key: file.key, eTag: file.eTag, ...mapping })).data.data
}
