import type { PreparationMember, PreparationResourceInput } from '#/api/lab-preparation'
import type { LabEquipment, LabMaterialLot } from '#/api/lab-operations'
import type { CatalogSupplier } from '#/api/supplier-catalog'
import type { MasterMixSummary } from '#/api/lab-master-mix'
import type { ProtocolDefinition } from './protocol-definition'
import { normalizeMaterialTubeScan } from './material-transfer-barcode'
import { combinedDecimalQuantity, exceedsDecimalQuantity, isPositiveDecimalQuantity, multipliedDecimalQuantity, remainingDecimalQuantity } from './decimal-quantity'

type Step = ProtocolDefinition['steps'][number]
export type ResourceField = Step['captures'][number]
export type ResourceCatalog = { materialLots: LabMaterialLot[]; masterMixes: MasterMixSummary[]; equipment: LabEquipment[]; suppliers: CatalogSupplier[] }
export const emptyResourceCatalog: ResourceCatalog = { materialLots: [], masterMixes: [], equipment: [], suppliers: [] }
export const isResourceField = (field: ResourceField) => ['material', 'biologicalMaterial', 'equipment', 'output'].includes(field.type)
export function stepResourceFields(step: Step): ResourceField[] {
  const fields = step.captures.filter(isResourceField)
  const legacy = (labels: string[], type: 'material' | 'equipment' | 'output'): ResourceField[] => labels.map((label, i) => ({ key: `_legacy_${type}_${i}`, label, type, required: false, scope: type === 'output' ? 'tube' : 'batch', includeTracking: type !== 'output', quantityBasis: type === 'material' ? 'total' : undefined }))
  return [...fields, ...legacy(step.inputMaterials, 'material'), ...legacy(step.equipmentTypes, 'equipment'), ...(!fields.some(f => f.type === 'output') && step.preparedOutputs.length ? legacy([step.preparedOutputs.join(', ')], 'output') : [])]
}
export function materialLotMatches(field: ResourceField, lot: LabMaterialLot) {
  if (lot.quantityHoldReason) return false
  if (field.unit?.trim() && field.unit.trim() !== lot.quantityUnit.trim()) return false
  const material = field.material
  if (material?.productId) return lot.kind === 'SupplierLot' && lot.supplierProductId === material.productId && lot.supplierId === material.supplierId
  if (material?.materialDefinitionId) return lot.kind === 'PreparedReagent' && lot.materialDefinitionId === material.materialDefinitionId
  return !material?.supplierId || lot.supplierId === material.supplierId
}
export function eligibleResources(catalog: ResourceCatalog): ResourceCatalog {
  const today = new Date().toISOString().slice(0, 10)
  return { materialLots: catalog.materialLots.filter(l => !l.quantityHoldReason && l.availableQuantity > 0 && ['Passed', 'ApprovedException'].includes(l.qcDisposition) && (!l.expirationOrRetestDate || l.expirationOrRetestDate >= today)), masterMixes: catalog.masterMixes.filter(item => item.status === 'Ready' && (item.remainingQuantity ?? 0) > 0 && new Date(item.useByUtc).getTime() > Date.now()), equipment: catalog.equipment.filter(e => e.status === 'Active' && (!e.calibrationDueOn || e.calibrationDueOn >= today)), suppliers: catalog.suppliers.filter(s => s.isActive).map(s => ({ ...s, products: s.products.filter(p => p.isActive && p.productTypeIsActive) })) }
}
export function resourceEntries(fields: ResourceField[], members: PreparationMember[], values: Record<string, string>, catalog: ResourceCatalog) {
  const entries: PreparationResourceInput[] = []
  const errors: Record<string, string> = {}
  for (const field of fields) for (const member of field.scope === 'batch' ? [undefined] : field.scope === 'shared' ? [undefined, ...members.filter(m => values[`${m.id}_${field.key}_exception`] === 'yes')] : members) {
    if (field.type === 'output' && member?.output) continue
    if (field.type === 'biologicalMaterial' && member?.libraryTube?.transferId && (member.output || values[`${member.id}_${field.key}_additional`] !== 'yes')) continue
    const prefix = `${member?.id ?? 'shared'}_${field.key}`
    const isException = field.type === 'material' && field.scope === 'shared' && Boolean(member)
    const isMasterMix = field.type === 'material' && Boolean(field.material?.masterMixWorkflowId)
    const raw = (part: string) => values[`${prefix}_${part}`]?.trim() || (field.type === 'output' ? values[`shared_${field.key}_${part}`]?.trim() : '') || ''
    const get = (part: string) => isException && ['resource', 'unit', 'mixBarcode'].includes(part) ? values[`shared_${field.key}_${part}`]?.trim() || '' : raw(part)
    const parts = field.type === 'output' ? ['quantity', 'unit', 'location'] : field.type === 'biologicalMaterial' ? ['quantity', 'unit', 'barcode', 'sourceBarcode', 'exhausted'] : field.type === 'equipment' ? ['name', 'resource', 'run'] : ['resource', 'quantity', 'unit', 'exhausted']
    const hasOverrides = field.scope === 'shared' && members.some(m => values[`${m.id}_${field.key}_exception`] === 'yes')
    if (field.type !== 'equipment' && !field.required && !isException && !hasOverrides && !(field.type === 'biologicalMaterial' && get('additional') === 'yes') && !parts.some(p => get(p))) continue
    const require = (part: string, message: string) => { if (!get(part)) errors[`${prefix}_${part}`] = message }
    const entry: PreparationResourceInput = { fieldKey: field.key, ...(member ? { memberId: member.id } : {}) }
    if (field.type === 'biologicalMaterial') {
      const source = member?.sourceMaterial
      const destination = member?.libraryTube
      if (!source || !member) errors[`${prefix}_quantity`] = 'Refresh to load the selected source material.'
      else if (source.status !== 'Available') errors[`${prefix}_quantity`] = 'The selected source is unavailable for another withdrawal.'
      if (!destination) errors[`${prefix}_barcode`] = 'Assign the library tube from this tray position before recording its transfer.'
      else if (normalizeMaterialTubeScan(get('barcode')) !== destination.barcode) errors[`${prefix}_barcode`] = 'Scan the assigned library tube barcode.'
      if (source && normalizeMaterialTubeScan(get('sourceBarcode')) !== source.barcode) errors[`${prefix}_sourceBarcode`] = 'Scan the selected source tube barcode.'
      entry.sourceBarcode = get('sourceBarcode')
      entry.resourceId = source?.id
      entry.resourceVersion = source?.version
      entry.barcode = get('barcode')
      entry.materialExhausted = get('exhausted') === 'yes'
      entry.exhaustionReason = entry.materialExhausted ? get('exhaustionReason') || undefined : undefined
      entry.quantityText = get('quantity')
      entry.quantityUnit = field.unit?.trim() || source?.quantityUnit?.trim() || get('unit')
      if (!isPositiveDecimalQuantity(entry.quantityText)) errors[`${prefix}_quantity`] = 'Enter a positive decimal amount with at most 28 fractional places.'
      else if (source?.quantity !== null && source?.quantity !== undefined && exceedsDecimalQuantity(entry.quantityText, source.quantityText ?? String(source.quantity))) errors[`${prefix}_quantity`] = 'The amount exceeds the known source material remaining.'
      else if ((source?.quantityText && remainingDecimalQuantity(source.quantityText, entry.quantityText) === null)
        || (destination?.quantityText && combinedDecimalQuantity(destination.quantityText, entry.quantityText) === null)) errors[`${prefix}_quantity`] = 'Use an amount whose source and library-tube balances can be recorded exactly.'
      if (!entry.quantityUnit) errors[`${prefix}_unit`] = 'Enter the quantity unit.'
      else if (source?.quantityUnit && source.quantityUnit !== entry.quantityUnit) errors[`${prefix}_unit`] = `Use the source material unit (${source.quantityUnit}).`
      if ((entry.exhaustionReason?.length ?? 0) > 2000) errors[`${prefix}_exhaustionReason`] = 'Use 2,000 characters or fewer.'
      entries.push(entry)
      continue
    }
    if (isException) {
      entry.amountUnknown = get('unknown') === 'yes'
      entry.exceptionReason = get('reason')
      entry.disposition = get('disposition') as PreparationResourceInput['disposition']
      if (!entry.exceptionReason || entry.exceptionReason.length > 2000) errors[`${prefix}_reason`] = 'Record a reason using 2,000 characters or fewer.'
      if (!['continue', 'hold', 'fail'].includes(entry.disposition ?? '')) errors[`${prefix}_disposition`] = 'Choose the tube outcome.'
      if (entry.amountUnknown && entry.disposition === 'continue') errors[`${prefix}_disposition`] = 'Unknown amounts require Hold or Close attempt as failed.'
    }
    if (field.type === 'equipment' || field.includeTracking || isMasterMix) {
      require('resource', isMasterMix ? 'Select the prepared master mix.' : field.type === 'material' ? 'Select the lot used.' : 'Select the equipment used.')
      const resource = (isMasterMix ? catalog.masterMixes : field.type === 'material' ? catalog.materialLots : catalog.equipment).find(r => r.id === get('resource'))
      if (get('resource') && !resource) errors[`${prefix}_resource`] = 'Choose an available item.'
      if (field.type === 'material' && resource && !isMasterMix && !materialLotMatches(field, resource as LabMaterialLot)) errors[`${prefix}_resource`] = 'Choose a lot matching the configured material and quantity unit.'
      if (isMasterMix && resource && ((resource as MasterMixSummary).workflowId !== field.material?.masterMixWorkflowId || (resource as MasterMixSummary).workflowRevision !== field.material?.masterMixWorkflowRevision)) errors[`${prefix}_resource`] = 'Choose a mix from the configured workflow revision.'
      if (isMasterMix) {
        entry.mixBarcode = get('mixBarcode')
        if (!entry.mixBarcode || entry.mixBarcode.toUpperCase() !== (resource as MasterMixSummary | undefined)?.barcode.toUpperCase()) errors[`${isException ? `shared_${field.key}` : prefix}_mixBarcode`] = 'Scan the barcode on the selected physical master-mix container.'
      }
      entry.resourceId = get('resource') || undefined; entry.resourceVersion = resource?.version
      if (field.type === 'material' && !isException) entry.materialExhausted = get('exhausted') === 'yes'
    }
    if (field.type !== 'equipment') {
      if (!entry.amountUnknown) require('quantity', isException ? 'Enter the actual quantity, including zero.' : 'Enter a positive quantity.')
      const quantity = Number(get('quantity'))
      if (!entry.amountUnknown && (!Number.isFinite(quantity) || (isException ? quantity < 0 : quantity <= 0))) errors[`${prefix}_quantity`] = 'Enter a positive quantity.'
      entry.quantity = entry.amountUnknown ? undefined : quantity
      const lot = field.type === 'material' && field.includeTracking ? catalog.materialLots.find(l => l.id === entry.resourceId) : undefined
      const mix = isMasterMix ? catalog.masterMixes.find(item => item.id === entry.resourceId) : undefined
      entry.quantityUnit = (field.type === 'material' ? field.unit?.trim() : undefined) || lot?.quantityUnit || get('unit')
      if (!entry.quantityUnit) errors[`${prefix}_unit`] = 'Enter the quantity unit.'
      if (!entry.amountUnknown && lot && quantity * (!member && ['batch', 'shared'].includes(field.scope ?? '') && field.quantityBasis !== 'total' ? members.filter(m => field.scope !== 'shared' || values[`${m.id}_${field.key}_exception`] !== 'yes').length : 1) > lot.availableQuantity) errors[`${prefix}_quantity`] = 'This quantity exceeds the available stock.'
      if (entry.amountUnknown && isMasterMix) errors[`${prefix}_quantity`] = 'Measure this master-mix amount before saving.'
      if (!entry.amountUnknown && mix) {
        const count = !member && ['batch', 'shared'].includes(field.scope ?? '') && field.quantityBasis !== 'total' ? members.filter(m => field.scope !== 'shared' || values[`${m.id}_${field.key}_exception`] !== 'yes').length : 1
        const total = multipliedDecimalQuantity(get('quantity'), count)
        if (!total || exceedsDecimalQuantity(total, mix.remainingQuantityText ?? String(mix.remainingQuantity ?? 0))) errors[`${prefix}_quantity`] = 'This quantity exceeds the mix remaining or cannot be recorded exactly.'
      }
    }
    if (field.type === 'output') { require('location', 'Enter the storage location.'); entry.location = get('location') }
    if (field.type === 'equipment') entry.runReference = get('run') || undefined
    entries.push(entry)
  }
  const totals = new Map<string, number>()
  const mixTotals = new Map<string, string>()
  for (const entry of entries) {
    const field = fields.find(f => f.key === entry.fieldKey)!
    if (field.type !== 'material' || !entry.resourceId || entry.amountUnknown) continue
    const count = !entry.memberId && field.quantityBasis !== 'total' ? members.filter(m => field.scope !== 'shared' || values[`${m.id}_${field.key}_exception`] !== 'yes').length : 1
    if (field.material?.masterMixWorkflowId) {
      const amount = multipliedDecimalQuantity(values[`${entry.memberId ?? 'shared'}_${entry.fieldKey}_quantity`]?.trim() ?? '', count)
      const sum = amount && combinedDecimalQuantity(mixTotals.get(entry.resourceId) ?? '0', amount)
      if (!sum) errors[`${entry.memberId ?? 'shared'}_${entry.fieldKey}_quantity`] = 'Use a representable decimal amount.'
      else mixTotals.set(entry.resourceId, sum)
    } else totals.set(entry.resourceId, (totals.get(entry.resourceId) ?? 0) + (entry.quantity ?? 0) * count)
  }
  for (const entry of entries) if (entry.resourceId && (totals.get(entry.resourceId) ?? 0) > (catalog.materialLots.find(l => l.id === entry.resourceId)?.availableQuantity ?? Infinity)) errors[`${entry.memberId ?? 'shared'}_${entry.fieldKey}_quantity`] = 'Combined quantities exceed the available amount.'
  for (const entry of entries) {
    const mix = catalog.masterMixes.find(item => item.id === entry.resourceId)
    if (mix && exceedsDecimalQuantity(mixTotals.get(mix.id) ?? '0', mix.remainingQuantityText ?? String(mix.remainingQuantity ?? 0))) errors[`${entry.memberId ?? 'shared'}_${entry.fieldKey}_quantity`] = 'Combined quantities exceed the mix remaining.'
  }
  const mixByField = new Map<string, string>()
  for (const entry of entries) {
    if (!fields.find(field => field.key === entry.fieldKey)?.material?.masterMixWorkflowId || !entry.resourceId || (entry.quantity ?? 0) <= 0) continue
    const prior = mixByField.get(entry.fieldKey)
    if (prior && prior !== entry.resourceId) errors[`${entry.memberId ?? 'shared'}_${entry.fieldKey}_resource`] = 'Use the same master-mix preparation for this field on the tray.'
    else mixByField.set(entry.fieldKey, entry.resourceId)
  }
  for (const entry of entries) if (entry.materialExhausted && fields.find(f => f.key === entry.fieldKey)?.type === 'material' && entries.some(other => other.resourceId === entry.resourceId && other.amountUnknown)) errors[`${entry.memberId ?? 'shared'}_${entry.fieldKey}_exhausted`] = 'Resolve unknown material amounts before confirming this lot exhausted.'
  return { entries, errors }
}
