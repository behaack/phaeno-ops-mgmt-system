import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getLabAccessionedSamples, getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { recordLinkClassName } from '#/components/ui/record-link'
import { accessionIntakeStatuses, accessionUseStatuses, parseAccessionSearch, type AccessionSearch } from './lab-accession-search'

const human = (value: string) => value === 'OnHold' ? 'On hold' : value.replace(/([a-z])([A-Z])/g, '$1 $2')

export function LabAccessionedSamplesPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const routeSearch = useSearch({ strict: false }), navigate = useNavigate()
  const filters = parseAccessionSearch(routeSearch)
  const draft = filters.accessionSearch ?? '', search = draft.trim(), page = filters.accessionPage ?? 1
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(timer) }, [search])
  const change = (next: AccessionSearch, replace = false) => void navigate({ to: '/lab-operations', search: previous => ({ ...previous, section: 'receipt', receiptTab: 'accession', accessionView: 'samples', ...next }), replace, resetScroll: false })
  const waiting = debouncedSearch !== search
  const query = useQuery({ queryKey: ['lab-work-order', 'accessioned-samples', debouncedSearch, filters.accessionStatus, filters.accessionUse, page], queryFn: () => getLabAccessionedSamples(debouncedSearch, page, filters.accessionStatus, filters.accessionUse), enabled: apiEnabled && !waiting })
  const data = !apiEnabled || waiting || query.isError ? undefined : query.data
  const pages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / (data?.pageSize ?? 20)))
  const returnSearch = { section: 'receipt' as const, receiptTab: 'accession' as const, accessionView: 'samples' as const, ...filters, accessionPage: data?.page ?? page }
  return <Card className="min-w-0 gap-0 overflow-hidden py-0">
    <CardHeader className="space-y-3 border-b bg-muted/50 p-4">
      <div><CardTitle>Accessioned samples</CardTitle><CardDescription>Find recorded samples, whether they have been used, and their tube decisions and storage locations. Used means processing has started or a material transfer is recorded; it does not mean all material is exhausted.</CardDescription></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Field className="min-w-0 flex-1 sm:min-w-64"><Label className="sr-only" htmlFor="accessioned-sample-search">Search accessioned samples</Label><Input id="accessioned-sample-search" type="search" maxLength={255} placeholder="Sample, accession, tube, freezer box, Customer or Job" value={draft} onChange={event => change({ accessionSearch: event.target.value || undefined, accessionPage: 1 }, true)} /></Field>
        <Field className="sm:w-44"><Label className="sr-only" htmlFor="accessioned-sample-status">Sample intake status</Label><NativeSelect id="accessioned-sample-status" value={filters.accessionStatus ?? ''} onChange={event => change({ accessionStatus: event.target.value as AccessionSearch['accessionStatus'] || undefined, accessionPage: 1 })}><option value="">All intake statuses</option>{Object.entries(accessionIntakeStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>
        <Field className="sm:w-36"><Label className="sr-only" htmlFor="accessioned-sample-use">Sample use</Label><NativeSelect id="accessioned-sample-use" value={filters.accessionUse ?? ''} onChange={event => change({ accessionUse: event.target.value as AccessionSearch['accessionUse'] || undefined, accessionPage: 1 })}><option value="">All sample use</option>{Object.entries(accessionUseStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>
        {draft || filters.accessionStatus || filters.accessionUse ? <Button variant="outline" onClick={() => change({ accessionSearch: undefined, accessionStatus: undefined, accessionUse: undefined, accessionPage: 1 }, true)}>Clear filters</Button> : null}
      </div>
    </CardHeader>
    <CardContent className="space-y-4 p-4" aria-busy={query.isFetching || waiting}>
      {!apiEnabled ? <p className="text-sm text-muted-foreground">A connected laboratory session is required.</p> : waiting || query.isPending ? <p role="status">Loading accessioned samples…</p> : null}
      {apiEnabled && query.error && !waiting ? <Alert variant="destructive"><AlertTitle>Samples could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Try loading the samples again.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry samples</Button></AlertDescription></Alert> : null}
      {data ? <>
        {data.items.length ? <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><caption className="sr-only">Accessioned samples</caption><thead className="border-b bg-muted/50"><tr>{['Sample / accession', 'Customer / Job', 'Intake status', 'Sample use', 'Tubes / storage'].map(label => <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}</tr></thead><tbody>{data.items.map(sample => <tr key={sample.id} className="border-b last:border-0">
          <td className="p-3 align-top"><Link className={`${recordLinkClassName} wrap-anywhere`} to="/lab-operations/$workOrderId/specimens/$specimenId" params={{ workOrderId: sample.labWorkOrderId, specimenId: sample.id }} search={previous => ({ ...previous, ...returnSearch })}>{sample.customerSampleId}</Link><p className="mt-1 font-mono text-xs text-muted-foreground wrap-anywhere">{sample.accessionNumber}</p></td>
          <td className="p-3 align-top"><p className="wrap-anywhere">{sample.organizationName}</p><p className="mt-1 text-xs text-muted-foreground wrap-anywhere">{sample.jobReference}</p></td>
          <td className="p-3 align-top"><Badge variant="outline">{human(sample.intakeDisposition)}</Badge></td>
          <td className="p-3 align-top"><Badge variant={sample.useStatus === 'Used' ? 'secondary' : 'outline'}>{accessionUseStatuses[sample.useStatus]}</Badge>{sample.useStatus === 'Used' ? <p className="mt-1 text-xs text-muted-foreground">{sample.tubes.some(tube => tube.useStatus === 'Unknown') ? 'Historical source not recorded' : `${sample.tubes.filter(tube => tube.useStatus === 'Used').length} of ${sample.tubes.length} tubes used`}</p> : null}</td>
          <td className="p-3 align-top"><details className="min-w-40"><summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{sample.tubes.length} recorded {sample.tubes.length === 1 ? 'tube' : 'tubes'}</summary><ul className="mt-3 space-y-3">{sample.tubes.map(tube => <li key={tube.id}><p className="font-mono text-xs wrap-anywhere">{tube.barcode}</p><p className="text-xs">{tube.useStatus === 'Unknown' ? 'Use unknown' : accessionUseStatuses[tube.useStatus]}{tube.status === 'Consumed' ? ' · Material exhausted' : tube.status === 'Failed' || tube.status === 'Disposed' ? ` · ${human(tube.status)}` : ''}</p><p className="text-xs text-muted-foreground">{tube.intakeDisposition ? human(tube.intakeDisposition) : 'Decision not recorded'} · {tube.location ?? (tube.intakeDisposition === 'Rejected' ? 'Not stored' : 'Location not recorded')}</p></li>)}</ul></details></td>
        </tr>)}</tbody></table></div> : <p className="py-5 text-sm text-muted-foreground">{search || filters.accessionStatus || filters.accessionUse ? 'No samples match your filters.' : 'No samples have been accessioned.'}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span aria-live="polite">{data.totalCount} {data.totalCount === 1 ? 'sample' : 'samples'} · Page {data.page} of {pages}</span><nav aria-label="Accessioned sample pages" className="flex gap-2"><Button variant="outline" size="sm" disabled={query.isFetching || waiting || data.page <= 1} onClick={() => change({ accessionPage: data.page - 1 })}>Previous</Button><Button variant="outline" size="sm" disabled={query.isFetching || waiting || data.page >= pages} onClick={() => change({ accessionPage: data.page + 1 })}>Next</Button></nav></div>
      </> : null}
    </CardContent>
  </Card>
}
