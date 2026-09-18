import { ForecastSummary } from './CompletionForecast'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { getLabJobs } from '#/api/lab-jobs'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import { activeDeadlineLabels, clearJobFilters, deadlineDate, deadlineLabels, jobDateBoundary, jobFilterSummary, jobStatusLabels, parseJobDate, parseJobListSearch, type DeadlineStatus, type JobListSearch, type JobView } from './job-deadlines'

export function DeadlineBadge({ status }: { status: DeadlineStatus }) {
  const urgent = status === 'Overdue' || status === 'AtRisk'
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${urgent ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>{deadlineLabels[status]}</span>
}

function JobDateFilter({ id, label, value, min, max, invalidRange, onCommit }: {
  id: string; label: string; value: string | undefined; min: string; max: string
  invalidRange: boolean; onCommit: (value: string | undefined) => void
}) {
  const [incomplete, setIncomplete] = useState(false)
  return <div className="space-y-1">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type="date" defaultValue={value ?? ''} min={min} max={max}
      aria-invalid={incomplete || invalidRange}
      aria-describedby={incomplete ? `${id}-error` : invalidRange ? 'job-date-error' : undefined}
      onChange={() => setIncomplete(false)}
      onBlur={event => {
        const input = event.currentTarget
        if (input.validity.badInput || input.value && !parseJobDate(input.value)) {
          setIncomplete(true)
          return
        }
        setIncomplete(false)
        const next = input.value || undefined
        if (next !== value) onCommit(next)
      }}
      onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
    {incomplete ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">Enter a complete date with a four-digit year.</p> : null}
  </div>
}

export function JobsList({ enabled }: { enabled: boolean }) {
  const navigate = useNavigate()
  const search = useRouterState({ select: s => s.location.search })
  const filters = parseJobListSearch(search)
  const view: JobView = filters.jobView ?? 'Active'
  const closed = view === 'Closed'
  const searchValue = (closed ? filters.jobClosedSearch : filters.jobSearch) ?? ''
  const from = closed ? filters.jobClosedFrom : filters.jobFrom
  const to = closed ? filters.jobClosedTo : filters.jobTo
  const invalidRange = Boolean(from && to && from > to)
  const appliedFilterCount = [searchValue, from, to, ...(closed ? [filters.jobOutcome] : [filters.jobDeadline, filters.jobStatus])].filter(Boolean).length
  const [dateReset, setDateReset] = useState(0)
  const [settledSearch, setSettledSearch] = useState({ view, value: searchValue })
  useEffect(() => {
    const timer = setTimeout(() => setSettledSearch({ view, value: searchValue }), 250)
    return () => clearTimeout(timer)
  }, [view, searchValue])
  const params = {
    view, search: searchValue || undefined, page: closed ? filters.jobClosedPage : filters.jobPage,
    deadlineStatus: closed ? undefined : filters.jobDeadline, jobStatus: closed ? undefined : filters.jobStatus,
    outcome: closed ? filters.jobOutcome : undefined, fromUtc: jobDateBoundary(from), toExclusiveUtc: jobDateBoundary(to, true),
  }
  const jobs = useQuery({ queryKey: ['lab-jobs', 'active-closed', params], queryFn: () => getLabJobs(params),
    enabled: enabled && !invalidRange && settledSearch.view === view && settledSearch.value === searchValue, refetchInterval: 60_000 })
  const change = (value: JobListSearch) => void navigate({ to: '/lab-operations', search: previous => ({ ...previous, section: 'jobs', ...(closed ? { jobClosedPage: undefined } : { jobPage: undefined }), ...value }), replace: true, resetScroll: false })
  const switchView = (value: string) => void navigate({ to: '/lab-operations', search: previous => ({ ...previous, section: 'jobs', jobView: value === 'Closed' ? 'Closed' : 'Active' }), replace: true, resetScroll: false })
  const data = invalidRange || jobs.error ? undefined : jobs.data
  const content = <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>{closed ? 'Closed jobs' : 'Active jobs'}</CardTitle>
      <CardDescription>{closed ? 'Find delivered and cancelled jobs.' : 'Track sent specimens through delivery of every sample’s results.'}</CardDescription>
      <Collapsible.Root className="group/filters">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Collapsible.Trigger asChild>
            <button type="button" className="flex min-h-9 cursor-pointer items-center gap-2 rounded-sm py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 group-data-[state=open]/filters:rotate-90" />
              Filters{appliedFilterCount ? ` (${appliedFilterCount} applied)` : ''}
              {invalidRange ? <span className="text-destructive">— Check date range</span> : null}
            </button>
          </Collapsible.Trigger>
          <Button variant="outline" onClick={() => { setDateReset(value => value + 1); change(clearJobFilters(view)) }}>Clear filters</Button>
        </div>
        <p className="mt-1 break-words text-sm text-muted-foreground group-data-[state=open]/filters:hidden">{jobFilterSummary(filters)}</p>
        <Collapsible.Content>
          <div className={`mt-3 grid items-start gap-3 sm:grid-cols-2 ${closed ? '' : 'lg:grid-cols-3'}`}>
            <div className="space-y-1"><Label htmlFor="job-search">Job or organization</Label><Input id="job-search" type="search" value={searchValue} maxLength={255} onChange={e => change(closed ? { jobClosedSearch: e.target.value || undefined } : { jobSearch: e.target.value || undefined })} placeholder="Job or organization" /></div>
            {closed ? <div className="space-y-1"><Label htmlFor="job-outcome">Outcome</Label><select id="job-outcome" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={filters.jobOutcome ?? ''} onChange={e => change({ jobOutcome: e.target.value as JobListSearch['jobOutcome'] || undefined })}><option value="">All outcomes</option><option value="Delivered">Delivered</option><option value="Cancelled">Cancelled</option></select></div> : null}
            {!closed ? <>
              <div className="space-y-1"><Label htmlFor="job-status-filter">Job status</Label><select id="job-status-filter" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={filters.jobStatus ?? ''} onChange={e => change({ jobStatus: e.target.value as JobListSearch['jobStatus'] || undefined })}><option value="">All job statuses</option>{Object.entries(jobStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
              <div className="flex flex-col"><Label className="mb-1" htmlFor="job-deadline-filter">Deadline status</Label><select id="job-deadline-filter" className="h-9 w-full rounded-md border bg-transparent px-3 text-sm" value={filters.jobDeadline ?? ''} onChange={e => change({ jobDeadline: e.target.value as JobListSearch['jobDeadline'] || undefined })}><option value="">All deadlines</option>{Object.entries(activeDeadlineLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                {!closed && data ? <div className="mt-[3px] flex flex-wrap gap-x-4 gap-y-1 pl-[10px] text-xs" aria-label="Job deadline counts"><button type="button" className="cursor-pointer rounded-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => change({ jobDeadline: undefined })}>All</button>{(Object.keys(activeDeadlineLabels) as Array<keyof typeof activeDeadlineLabels>).map(status => <button key={status} type="button" className="cursor-pointer rounded-sm text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => change({ jobDeadline: status })}>{deadlineLabels[status]}: {data.counts[status] ?? 0}</button>)}</div> : null}
              </div>
            </> : null}
          </div>
          <div className="mt-3 grid items-end gap-3 sm:grid-cols-2">
            <JobDateFilter key={`${view}:from:${from ?? ''}:${dateReset}`} id="job-date-from" label={closed ? 'Order date: From' : 'Due date: From'} value={from} min="0100-01-01" max={to ?? '9998-12-31'} invalidRange={invalidRange} onCommit={value => change(closed ? { jobClosedFrom: value } : { jobFrom: value })} />
            <JobDateFilter key={`${view}:to:${to ?? ''}:${dateReset}`} id="job-date-to" label={closed ? 'Order date: To' : 'Due date: To'} value={to} min={from ?? '0100-01-01'} max="9998-12-31" invalidRange={invalidRange} onCommit={value => change(closed ? { jobClosedTo: value } : { jobTo: value })} />
          </div>
          {invalidRange ? <p id="job-date-error" role="alert" className="mt-2 text-sm text-destructive">From must be on or before To.</p> : null}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground">Dates include the entire selected day in {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}.</p>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </CardHeader>
    <CardContent className="space-y-3 p-4" aria-busy={jobs.isFetching}>
      {jobs.isLoading ? <p role="status">Loading jobs…</p> : null}
      {jobs.error ? <Alert variant="destructive"><AlertDescription>{getLabOperationsError(jobs.error, 'Jobs could not be loaded. Try Refresh.')}</AlertDescription></Alert> : null}
      {data?.items.map(({ job, deadlineStatus, reason, jobStatus, forecast }) => <article key={job.id} className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="font-medium text-primary underline-offset-4 hover:underline" to="/lab-operations/$workOrderId" params={{ workOrderId: job.id }} search={previous => ({ ...previous, section: 'jobs', tab: 'specimens' })}>{job.name}</Link><p className="mt-1 text-sm text-muted-foreground">{job.organizationName}{job.customerReference ? ` · ${job.customerReference}` : ''}</p></div>{closed ? <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">{jobStatus === 'Cancelled' ? 'Cancelled' : 'Delivered'}</span> : <DeadlineBadge status={deadlineStatus} />}</div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Delivery due {job.dueDateAdjusted ? '(adjusted)' : '(standard TAT)'}</dt><dd>{deadlineDate(job.dueAtUtc)}</dd></div><div><dt className="text-muted-foreground">{closed ? 'Order date' : 'Calculated expected completion'}</dt><dd>{closed ? deadlineDate(job.orderCreatedAtUtc) : <ForecastSummary forecast={forecast} />}</dd></div><div><dt className="text-muted-foreground">Portal delivery</dt><dd>{job.deliveredSampleCount} of {job.sampleCount} samples{job.isComplete ? ` · ${deadlineDate(job.completedAtUtc)}` : ''}</dd></div></dl>
        <p className="text-sm">{closed && jobStatus === 'Cancelled' ? 'This job was cancelled.' : reason}</p><p className="text-xs text-muted-foreground">Job status: {jobStatus === 'Delivered' || jobStatus === 'Cancelled' ? jobStatus : jobStatusLabels[jobStatus]}{job.nextSampleDueAtUtc && !closed ? ` · Next outstanding sample target: ${deadlineDate(job.nextSampleDueAtUtc)}` : ''}</p>
      </article>)}
      {data && data.items.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">No jobs match these filters.</p> : null}
      {data ? <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><p className="text-sm" role="status">{data.totalCount} jobs · Page {data.page} of {Math.max(1, Math.ceil(data.totalCount / data.pageSize))}</p><div className="flex gap-2"><Button variant="outline" disabled={data.page <= 1 || jobs.isFetching} onClick={() => change(closed ? { jobClosedPage: data.page - 1 } : { jobPage: data.page - 1 })}>Previous</Button><Button variant="outline" disabled={data.page * data.pageSize >= data.totalCount || jobs.isFetching} onClick={() => change(closed ? { jobClosedPage: data.page + 1 } : { jobPage: data.page + 1 })}>Next</Button></div></div> : null}
    </CardContent>
  </Card>
  return <Tabs value={view} onValueChange={switchView}>
    <TabsList aria-label="Jobs view" className="grid w-full grid-cols-2"><TabsTrigger value="Active">Active jobs</TabsTrigger><TabsTrigger value="Closed">Closed jobs</TabsTrigger></TabsList>
    <TabsContent value="Active">{!closed ? content : null}</TabsContent>
    <TabsContent value="Closed">{closed ? content : null}</TabsContent>
  </Tabs>
}
