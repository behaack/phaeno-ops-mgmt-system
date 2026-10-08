import { z } from 'zod'
import type { CustomerStandardDraft } from '#/api/customer-standard-orders'

export const customerDraftSchema = z.object({
  jobName: z.string().trim().min(1, 'Enter a Job name before saving.').max(255),
  offeringId: z.string(), sampleTypeDefinitionId: z.string(),
  sources: z.array(z.object({ biologicalSource: z.string().trim().max(500), specimenCount: z.coerce.number().int('Use a whole number.').min(0).max(10000) })).min(1).max(100),
  differentStorage: z.boolean(), storageRequirements: z.string().trim().max(2000),
  safetyDeclaration: z.string().trim().max(2000), notes: z.string().trim().max(2000),
}).superRefine((v, ctx) => {
  if (v.sources.reduce((sum, s) => sum + s.specimenCount, 0) > 10000)
    ctx.addIssue({ code: 'custom', path: ['sources'], message: 'Enter no more than 10,000 samples.' })
})
export type CustomerDraftForm = z.input<typeof customerDraftSchema>
export type CustomerDraftValues = z.output<typeof customerDraftSchema>
export function mergeCustomerDraft(baseline: CustomerDraftForm, entered: CustomerDraftForm, latest: CustomerDraftForm): CustomerDraftForm {
  const pick = <K extends keyof CustomerDraftForm>(key: K): CustomerDraftForm[K] =>
    JSON.stringify(entered[key]) === JSON.stringify(baseline[key]) ? latest[key] : entered[key]
  const storageChanged = entered.differentStorage !== baseline.differentStorage || entered.storageRequirements !== baseline.storageRequirements
  return { jobName: pick('jobName'), offeringId: pick('offeringId'), sampleTypeDefinitionId: pick('sampleTypeDefinitionId'),
    // Source rows are one scope: never combine a renamed/reordered server row with an old local count.
    sources: pick('sources'), safetyDeclaration: pick('safetyDeclaration'), notes: pick('notes'),
    differentStorage: storageChanged ? entered.differentStorage : latest.differentStorage,
    storageRequirements: storageChanged ? entered.storageRequirements : latest.storageRequirements }
}
export function customerDraftValues(draft?: CustomerStandardDraft | null): CustomerDraftForm {
  return { jobName: draft?.jobName ?? '', offeringId: draft?.offeringId ?? '', sampleTypeDefinitionId: draft?.sampleTypeDefinitionId ?? '',
    sources: draft?.sources.length ? draft.sources : [{ biologicalSource: '', specimenCount: 1 }],
    differentStorage: draft?.storageRequirements != null, storageRequirements: draft?.storageRequirements ?? '',
    safetyDeclaration: draft?.safetyDeclaration ?? '', notes: draft?.notes ?? '' }
}
export function customerDraftPayload(v: CustomerDraftValues): CustomerStandardDraft {
  return { jobName: v.jobName, offeringId: v.offeringId || null, sampleTypeDefinitionId: v.sampleTypeDefinitionId || null,
    sources: v.sources, storageRequirements: v.differentStorage ? v.storageRequirements : null,
    safetyDeclaration: v.safetyDeclaration, notes: v.notes }
}
