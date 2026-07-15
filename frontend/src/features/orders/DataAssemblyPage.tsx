import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Download, Plus, Search, Workflow } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

import { exportOrderList, getOrderErrorMessage, listAssemblyRequests } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { usePhaenoSession } from '#/features/auth/session-context'
import { OrderListFilters, orderFilterParams, type OrderListFilterState } from './OrderListFilters'
import { OrderStatusBadge } from './OrderStatusBadge'

export function DataAssemblyPage() {
  const { authProvider, session } = usePhaenoSession()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<OrderListFilterState>({ status: '', createdFrom: '', createdTo: '', submittedByMe: false })
  const deferredSearch = useDeferredValue(search)
  const canView = Boolean(session?.capabilities.canViewDataAssemblyRequests)
  const apiEnabled = canView && authProvider !== 'mock'
  const filters = orderFilterParams(filter, session?.user?.id)
  const requests = useQuery({ queryKey: ['data-assembly-requests', deferredSearch, filter], queryFn: () => listAssemblyRequests({ search: deferredSearch || undefined, ...filters }), enabled: apiEnabled })
  const exportCsv = useMutation({ mutationFn: () => exportOrderList('assembly', { search: deferredSearch || undefined, ...filters }) })
  if (!canView) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Data assembly unavailable</AlertTitle><AlertDescription>Select an active Partner organization with data-assembly access.</AlertDescription></Alert></main>
  return <main className="page-wrap px-4 py-8">
    <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-3xl font-semibold">Data assembly</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Submit validated scientific inputs for Phaeno assembly, approve job-specific pricing, and retrieve released output packages.</p></div><div className="flex flex-wrap gap-2">{apiEnabled ? <Button type="button" variant="outline" disabled={exportCsv.isPending} onClick={() => exportCsv.mutate()}><Download data-icon="inline-start" />Export CSV</Button> : null}{session?.capabilities.canCreateDataAssemblyRequests ? <Button asChild><Link to="/data-assembly/new"><Plus data-icon="inline-start" />Request data assembly</Link></Button> : null}</div></section>
    {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Connected requests are paused in mock-session mode</AlertTitle><AlertDescription>Use a signed-in Partner session to submit and track assembly work.</AlertDescription></Alert> : null}
    {exportCsv.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Export could not be created</AlertTitle><AlertDescription>{getOrderErrorMessage(exportCsv.error, 'Try the export again.')}</AlertDescription></Alert> : null}
    <Card><CardHeader><CardTitle>Assembly requests</CardTitle><CardDescription>Search by request number, project reference, PO, or profile.</CardDescription><div className="relative mt-3 max-w-md"><label htmlFor="assemblySearch" className="sr-only">Search assembly requests</label><Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="assemblySearch" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests" /></div><OrderListFilters idPrefix="assembly-requests" value={filter} onChange={setFilter} statuses={assemblyStatuses} /></CardHeader><CardContent>
      {requests.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Requests could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(requests.error, 'Try refreshing this page.')}</AlertDescription></Alert> : null}
      {requests.isLoading ? <p role="status">Loading assembly requests…</p> : null}
      {(requests.data?.items.length ?? 0) ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="px-2 py-3">Request</th><th className="px-2 py-3">Project</th><th className="px-2 py-3">Status</th><th className="px-2 py-3">Updated</th></tr></thead><tbody>{requests.data?.items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-2 py-3"><Link to="/data-assembly/$requestId" params={{ requestId: item.id }} className="font-medium text-primary hover:underline">{item.number}</Link></td><td className="px-2 py-3">{item.reference ?? '—'}</td><td className="px-2 py-3"><OrderStatusBadge status={item.status} /></td><td className="px-2 py-3 text-muted-foreground">{formatDate(item.updatedAt)}</td></tr>)}</tbody></table></div> : !requests.isLoading ? <div className="flex flex-col items-center py-12 text-center"><Workflow aria-hidden="true" className="mb-3 size-8 text-muted-foreground" /><p className="font-medium">{apiEnabled && search ? 'No matching assembly requests' : 'No assembly requests yet'}</p><p className="mt-1 text-sm text-muted-foreground">{apiEnabled ? 'Start a request using an active Phaeno-managed assembly profile.' : 'Connect a real Partner session to load requests.'}</p></div> : null}
    </CardContent></Card>
  </main>
}

function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value)) }
const assemblyStatuses = ['Draft', 'Submitted', 'IntakeValidation', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedQueued', 'Processing', 'OutputReview', 'OutputAvailable', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Rejected'].map((value) => ({ value, label: value.replace(/([a-z])([A-Z])/g, '$1 $2') }))
