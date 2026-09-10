import { customerLabStatus } from './lab-customer-progress'
import { RequestCustomWorkButton } from './RequestCustomWorkButton'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { exportOrderList, getLabServiceOrderingEligibility, getOrderErrorMessage, listAssemblyRequests, listLabOrders, listReagentOrders } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { OrderListFilters, orderFilterParams } from './OrderListFilters'
import { OrderStatusBadge } from './OrderStatusBadge'
import { parseExternalOrderListSearch, type ExternalOrderListSearch } from './external-order-list-search'

const views = {
  lab: { title: 'Lab services', record: 'laboratory requests', path: '/lab-services', create: '/lab-services/new', createLabel: 'Request lab service', query: 'lab-service-orders', list: listLabOrders, description: 'Review configured PSeq Lab Service or request custom pricing, prepare the accepted sample list, ship samples and retrieve released results.', statuses: ['DraftRequest', 'SubmittedForQuote', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedAwaitingSamples', 'InProgress', 'ResultsAvailable', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Declined'] },
  reagent: { title: 'PSeq Kit orders', record: 'reagent orders', path: '/reagent-orders', create: '/reagent-orders/new', createLabel: 'Create PSeq Kit order', query: 'reagent-orders', list: listReagentOrders, description: 'Purchase kit bundles and track each shipment, included assembly case, deadline and released result.', statuses: ['Draft', 'Placed', 'UnderReview', 'Accepted', 'Processing', 'PartiallyShipped', 'Shipped', 'OnHold', 'CancellationRequested', 'Fulfilled', 'Cancelled', 'Rejected'] },
  assembly: { title: 'Assembly cases', record: 'assembly requests', path: '/data-assembly', create: '/data-assembly/new', createLabel: 'Request data assembly', query: 'data-assembly-requests', list: listAssemblyRequests, description: 'Continue included kit cases, correct submitted inputs and retrieve released outputs. Historical standalone requests remain available.', statuses: ['Draft', 'Submitted', 'IntakeValidation', 'ChangesRequested', 'QuoteInPreparation', 'QuoteIssued', 'PlacedQueued', 'Processing', 'OutputReview', 'OutputAvailable', 'OnHold', 'CancellationRequested', 'Completed', 'Cancelled', 'Rejected'] },
} as const

export function ExternalOrderListPage({ kind }: { kind: keyof typeof views }) {
  const view = views[kind]
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const state = useRouterState({ select: value => parseExternalOrderListSearch(value.location.search) })
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const [settledSearch, setSettledSearch] = useState(state.q ?? '')
  useEffect(() => { const timer = setTimeout(() => setSettledSearch(state.q ?? ''), 250); return () => clearTimeout(timer) }, [state.q])
  const update = (change: Partial<ExternalOrderListSearch>, keepPage = false) => void navigate({ to: view.path, search: { ...state, ...(keepPage ? {} : { page: undefined }), ...change }, replace: true })
  const caps = session?.capabilities
  const canView = Boolean(kind === 'lab' ? caps?.canViewLabServiceOrders : kind === 'reagent' ? caps?.canViewReagentOrders : caps?.canViewDataAssemblyRequests)
  const canCreateByRole = Boolean(kind === 'lab' ? caps?.canCreateLabServiceRequests : kind === 'reagent' ? caps?.canCreateReagentOrders : false)
  const enabled = canView && authProvider !== 'mock'
  const filter = { status: state.status ?? '', createdFrom: state.from ?? '', createdTo: state.through ?? '', submittedByMe: state.mine ?? false }
  const filters = orderFilterParams(filter, session?.user?.id)
  const page = state.page ?? 1
  const params = { search: settledSearch || undefined, ...filters, page, pageSize: 25 }
  const orders = useQuery({ queryKey: [view.query, selectedOrganizationId, selectedDepartmentId, params], queryFn: () => view.list(params), enabled })
  const eligibility = useQuery({ queryKey: ['lab-service-ordering-eligibility', selectedOrganizationId, selectedDepartmentId], queryFn: getLabServiceOrderingEligibility, enabled: enabled && kind === 'lab' && canCreateByRole })
  const canCreate = canCreateByRole && (kind !== 'lab' || authProvider === 'mock' || eligibility.data?.canOrder === true)
  const exportCsv = useMutation({ mutationFn: () => exportOrderList(kind, { search: state.q, ...filters }) })
  const hasFilters = Boolean(state.q || state.status || state.from || state.through || state.mine)
  if (!canView) return <main className="page-wrap px-4 py-8"><Alert><AlertTitle>{view.title} unavailable</AlertTitle><AlertDescription>This workspace is unavailable in the current organization and Department.</AlertDescription></Alert></main>
  return <main className="page-wrap space-y-5 px-4 py-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{view.title}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{view.description}</p></div><div className="flex flex-wrap gap-2">{kind === 'reagent' ? <RequestCustomWorkButton service="PSeqKit" defaultSubject="Custom PSeq Kit work" /> : null}{kind === 'assembly' ? <Button asChild><Link to="/reagent-orders">Open PSeq Kit orders</Link></Button> : null}{enabled ? <Button variant="outline" disabled={exportCsv.isPending} onClick={() => exportCsv.mutate()}>Export CSV</Button> : null}{canCreate ? <Button asChild><Link to={view.create} search={state}>{view.createLabel}</Link></Button> : canCreateByRole ? <Button disabled>{view.createLabel}</Button> : null}</div></header>
    {!enabled ? <Alert><AlertTitle>Connected records are paused in mock-session mode</AlertTitle><AlertDescription>Use a signed-in organization session to load current work.</AlertDescription></Alert> : null}
    {kind === 'lab' && canCreateByRole && enabled && (eligibility.isLoading || eligibility.error || eligibility.data?.canOrder === false) ? <Alert><AlertTitle>{eligibility.error ? 'Ordering availability could not be checked' : eligibility.isLoading ? 'Checking ordering authorization…' : 'New Jobs are unavailable'}</AlertTitle><AlertDescription>{eligibility.data?.blockingReason}{eligibility.error ? <Button variant="outline" onClick={() => { void eligibility.refetch() }}>Retry availability</Button> : null}</AlertDescription></Alert> : null}
    {exportCsv.error ? <Alert variant="destructive"><AlertTitle>Export could not be created</AlertTitle><AlertDescription>{getOrderErrorMessage(exportCsv.error, 'Try exporting again.')}</AlertDescription></Alert> : null}
    <section aria-label={`${view.title} filters`} className="rounded-lg border bg-card p-4"><Label htmlFor={`${kind}-search`}>Search {view.record}</Label><Input ref={searchRef} id={`${kind}-search`} className="mt-2 max-w-lg" placeholder="Number, reference or sample" value={state.q ?? ''} onChange={event => update({ q: event.target.value || undefined })} /><OrderListFilters statusLabel={kind === 'lab' ? 'Order status' : 'Status'} idPrefix={kind} value={filter} statuses={view.statuses.map(value => ({ value, label: value.replace(/([a-z])([A-Z])/g, '$1 $2') }))} onChange={value => update({ status: value.status || undefined, from: value.createdFrom || undefined, through: value.createdTo || undefined, mine: value.submittedByMe || undefined })} />{hasFilters ? <Button variant="ghost" className="mt-3" onClick={() => { setSettledSearch(''); void navigate({ to: view.path, search: {}, replace: true }); searchRef.current?.focus() }}>Clear all</Button> : null}</section>
    {orders.error ? <Alert variant="destructive"><AlertTitle>{view.title} could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(orders.error, 'Try again. Your filters are preserved.')} <Button variant="outline" onClick={() => { void orders.refetch() }}>Retry records</Button></AlertDescription></Alert> : null}
    <section aria-label={`${view.title} results`} aria-busy={orders.isFetching || settledSearch !== (state.q ?? '')}>
      {orders.isLoading ? <p role="status">Loading {view.record}…</p> : orders.data?.items.length ? <><div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">{kind === 'lab' ? 'Job name' : kind === 'reagent' ? 'Order' : 'Request'}</th><th className="p-3">{kind === 'lab' ? 'Job number' : kind === 'reagent' ? 'PO' : 'Project'}</th><th className="p-3">Status</th><th className="p-3">Updated</th></tr></thead><tbody>{orders.data.items.map(item => <tr key={item.id} className="border-t"><td className="p-3">{kind === 'assembly' ? <Link to="/data-assembly/$requestId" params={{ requestId: item.id }} search={state} className="font-medium text-primary underline">{item.number}</Link> : kind === 'lab' ? <Link to="/lab-services/$orderId" params={{ orderId: item.id }} search={state} className="font-medium text-primary underline">{item.reference || item.number}</Link> : <Link to="/reagent-orders/$orderId" params={{ orderId: item.id }} search={state} className="font-medium text-primary underline">{item.number}</Link>}</td><td className="p-3">{kind === 'lab' ? item.number : item.reference ?? '—'}</td><td className="p-3"><OrderStatusBadge status={kind === 'lab' ? customerLabStatus(item.status, item.laboratoryProgress) : item.status} /></td><td className="p-3">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(item.updatedAt))}</td></tr>)}</tbody></table></div></> : enabled && !orders.error ? <div role="status" className="rounded-lg border p-8 text-center"><h2 className="font-semibold">{orders.data?.totalCount && page > 1 ? 'No records on this page' : hasFilters ? `No matching ${view.record}` : `No ${view.record} yet`}</h2><p className="mt-2 text-sm text-muted-foreground">{hasFilters ? 'Try different filters or clear all to see other work.' : `Use ${view.createLabel} when you are ready to begin.`}</p>{orders.data?.totalCount && page > 1 ? <Button className="mt-3" variant="outline" onClick={() => update({ page: undefined }, true)}>First page</Button> : null}</div> : null}
      {orders.data && !orders.error ? <nav aria-label="Results pages" className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{orders.data.totalCount} records · Page {page} of {Math.max(1, Math.ceil(orders.data.totalCount / 25))}</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || orders.isFetching} onClick={() => update({ page: page > 2 ? page - 1 : undefined }, true)}>Previous</Button><Button variant="outline" disabled={page * 25 >= orders.data.totalCount || orders.isFetching} onClick={() => update({ page: page + 1 }, true)}>Next</Button></div></nav> : null}
    </section>
  </main>
}
