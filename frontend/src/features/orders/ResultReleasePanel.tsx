import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { authorizeResultReissue, getResultPackage, listResultPackages, releaseResultPackage, withdrawResultPackage, type ResultPackage } from '#/api/pseq-order-to-cash'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { ReleasedDeliverableDetailPage } from '#/features/file-management/ReleasedDeliverableDetailPage'
import { humanizeStatus, OrderStatusBadge } from './OrderStatusBadge'

const states = ['ScientificallyApproved', 'ReadyForRelease', 'Released', 'ReadyForReview', 'Failed', 'Withdrawn']

export function ResultReleasePanel({ apiEnabled }: { apiEnabled: boolean }) {
  const search = useSearch({ strict: false }) as { resultState?: string }
  const navigate = useNavigate()
  const state = states.includes(search.resultState ?? '') ? search.resultState! : 'ScientificallyApproved'
  const query = useQuery({ queryKey: ['pseq-result-packages', state], queryFn: () => listResultPackages(state), enabled: apiEnabled })
  return <Card><CardHeader><CardTitle>Result packages</CardTitle><CardDescription>Open a package to review its Customer, job, sample, scientific approval, and release history.</CardDescription>
    <div className="max-w-sm pt-2"><Label htmlFor="result-package-state">Package state</Label><select id="result-package-state" className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={state} onChange={(event) => void navigate({ to: '/order-operations', search: (previous) => ({ ...previous, orderSection: 'results', resultState: event.target.value }), replace: true })}>{states.map((value) => <option key={value} value={value}>{humanizeStatus(value)}</option>)}</select></div>
  </CardHeader><CardContent>
    {query.error ? <Alert variant="destructive"><AlertTitle>Result packages could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh the queue.')}</AlertDescription></Alert> : null}
    {query.isLoading ? <p role="status">Loading result packages…</p> : null}
    <div className="divide-y">{query.data?.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><Link to="/order-operations/result-packages/$packageId" params={{ packageId: item.id }} search={{ resultState: state }} className="font-medium text-primary underline underline-offset-4">{packageTitle(item)}</Link><p className="mt-1 text-sm text-muted-foreground">{item.context?.organizationName ?? 'Customer'} · {item.context?.customerReference ?? 'Job reference unavailable'}</p><p className="mt-1 text-xs text-muted-foreground">{item.artifacts.length} files · {item.context?.scientificReviewer ? `Reviewed by ${item.context.scientificReviewer}` : 'Scientific approval pending'}</p></div><OrderStatusBadge status={item.state} /></article>)}</div>
    {!query.isLoading && !query.error && !query.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No result packages in this state.</p> : null}
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
  if (!canView || authProvider === 'mock') return <main className="page-wrap p-8"><Alert><AlertTitle>Result package unavailable</AlertTitle><AlertDescription>Use a connected Phaeno session with result release or file-management access.</AlertDescription></Alert></main>
  if (query.isPending) return <main className="page-wrap p-8" role="status">Loading result package…</main>
  if (query.error || !query.data) return <main className="page-wrap p-8"><Alert variant="destructive"><AlertTitle>Result package could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Return to the package queue and try again.')}</AlertDescription></Alert></main>
  const item = query.data
  const context = item.context
  return <main className="page-wrap space-y-6 px-4 py-8">
    <Link to={canRelease ? '/order-operations' : '/released-deliverables'} search={canRelease ? { orderSection: 'results', resultState: search.resultState } : { q: '', page: 0 }} className="text-sm text-primary underline">{canRelease ? 'Result packages' : 'Released packages'}</Link>
    <section className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{packageTitle(item)}</h1><p className="mt-2 text-muted-foreground">{context?.organizationName} · {context?.customerReference}</p><div className="mt-2"><OrderStatusBadge status={item.state} /></div></div><div className="flex flex-wrap gap-2">
      {session?.capabilities.canViewAllOperationalOrders ? <Button asChild variant="outline"><Link to="/order-operations/$workflow/$orderId" params={{ workflow: 'lab', orderId: item.labServiceOrderId }}>View commercial order</Link></Button> : null}
      {session?.capabilities.canManageLabOperations ? <Button asChild variant="outline"><Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.labWorkOrderId }} search={{ section: 'work', tab: 'review' }}>View scientific review</Link></Button> : null}
    </div></section>
    <Card><CardHeader><CardTitle>Scientific approval and publication</CardTitle><CardDescription>Scientific approval and Customer release are separate decisions. Payment never gates PSeq result release.</CardDescription></CardHeader><CardContent className="space-y-4"><dl className="grid gap-4 text-sm sm:grid-cols-2"><Fact label="Customer sample" value={context?.customerSampleId} /><Fact label="Reviewed by" value={context?.scientificReviewer} /><Fact label="Approved" value={formatTime(context?.scientificallyApprovedAtUtc)} /><Fact label="Release definition" value={context?.releaseDefinitionKey ? `${context.releaseDefinitionKey} · version ${context.releaseDefinitionVersion}` : null} /><Fact label="Released" value={formatTime(item.releasedAtUtc)} /><Fact label="Retention" value={item.retentionState ? humanizeStatus(item.retentionState) : 'Begins when released'} /></dl>
      {item.failureDetail ? <Alert variant="destructive"><AlertTitle>Package needs attention</AlertTitle><AlertDescription>{item.failureDetail}</AlertDescription></Alert> : null}
      {canRelease ? <div className="flex flex-wrap gap-2">{['ScientificallyApproved', 'ReadyForRelease'].includes(item.state) ? <Button onClick={() => open('release')}>Release to Customer</Button> : null}{item.state === 'Released' && item.retentionState === 'Deleted' ? <Button variant="outline" onClick={() => open('reissue')}>Authorize reissue</Button> : null}{!['Withdrawn', 'Failed'].includes(item.state) ? <Button variant="destructive" onClick={() => open('withdraw')}>Withdraw</Button> : null}</div> : <p className="text-sm text-muted-foreground">A Result Release Manager controls publication and reissue authorization.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Files in this package</CardTitle><CardDescription>{item.artifacts.length} of {item.expectedArtifactCount} expected files. This immutable manifest identifies the exact files covered by the approval.</CardDescription></CardHeader><CardContent><ul className="divide-y">{item.artifacts.map((file) => <li key={file.id} className="space-y-1 py-3 text-sm"><p className="break-words font-medium">{file.fileName}</p><p>{file.logicalRole} · {file.sizeBytes.toLocaleString()} bytes · {humanizeStatus(file.scanState)}{file.deletedAtUtc ? ' · Files deleted' : ''}</p><details><summary className="cursor-pointer text-xs text-muted-foreground">Checksum</summary><p className="break-all font-mono text-xs">{file.sha256}</p></details></li>)}</ul><details className="mt-4"><summary className="cursor-pointer text-sm">Processing and manifest evidence</summary><dl className="mt-3 space-y-3 text-sm"><Fact label="Pipeline" value={item.pipelineProviderKey} /><Fact label="Submission" value={item.pipelineSubmissionId} /><Fact label="Manifest SHA-256" value={item.manifestSha256} /></dl></details></CardContent></Card>
    {context?.retentionSnapshotId && canRetain ? <ReleasedDeliverableDetailPage key={context.retentionSnapshotId} snapshotId={context.retentionSnapshotId} q="" page={0} embedded /> : <Card><CardHeader><CardTitle>Retention and preservation</CardTitle><CardDescription>{context?.retentionSnapshotId ? 'The release receipt and preservation controls are available to a file administrator. Release authority does not grant preservation authority.' : 'A retention receipt is created when the package is released.'}</CardDescription></CardHeader></Card>}
    <Dialog open={action !== null} onOpenChange={(value) => { if (!value && !mutation.isPending) setAction(null) }}><DialogContent><DialogHeader><DialogTitle>{action === 'release' ? 'Release result package' : action === 'withdraw' ? 'Withdraw result package' : 'Authorize result reissue'}</DialogTitle><DialogDescription>{packageTitle(item)} · {context?.organizationName}. {action === 'release' ? 'Confirm that this is the approved package to publish to the Customer.' : action === 'withdraw' ? 'This stops Customer access to this version and preserves its history.' : 'A new package must still pass scientific review and release. This does not restore deleted files.'}</DialogDescription></DialogHeader><form id="result-package-action" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}>{action !== 'release' ? <div className="space-y-2"><Label htmlFor="result-action-reason"><RequiredFieldName>Reason</RequiredFieldName></Label><Input id="result-action-reason" required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></div> : null}</form>{mutation.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(mutation.error, 'The package was refreshed. Review its current state before trying again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={action !== 'release'}><Button variant="outline" disabled={mutation.isPending} onClick={() => setAction(null)}>Cancel</Button><Button type="submit" form="result-package-action" variant={action === 'withdraw' ? 'destructive' : 'default'} disabled={mutation.isPending || query.isFetching || (action !== 'release' && !reason.trim())}>{mutation.isPending ? 'Saving…' : 'Confirm'}</Button></RequiredDialogFooter></DialogContent></Dialog>
  </main>
}

function packageTitle(item: ResultPackage) { return `${item.context?.orderNumber ?? 'Result package'} · ${item.context?.customerSampleId ?? 'Sample'} · version ${item.packageVersion}` }
function formatTime(value?: string | null) { return value ? new Date(value).toLocaleString() : null }
function Fact({ label, value }: { label: string; value?: string | null }) { return <div><dt className="font-medium">{label}</dt><dd className="break-words text-muted-foreground">{value || 'Not recorded'}</dd></div> }
