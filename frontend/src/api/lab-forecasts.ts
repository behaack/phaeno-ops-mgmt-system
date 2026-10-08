import { api } from './client'

export type DayBasis = 'Calendar' | 'Business'
export type ForecastCalendar = { id: string; revision: number; timeZoneId: string; coverageFrom: string; coverageTo: string; reason: string; holidays: { date: string; name: string }[] }
export type StageDuration = { stageKey: string; days: number; dayBasis: DayBasis }
export type TimingPolicy = { id: string; revision: number; labBusinessCalendarId: string; requiresSequencing: boolean; reason: string; durations: StageDuration[] }
export type TimingWorkflow = { id: string; name: string; workflowVersion: number; status: string; stages: { key: string; name: string; requirement: string }[]; policies: TimingPolicy[] }
export type ForecastConfiguration = { canConfigure: boolean; workflows: TimingWorkflow[]; calendars: ForecastCalendar[] }
export type ForecastStep = { key: string; name: string; enteredAtUtc: string | null; expectedExitAtUtc: string; days: number; dayBasis: DayBasis; overrun: boolean }
export type SampleForecast = { sampleId: string; name: string; stage: string; enteredAtUtc: string | null; expectedAtUtc: string | null; remainingDays: number | null; status: string; reason: string; steps: ForecastStep[]; policyId: string | null; policyRevision: number | null; calendarRevision: number | null }
export type CompletionForecast = { jobId: string; policyId: string | null; policyRevision: number | null; calendarRevision: number | null; evaluatedAtUtc: string; expectedAtUtc: string | null; remainingDays: number | null; status: string; reason: string; estimatedSamples: number; outstandingSamples: number; drivingSampleIds: string[]; samples: SampleForecast[] }
export type ForecastPreviewJob = { id: string; name: string; version: number; currentPolicyId: string | null; current: CompletionForecast; proposed: CompletionForecast }
type Envelope<T> = { success: boolean; data: T; error: { message: string } | null }
function unwrap<T>(v: Envelope<T>): T { if (!v.success) throw new Error(v.error?.message ?? 'The forecast request failed.'); return v.data }
export async function getForecastConfiguration() { return unwrap((await api.get<Envelope<ForecastConfiguration>>('/platform/lab-operations/forecast-configuration')).data) }
export async function saveForecastCalendar(input: { previousId: string | null; coverageFrom: string; coverageTo: string; reason: string; holidays: { date: string; name: string }[] }) { return unwrap((await api.post<Envelope<ForecastCalendar>>('/platform/lab-operations/forecast-calendars', input)).data) }
export async function saveTimingPolicy(workflowId: string, input: { previousId: string | null; calendarId: string; requiresSequencing: boolean; reason: string; durations: StageDuration[] }) { return unwrap((await api.post<Envelope<TimingPolicy>>(`/platform/lab-operations/forecast-policies/${workflowId}`, input)).data) }
export async function previewTimingPolicy(id: string, page: number) { return unwrap((await api.get<Envelope<{ page: number; total: number; jobs: ForecastPreviewJob[] }>>(`/platform/lab-operations/forecast-policies/${id}/preview`, { params: { page } })).data) }
export async function applyTimingPolicy(input: { policyId: string; reason: string; jobs: { jobId: string; version: number; previousPolicyId: string | null }[] }) { return unwrap((await api.post<Envelope<{ applied: number }>>('/platform/lab-operations/forecast-policies/apply', input)).data) }
export async function getCompletionForecast(id: string) { return unwrap((await api.get<Envelope<CompletionForecast>>(`/platform/lab-operations/work-orders/${id}/forecast`)).data) }
