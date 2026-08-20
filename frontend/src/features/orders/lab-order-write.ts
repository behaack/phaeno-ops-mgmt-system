import type { LabSample, LabSampleWrite } from '#/api/order-management'

export function labSampleToWrite(sample: LabSample): LabSampleWrite {
  return {
    id: sample.id,
    customerSampleId: sample.customerSampleId,
    materialType: sample.materialType,
    biologicalSource: sample.biologicalSource,
    quantity: sample.quantity,
    quantityUnit: sample.quantityUnit,
    storageRequirements: sample.storageRequirements,
    safetyDeclaration: sample.safetyDeclaration,
    collectionDate: sample.collectionDate,
    concentration: sample.concentration,
    notes: sample.notes,
    analysisDefinitionIds: readAnalysisIds(sample.analysisDefinitionIdsJson),
    replacementForSampleId: sample.replacementForSampleId,
  }
}

export function readAnalysisIds(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}
