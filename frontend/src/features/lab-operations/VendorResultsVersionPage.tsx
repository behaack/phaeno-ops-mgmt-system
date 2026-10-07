import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getVendorResultsVersion, getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { usePhaenoSession } from '#/features/auth/session-context'
import { PreparationPanel } from './preparation-ui'

const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded'
export function VendorResultsVersionPage({ batchId, resultVersion }: { batchId: string; resultVersion: number }) {
  const { session, authProvider } = usePhaenoSession()
  const enabled = Boolean(session?.capabilities.canManageLabOperations && authProvider !== 'mock')
  const valid = Number.isInteger(resultVersion) && resultVersion > 0
  const query = useQuery({ queryKey: ['lab-result-version', batchId, resultVersion], queryFn: () => getVendorResultsVersion(batchId, resultVersion), enabled: enabled && valid })
  if (!enabled) return <main className="page-wrap py-8"><p role="alert">A connected Phaeno laboratory session is required.</p></main>
  if (!valid) return <main className="page-wrap py-8"><p role="alert">Choose a valid results version.</p></main>
  if (query.isPending) return <main className="page-wrap py-8"><p role="status">Loading results version…</p></main>
  if (query.isError) return <main className="page-wrap space-y-3 py-8"><p role="alert">{getLabOperationsError(query.error, 'This results version could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload version</Button></main>
  const { version, snapshot } = query.data
  return <main className="page-wrap space-y-5 py-8">
    <Link to="/lab-operations/batches/$batchId" params={{ batchId }} className="text-sm text-primary underline">← Current batch</Link>
    <div className="space-y-2"><h1 className="break-words text-2xl font-semibold">{snapshot.batchNumber} · Results v{version.resultVersion}</h1>
      <p className="text-sm">{version.isCurrent ? 'Current saved version' : 'Earlier saved version'} · Read-only</p>
      <p className="text-sm text-muted-foreground">Recorded {date(version.recordedAtUtc)} · {version.recordedByName}</p>
    </div>
    <PreparationPanel title="Vendor result"><dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Vendor</dt><dd className="break-words">{snapshot.providerName}</dd></div>
      <div><dt className="text-muted-foreground">Vendor job reference</dt><dd className="break-words">{snapshot.vendorJobReference}</dd></div>
      <div><dt className="text-muted-foreground">Disposition</dt><dd>{snapshot.runNotPerformed ? 'Run not performed' : 'Results received'}</dd></div>
      <div><dt className="text-muted-foreground">Batch outcome</dt><dd>{snapshot.outcome === 'Failure' ? 'Fail' : 'Success'}</dd></div>
      {!snapshot.runNotPerformed ? <>{[['Run started', snapshot.runStartedAtUtc], ['Run completed', snapshot.runCompletedAtUtc], ['Results received', snapshot.resultsReceivedAtUtc]].map(([label, time]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{date(time)}</dd></div>)}</> : null}
    </dl>{snapshot.notes ? <p className="mt-4 whitespace-pre-wrap break-words text-sm">{snapshot.notes}</p> : null}</PreparationPanel>
    <PreparationPanel title="Library results"><ul className="space-y-2">{snapshot.libraries.map(library => <li key={library.memberId} className="rounded-md border p-3 text-sm"><p className="break-words font-medium">{library.libraryKey} · {library.outcome === 'Failure' ? 'Fail' : 'Success'}</p>{library.reason && library.reason !== snapshot.notes ? <p className="mt-1 whitespace-pre-wrap break-words">{library.reason}</p> : null}</li>)}</ul></PreparationPanel>
    {snapshot.fastqSets?.length ? <PreparationPanel title="Verified FASTQ file sets">{snapshot.fastqSets.map(set => <section key={set.setId} className="space-y-2 border-b py-3"><h2 className="font-medium">{set.libraryKey} · Run {set.sequencingRunNumber} · File set v{set.setVersion}</h2><p className="text-xs text-muted-foreground">{set.readLayout === 'PairedEnd' ? 'Paired-end' : 'Single-end'} · Exact file identities retained</p><ul className="divide-y">{set.files.map(file => <li key={file.fileId} className="space-y-1 py-2"><p className="break-all text-sm">{file.archiveEntryPath ?? file.originalFileName} · G{file.groupNumber} / R{file.readNumber} / P{file.partNumber}</p><p className="text-xs text-muted-foreground">{file.readCount.toLocaleString()} reads · {file.sizeBytes.toLocaleString()} bytes</p><details><summary className="cursor-pointer text-xs">Stored identity and checksum</summary><p className="break-all text-xs">{file.fileName}</p><p className="break-all font-mono text-xs">{file.sha256}</p></details></li>)}</ul></section>)}</PreparationPanel> : null}
    {snapshot.locations.length ? <PreparationPanel title="Earlier declared locations" description="These are the declared locations saved with this exact version. File verification and scientific approval are separate.">{snapshot.locations.length ? <ul className="space-y-2">{snapshot.locations.map(location => <li key={location.id} className="rounded-md border p-3 text-sm"><p>{location.memberId ? snapshot.libraries.find(library => library.memberId === location.memberId)?.libraryKey : 'Whole batch'}</p><p className="mt-1 select-all break-all font-mono text-xs">{location.storageReference}</p>{location.notes ? <p className="mt-1 whitespace-pre-wrap break-words">{location.notes}</p> : null}</li>)}</ul> : <p className="text-sm">No data locations apply to this version.</p>}</PreparationPanel> : null}
  </main>
}
