import { useCustomerText } from '#/features/customer-i18n/customer-text'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { parseWorkSearch, type WorkSearch } from './work-search'
import { Link } from '@tanstack/react-router'
import { getSelectedMembership, usePhaenoSession } from '#/features/auth/session-context'
import { RecordPagination } from '#/components/RecordPagination'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { NativeSelect } from '#/components/ui/native-select'
import type { WorkKind, WorkView } from '#/api/work-attention'
import { WorkList } from './WorkList'
import { useWorkAttention } from './use-work-attention'
import { useWorkMessages, type WorkMessageId } from './work-messages'

export function WorkDashboard({ full = false }: { full?: boolean }) {
  const __customerText = useCustomerText()

  const { session, selectedOrganizationId } = usePhaenoSession()
  const staff = getSelectedMembership(session, selectedOrganizationId)?.organizationKind === 'Phaeno'
  const route = useRouterState({ select: state => parseWorkSearch(state.location.search as Record<string, unknown>) })
  const navigate = useNavigate()
  const view = staff ? route.workView ?? 'mine' : 'mine'
  const kind = route.workKind ?? 'action'
  const domain = route.workDomain ?? ''
  const page = route.workPage ?? 1
  const change = (values: WorkSearch) => { void navigate({ to: '.', search: previous => ({ ...previous, ...values }), replace: true, resetScroll: false }) }
  const setPage = (next: number) => change({ workPage: next })
  const setView = (next: WorkView) => change({ workView: next, workPage: 1 })
  const setKind = (next: WorkKind) => change({ workKind: next, workPage: 1 })
  const setDomain = (next: string) => change({ workDomain: next, workPage: 1 })
  const messages = useWorkMessages()
  const summary = useWorkAttention()
  const query = useWorkAttention({ view, kind, domain: domain || undefined, priority: route.workPriority, page, pageSize: full ? 25 : 10 })
  const data = query.isError ? undefined : query.data
  const retry = () => { void Promise.all([summary.refetch({ cancelRefetch: false }), query.refetch({ cancelRefetch: false })]) }
  const chooseKind = (next: WorkKind) => { setKind(next) }
  return <main className="page-wrap space-y-5 px-4 py-8">
    <header><h1 className="text-3xl font-semibold">{messages.text('title')}</h1><p className="mt-2 text-sm text-muted-foreground">{messages.text('description')}</p></header>
    <section aria-label={messages.text('title')} className="grid gap-3 sm:grid-cols-3">{(['action', 'waiting', 'update'] as const).map((value, index) => <Button key={value} variant={kind === value ? "default" : "outline"} className="h-auto justify-start gap-3 whitespace-normal px-4 py-4 text-left" aria-pressed={kind === value} onClick={() => chooseKind(value)}>
      <span className="text-2xl tabular-nums">{summary.data && !summary.isError ? [summary.data.actionCount, summary.data.waitingCount, summary.data.updateCount][index] : '—'}</span>{messages.text(value === 'action' ? 'actions' : value === 'waiting' ? 'waiting' : 'updates')}
    </Button>)}</section>
    <section className="flex flex-wrap gap-3" aria-label={__customerText('m_29c2475f2934')}>
      {staff ? <NativeSelect aria-label={__customerText('m_82c3f7ac86a5')} value={view} onChange={event => { setView(event.target.value as WorkView) }}><option value="mine">{messages.text('myWork')}</option><option value="unassigned">{messages.text('unassigned')}</option><option value="team">{messages.text('team')}</option></NativeSelect> : null}
      <NativeSelect aria-label={__customerText('m_6e04f9c51695')} value={domain} onChange={event => { setDomain(event.target.value) }}><option value="">{messages.text('allDomains')}</option>{['commercial', 'crm', 'laboratory', 'scientific', 'fulfillment', 'shipping', 'finance', 'recovery', 'web', 'data', 'access'].map(value => <option key={value} value={value}>{messages.text(`domain.${value}` as WorkMessageId)}</option>)}</NativeSelect>
<NativeSelect aria-label={messages.text("priorityLabel")} value={route.workPriority ?? ""} onChange={event => change({ workPriority: event.target.value === "" ? undefined : Number(event.target.value), workPage: 1 })}><option value="">{messages.text("allPriorities")}</option><option value="0">{messages.text("blocked")}</option><option value="1">{messages.text("overdue")}</option><option value="2">{messages.text("elevated")}</option><option value="3">{messages.text("routine")}</option><option value="4">{messages.text("available")}</option></NativeSelect>
    </section>
    {query.disabledByMock ? <p role="status">{messages.text('mockPaused')}</p> : query.isError || summary.isError ? <Alert variant="destructive"><AlertDescription>{messages.text(query.isError ? 'unavailable' : 'countsUnavailable')} <Button variant="outline" onClick={retry}>{messages.text('retry')}</Button></AlertDescription></Alert> : query.isPending ? <p role="status">{messages.text('loading')}</p> : null}
    {data?.disabledSources.length ? <Alert><AlertDescription>{messages.text('disabled')}</AlertDescription></Alert> : null}
    {data ? <section className="rounded-lg border bg-card px-4" aria-busy={query.isFetching}><WorkList items={data.items} />{!data.items.length ? <p role="status" className="py-8 text-sm text-muted-foreground">{messages.text(data.totalCount > 0 ? 'emptyPage' : kind === 'action' ? 'empty' : kind === 'waiting' ? 'emptyWaiting' : 'emptyUpdates')}</p> : null}
      <RecordPagination data={data} busy={query.isFetching} onPage={setPage} />
    </section> : null}
    <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><p>{data ? `${messages.text('updated')}: ${new Intl.DateTimeFormat(messages.locale, { timeStyle: 'short' }).format(new Date(data.evaluatedAtUtc))}${query.isFetching ? ` · ${messages.text('stale')}` : ''}` : messages.text('unknown')}</p>
      {!full ? <Button asChild variant="outline"><Link to="/dashboard/attention">{messages.text('openWork')}</Link></Button> : null}
    </footer>
  </main>
}
