import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Plus } from 'lucide-react'
import type { LabBatch, LabSupplier } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Field as FormField } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { LabBatchBarcodeScanner } from './LabBarcodeScanner'
import { SequencingBatchActions } from './SequencingBatchActions'
import { labCount, labStatus } from './lab-presentation'
import { vendorStage, vendorEtaOverdue } from './vendor-workflow'

const humanize = labStatus
const formatDate = (value: string) => new Date(value).toLocaleString()
export function SequencingBatchList({ items, suppliers, canManage, onCreate, refresh }: {
  items: LabBatch[]; suppliers: LabSupplier[]; canManage: boolean; onCreate: () => void; refresh: () => Promise<unknown>
}) {
  const [statusFilter, setStatusFilter] = useState('All')
  const filteredItems = statusFilter === 'All' ? items : items.filter(item => statusFilter === 'Draft' ? item.status === 'Draft' : vendorStage(item) === (statusFilter === 'Preparing' ? 'Prepare shipment' : statusFilter === 'ReceivedByProvider' ? 'Vendor received' : statusFilter === 'ResultsReceived' ? 'Results received' : statusFilter === 'RunNotPerformed' ? 'Run not performed' : statusFilter))
  return (
      <div className="space-y-5">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Sequencing batches</CardTitle>
                <CardDescription>Libraries may cross Commercial orders while retaining work-order and specimen lineage.</CardDescription>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <FormField>
                  <Label htmlFor="batch-status-filter">Status</Label>
                  <NativeSelect
                    id="batch-status-filter"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="All">All statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Preparing">Prepare shipment</option>
                    <option value="Shipped">Shipped</option>
                    <option value="ReceivedByProvider">Vendor received</option>
                    <option value="ResultsReceived">Results received</option>
                    <option value="RunNotPerformed">Run not performed</option>
                  </NativeSelect>
                </FormField>
                {canManage ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> New batch</Button> : null}
              </div>
            </div>
            {canManage ? <details className="group/scan mt-3 border-t pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"><ChevronRight aria-hidden="true" className="size-4 shrink-0 group-open/scan:rotate-90" />Scan libraries</summary>
              <div className="mt-3"><LabBatchBarcodeScanner batches={items} suppliers={suppliers} onAdded={refresh} /></div>
            </details> : null}
          </CardHeader>
          <CardContent className="p-4">
            {filteredItems.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No batches match this status.</p>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  return (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-lg border bg-muted/30 p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <div className="min-w-0 break-words">
                        <Link to="/lab-operations/batches/$batchId" params={{ batchId: item.id }} className="font-medium text-primary underline underline-offset-4">{item.batchNumber}</Link>
                        {item.resultsVersion ? <span className="ml-2 text-xs text-muted-foreground">Results v{item.resultsVersion}</span> : null}
                      </div>
                      <div className="col-span-2 min-w-0 break-words sm:col-span-1 sm:col-start-1 sm:row-start-2">
                        <p className="text-xs text-muted-foreground">
                          {item.name !== item.batchNumber ? `${item.name} · ` : ''}{humanize(item.batchType)} · {labCount(item.memberCount, 'library', 'libraries')}
                          {item.startedAtUtc ? ` · started ${formatDate(item.startedAtUtc)}` : ''}
                          {item.completedAtUtc ? ` · completed ${formatDate(item.completedAtUtc)}` : ''}
                          {item.providerName ? ` · ${item.providerName}` : ''}
                          {item.libraryExceptionCount ? ` · ${labCount(item.libraryExceptionCount, 'library exception')}` : ''}
                        </p>
                        {item.trackingReference ? <p className="mt-1 break-all text-xs text-muted-foreground">Tracking: {item.trackingReference}</p> : null}
                        {item.expectedCompletionAtUtc ? <p className={`mt-1 text-xs ${vendorEtaOverdue(item) ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>Expected completion: {formatDate(item.expectedCompletionAtUtc)}{vendorEtaOverdue(item) ? ' · Overdue' : ''}</p> : null}
                        {item.memberCount === 0 && item.status === 'Draft' ? <p className="mt-2 text-sm text-muted-foreground">Add passing libraries from Library prep or Scan libraries before starting this batch.</p> : null}
                        {item.memberCount === 0 && item.status === 'InProgress' && !item.sendoutId ? <p className="mt-2 text-sm text-muted-foreground">This batch has no libraries. Return it to draft before adding libraries.</p> : null}
                      </div>
                      <div className="col-span-2 row-start-3 mt-2 flex min-w-0 sm:col-span-1 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0">
                        <Status value={vendorStage(item)} />
                      </div>
                      <div className="col-start-2 row-start-1 flex min-w-0 justify-end sm:col-start-3 sm:row-span-2 [&>button]:shrink-0">
                        <SequencingBatchActions batch={item} suppliers={suppliers} canManage={canManage} refresh={refresh} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}

function Status({ value }: { value: string }) { return <span className="min-w-0 break-words rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">{labStatus(value)}</span> }
