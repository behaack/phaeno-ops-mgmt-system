import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { FlaskConical, Search } from 'lucide-react'
import { Label } from '#/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { getTrialHandoffs, type TrialDetail } from '#/api/trials'
import { apiErrorMessage } from '#/api/organization-management'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { TrialFormDialog } from './TrialFormDialog'
import { useTrialMutation, useTrialQueries } from './trial-hooks'
import { trialDate, trialLabel } from './trial-presentation'

export function TrialProjectsPage({ search, status, owner, requestId, fromCompanyId, onFilter }: { search: string; status: string; owner: string; requestId?: string; fromCompanyId?: string; onFilter: (value: { q?: string; status?: string; owner?: string; requestId?: string }) => void }) {
  const [settledSearch, setSettledSearch] = useState(search)
  useEffect(() => {
    const timer = setTimeout(() => setSettledSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search])
  const queries = useTrialQueries(undefined, settledSearch, status, owner)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const hasFilters = Boolean(search || status || owner)
  const updating = search !== settledSearch || queries.list.isFetching
  const clearFilters = () => { setSettledSearch(''); onFilter({ q: '', status: '', owner: '' }); searchInputRef.current?.focus() }
  const [creating, setCreating] = useState(Boolean(requestId))
  const createdFromRequest = useRef(false)
  const mutation = useTrialMutation<TrialDetail>()
  const navigate = useNavigate()
  if (!queries.allowed) return <p className="p-6">Trial projects are unavailable for this organization and department.</p>
  return <main className="page-wrap space-y-6 px-4 py-8">
    {fromCompanyId && queries.staff ? <Link to="/crm/companies/$companyId" params={{ companyId: fromCompanyId }} className="text-primary underline">Back to Company</Link> : null}
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-semibold">Trial projects</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">No-charge PSeq evaluations with an agreed scope and submission window.</p></div>
      {queries.staff ? <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/trial-projects/configuration">Trial configuration</Link></Button><Button onClick={() => setCreating(true)}>Start Trial</Button></div> : null}</header>
    <section aria-label="Trial project filters" className="space-y-3 rounded-xl border bg-card p-4">
      <div className={`grid items-end gap-4 sm:grid-cols-2 ${queries.staff ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
        <div className={`min-w-0 space-y-2 ${queries.staff ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
          <Label htmlFor="trial-search">Search</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input ref={searchInputRef} id="trial-search" aria-label="Search Trial projects" placeholder="Trial number or company" value={search} onChange={event => onFilter({ q: event.target.value })} className="pl-8" />
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="trial-status-filter">Status</Label>
          <select id="trial-status-filter" className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" value={status} onChange={event => onFilter({ status: event.target.value })}>
            <option value="">All statuses</option>
            {['Requested', 'UnderReview', 'AwaitingAcceptance', 'AwaitingSamples', 'InProgress', 'OnHold', 'Completed', 'ClosedIncomplete', 'Declined', 'Expired', 'Cancelled'].map(value => <option key={value} value={value}>{trialLabel(value)}</option>)}
          </select>
        </div>
        {queries.staff ? <div className="min-w-0 space-y-2">
          <Label htmlFor="trial-owner-filter">Sales owner</Label>
          <SearchableSelect id="trial-owner-filter" value={owner} onValueChange={value => onFilter({ owner: value })} options={queries.config.data?.staff.map(value => ({ value: value.id, label: value.name })) ?? []} placeholder="All owners" emptyMessage="No Sales owners available." resultsLabel="Sales owner choices" selectionMessage="Select an owner from the results." noMatchMessage="No matching owners." narrowMessage={count => `Keep typing to narrow ${count} owners.`} disabled={queries.config.isPending || Boolean(queries.config.error)} />
        </div> : null}
      </div>
      {hasFilters ? <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-sm text-muted-foreground">Filters applied</p>
        <Button variant="ghost" onClick={clearFilters}>Clear all</Button>
      </div> : null}
      {queries.staff && queries.config.error ? <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
        <p>Sales owner choices could not be loaded.</p><Button variant="outline" onClick={() => { void queries.config.refetch() }}>Retry owners</Button>
      </div> : null}
    </section>
    {updating && !queries.list.isPending ? <p role="status" className="text-sm text-muted-foreground">Updating Trial projects…</p> : null}
    {queries.list.data?.length === 250 ? <p className="text-sm text-muted-foreground">Showing the latest 250 matching Trials. Narrow the search or filters to find older work.</p> : null}
    <section aria-label="Trial project results" aria-busy={updating}>
    {queries.list.error ? <div role="alert"><p>{apiErrorMessage(queries.list.error)}</p><Button variant="outline" onClick={() => { void queries.list.refetch() }}>Retry Trials</Button></div> : queries.list.isPending ? <p role="status">Loading Trials…</p> : queries.list.data?.length ?
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><caption className="sr-only">Trial projects in the selected organization and department</caption><thead className="bg-muted"><tr>{['Trial', 'Company', 'Status', 'Samples', 'Submission closes', ...(queries.staff ? ['Sales owner', 'Requested', 'Next due'] : [])].map(label => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>{queries.list.data.map(trial => <tr key={trial.id} className="border-t"><td className="p-3"><Link to="/trial-projects/$trialId" params={{ trialId: trial.id }} search={{ q: search, status, owner, fromCompanyId }} className="font-medium text-primary underline underline-offset-4">{trial.number}</Link><p className="text-muted-foreground">{trial.name}</p></td><td className="p-3">{trial.companyName}</td><td className="p-3">{trialLabel(trial.status)}{trial.isOnHold ? ' · On hold' : ''}</td><td className="p-3">{trial.sampleCount} submitted · {trial.sampleAllowance ?? 'Unapproved'} allowance</td><td className="p-3">{trialDate(trial.submissionClosesAtUtc)}</td>{queries.staff ? <><td className="p-3">{trial.salesOwnerName}</td><td className="p-3">{trialDate(trial.requestedAtUtc)}</td><td className="p-3">{trialDate(trial.dueAtUtc)}</td></> : null}</tr>)}</tbody></table></div>
      : <div role="status" className="flex flex-col items-center rounded-xl border bg-card px-4 py-10 text-center">
          <FlaskConical aria-hidden="true" className="mb-3 size-6 text-muted-foreground" />
          <h2 className="text-base font-semibold">{hasFilters ? 'No matching Trial projects' : 'No Trial projects yet'}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{hasFilters
            ? 'Try a different search or clear the filters to see all Trial projects.'
            : queries.staff ? 'Start a Trial from an eligible CRM request linked to a company and opportunity.' : 'Trial projects shared with your organization will appear here.'}</p>
          {!hasFilters && queries.staff ? <Button asChild variant="outline" className="mt-4"><Link to="/crm/companies">View CRM companies</Link></Button> : null}
        </div>}
    </section>
    {creating && queries.staff ? <TrialCreateDialog requestId={requestId} fromCompanyId={fromCompanyId} onClose={() => { setCreating(false); if (requestId && !createdFromRequest.current) onFilter({ requestId: undefined }) }} onSubmit={async (values, key) => { const created = await mutation.mutateAsync({ path: '', payload: values, key }); createdFromRequest.current = true; await navigate({ to: '/trial-projects/$trialId', params: { trialId: created.id }, search: { fromCompanyId } }) }} /> : null}
  </main>
}
function TrialCreateDialog({ requestId, fromCompanyId, onClose, onSubmit }: { requestId?: string; fromCompanyId?: string; onClose: () => void; onSubmit: (values: Record<string, string>, key: string) => Promise<void> }) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(0)
  const [settledSearch, setSettledSearch] = useState(search)
  useEffect(() => { const timer = setTimeout(() => setSettledSearch(search), 250); return () => clearTimeout(timer) }, [search])
  const requests = useQuery({ queryKey: ['trial-requests', fromCompanyId, requestId, settledSearch, page], queryFn: () => getTrialHandoffs(settledSearch, page, fromCompanyId, requestId) })
  const options = requests.data?.items.map(value => ({ value: value.id, label: `${value.companyName} · ${value.opportunityName} · ${value.summary}` })) ?? []
  return <TrialFormDialog title="Start Trial" description={requestId ? 'Review the selected Company request, then start its Trial. Define the scientific scope in the Trial workspace next.' : 'Search eligible Company requests, choose one, and define its scientific scope in the Trial workspace next.'} fields={[{ name: 'crmHandoffId', label: 'CRM Trial request', type: 'select', required: true, options, defaultValue: requestId }]} onClose={onClose} onSubmit={onSubmit} submitDisabled={requests.isFetching || Boolean(requests.error) || search !== settledSearch} submitLabel="Start Trial">
    {!requestId ? <div className="space-y-2"><LabelForRequestSearch /><Input id="trial-request-search" placeholder="Search Company, opportunity or request" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} /></div> : null}
    {requests.isPending ? <p role="status">Loading eligible Trial requests…</p> : requests.error ? <div role="alert"><p>{apiErrorMessage(requests.error)}</p><Button type="button" variant="outline" onClick={() => { void requests.refetch() }}>Retry requests</Button></div> : !options.length ? <p role="status">{requestId ? 'This request is no longer eligible to start a Trial. Return to the Company to review whether it already has a Trial or needs another action.' : 'No eligible requests match. Create a Trial request linked to a Company and opportunity, or change the search.'}</p> : <p className="text-sm">{requests.data!.total} eligible {requests.data!.total === 1 ? 'request' : 'requests'}{fromCompanyId ? ' for this Company' : ''}.</p>}
    {!requestId && requests.data && requests.data.total > requests.data.pageSize ? <div className="flex items-center gap-2"><Button type="button" variant="outline" disabled={page === 0 || requests.isFetching} onClick={() => setPage(value => value - 1)}>Previous requests</Button><span className="text-sm">Page {page + 1} of {Math.ceil(requests.data.total / requests.data.pageSize)}</span><Button type="button" variant="outline" disabled={(page + 1) * requests.data.pageSize >= requests.data.total || requests.isFetching} onClick={() => setPage(value => value + 1)}>Next requests</Button></div> : null}
  </TrialFormDialog>
}
function LabelForRequestSearch() { return <label htmlFor="trial-request-search" className="text-sm font-medium">Find a Company request</label> }
