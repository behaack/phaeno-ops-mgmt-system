import type { PreparationDetail } from '#/api/lab-preparation'
import type { ProtocolDefinition } from './protocol-definition'

export function isOptionalSyntheticQcReference(batch: Pick<PreparationDetail, 'optionalQcReports'>, step: ProtocolDefinition['steps'][number], capture: ProtocolDefinition['steps'][number]['captures'][number]) {
  return batch.optionalQcReports === true && Boolean(step.qcGate) && capture.type === 'fileReference'
    && ['synthetic-qc-record-reference', 'synthetic-library-qc-record-reference'].includes(capture.key)
}

export function isOptionalPreparationReference(batch: Pick<PreparationDetail, 'optionalPreparationReports'>, step: ProtocolDefinition['steps'][number], capture: ProtocolDefinition['steps'][number]['captures'][number]) {
  return batch.optionalPreparationReports === true && !step.qcGate && capture.key === 'preparation-record-reference'
    && capture.type === 'text' && (capture.scope === 'shared' || capture.scope === 'batch')
}

// The API resolves this established capture key from each member's assigned specimen.
export function isAutomaticSpecimenReference(
  batch: Pick<PreparationDetail, 'automaticSpecimenReferences'>,
  capture: ProtocolDefinition['steps'][number]['captures'][number],
) {
  return batch.automaticSpecimenReferences === true && capture.key === 'specimen-reference' && capture.type === 'text'
}

export function isSharedIdentityCheckDate(capture: ProtocolDefinition['steps'][number]['captures'][number]) {
  return capture.key === 'identity-checked-on' && capture.type === 'date' && (capture.scope === 'shared' || capture.scope === 'batch')
}

export const preparationFailureReasons = [
  { value: 'analysis_failed', label: 'Analysis failed' },
  { value: 'material_unusable', label: 'Material unusable' },
  { value: 'equipment_incident', label: 'Equipment incident' },
  { value: 'procedure_deviation', label: 'Procedure deviation' },
  { value: 'other', label: 'Other' },
]
