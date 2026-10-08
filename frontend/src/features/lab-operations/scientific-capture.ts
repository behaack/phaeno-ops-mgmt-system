import { z } from 'zod'
import type { AnalysisRecord, ScientificMetadata, ScientificWorkspace, SequencingRecord } from '#/api/lab-scientific-evidence'
import { localTimeOccurrences } from './step-performance'

const text = (label: string, max = 1000) => z.string().trim().min(1, `${label} is required.`).max(max)
const hash = z.string().trim().regex(/^[a-f\d]{64}$/i, 'Enter the complete 64-character SHA-256 checksum.')
const version = z.object({ name: z.string().trim(), version: z.string().trim(), sha256: z.string().trim() })
export const captureSchema = z.object({
  kind: z.enum(['sequencing', 'analysis']), providerKey: text('Provider', 100), runReference: text('Run reference', 255),
  sequencingRunNumber: z.string(), libraryPreparationChoice: z.string(),
  libraryId: z.string(), sendoutId: z.string(), mapping: z.string().trim().max(1000), fileReference: z.string().trim().max(1000), checksum: z.string().trim(), size: z.string(),
  start: z.string(), startOccurrence: z.string(), end: z.string(), endOccurrence: z.string(), reason: z.string().trim().max(2000), isCorrection: z.boolean(),
  submitted: z.string(), submittedOccurrence: z.string(), received: z.string(), receivedOccurrence: z.string(),
  instrument: z.string().trim().max(1000), flowcell: z.string().trim().max(1000), lane: z.string().trim().max(1000), pool: z.string().trim().max(1000), indexMapping: z.string().trim().max(1000), workflowVersion: z.string().trim().max(1000),
  qcSummary: z.string().trim().max(8000), qcNa: z.boolean(), qcReason: z.string().trim().max(4000),
  metrics: z.array(z.object({ name: z.string().trim(), value: z.string().trim(), unit: z.string().trim() })).max(128),
  documents: z.array(z.object({ role: text('Document role', 100), externalFileReference: text('Document upload'), sha256: hash, sizeBytes: text('Size') })).max(64),
  software: z.array(version).max(64), softwareNa: z.boolean(), softwareReason: z.string().trim().max(4000),
  references: z.array(version).max(64), referenceNa: z.boolean(), referenceReason: z.string().trim().max(4000),
  parameters: z.string().trim(), parametersNa: z.boolean(), parametersReason: z.string().trim().max(4000),
  inputs: z.array(z.object({ id: z.string(), role: text('Input role', 100) })).max(256),
}).superRefine((v, ctx) => {
  const error = (field: keyof typeof v, message: string) => ctx.addIssue({ code: 'custom', path: [field], message })
  for (const field of ['start', 'end', 'submitted', 'received'] as const) {
    if ((field === 'submitted' || field === 'received') && !v[field]) continue
    const instant = actualTime(v[field], v[`${field}Occurrence`])
    if (!instant) error(field, 'Enter a valid time and choose its occurrence when the clock repeats.')
    else if (Date.parse(instant) > Date.now()) error(field, 'The run time cannot be in the future.')
  }
  const start = actualTime(v.start, v.startOccurrence), end = actualTime(v.end, v.endOccurrence)
  if (start && end && Date.parse(start) > Date.parse(end)) error('end', 'Completion must follow the start.')
  const submitted = actualTime(v.submitted, v.submittedOccurrence), received = actualTime(v.received, v.receivedOccurrence)
  if (submitted && received && Date.parse(submitted) > Date.parse(received)) error('received', 'Receipt must follow submission.')
  if (v.isCorrection && !v.reason) error('reason', 'Explain why this new record replaces or follows the previous evidence.')
  const positive = (s: string) => Number.isSafeInteger(Number(s)) && Number(s) > 0
  if (v.documents.some(d => !positive(d.sizeBytes))) error('documents', 'Finish uploading each document before saving.')
  if (v.kind === 'sequencing') {
    if (!positive(v.sequencingRunNumber)) error('sequencingRunNumber', 'Enter a positive purchased run number.')
    if (!['NewPreparation', 'ExistingLibrary'].includes(v.libraryPreparationChoice)) error('libraryPreparationChoice', 'Choose new preparation or an existing library.')
    for (const field of ['libraryId', 'sendoutId', 'mapping'] as const) if (!v[field]) error(field, 'This field is required.')
    if (!v.fileReference) error('fileReference', 'Upload the sequencing file.')
    if (v.fileReference && !hash.safeParse(v.checksum).success) error('checksum', 'The uploaded file fingerprint is incomplete. Select the file again.')
    if (v.fileReference && !positive(v.size)) error('size', 'The upload is incomplete. Select the file again.')
    if (v.qcNa ? !v.qcReason : !v.qcSummary || !v.metrics.length && !v.documents.some(d => d.role === 'qc')) error('qcSummary', 'Provide a QC summary with metrics or a QC document, or explain why QC is not applicable.')
    if (!v.qcNa) {
      v.metrics.forEach((m, index) => { for (const field of ['name', 'unit'] as const) if (!m[field] || m[field].length > 100) ctx.addIssue({ code: 'custom', path: ['metrics', index, field], message: 'Enter 1–100 characters.' }); if (!m.value || !Number.isFinite(Number(m.value))) ctx.addIssue({ code: 'custom', path: ['metrics', index, 'value'], message: 'Enter a finite number.' }) })
      if (new Set(v.metrics.map(m => m.name)).size !== v.metrics.length) error('metrics', 'Use each metric name once.')
    }
  } else {
    if (!v.inputs.length) error('inputs', 'Choose at least one sequencing input from a single tube attempt.')
    if (new Set(v.inputs.map(i => i.id)).size !== v.inputs.length) error('inputs', 'Each input may be included only once.')
    if (v.softwareNa ? !v.softwareReason : !v.software.length) error('software', 'Record software versions or explain why they are not applicable.')
    if (v.referenceNa ? !v.referenceReason : !v.references.length) error('references', 'Record reference versions or explain why they are not applicable.')
    if (v.parametersNa ? !v.parametersReason : !hash.safeParse(v.documents.find(d => d.role === 'parameters')?.sha256 || v.parameters).success) error('parameters', 'Upload the analysis settings file or explain why settings are not applicable.')
    for (const field of ['software', 'references'] as const) if (!(field === 'software' ? v.softwareNa : v.referenceNa)) v[field].forEach((row, index) => {
      for (const key of ['name', 'version', 'sha256'] as const) {
        const check = key === 'sha256' ? z.union([hash, z.literal('')]) : text(key, key === 'name' ? 255 : 1000)
        const parsed = check.safeParse(row[key]); if (!parsed.success) ctx.addIssue({ code: 'custom', path: [field, index, key], message: parsed.error.issues[0].message })
      }
    })
  }
})
export type CaptureValues = z.infer<typeof captureSchema>
export function actualTime(local: string, occurrence: string) {
  const choices = localTimeOccurrences(local)
  const selected = choices.length === 1 ? choices[0] : choices.find(c => c.value === occurrence)
  return selected ? new Date(selected.value).toISOString() : undefined
}
function localDate(utc?: string) {
  if (!utc) return ''
  const d = new Date(utc)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
export function captureDefaults(kind: 'sequencing' | 'analysis', source: SequencingRecord | AnalysisRecord | undefined, data: ScientificWorkspace): CaptureValues {
  const m = source?.scientificEvidenceJson ? JSON.parse(source.scientificEvidenceJson) as ScientificMetadata : undefined
  const seq = source && 'labLibraryId' in source ? source : undefined
  const versions = (values?: ScientificMetadata['software']) => (values ?? []).map(v => ({ ...v, sha256: v.sha256 ?? '' }))
  return { kind, sequencingRunNumber: String(seq?.sequencingRunNumber ?? 1), libraryPreparationChoice: seq?.libraryPreparationChoice ?? '', providerKey: source?.providerKey ?? '', runReference: seq?.providerRunReference ?? (source && 'runReference' in source ? source.runReference : ''),
    libraryId: seq?.labLibraryId ?? '', sendoutId: seq?.labNgsSendoutId ?? '', mapping: seq?.sampleMappingReference ?? '', fileReference: seq?.externalFileReference ?? '', checksum: seq?.sha256 ?? '', size: seq ? String(seq.sizeBytes) : '',
    start: localDate(m?.runStartedAtUtc), startOccurrence: '', end: localDate(m?.runCompletedAtUtc), endOccurrence: '', reason: '', isCorrection: Boolean(source),
    submitted: localDate(m?.submittedAtUtc), submittedOccurrence: '', received: localDate(m?.receivedAtUtc), receivedOccurrence: '',
    instrument: m?.instrument ?? '', flowcell: m?.flowcell ?? '', lane: m?.lane ?? '', pool: m?.pool ?? '', indexMapping: m?.indexMapping ?? '', workflowVersion: m?.workflowVersion ?? '',
    qcSummary: m?.qcSummary ?? '', qcNa: Boolean(m?.notApplicable?.qc), qcReason: m?.notApplicable?.qc ?? '',
    metrics: Object.entries(m?.qcMetrics ?? {}).map(([name, metric]) => ({ name, value: String(metric.value), unit: metric.unit })),
    documents: (m?.documents ?? []).map(d => ({ ...d, sizeBytes: String(d.sizeBytes) })),
    software: versions(m?.software), softwareNa: Boolean(m?.notApplicable?.software), softwareReason: m?.notApplicable?.software ?? '',
    references: versions(m?.referenceData), referenceNa: Boolean(m?.notApplicable?.referenceData), referenceReason: m?.notApplicable?.referenceData ?? '',
    parameters: m?.parametersSha256 ?? '', parametersNa: Boolean(m?.notApplicable?.parameters), parametersReason: m?.notApplicable?.parameters ?? '',
    inputs: source && kind === 'analysis' ? data.inputs.filter(i => i.labAnalysisRunId === source.id).map(i => ({ id: i.labSequencingOutputId, role: m?.inputRoles?.find(r => r.sequencingOutputId === i.labSequencingOutputId)?.role ?? '' })) : [] }
}
export function captureMetadata(v: CaptureValues, original?: ScientificMetadata): ScientificMetadata {
  // Keep recorded sub-minute precision when a correction leaves the displayed time unchanged.
  const time = (field: 'start' | 'end' | 'submitted' | 'received', prior?: string) => {
    const selected = actualTime(v[field], v[`${field}Occurrence`])
    return selected && prior && Date.parse(selected) === Math.floor(Date.parse(prior) / 60000) * 60000 ? prior : selected
  }
  const na: Record<string, string> = {}
  if (v.kind === 'sequencing' && v.qcNa) na.qc = v.qcReason
  if (v.kind === 'analysis') {
    if (v.softwareNa) na.software = v.softwareReason
    if (v.referenceNa) na.referenceData = v.referenceReason
    if (v.parametersNa) na.parameters = v.parametersReason
  }
  const versions = (rows: CaptureValues['software']) => rows.map(r => ({ name: r.name, version: r.version, ...(r.sha256 ? { sha256: r.sha256 } : {}) }))
  return { schemaVersion: 1, runStartedAtUtc: time('start', original?.runStartedAtUtc), runCompletedAtUtc: time('end', original?.runCompletedAtUtc),
    submittedAtUtc: time('submitted', original?.submittedAtUtc), receivedAtUtc: time('received', original?.receivedAtUtc),
    ...(v.kind === 'sequencing' && !v.qcNa ? { qcSummary: v.qcSummary, qcMetrics: Object.fromEntries(v.metrics.map(m => [m.name, { value: Number(m.value), unit: m.unit }])) } : {}),
    ...(v.kind === 'analysis' ? { software: v.softwareNa ? undefined : versions(v.software), referenceData: v.referenceNa ? undefined : versions(v.references), parametersSha256: v.parametersNa ? undefined : v.documents.find(d => d.role === 'parameters')?.sha256 || v.parameters, inputRoles: v.inputs.map(i => ({ sequencingOutputId: i.id, role: i.role })) } : {}),
    documents: v.documents.filter(d => !(v.qcNa && d.role === 'qc') && !(v.parametersNa && d.role === 'parameters')).map(d => ({ ...d, sizeBytes: Number(d.sizeBytes) })),
    ...Object.fromEntries((['instrument', 'flowcell', 'lane', 'pool', 'indexMapping', 'workflowVersion'] as const).filter(k => v[k]).map(k => [k, v[k]])),
    ...(Object.keys(na).length ? { notApplicable: na } : {}) }
}
