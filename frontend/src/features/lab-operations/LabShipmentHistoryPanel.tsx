import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getLabShipmentHistory } from '#/api/lab-shipment-receipt'
import { getLabOperationsError } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { LabShipmentTable } from './LabShipmentTable'
import { parseShipmentHistorySearch } from './lab-shipment-history-search'

export function LabShipmentHistoryPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const currentSearch = useSearch({ strict: false }), navigate = useNavigate()
  const parsed = parseShipmentHistorySearch(currentSearch)
  const draft = parsed.shipmentHistorySearch ?? '', search = draft.trim(), page = parsed.shipmentHistoryPage ?? 1
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search), 300); return () => clearTimeout(timer) }, [search])
  const change = (nextSearch: string, nextPage: number, replace = false) => {
    void navigate({ to: '/lab-operations', search: previous => ({ ...previous, section: 'receipt', receiptTab: 'receiving', receiptView: 'received', shipmentHistorySearch: nextSearch || undefined, shipmentHistoryPage: nextPage }), replace, resetScroll: false })
  }
  const waitingForSearch = debouncedSearch !== search
  const query = useQuery({ queryKey: ['lab-shipment-queue', 'history', debouncedSearch, page], queryFn: () => getLabShipmentHistory(debouncedSearch, page), enabled: apiEnabled && !waitingForSearch })
  const data = !apiEnabled || waitingForSearch ? undefined : query.data, pages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / (data?.pageSize ?? 20)))
  return <Card className="min-w-0 gap-0 overflow-hidden py-0">
    <CardHeader className="space-y-3 border-b bg-muted/50 p-4">
      <div><CardTitle>Shipments received</CardTitle><CardDescription>Recorded container arrivals, most recent first, including completed accession. Container arrival and individual tube accession are separate steps.</CardDescription></div>
      <div className="flex flex-wrap items-end gap-2">
        <Field className="min-w-0 flex-1"><Label htmlFor="received-shipment-search" className="sr-only">Search received shipments</Label>
          <Input id="received-shipment-search" type="search" maxLength={255} placeholder="Shipment, PH-P number, Customer, Job, carrier or tracking" value={draft}
            onChange={event => change(event.target.value, 1, true)} />
        </Field>
        {draft ? <Button variant="outline" onClick={() => change('', 1, true)}>Clear search</Button> : null}
      </div>
    </CardHeader>
    <CardContent className="space-y-4 p-4" aria-busy={query.isFetching}>
      {!apiEnabled ? <p className="text-sm text-muted-foreground">A connected laboratory session is required.</p> : waitingForSearch || query.isPending ? <p role="status">Loading shipments…</p> : null}
      {apiEnabled && query.error && !waitingForSearch ? <Alert variant="destructive"><AlertTitle>Shipments could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(query.error, 'Refresh the history and try again.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry shipments</Button></AlertDescription></Alert> : null}
      {data && !query.isError ? <>
        {data.items.length ? <LabShipmentTable items={data.items} received returnSearch={{ receiptView: 'received', shipmentHistorySearch: search || undefined, shipmentHistoryPage: data.page }} />
          : <p className="py-5 text-sm text-muted-foreground">{search ? 'No shipments match your search.' : 'No shipments have been received.'}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span aria-live="polite">{data.totalCount} {data.totalCount === 1 ? 'shipment' : 'shipments'} · Page {data.page} of {pages}</span>
          <nav aria-label="Received shipments pages" className="flex gap-2"><Button variant="outline" size="sm" disabled={query.isFetching || waitingForSearch || data.page <= 1} onClick={() => change(search, data.page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={query.isFetching || waitingForSearch || data.page >= pages} onClick={() => change(search, data.page + 1)}>Next</Button></nav>
        </div>
      </> : null}
    </CardContent>
  </Card>
}
