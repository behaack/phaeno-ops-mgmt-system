import { LoadingState, EmptyState } from '#/components/ui/content-state'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { Field as PortalField } from '#/components/ui/field'
import { PageTitle } from '#/components/ui/page-header'
import { RecordLink } from '#/components/ui/record-link'
import { BackLink } from '#/components/ui/back-link'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { RecordPagination, useRecordListState } from '#/components/RecordPagination'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { authorizeResultReissue, getResultPackage, listResultPackagePage, releaseResultPackage, withdrawResultPackage, type ResultPackage } from '#/api/pseq-order-to-cash'
import { getOrderErrorMessage, isOrderFeatureDisabled } from '#/api/order-management'
import { OrderFeatureNotEnabled } from './OrderFeatureNotEnabled'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogReturnFocus } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { ReleasedDeliverableDetailPage } from '#/features/file-management/ReleasedDeliverableDetailPage'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'

const states = ['ReadyForRelease', 'ScientificallyApproved', 'Released', 'ReadyForReview', 'Failed', 'Withdrawn']

export function ResultReleasePanel({ apiEnabled }: { apiEnabled: boolean }) {
  const search = useSearch({ strict: false }) as { resultState?: string }
  const navigate = useNavigate()
  const state = states.includes(search.resultState ?? '') ? search.resultState! : 'ReadyForRelease'
  const list = useRecordListState()
  const pageQuery = useQuery({ queryKey: ['pseq-result-packages', state, list.page], queryFn: () => listResultPackagePage(state, list.page), enabled: apiEnabled })
  const query = { ...pageQuery, data: pageQuery.data?.items }
  if (isOrderFeatureDisabled(query.error, 'governed_results_disabled')) {
    return <Card><CardHeader><CardTitle><CustomerSourceText source={"Result packages"} /></CardTitle></CardHeader><CardContent><OrderFeatureNotEnabled feature="Result release" /></CardContent></Card>
  }
  return <Card><CardHeader><CardTitle><CustomerSourceText source={"Result packages"} /></CardTitle><CardDescription><CustomerSourceText source={"Open a package to review its Customer, job, sample, scientific approval, and release history."} /></CardDescription>
    <PortalField className="max-w-sm pt-2"><Label htmlFor="result-package-state"><CustomerSourceText source={"Package state"} /></Label><NativeSelect id="result-package-state" className="w-full" value={state} onChange={(event) => void navigate({ to: '/lab-operations/result-release', search: { resultState: event.target.value, listPage: 1 }, replace: true })}>{states.map((value) => <option key={value} value={value}>{humanizeStatus(value)}</option>)}</NativeSelect></PortalField>
  </CardHeader><CardContent>
    {query.error ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Result packages could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Refresh the queue.')} />}</AlertDescription></Alert> : null}
    {query.isLoading ? <LoadingState  label={<><CustomerSourceText source={"Loading result packages…"} /></>} /> : null}
    <div className="divide-y">{query.data?.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><RecordLink asChild><Link to="/lab-operations/result-packages/$packageId" params={{ packageId: item.id }} search={{ resultState: state, listPage: list.page }} >{packageTitle(item)}</Link></RecordLink><p className="mt-1 text-sm text-muted-foreground">{item.context?.organizationName ?? 'Customer'} · {item.context?.customerReference ?? 'Job reference unavailable'}</p><p className="mt-1 text-xs text-muted-foreground">{item.artifacts.length} <CustomerSourceText source={"files ·"} /> {item.context?.scientificReviewer ? `Reviewed by ${item.context.scientificReviewer}` : <CustomerSourceText source={"Scientific approval pending"} />}</p></div><OrderStatusBadge status={item.state} /></article>)}</div>
    {!query.isLoading && !query.error && !query.data?.length ? <EmptyState  kind="empty" title={<><CustomerSourceText source={"No result packages in this state."} /></>} /> : null}
    <RecordPagination data={pageQuery.data} busy={pageQuery.isFetching} onPage={page => list.change({ listPage: page })} />
  </CardContent></Card>
}

export function ResultPackageDetailPage({ packageId }: { packageId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const search = useSearch({ strict: false }) as { resultState?: string }
  const canRelease = Boolean(session?.capabilities.canReleasePSeqResults)
  const canRetain = Boolean(session?.capabilities.canManageFileManagementConfiguration)
  const canView = canRelease || canRetain
  const cache = useQueryClient()
  const query = useQuery({ queryKey: ['pseq-result-package', packageId], queryFn: () => getResultPackage(packageId), enabled: canView && authProvider !== 'mock' })
  const cancel = useRef<HTMLButtonElement>(null)
  const [action, setAction] = useState<'release' | 'withdraw' | 'reissue' | null>(null)
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: async () => {
      if (!query.data || !action) throw new Error('Load the package and choose an action.')
      if (action === 'release') return releaseResultPackage(packageId, query.data.version)
      if (action === 'withdraw') return withdrawResultPackage(packageId, query.data.version, reason)
      return authorizeResultReissue(packageId, query.data.version, reason)
    },
    onSuccess: async () => {
      setAction(null); setReason('')
      await Promise.all([cache.invalidateQueries({ queryKey: ['pseq-result-package', packageId] }), cache.invalidateQueries({ queryKey: ['pseq-result-packages'] }), cache.invalidateQueries({ queryKey: ['operational-attention'] }), cache.invalidateQueries({ queryKey: ['release-receipt'] })])
    },
    onError: () => { void query.refetch() },
  })
  function open(next: 'release' | 'withdraw' | 'reissue') { mutation.reset(); setReason(''); setAction(next) }
  if (!canView || authProvider === 'mock') return <main className="page-wrap p-8"><Alert><AlertTitle><CustomerSourceText source={"Result package unavailable"} /></AlertTitle><AlertDescription><CustomerSourceText source={"Use a connected Phaeno session with result release or file-management access."} /></AlertDescription></Alert></main>
  if (query.isPending) return <main className="page-wrap p-8" role="status"><CustomerSourceText source={"Loading result package…"} /></main>
  if (isOrderFeatureDisabled(query.error, 'governed_results_disabled')) return <main className="page-wrap space-y-4 p-8"><BackLink asChild><Link to="/lab-operations/result-release" search={{  }}><CustomerSourceText source={"Back to result packages"} /></Link></BackLink><OrderFeatureNotEnabled feature="Result release" /></main>
  if (query.error || !query.data) return <main className="page-wrap p-8"><Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Result package could not be loaded"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Return to the package queue and try again.')} />}</AlertDescription></Alert></main>
  const item = query.data
  const context = item.context
  return <main className="page-wrap min-w-0 space-y-6 px-4 py-8 wrap-anywhere">
    <Link to={canRelease ? '/lab-operations/result-release' : '/released-deliverables'} search={canRelease ? { resultState: search.resultState } : { q: '', page: 0 }} className="text-sm text-primary underline">{canRelease ? <CustomerSourceText source={"Result packages"} /> : <CustomerSourceText source={"Released packages"} />}</Link>
    <section className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 max-w-full flex-1 basis-80"><PageTitle>{packageTitle(item)}</PageTitle><p className="mt-2 text-muted-foreground">{context?.organizationName} · {context?.customerReference}</p><div className="mt-2"><OrderStatusBadge status={item.state} /></div></div><ActionMenu><DropdownMenuTrigger asChild><Button id="result-package-actions" variant="outline"><CustomerSourceText source={"Actions"} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
      {session?.capabilities.canManageOrderConfiguration ? <DropdownMenuItem asChild><Link to="/order-operations/lab-services/orders/$orderId" params={{ orderId: item.labServiceOrderId }}><CustomerSourceText source={"View commercial order"} /></Link></DropdownMenuItem> : null}
      {session?.capabilities.canManageLabOperations ? <DropdownMenuItem asChild><Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.labWorkOrderId }} search={{ section: 'results', tab: 'review' }}><CustomerSourceText source={"View scientific review"} /></Link></DropdownMenuItem> : null}
      {canRelease && ['ScientificallyApproved', 'ReadyForRelease'].includes(item.state) ? <DropdownMenuItem onSelect={() => open('release')}><CustomerSourceText source={"Release to Customer"} /></DropdownMenuItem> : null}
      {canRelease && item.state === 'Released' && item.retentionState === 'Deleted' ? <DropdownMenuItem onSelect={() => open('reissue')}><CustomerSourceText source={"Authorize reissue"} /></DropdownMenuItem> : null}
      {canRelease && !['Withdrawn', 'Failed'].includes(item.state) ? <DropdownMenuItem variant="destructive" onSelect={() => open('withdraw')}><CustomerSourceText source={"Withdraw"} /></DropdownMenuItem> : null}
    </DropdownMenuContent></ActionMenu></section>
    {context?.assemblyQc ? <Card><CardHeader><CardTitle><CustomerSourceText source={"Assembly QC · v"} />{context.assemblyQc.reviewVersion}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="font-medium">{context.assemblyQc.decision}</p><p className="text-sm text-muted-foreground">{context.assemblyQc.reviewedBy} · {formatTime(context.assemblyQc.recordedAtUtc)}</p><p className="whitespace-pre-wrap text-sm">{context.assemblyQc.note}</p>{session?.capabilities.canManageLabOperations ? <RecordLink asChild><Link to="/lab-operations/assembly-jobs/$jobId/qc" params={{ jobId: context.assemblyQc.jobId }} search={{ section: 'assembly', assemblyTab: 'jobs' }} ><CustomerSourceText source={"View exact QC history"} /></Link></RecordLink> : null}</CardContent></Card> : null}
    {item.state === 'Released' ? <p className="text-sm"><CustomerSourceText source={"This package is available to the Customer in the owning Job’s Files and results. Its internal evidence and release version are retained."} /></p> : null}
    <Card><CardHeader><CardTitle><CustomerSourceText source={"Scientific approval and publication"} /></CardTitle><CardDescription><CustomerSourceText source={"Scientific approval and Customer release are separate decisions. Payment never gates PSeq result release."} /></CardDescription></CardHeader><CardContent className="space-y-4"><dl className="grid gap-4 text-sm sm:grid-cols-2"><Fact label="Customer sample" value={context?.customerSampleId} /><Fact label="Reviewed by" value={context?.scientificReviewer} /><Fact label="Approved" value={formatTime(context?.scientificallyApprovedAtUtc)} /><Fact label="Release definition" value={context?.releaseDefinitionKey ? `${context.releaseDefinitionKey} · version ${context.releaseDefinitionVersion}` : null} /><Fact label="Released" value={formatTime(item.releasedAtUtc)} /><Fact label="Retention" value={item.retentionState ? humanizeStatus(item.retentionState) : 'Begins when released'} /></dl>
      {item.failureDetail ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Package needs attention"} /></AlertTitle><AlertDescription>{item.failureDetail}</AlertDescription></Alert> : null}
      {!canRelease ? <p className="text-sm text-muted-foreground"><CustomerSourceText source={"A Result Release Manager controls publication and reissue authorization."} /></p> : null}
    </CardContent></Card>
    <Card><CardHeader><CardTitle><CustomerSourceText source={"Files in this package"} /></CardTitle><CardDescription>{item.artifacts.length} of {item.expectedArtifactCount} <CustomerSourceText source={"expected files. This immutable manifest identifies the exact files covered by the approval."} /></CardDescription></CardHeader><CardContent><ul className="divide-y">{item.artifacts.map((file) => <li key={file.id} className="space-y-1 py-3 text-sm"><p className="break-words font-medium">{file.fileName}</p><p>{file.logicalRole} · {file.sizeBytes.toLocaleString()} <CustomerSourceText source={"bytes ·"} /> {humanizeStatus(file.scanState)}{file.deletedAtUtc ? <CustomerSourceText source={" · Files deleted"} /> : ''}</p><details><summary className="cursor-pointer text-xs text-muted-foreground"><CustomerSourceText source={"Checksum"} /></summary><p className="break-all font-mono text-xs">{file.sha256}</p></details></li>)}</ul><details className="mt-4"><summary className="cursor-pointer text-sm"><CustomerSourceText source={"Processing and manifest evidence"} /></summary><dl className="mt-3 space-y-3 text-sm"><Fact label="Pipeline" value={item.pipelineProviderKey} /><Fact label="Submission" value={item.pipelineSubmissionId} /><Fact label="Manifest SHA-256" value={item.manifestSha256} /></dl></details></CardContent></Card>
    {context?.retentionSnapshotId && canRetain ? <ReleasedDeliverableDetailPage key={context.retentionSnapshotId} snapshotId={context.retentionSnapshotId} q="" page={0} embedded /> : <Card><CardHeader><CardTitle><CustomerSourceText source={"Retention and preservation"} /></CardTitle><CardDescription>{context?.retentionSnapshotId ? <CustomerSourceText source={"The release receipt and preservation controls are available to a file administrator. Release authority does not grant preservation authority."} /> : <CustomerSourceText source={"A retention receipt is created when the package is released."} />}</CardDescription></CardHeader></Card>}
    <DialogReturnFocus target={null} fallbackId="result-package-actions"><Dialog open={action !== null} onOpenChange={(value) => { if (!value && !mutation.isPending) setAction(null) }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}><DialogHeader><DialogTitle>{action === 'release' ? <CustomerSourceText source={"Release result package"} /> : action === 'withdraw' ? 'Withdraw result package' : 'Authorize result reissue'}</DialogTitle><DialogDescription className="wrap-anywhere">{packageTitle(item)} · {context?.organizationName}. {action === 'release' ? <CustomerSourceText source={"Confirm that this is the approved package to publish to the Customer."} /> : action === 'withdraw' ? 'This stops Customer access to this version and preserves its history.' : 'A new package must still pass scientific review and release. This does not restore deleted files.'}</DialogDescription></DialogHeader><form id="result-package-action" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}><p className="mb-3 text-sm">{action === 'release' ? <CustomerSourceText source={"Publication gives the owning Customer access to download this exact approved package from the Job’s Files and results."} /> : action === 'withdraw' ? 'Customer access to this version will stop. The package, approval and release history are retained.' : 'Authorization permits a replacement package to be prepared; it still needs its own scientific approval and release.'}</p>{action !== 'release' ? <PortalField ><Label htmlFor="result-action-reason"><RequiredFieldName><CustomerSourceText source={"Reason"} /></RequiredFieldName></Label><Input id="result-action-reason" required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></PortalField> : null}</form>{mutation.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'The package was refreshed. Review its current state before trying again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={action !== 'release'}><Button ref={cancel} variant="outline" disabled={mutation.isPending} onClick={() => setAction(null)}><CustomerSourceText source={"Cancel"} /></Button><Button type="submit" form="result-package-action" variant={action === 'withdraw' ? 'destructive' : 'default'} disabled={mutation.isPending || query.isFetching || (action !== 'release' && !reason.trim())}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : <CustomerSourceText source={"Confirm"} />}</Button></RequiredDialogFooter></DialogContent></Dialog></DialogReturnFocus>
  </main>
}

function packageTitle(item: ResultPackage) { return `${item.context?.orderNumber ?? 'Result package'} · ${item.context?.customerSampleId ?? 'Sample'} · version ${item.packageVersion}` }
function formatTime(value?: string | null) { return value ? formatDisplayTimestamp(value, { seconds: true }) : null }
function Fact({ label, value }: { label: string; value?: string | null }) { return <div className="min-w-0"><dt className="font-medium">{label}</dt><dd className="wrap-anywhere text-muted-foreground">{value || 'Not recorded'}</dd></div> }
