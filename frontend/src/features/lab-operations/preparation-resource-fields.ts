import type { PreparationMember, PreparationResourceInput } from '#/api/lab-preparation'
import type { LabEquipment, LabMaterialLot } from '#/api/lab-operations'
import type { CatalogSupplier } from '#/api/supplier-catalog'
import type { ProtocolDefinition } from './protocol-definition'

type Step = ProtocolDefinition['steps'][number]
export type ResourceField = Step['captures'][number]
export type ResourceCatalog = { materialLots: LabMaterialLot[]; equipment: LabEquipment[]; suppliers: CatalogSupplier[] }
export const emptyResourceCatalog: ResourceCatalog = { materialLots: [], equipment: [], suppliers: [] }
export const isResourceField = (field: ResourceField) => ['material', 'equipment', 'output'].includes(field.type)
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
  return { materialLots: catalog.materialLots.filter(l => !l.quantityHoldReason && l.availableQuantity > 0 && ['Passed', 'ApprovedException'].includes(l.qcDisposition) && (!l.expirationOrRetestDate || l.expirationOrRetestDate >= today)), equipment: catalog.equipment.filter(e => e.status === 'Active' && (!e.calibrationDueOn || e.calibrationDueOn >= today)), suppliers: catalog.suppliers.filter(s => s.isActive).map(s => ({ ...s, products: s.products.filter(p => p.isActive && p.productTypeIsActive) })) }
}
export function resourceEntries(fields: ResourceField[], members: PreparationMember[], values: Record<string, string>, catalog: ResourceCatalog) {
  const entries: PreparationResourceInput[] = []
  const errors: Record<string, string> = {}
  for (const field of fields) for (const member of field.scope === 'batch' ? [undefined] : field.scope === 'shared' ? [undefined, ...members.filter(m => values[`${m.id}_${field.key}_exception`] === 'yes')] : members) {
    if (field.type === 'output' && member?.output) continue
    const prefix = `${member?.id ?? 'shared'}_${field.key}`
    const isException = field.type === 'material' && field.scope === 'shared' && Boolean(member)
    const raw = (part: string) => values[`${prefix}_${part}`]?.trim() || (field.type === 'output' ? values[`shared_${field.key}_${part}`]?.trim() : '') || ''
    const get = (part: string) => isException && ['resource', 'unit'].includes(part) ? values[`shared_${field.key}_${part}`]?.trim() || '' : raw(part)
    const parts = field.type === 'output' ? ['quantity', 'unit', 'location'] : field.type === 'equipment' ? ['name', 'resource', 'run'] : ['resource', 'quantity', 'unit']
    const hasOverrides = field.scope === 'shared' && members.some(m => values[`${m.id}_${field.key}_exception`] === 'yes')
    if (!field.required && !isException && !hasOverrides && !parts.some(p => get(p))) continue
    const require = (part: string, message: string) => { if (!get(part)) errors[`${prefix}_${part}`] = message }
    const entry: PreparationResourceInput = { fieldKey: field.key, ...(member ? { memberId: member.id } : {}) }
    if (isException) {
      entry.amountUnknown = get('unknown') === 'yes'
      entry.exceptionReason = get('reason')
      entry.disposition = get('disposition') as PreparationResourceInput['disposition']
      if (!entry.exceptionReason || entry.exceptionReason.length > 2000) errors[`${prefix}_reason`] = 'Record a reason using 2,000 characters or fewer.'
      if (!['continue', 'hold', 'fail'].includes(entry.disposition ?? '')) errors[`${prefix}_disposition`] = 'Choose the tube outcome.'
      if (entry.amountUnknown && entry.disposition === 'continue') errors[`${prefix}_disposition`] = 'Unknown amounts require Hold or Close attempt as failed.'
    }
    if (field.includeTracking) {
      require('resource', field.type === 'material' ? 'Select the lot used.' : 'Select the equipment used.')
      const resource = (field.type === 'material' ? catalog.materialLots : catalog.equipment).find(r => r.id === get('resource'))
      if (get('resource') && !resource) errors[`${prefix}_resource`] = 'Choose an available item.'
      if (field.type === 'material' && resource && !materialLotMatches(field, resource as LabMaterialLot)) errors[`${prefix}_resource`] = 'Choose a lot matching the configured material and quantity unit.'
      entry.resourceId = get('resource') || undefined; entry.resourceVersion = resource?.version
    } else if (field.type === 'equipment') { require('name', 'Enter the equipment name.'); entry.name = get('name') }
    if (field.type !== 'equipment') {
      if (!entry.amountUnknown) require('quantity', isException ? 'Enter the actual quantity, including zero.' : 'Enter a positive quantity.')
      const quantity = Number(get('quantity'))
      if (!entry.amountUnknown && (!Number.isFinite(quantity) || (isException ? quantity < 0 : quantity <= 0))) errors[`${prefix}_quantity`] = 'Enter a positive quantity.'
      entry.quantity = entry.amountUnknown ? undefined : quantity
      const lot = field.type === 'material' && field.includeTracking ? catalog.materialLots.find(l => l.id === entry.resourceId) : undefined
      entry.quantityUnit = (field.type === 'material' ? field.unit?.trim() : undefined) || lot?.quantityUnit || get('unit')
      if (!entry.quantityUnit) errors[`${prefix}_unit`] = 'Enter the quantity unit.'
      if (!entry.amountUnknown && lot && quantity * (!member && ['batch', 'shared'].includes(field.scope ?? '') && field.quantityBasis !== 'total' ? members.filter(m => field.scope !== 'shared' || values[`${m.id}_${field.key}_exception`] !== 'yes').length : 1) > lot.availableQuantity) errors[`${prefix}_quantity`] = 'This quantity exceeds the available stock.'
    }
    if (field.type === 'output') { require('location', 'Enter the storage location.'); entry.location = get('location') }
    if (field.type === 'equipment') entry.runReference = get('run') || undefined
    entries.push(entry)
  }
  const totals = new Map<string, number>()
  for (const entry of entries) {
    const field = fields.find(f => f.key === entry.fieldKey)!
    if (field.type !== 'material' || !entry.resourceId || entry.amountUnknown) continue
    const count = !entry.memberId && field.quantityBasis !== 'total' ? members.filter(m => field.scope !== 'shared' || values[`${m.id}_${field.key}_exception`] !== 'yes').length : 1
    totals.set(entry.resourceId, (totals.get(entry.resourceId) ?? 0) + (entry.quantity ?? 0) * count)
  }
  for (const entry of entries) if (entry.resourceId && (totals.get(entry.resourceId) ?? 0) > (catalog.materialLots.find(l => l.id === entry.resourceId)?.availableQuantity ?? Infinity)) errors[`${entry.memberId ?? 'shared'}_${entry.fieldKey}_quantity`] = 'Combined quantities exceed the available stock.'
  return { entries, errors }
}
