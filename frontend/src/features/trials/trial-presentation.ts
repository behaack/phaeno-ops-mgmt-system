import type { TrialScope } from '#/api/trials'

export const trialLabel = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2')
export const trialDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'Not set'
export const trialTerminal = (status: string) => ['Completed', 'Declined', 'Expired', 'Cancelled', 'ClosedIncomplete'].includes(status)
export const trialChoices = (values: { id: string; name: string }[] = []) => values.map(value => ({ value: value.id, label: value.name }))
export const trialUtc = (value: string) => value ? new Date(value).toISOString() : null
export function requiredTrialInputs(scope: TrialScope | null) {
  const builtIn = new Set(['customerSampleId', 'biologicalSource', 'materialType', 'quantity', 'quantityUnit', 'concentration', 'storageRequirements', 'safetyDeclaration'].map(value => value.toLowerCase()))
  const fields = new Map<string, string>()
  for (const analysis of scope?.analyses ?? []) {
    const document: unknown = JSON.parse(analysis.requiredInputsJson)
    const values: unknown = document && typeof document === 'object' && 'required' in document ? document.required : document
    if (!Array.isArray(values)) continue
    for (const entry of values) {
      const name = typeof entry === 'string' ? entry : entry && typeof entry.name === 'string' && entry.required !== false ? entry.name as string : null
      if (name && !builtIn.has(name.toLowerCase())) fields.set(name.toLowerCase(), name)
    }
  }
  return [...fields.values()]
}
