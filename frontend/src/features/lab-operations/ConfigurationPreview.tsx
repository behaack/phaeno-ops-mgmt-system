import { useState } from 'react'
import type { PreparationDetail, PreparationStage } from '#/api/lab-preparation'
import type { MasterMix } from '#/api/lab-master-mix'
import { Button } from '#/components/ui/button'
import { PreparationStepDialog } from './PreparationStepDialog'
import { PreparationField, prepSelectClass } from './preparation-ui'
import type { ResourceCatalog } from './preparation-resource-fields'
import type { ProtocolDefinition } from './protocol-definition'

export function createPreviewBatch(stage: PreparationStage): PreparationDetail {
  return {
    id: 'preview', name: 'Fictional configuration preview', version: 1, status: 'InProgress',
    startedAtUtc: null, completedAtUtc: null, labServiceWorkflowVersionId: 'preview', stages: [stage], records: [],
    layout: { name: 'Fictional tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] },
    inlineResourceFields: true, automaticSpecimenReferences: true, optionalQcReports: true, optionalPreparationReports: true, bulkOutputs: true,
    canOperate: false, canCorrect: false, roles: [],
    members: [1, 2].map(i => ({
      id: `example-${i}`, position: `A${i}`, barcode: `EXAMPLE-TUBE-${i}`, jobName: 'Fictional job',
      workOrderId: 'preview', specimenId: `example-${i}`, specimenName: `EXAMPLE-ACC-${i}`,
      customerSampleId: `Example sample ${i}`, biologicalSource: i === 1 ? 'Human liver (fictional)' : 'Human kidney (fictional)',
      state: 'InProgress', blocker: null, attemptId: `example-${i}`, sequence: 1, failureEvidence: null,
      stageSkips: [], output: null, library: null,
      sourceMaterial: { id: `example-source-${i}`, barcode: `EXAMPLE-TUBE-${i}`, quantity: 100, quantityUnit: stage.definition.steps.flatMap(s => s.captures).find(c => c.type === 'biologicalMaterial')?.unit?.trim() || 'µL', version: 1, status: 'Available' },
      libraryTube: { id: `example-library-${i}`, barcode: `EXAMPLE-LIBRARY-${i}`, barcodeSource: 'PhaenoGenerated', quantity: null, quantityUnit: null, version: 1, confirmed: false, transferId: null },
      executions: [{ id: `example-${i}`, stageId: stage.id, status: 'InProgress', blockers: [], evidence: { records: [] } }],
    })),
  }
}

// Deliberately imports no operational API functions or query/mutation hooks.
export function ConfigurationPreview({ definition, name, initialIndex = 0, onClose }: {
  definition: ProtocolDefinition; name: string; initialIndex?: number; onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const [action, setAction] = useState<'record' | 'repeat' | 'correct'>('record')
  const [reset, setReset] = useState(0)
  const [valid, setValid] = useState(false)
  const step = definition.steps[index]
  const stage: PreparationStage = { id: 'preview-stage', name, sequence: 1, requirement: 'Required', definition }
  const batch = createPreviewBatch(stage)
  const changeStep = (next: number) => { setIndex(next); setAction('record'); setValid(false) }
  const controls = <div className="space-y-3 pt-3">
    <PreparationField id="preview-step" label="Step"><select id="preview-step" className={prepSelectClass} value={index} onChange={e => changeStep(Number(e.target.value))}>{definition.steps.map((s, i) => <option key={s.key} value={i}>{i + 1}. {s.name || 'Unnamed step'}</option>)}</select></PreparationField>
    <PreparationField id="preview-state" label="Presentation"><select id="preview-state" className={prepSelectClass} value={action} onChange={e => { setAction(e.target.value as typeof action); setValid(false) }}><option value="record">Performed{!step.required ? ' / skipped' : ''}</option>{step.repeatable ? <option value="repeat">Repeat</option> : null}<option value="correct">Correction</option></select></PreparationField>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={index === 0} onClick={() => changeStep(index - 1)}>Previous step</Button><Button type="button" variant="outline" disabled={index === definition.steps.length - 1} onClick={() => changeStep(index + 1)}>Next step</Button><Button type="button" variant="outline" onClick={() => { setReset(n => n + 1); setValid(false) }}>Reset example values</Button></div>
    <p className="text-xs text-muted-foreground">Changing steps or presentation resets example values. Close and reopen after editing to preview the updated configuration.</p>
    {valid ? <p role="status" className="text-sm">Example entry is valid. Nothing was saved.</p> : null}
  </div>
  return <PreparationStepDialog key={`${index}-${action}-${reset}`} preview previewControls={controls} resourceCatalog={{ ...previewResourceCatalog, materialLots: [...previewResourceCatalog.materialLots, ...step.captures.filter(c => c.type === 'material' && (c.material?.productId || c.material?.materialDefinitionId)).map((c, i) => ({ ...previewResourceCatalog.materialLots[0], id: `example-lot-${i}`, quantityUnit: c.unit?.trim() || 'µL', name: `Example lot for ${c.material!.name}`, kind: c.material?.materialDefinitionId ? 'PreparedReagent' : 'SupplierLot', materialDefinitionId: c.material?.materialDefinitionId ?? 'example-material', supplierProductId: c.material?.productId, supplierId: c.material?.supplierId ?? null, supplier: c.material?.vendor ?? null }))], masterMixes: step.captures.filter(c => c.type === 'material' && c.material?.masterMixWorkflowId).map((capture, i): MasterMix => ({ id: `example-mix-${i}`, barcode: `PH-MX-EXAMPLE-${i}`, workflowId: capture.material!.masterMixWorkflowId!, workflowRevision: capture.material!.masterMixWorkflowRevision ?? 1, workflowName: capture.material!.name, quantityUnit: capture.unit?.trim() || 'µL', status: 'Ready', version: 1, preparedQuantity: 1000, preparedQuantityText: '1000', usedQuantity: 0, usedQuantityText: '0', measuredDiscardQuantityText: null, remainingQuantity: 1000, remainingQuantityText: '1000', useByUtc: new Date(Date.now() + 86400000).toISOString(), startedByUserId: 'example-operator', startedAtUtc: new Date().toISOString(), preparedByUserId: 'example-operator', preparedAtUtc: new Date().toISOString(), discardedByUserId: null, discardedAtUtc: null, measuredDiscardQuantity: null, discardReason: null, recipeDeviationReason: null, recipeDeviationApprovedByUserId: null, recipeDeviationApprovedAtUtc: null, recipeDeviationApprovalCurrent: false, recipeMatches: true, steps: [], recipeIngredients: [], recordedSteps: [], ingredients: [], trayUses: [], corrections: [], actors: [] })) }} batch={batch} stage={stage} step={step} action={action} pending={false} onClose={onClose} onSubmit={() => setValid(true)} />
}

const previewResourceCatalog: ResourceCatalog = {
  masterMixes: [],
  materialLots: [{ id: 'example-lot', kind: 'RawMaterial', materialDefinitionId: 'example-material', materialKey: 'example', name: 'Example reagent', lotNumber: 'EXAMPLE-LOT', supplierId: 'example-vendor', supplier: 'Example vendor', expirationOrRetestDate: null, storageLocationId: 'example-storage', storageLocation: 'Example shelf', availableQuantity: 1000, quantityUnit: 'µL', qcDisposition: 'Passed', qcPerformedOn: null, qcFailureReason: null, components: [], version: 1 }],
  equipment: [{ id: 'example-equipment', assetCode: 'EXAMPLE-ASSET', name: 'Example instrument', equipmentType: 'Fictional', location: 'Example bench', status: 'Active', lastCalibrationOn: null, calibrationDueOn: null, version: 1 }],
  suppliers: [{ id: 'example-vendor', name: 'Example vendor', isActive: true, version: 1, products: [{ id: 'example-product', supplierId: 'example-vendor', productNumber: 'EXAMPLE-PRODUCT', description: 'Example reagent', kind: 'Other', productTypeId: 'example-type', productTypeName: 'Example material', productTypeIsActive: true, isActive: true, version: 1 }] }],
}
