import { LoadingState, EmptyState } from '#/components/ui/content-state'
import { paymentTones } from '#/features/orders/OrderStatusBadge'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { RecordTableHeader } from '#/components/ui/record-list'
import { formatDisplayDate, formatDisplayCurrency } from '#/lib/display-format'
import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState } from 'react'

import { downloadManualJournalEntries, getOrderErrorMessage, listManualJournalEntries } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export function ManualJournalEntryReport({ apiEnabled }: { apiEnabled: boolean }) {
  const [from, setFrom] = useState(() => currentMonthStart())
  const [to, setTo] = useState(() => currentUtcDate())
  const rangeIsValid = Boolean(from && to && from <= to)
  const report = useQuery({
    queryKey: ['manual-journal-entry-report', from, to],
    queryFn: () => listManualJournalEntries(from, to),
    enabled: apiEnabled && rangeIsValid,
  })
  const download = useMutation({ mutationFn: () => downloadManualJournalEntries(from, to) })

  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle><CustomerSourceText source={"Journal-entry source report"} /></CardTitle>
          <CardDescription>
            <CustomerSourceText source={"Review POMS billing source records, then download CSV for manual entry into the accounting system. Downloading does not mark a record as posted."} />
          </CardDescription>
        </div>
        <Button type="button" variant="outline" disabled={!apiEnabled || !rangeIsValid || download.isPending} onClick={() => download.mutate()}>
          <Download data-icon="inline-start" />
          {download.isPending ? <CustomerSourceText source={"Preparing…"} /> : <CustomerSourceText source={"Download CSV"} />}
        </Button>
      </div>
      <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
        <PortalField><Label htmlFor="journal-from"><CustomerSourceText source={"Accounting date from"} /></Label><Input id="journal-from" type="date"  value={from} onChange={(event) => setFrom(event.target.value)} /></PortalField>
        <PortalField><Label htmlFor="journal-to"><CustomerSourceText source={"Accounting date through"} /></Label><Input id="journal-to" type="date"  value={to} onChange={(event) => setTo(event.target.value)} /></PortalField>
      </div>
    </CardHeader>
    <CardContent>
      {!rangeIsValid ? <Alert variant="destructive"><AlertTitle><CustomerSourceText source={"Date range is invalid"} /></AlertTitle><AlertDescription><CustomerSourceText source={"The end date must be on or after the start date."} /></AlertDescription></Alert> : null}
      {report.error || download.error ? <Alert variant="destructive" className="mb-4"><AlertTitle><CustomerSourceText source={"Journal-entry report unavailable"} /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(report.error ?? download.error, 'Review the date range and try again.')} />}</AlertDescription></Alert> : null}
      {report.isLoading ? <LoadingState  label={<><CustomerSourceText source={"Loading journal-entry source records…"} /></>} /> : null}
      {report.data?.length ? <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <RecordTableHeader className="border-b text-muted-foreground"><tr><th className="py-3 pr-3 font-medium"><CustomerSourceText source={"Date / entry"} /></th><th className="px-3 py-3 font-medium"><CustomerSourceText source={"Organization"} /></th><th className="px-3 py-3 font-medium"><CustomerSourceText source={"Source"} /></th><th className="px-3 py-3 font-medium"><CustomerSourceText source={"Reference"} /></th><th className="px-3 py-3 text-right font-medium"><CustomerSourceText source={"Gross"} /></th><th className="py-3 pl-3 text-right font-medium"><CustomerSourceText source={"Balance"} /></th></tr></RecordTableHeader>
          <tbody>{report.data.map((row) => <tr key={row.entryId} className="border-b align-top last:border-0">
            <td className="py-3 pr-3"><span>{formatDate(row.accountingDateUtc)}</span><span className="mt-1 block font-mono text-xs text-muted-foreground">{row.entryId}</span></td>
            <td className="px-3 py-3">{row.organizationName}</td>
            <td className="px-3 py-3"><span>{workflowLabel(row.workflowType)} {row.workflowNumber}</span><span className="mt-1 block text-xs text-muted-foreground"><CustomerSourceText source={"Document"} /> {row.sourceDocumentNumber}</span></td>
            <td className="px-3 py-3">{row.purchaseOrderNumber ?? row.customerOrProjectReference ?? '—'}</td>
            <td className="px-3 py-3 text-right tabular-nums">{formatMoney(row.grossAmount, row.currency)}</td>
            <td className="py-3 pl-3 text-right"><span className="tabular-nums">{formatMoney(row.outstandingBalance, row.currency)}</span><span className="mt-1 block"><DomainStatusBadge status={row.paymentStatus} tones={paymentTones}>{row.paymentStatus === 'PaidRecorded' ? <CustomerSourceText source={"Paid recorded"} /> : <CustomerSourceText source={"Outstanding"} />}</DomainStatusBadge></span></td>
          </tr>)}</tbody>
        </table>
      </div> : !report.isLoading && rangeIsValid && !report.error ? <EmptyState  kind="empty" title={<><CustomerSourceText source={"No journal-entry source records fall in this date range."} /></>} /> : null}
      <p className="mt-4 border-t pt-4 text-xs leading-5 text-muted-foreground">
        <CustomerSourceText source={"Finance assigns general-ledger accounts, tax treatment, and posting dates outside POMS. This report does not record payment or release files held for payment."} />
      </p>
    </CardContent>
  </Card>
}

function currentUtcDate() { return new Date().toISOString().slice(0, 10) }
function currentMonthStart() { const today = currentUtcDate(); return `${today.slice(0, 8)}01` }
function formatDate(value: string) { return formatDisplayDate(value, { timeZone: 'UTC' }) }
function formatMoney(value: number, currency: string) { return formatDisplayCurrency(value, currency) }
function workflowLabel(value: string) { return value === 'LabService' ? 'Lab' : value === 'Reagent' ? 'PSeq kit' : value === 'DataAssembly' ? 'Assembly' : value }
