import type { SampleShippingInstructionRule } from '#/api/sample-shipping'

export function instructionPreviewTime(rule: Pick<SampleShippingInstructionRule, 'effectiveFrom'>, now = new Date()): string {
  return new Date(Math.max(now.getTime(), new Date(rule.effectiveFrom).getTime())).toISOString()
}

export function instructionPreviewUnavailable(rule: Pick<SampleShippingInstructionRule, 'isActive' | 'effectiveTo'>, effectiveAt: string): string | null {
  if (!rule.isActive) return 'This rule is inactive. A resolved shipment preview requires an active instruction rule.'
  if (rule.effectiveTo && new Date(rule.effectiveTo).getTime() <= new Date(effectiveAt).getTime()) return 'This rule has ended and cannot resolve instructions for the preview date.'
  return null
}
