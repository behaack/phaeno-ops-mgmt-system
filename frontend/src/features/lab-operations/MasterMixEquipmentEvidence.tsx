import type { LabExecutionStepRecord } from '#/api/lab-operations'
import { EvidenceDetails } from './InvestigationEvidence'

export function MasterMixEquipmentEvidence({ fields, uses }: { fields: string[]; uses: LabExecutionStepRecord['equipmentUses'] }) {
  if (!fields.length && !uses?.length) return null
  const missing = fields.some(field => !uses?.some(use => use.fieldKey === field))
  return <div className="space-y-2">
    {missing ? <p className="text-sm text-muted-foreground">Unknown: original equipment conditions were not captured for every equipment field.</p> : null}
    {uses?.length ? <details><summary className="cursor-pointer">Frozen equipment conditions</summary><p className="text-xs text-muted-foreground">Conditions available when this entry was recorded. Later equipment changes do not rewrite this evidence.</p>{uses.map(use => <div key={use.fieldKey} className="mt-2"><p className="font-medium">{use.fieldKey}</p><EvidenceDetails value={use.resourceSnapshotJson} /></div>)}</details> : null}
  </div>
}
