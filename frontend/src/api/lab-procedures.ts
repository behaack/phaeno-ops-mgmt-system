import { api } from './client'
import type { ProtocolDefinition } from '#/features/lab-operations/protocol-definition'
import type { ProcedureContext } from '#/features/lab-operations/procedure-types'

const root = '/platform/lab-operations'
export type ProcedureLibraryItem = { kind: ProcedureContext; recordId: string; revision: string; name: string; steps: ProtocolDefinition['steps'] }
export async function getProcedureLibrary(context: ProcedureContext) {
  return (await api.get<{ data: ProcedureLibraryItem[] }>(`${root}/configuration-library`, { params: { context } })).data.data
}
export async function uploadProcedureIllustration(file: File) {
  return (await api.post<{ data: { id: string; fileName: string } }>(`${root}/configuration-assets`, file, { params: { fileName: file.name }, headers: { 'Content-Type': 'application/octet-stream' } })).data.data
}
export async function readProcedureIllustration(id: string) {
  return (await api.get<Blob>(`${root}/configuration-assets/${id}`, { responseType: 'blob' })).data
}
