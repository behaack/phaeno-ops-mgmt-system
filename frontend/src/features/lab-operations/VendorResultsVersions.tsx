import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getVendorResultsVersions, getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { PreparationPanel } from './preparation-ui'

export function VendorResultsVersions({ batchId }: { batchId: string }) {
  const query = useQuery({ queryKey: ['lab-result-versions', batchId], queryFn: () => getVendorResultsVersions(batchId) })
  return <PreparationPanel title="Results versions" description="Every saved version retains its values, author, date and note. Earlier versions are read-only.">
    {query.isPending ? <p role="status" className="text-sm">Loading results versions…</p> : query.isError ? <div className="space-y-2"><p role="alert" className="text-sm">{getLabOperationsError(query.error, 'Results versions could not be loaded.')}</p><Button variant="outline" onClick={() => void query.refetch()}>Reload versions</Button></div> : query.data.length ? <ol className="space-y-3">{query.data.map(version => <li key={version.id} className="rounded-md border p-3 text-sm">
      <Link to="/lab-operations/batches/$batchId/results/$resultVersion" params={{ batchId, resultVersion: String(version.resultVersion) }} className="font-medium text-primary underline">Results v{version.resultVersion}</Link>
      {version.isCurrent ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">Current</span> : null}
      <p className="mt-1 text-muted-foreground">{new Date(version.recordedAtUtc).toLocaleString()} · {version.recordedByName}</p>
      {version.note ? <p className="mt-1 whitespace-pre-wrap break-words">{version.note}</p> : null}
    </li>)}</ol> : <p className="text-sm">No results versions recorded.</p>}
  </PreparationPanel>
}
