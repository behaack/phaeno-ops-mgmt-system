import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import type { TrialDetail } from '#/api/trials'
import { apiErrorMessage } from '#/api/organization-management'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { TrialFormDialog } from './TrialFormDialog'
import { useTrialMutation, useTrialQueries } from './trial-hooks'
import { trialDate, trialLabel } from './trial-presentation'

export function TrialProjectsPage({ search, status, owner, onFilter }: { search: string; status: string; owner: string; onFilter: (value: { q?: string; status?: string; owner?: string }) => void }) {
  const queries = useTrialQueries(undefined, search, status, owner)
  const [creating, setCreating] = useState(false)
  const mutation = useTrialMutation<TrialDetail>()
  const navigate = useNavigate()
  if (!queries.allowed) return <p className="p-6">Trial projects are unavailable for this organization and department.</p>
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">Trial projects</h1><p className="text-sm text-muted-foreground">No-charge PSeq evaluations with an agreed scope and submission window.</p></div>
      {queries.staff ? <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/trial-projects/configuration">Trial configuration</Link></Button><Button onClick={() => setCreating(true)}>Start Trial</Button></div> : null}</header>
    <Input aria-label="Search Trial projects" placeholder="Search Trial number or company" value={search} onChange={event => onFilter({ q: event.target.value })} className="max-w-md" />
    <div className="flex flex-wrap gap-3"><label className="text-sm">Status<select className="ml-2 h-9 rounded-md border bg-background px-2" value={status} onChange={event => onFilter({ status: event.target.value })}><option value="">All statuses</option>{['Requested','UnderReview','AwaitingAcceptance','AwaitingSamples','InProgress','OnHold','Completed','ClosedIncomplete','Declined','Expired','Cancelled'].map(value => <option key={value} value={value}>{trialLabel(value)}</option>)}</select></label>{queries.staff ? <label className="text-sm">Sales owner<select className="ml-2 h-9 rounded-md border bg-background px-2" value={owner} onChange={event => onFilter({ owner: event.target.value })}><option value="">All owners</option>{queries.config.data?.staff.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label> : null}</div>
    {queries.list.data?.length === 250 ? <p className="text-sm text-muted-foreground">Showing the latest 250 matching Trials. Narrow the search or filters to find older work.</p> : null}
    {queries.list.error ? <p role="alert">{apiErrorMessage(queries.list.error)}</p> : queries.list.isPending ? <p role="status">Loading Trials…</p> : queries.list.data?.length ?
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><caption className="sr-only">Trial projects in the selected organization and department</caption><thead className="bg-muted"><tr>{['Trial', 'Company', 'Status', 'Samples', 'Submission closes', ...(queries.staff ? ['Sales owner', 'Requested', 'Next due'] : [])].map(label => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>{queries.list.data.map(trial => <tr key={trial.id} className="border-t"><td className="p-3"><Link to="/trial-projects/$trialId" params={{ trialId: trial.id }} className="font-medium text-primary underline underline-offset-4">{trial.number}</Link><p className="text-muted-foreground">{trial.name}</p></td><td className="p-3">{trial.companyName}</td><td className="p-3">{trialLabel(trial.status)}{trial.isOnHold ? ' · On hold' : ''}</td><td className="p-3">{trial.sampleCount} submitted · {trial.sampleAllowance ?? 'Unapproved'} allowance</td><td className="p-3">{trialDate(trial.submissionClosesAtUtc)}</td>{queries.staff ? <><td className="p-3">{trial.salesOwnerName}</td><td className="p-3">{trialDate(trial.requestedAtUtc)}</td><td className="p-3">{trialDate(trial.dueAtUtc)}</td></> : null}</tr>)}</tbody></table></div>
      : <p className="rounded-lg border p-6 text-muted-foreground">No Trials match this view.{queries.staff ? ' Start from a Trial request linked to a CRM company and opportunity.' : 'Approved Trials will appear here.'}</p>}
    {creating ? <TrialFormDialog title="Start Trial" description="Choose the commercial request. Define the scientific scope in the Trial workspace next." fields={[{ name: 'crmHandoffId', label: 'CRM Trial request', type: 'select', required: true, options: queries.config.data?.handoffs.map(value => ({ value: value.id, label: `${value.companyName} · ${value.opportunityName} · ${value.summary}` })) }]} onClose={() => setCreating(false)} onSubmit={async (values, key) => { const created = await mutation.mutateAsync({ path: '', payload: values, key }); await navigate({ to: '/trial-projects/$trialId', params: { trialId: created.id } }) }} submitLabel="Start Trial">
      {!queries.config.data?.handoffs.length ? <p>Create a Trial request from the company’s CRM relationship workspace and link its opportunity first.</p> : null}
    </TrialFormDialog> : null}
  </main>
}
