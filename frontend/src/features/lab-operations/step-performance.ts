import { z } from 'zod'
import type { LabStepPerformanceInput } from '#/api/lab-operations'

export const stepTimingSchema = z.object({ mode: z.enum(['now', 'earlier']), localTime: z.string(), occurrence: z.string(), reason: z.string().max(4000), otherPerformer: z.boolean().optional(), performerId: z.string().optional() })
export type StepTimingValues = z.infer<typeof stepTimingSchema>
export const emptyStepTiming: StepTimingValues = { mode: 'now', localTime: '', occurrence: '', reason: '' }
const pad = (n: number) => String(n).padStart(2, '0')
export function offsetLabel(minutes: number) {
  return `${minutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`
}
const localMinute = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

// Return every real occurrence of a local minute. DST gaps have none; repeated minutes require a choice.
export function localTimeOccurrences(value: string): { value: string; label: string }[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return []
  const nominal = Date.parse(`${value}Z`)
  if (!Number.isFinite(nominal)) return []
  const offsets = new Set<number>()
  for (let hours = -36; hours <= 36; hours++) offsets.add(-new Date(nominal + hours * 3600000).getTimezoneOffset())
  return [...offsets].flatMap(offset => {
    const date = new Date(nominal - offset * 60000)
    return localMinute(date) === value ? [{ value: `${value}${offsetLabel(offset)}`, label: `${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })} (UTC${offsetLabel(offset)})` }] : []
  }).sort((a, b) => Date.parse(a.value) - Date.parse(b.value))
}

export function timingIssues(timing: StepTimingValues, now = Date.now()): { field: keyof StepTimingValues; message: string }[] {
  const issues: ReturnType<typeof timingIssues> = []
  if (timing.otherPerformer && !timing.performerId) issues.push({ field: 'performerId', message: 'Select the actual performer.' })
  if (timing.otherPerformer && !timing.reason.trim()) issues.push({ field: 'reason', message: 'Explain why you are recording another person’s work.' })
  if (timing.mode === 'now') return issues
  const choices = localTimeOccurrences(timing.localTime)
  const chosen = choices.length === 1 ? choices[0] : choices.find(c => c.value === timing.occurrence)
  if (!choices.length) issues.push({ field: 'localTime', message: 'Enter a valid local date and time. A daylight-saving clock change may make this time unavailable.' })
  else if (!chosen) issues.push({ field: 'occurrence', message: 'This time occurs twice. Choose which occurrence you mean.' })
  else if (Date.parse(chosen.value) > now) issues.push({ field: 'localTime', message: 'The performed time cannot be in the future.' })
  if (!timing.reason.trim()) issues.push({ field: 'reason', message: 'Explain why this work is being recorded later.' })
  return issues
}

export function performanceInput(timing: StepTimingValues, confirmed: boolean): LabStepPerformanceInput {
  const performer = timing.otherPerformer ? { performedByUserId: timing.performerId, lateEntryReason: timing.reason.trim() } : {}
  if (timing.mode === 'now') return { mode: 'now', personallyPerformed: confirmed && !timing.otherPerformer, ...performer }
  const choices = localTimeOccurrences(timing.localTime)
  const chosen = choices.length === 1 ? choices[0] : choices.find(c => c.value === timing.occurrence)
  if (!chosen) throw new Error('Review the performed time before saving.')
  return { mode: 'earlier', personallyPerformed: confirmed && !timing.otherPerformer, performedAt: chosen.value, lateEntryReason: timing.reason.trim(), ...performer }
}
