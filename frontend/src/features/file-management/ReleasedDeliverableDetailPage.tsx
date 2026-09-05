import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { fileManagementErrorMessage } from '#/api/file-management'
import { linkReleaseReissue, listReissueCandidates, placeReleaseHold, readReleaseReceipt, releasePreservationHold, type ReleaseHold, type ReleaseReceipt } from '#/api/released-deliverables'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { ReleasedDeliverableRetentionNotice } from '#/features/orders/ReleasedDeliverableRetentionNotice'
import { usePhaenoSession } from '#/features/auth/session-context'

const schema = z.object({ reason: z.string().trim().min(1, 'Enter a reason.').max(2000, 'Keep the reason under 2,000 characters.'), kind: z.enum(['Preservation', 'Quarantine']), replacementSnapshotId: z.string() })
type FormValues = z.infer<typeof schema>
type Action = { type: 'hold' | 'reissue' } | { type: 'release'; hold: ReleaseHold }
export function ReleasedDeliverableDetailPage({ snapshotId, q, page }: { snapshotId: string; q: string; page: number }) {
  const { session, authProvider } = usePhaenoSession()
  const cache = useQueryClient()
  const query = useQuery({ queryKey: ['release-receipt', snapshotId], queryFn: () => readReleaseReceipt(snapshotId), enabled: Boolean(session) && authProvider !== 'mock' })
  const [action, setAction] = useState<Action | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { reason: '', kind: 'Preservation', replacementSnapshotId: '' } })
  const candidates = useQuery({ queryKey: ['reissue-candidates', snapshotId], queryFn: () => listReissueCandidates(snapshotId), enabled: action?.type === 'reissue' })
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!query.data || !action) throw new Error('Load the current release before changing it.')
      if (action.type === 'hold') return placeReleaseHold(snapshotId, { version: query.data.version, kind: values.kind, reason: values.reason })
      if (action.type === 'release') { const current = query.data.holds.find((hold) => hold.id === action.hold.id); if (!current || current.releasedAtUtc) throw new Error('The hold is no longer active.'); return releasePreservationHold(snapshotId, current.id, { version: current.version, reason: values.reason }) }
      if (!values.replacementSnapshotId) throw new Error('Select a replacement release.')
      return linkReleaseReissue(snapshotId, { version: query.data.version, replacementSnapshotId: values.replacementSnapshotId, reason: values.reason })
    },
    onSuccess: (data) => { cache.setQueryData(['release-receipt', snapshotId], data); void cache.invalidateQueries({ queryKey: ['retained-releases'] }); setAction(null) },
    onError: () => { void query.refetch() },
  })
  function open(value: Action) { mutation.reset(); form.reset({ reason: '', kind: 'Preservation', replacementSnapshotId: '' }); setAction(value) }
  if (authProvider === 'mock') return <main className="page-wrap p-6">Use a connected session to view this retained release.</main>
  if (query.isPending) return <main className="page-wrap p-6" role="status">Loading release…</main>
  if (query.error || !query.data) return <main className="page-wrap p-6" role="alert">{fileManagementErrorMessage(query.error, 'The retained release is unavailable.')}</main>
  const data = query.data
  return <main className="page-wrap space-y-5 px-4 py-8">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">{data.canManage ? <Link to="/released-deliverables" search={{ q, page }} className="text-primary underline">Released packages</Link> : <a href={data.workflowPath} className="text-primary underline">Back to workflow</a>}<Button variant="outline" onClick={() => window.print()}>Print / save PDF</Button></div>
    <ReleaseReceiptView data={data} />
    {data.canManage ? <section className="space-y-4 print:hidden" aria-label="Release management">
      <h2 className="text-xl font-semibold">Preservation and reissue</h2>
      <p className="text-sm text-muted-foreground">Preservation protects bytes. Quarantine also suspends access. Neither changes the original retention dates.</p>
      <div className="flex flex-wrap gap-2"><Button disabled={Boolean(data.release.byteDeletedAtUtc)} onClick={() => open({ type: 'hold' })}>Place hold</Button><Button variant="outline" disabled={!data.release.byteDeletedAtUtc} onClick={() => open({ type: 'reissue' })}>Link reissued package</Button></div>
      {data.holds.length ? <ul className="divide-y">{data.holds.map((hold) => <li key={hold.id} className="space-y-2 py-3"><p className="font-medium">{hold.kind} · {hold.releasedAtUtc ? 'Released' : 'Active'}</p><p className="break-words text-sm">{hold.reason}</p>{hold.releaseReason ? <p className="text-sm">Release reason: {hold.releaseReason}</p> : null}{!hold.releasedAtUtc ? <Button variant="outline" size="sm" onClick={() => open({ type: 'release', hold })}>Release hold</Button> : null}</li>)}</ul> : <p>No preservation holds.</p>}
    </section> : null}
    <Dialog open={Boolean(action)} onOpenChange={(openState) => { if (!openState && !mutation.isPending) setAction(null) }}><DialogContent>
      <DialogHeader><DialogTitle>{action?.type === 'hold' ? 'Place preservation hold' : action?.type === 'release' ? 'Release preservation hold' : 'Link reissued package'}</DialogTitle><DialogDescription>Review the retained release and record why this action is authorized.</DialogDescription></DialogHeader>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
        <p className="text-sm">{action?.type === 'reissue' ? 'First regenerate and approve a new package through the normal scientific release workflow. Linking records its lineage; it never restores the deleted release.' : action?.type === 'release' ? 'An overdue package becomes eligible for cleanup as soon as all holds are released. Its original deadline remains unchanged.' : 'Preservation blocks byte deletion. Quarantine also stops current downloads and blocks new access. The original clock continues.'}</p>
        {action?.type === 'hold' ? <div className="space-y-1"><Label htmlFor="hold-kind">Hold type</Label><select id="hold-kind" className="w-full rounded-md border bg-background p-2" {...form.register('kind')}><option value="Preservation">Preserve bytes</option><option value="Quarantine" disabled={!data.canQuarantine}>Quarantine and suspend access</option></select>{!data.canQuarantine ? <p className="text-sm text-muted-foreground">Quarantine requires active download monitoring.</p> : null}</div> : null}
        {action?.type === 'reissue' ? <div className="space-y-1"><Label htmlFor="replacement"><RequiredFieldName>Replacement release</RequiredFieldName></Label><select id="replacement" required className="w-full rounded-md border bg-background p-2" {...form.register('replacementSnapshotId')}><option value="">Select a newly released package</option>{candidates.data?.map((release) => <option key={release.id} value={release.id}>{release.packageType} {release.packageId} · {new Date(release.releasedAtUtc).toLocaleString()}</option>)}</select>{candidates.isPending ? <p role="status">Loading replacements…</p> : candidates.error ? <p role="alert">Could not load replacements.</p> : !candidates.data?.length ? <p>No eligible replacement has been released for this workflow.</p> : null}</div> : null}
        <div className="space-y-1"><Label htmlFor="lifecycle-reason"><RequiredFieldName>Reason</RequiredFieldName></Label><Input id="lifecycle-reason" aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? 'reason-error' : undefined} {...form.register('reason')} />{form.formState.errors.reason ? <p id="reason-error" role="alert" className="text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}</div>
        <p className="text-sm">Current state: {data.release.byteDeletedAtUtc ? 'Files deleted' : data.release.isQuarantined ? 'Quarantined' : data.release.downloadAccessClosedAtUtc ? 'Downloads closed' : 'Retained'}.</p>
        {mutation.error ? <p role="alert" className="text-sm text-destructive">{fileManagementErrorMessage(mutation.error, mutation.error.message)} Current details have been refreshed; review them before retrying.</p> : null}
        <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setAction(null)}>Cancel</Button><Button type="submit" disabled={mutation.isPending || query.isFetching}>{mutation.isPending ? 'Saving…' : 'Confirm'}</Button></RequiredDialogFooter>
      </form>
    </DialogContent></Dialog>
  </main>
}

export function ReleaseReceiptView({ data }: { data: ReleaseReceipt }) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  function time(value: string | null) { return value ? `${new Date(value).toLocaleString(undefined, { timeZoneName: 'short' })} · ${new Date(value).toISOString()} UTC` : 'Not recorded' }
  return <article className="retention-receipt space-y-5">
    <style>{`@media print {
      @page { size: A4; margin: 12mm; background: white; }
      html:has(.retention-receipt), body:has(.retention-receipt) { background: white !important; color-scheme: only light !important; }
      body *:not(:has(.retention-receipt)):not(.retention-receipt):not(.retention-receipt *) { display: none !important; }
      body *:has(.retention-receipt) { display: contents !important; }
      .retention-receipt { width: 100%; color: black; background: white; }
      .retention-receipt * { color: black !important; background: transparent !important; border-color: #ddd !important; }
      .retention-receipt li { break-inside: avoid; }
      .retention-receipt h2 { break-after: avoid; }
    }`}</style>
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Released package receipt</h1><p className="break-all">{data.release.packageType} · {data.release.packageId}</p><p>{data.release.organizationName}</p><p className="text-sm text-muted-foreground">Generated {time(data.generatedAtUtc)}. Display time zone: {zone}.</p></header>
    <ReleasedDeliverableRetentionNotice retention={{ ...data.retention, snapshotId: null }} />
    <dl className="grid gap-3 text-sm sm:grid-cols-2">{([['Released', data.retention.releasedAtUtc], ['Warning', data.retention.warningAtUtc], ['Standard deadline', data.retention.standardDeletionAtUtc], ['Potential final deadline', data.retention.potentialFinalDeletionAtUtc], ['Deletion due', data.deletionDueAtUtc], ['Access closed', data.retention.downloadAccessClosedAtUtc], ['Bytes deleted', data.retention.byteDeletedAtUtc]] as const).map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd>{time(value)}</dd></div>)}</dl>
    <p className="text-sm">Cleanup: {data.release.deletionOutcome ?? 'Not yet processed'}. Closure and preservation do not by themselves prove physical deletion.</p>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Release lineage</h2>{data.lineage ? <dl className="space-y-2 text-sm"><div><dt className="font-medium">File scope</dt><dd>{data.lineage.scope === 'Project' ? 'Project-level output; sample mapping does not apply.' : 'Every file in this release belongs to the sample below.'}</dd></div>{data.lineage.scope !== 'Project' ? <><div><dt className="font-medium">Customer sample identifier</dt><dd className="break-all">{data.lineage.customerSampleIds.join(', ') || 'Not recorded at release'}</dd></div><div><dt className="font-medium">Original supplier tube barcodes</dt><dd className="break-all">{data.lineage.supplierTubeBarcodes.join(', ') || 'Not recorded at release'}</dd></div><div><dt className="font-medium">Phaeno accession</dt><dd>{data.lineage.accessionId || 'Not recorded at release'}</dd></div></> : null}</dl> : <p className="text-sm">Lineage was not captured in this historical release snapshot.</p>}</section>
    <section className="space-y-2"><h2 className="text-xl font-semibold">Package manifest</h2><ul className="divide-y">{data.files.map((file) => <li key={file.id} className="space-y-1 py-3 text-sm"><p className="break-all font-medium">{file.name}</p><p>{file.sizeBytes.toLocaleString()} bytes · Download completed: {time(file.downloadedAtUtc)}</p><p className="break-all">SHA-256: {file.sha256}</p></li>)}</ul></section>
    {data.downloads.length ? <section className="space-y-2"><h2 className="text-xl font-semibold">Organization download history</h2><ul className="divide-y">{data.downloads.map((attempt) => <li key={attempt.id} className="space-y-1 py-3 text-sm"><p>{attempt.userName} · {attempt.scope} · {attempt.outcome === 'Revoked' ? 'Access ended' : attempt.outcome}</p><p className="break-all">File {attempt.fileId}</p><p>Started {time(attempt.startedAtUtc)}. Verified completion: {time(attempt.completedAtUtc)}</p>{attempt.completedAfterCutoff ? <p>Authorized and started before cutoff; completed afterward.</p> : null}</li>)}</ul></section> : null}
    {data.reissues.length ? <section className="space-y-2"><h2 className="text-xl font-semibold">Reissue history</h2><ul>{data.reissues.map((link) => <li key={link.id} className="break-all text-sm">{link.originalSnapshotId} → {link.replacementSnapshotId} · {time(link.authorizedAtUtc)}</li>)}</ul></section> : null}
  </article>
}
