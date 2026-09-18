export const deadlineLabels = {
  Overdue: 'Overdue', AtRisk: 'At risk', DueSoon: 'Due soon',
  AwaitingAcceptance: 'Awaiting acceptance', NoKnownRisk: 'No known risk',
  CompleteOnTime: 'Complete on time', CompleteLate: 'Complete late', CompleteUndated: 'Complete — no due date', CompleteUnverified: 'Complete — timing unverified', Cancelled: 'Cancelled',
} as const
export type DeadlineStatus = keyof typeof deadlineLabels
export const activeDeadlineLabels = { Overdue: 'Overdue', AtRisk: 'At risk', DueSoon: 'Due soon' } as const
export const jobStatusLabels = {
  AwaitingReceipt: 'Awaiting receipt', AwaitingAcceptance: 'Awaiting acceptance', ReadyForPreparation: 'Ready for preparation',
  LibraryPreparation: 'Library preparation', Sequencing: 'Sequencing', DataProcessing: 'Data processing',
  QualityReview: 'Quality review', AwaitingDelivery: 'Awaiting delivery', OnHold: 'On hold',
} as const
export type JobStatus = keyof typeof jobStatusLabels
export type JobView = 'Active' | 'Closed'
export type JobListSearch = {
  jobView?: JobView; jobSearch?: string; jobDeadline?: keyof typeof activeDeadlineLabels; jobPage?: number
  jobFrom?: string; jobTo?: string; jobStatus?: JobStatus
  jobClosedSearch?: string; jobClosedFrom?: string; jobClosedTo?: string; jobOutcome?: 'Delivered' | 'Cancelled'; jobClosedPage?: number
}
export function parseJobDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0100-01-01' || value > '9998-12-31') return undefined
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined
}
export function jobDateBoundary(value: string | undefined, afterDay = false): string | undefined {
  if (!parseJobDate(value)) return undefined
  const [year, month, day] = value!.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (afterDay) date.setDate(date.getDate() + 1)
  return date.toISOString()
}
export function parseJobListSearch(search: Record<string, unknown>): JobListSearch {
  const text = (v: unknown) => typeof v === 'string' ? v.slice(0, 255) : undefined
  const page = (v: unknown) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : undefined
  const legacyClosed = search.jobView === undefined && (search.showComplete === true || search.showComplete === 'true' || search.jobDeadline === 'Cancelled' || typeof search.jobDeadline === 'string' && search.jobDeadline.startsWith('Complete'))
  return {
    jobView: search.jobView === 'Closed' || legacyClosed ? 'Closed' : undefined,
    jobSearch: text(search.jobSearch),
    jobDeadline: typeof search.jobDeadline === 'string' && Object.hasOwn(activeDeadlineLabels, search.jobDeadline) ? search.jobDeadline as JobListSearch['jobDeadline'] : undefined,
    jobPage: page(search.jobPage), jobFrom: parseJobDate(search.jobFrom), jobTo: parseJobDate(search.jobTo),
    jobStatus: typeof search.jobStatus === 'string' && Object.hasOwn(jobStatusLabels, search.jobStatus) ? search.jobStatus as JobStatus : undefined,
    jobClosedSearch: text(search.jobClosedSearch ?? (legacyClosed ? search.jobSearch : undefined)),
    jobClosedPage: page(search.jobClosedPage), jobClosedFrom: parseJobDate(search.jobClosedFrom), jobClosedTo: parseJobDate(search.jobClosedTo),
    jobOutcome: search.jobOutcome === 'Delivered' || search.jobOutcome === 'Cancelled' ? search.jobOutcome : legacyClosed && search.jobDeadline === 'Cancelled' ? 'Cancelled' : undefined,
  }
}
export function clearJobFilters(view: JobView): JobListSearch {
  return view === 'Closed' ? { jobClosedSearch: undefined, jobClosedFrom: undefined, jobClosedTo: undefined, jobClosedPage: undefined, jobOutcome: undefined }
    : { jobSearch: undefined, jobDeadline: undefined, jobPage: undefined, jobFrom: undefined, jobTo: undefined, jobStatus: undefined }
}
export function deadlineDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not established'
}

export function jobFilterSummary(filters: JobListSearch): string {
  const closed = filters.jobView === 'Closed'
  const search = closed ? filters.jobClosedSearch : filters.jobSearch
  const from = closed ? filters.jobClosedFrom : filters.jobFrom
  const to = closed ? filters.jobClosedTo : filters.jobTo
  const criteria: string[] = []
  const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' })
  if (search) criteria.push(`job or organization matching “${search}”`)
  if (from || to) {
    const range = from && to ? from === to ? `on ${date(from)}` : `from ${date(from)} through ${date(to)}`
      : from ? `on or after ${date(from)}` : `on or before ${date(to!)}`
    criteria.push(`${closed ? 'order' : 'due'} dates ${range}${from && to && from > to ? ' (invalid range)' : ''}`)
  }
  if (closed && filters.jobOutcome) criteria.push(`outcome “${filters.jobOutcome}”`)
  if (!closed && filters.jobDeadline) criteria.push(`deadline status “${activeDeadlineLabels[filters.jobDeadline]}”`)
  if (!closed && filters.jobStatus) criteria.push(`job status “${jobStatusLabels[filters.jobStatus]}”`)
  const jobs = closed ? 'closed jobs' : 'active jobs'
  return criteria.length ? `${closed ? 'Closed' : 'Active'} jobs filtered by ${new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' }).format(criteria)}.`
    : `Showing all ${jobs}.`
}
