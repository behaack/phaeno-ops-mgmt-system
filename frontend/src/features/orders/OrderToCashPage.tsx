import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { apiErrorMessage } from '#/api/api-error'
import {
  allocatePayment,
  downloadInvoiceDocument,
  getOrderToCashFeatures,
  listAgingInvoices,
  listAttentionItems,
  listInvoices,
  listPaymentReceipts,
  listResultPackages,
  recordPaymentReceipt,
  releaseResultPackage,
  type Invoice,
  type PaymentReceipt,
} from '#/api/order-to-cash'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  getSelectedMembership,
  usePhaenoSession,
} from '#/features/auth/session-context'

const selectClass =
  'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm'

export function OrderToCashPage() {
  const client = useQueryClient()
  const { session, selectedOrganizationId } = usePhaenoSession()
  const selectedMembership = getSelectedMembership(
    session,
    selectedOrganizationId,
  )
  const isPhaeno = selectedMembership?.organizationKind === 'Phaeno'
  const customerOrganizationId =
    selectedMembership?.organizationKind === 'Customer'
      ? selectedMembership.organizationId
      : null
  const featuresQuery = useQuery({
    queryKey: ['order-to-cash-features'],
    queryFn: getOrderToCashFeatures,
    staleTime: 60_000,
  })
  const nativeArEnabled =
    featuresQuery.data?.nativePSeqAccountsReceivable === true
  const resultsEnabled = featuresQuery.data?.governedPSeqResults === true
  const attentionEnabled =
    isPhaeno && featuresQuery.data?.attentionOperations === true
  const invoicesQuery = useQuery({
    queryKey: ['order-to-cash', 'invoices', customerOrganizationId],
    queryFn: () => listInvoices(customerOrganizationId),
    enabled: nativeArEnabled,
  })
  const receiptsQuery = useQuery({
    queryKey: ['order-to-cash', 'receipts'],
    queryFn: () => listPaymentReceipts(),
    enabled: nativeArEnabled && isPhaeno,
  })
  const agingQuery = useQuery({
    queryKey: ['order-to-cash', 'aging'],
    queryFn: listAgingInvoices,
    enabled: nativeArEnabled && isPhaeno && session?.capabilities.canOperateBilling,
  })
  const resultsQuery = useQuery({
    queryKey: ['order-to-cash', 'results', customerOrganizationId],
    queryFn: () => listResultPackages(customerOrganizationId),
    enabled: resultsEnabled,
  })
  const attentionQuery = useQuery({
    queryKey: ['order-to-cash', 'attention'],
    queryFn: () => listAttentionItems(false),
    enabled: attentionEnabled,
  })

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['order-to-cash'] })
  }
  const releaseMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      releaseResultPackage(id, version),
    onSuccess: refresh,
  })
  const downloadMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const blob = await downloadInvoiceDocument(invoice.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoiceNumber}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    },
  })
  const pageError =
    featuresQuery.error ??
    invoicesQuery.error ??
    receiptsQuery.error ??
    agingQuery.error ??
    resultsQuery.error ??
    attentionQuery.error ??
    releaseMutation.error ??
    downloadMutation.error

  if (featuresQuery.isLoading) {
    return (
      <main className="page-wrap px-4 py-8" aria-busy="true">
        <p role="status" className="text-sm text-muted-foreground">
          Checking order-to-cash features…
        </p>
      </main>
    )
  }

  if (featuresQuery.error) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Order-to-cash availability could not be checked</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(featuresQuery.error)}
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  if (!nativeArEnabled && !resultsEnabled && !attentionEnabled) {
    return (
      <main className="page-wrap px-4 py-8">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>
              <h1>Order-to-cash is not enabled</h1>
            </CardTitle>
            <CardDescription>
              The additive workflows are installed but their independent flags
              remain off in this environment.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Order-to-cash</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Governed PSeq result release and POMS-owned accounts receivable.
            Result availability is independent of payment state.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </header>

      {pageError ? (
        <Alert variant="destructive">
          <AlertTitle>Order-to-cash data could not be refreshed</AlertTitle>
          <AlertDescription>{apiErrorMessage(pageError)}</AlertDescription>
        </Alert>
      ) : null}

      {attentionEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Owned attention</CardTitle>
            <CardDescription>
              Oldest unresolved work for your assigned business roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attentionQuery.isLoading ? (
              <p role="status" className="text-sm text-muted-foreground">
                Refreshing attention queues…
              </p>
            ) : (attentionQuery.data ?? []).length ? (
              <div className="space-y-2">
                {attentionQuery.data?.map((item) => (
                  <article key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.category}</span>
                      <Badge variant="outline">{item.ownerRole}</Badge>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm">{item.nextAction}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Age {item.ageHours} hours · {item.attemptCount} attempt
                      {item.attemptCount === 1 ? '' : 's'}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No owned attention items are open.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {resultsEnabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Governed result packages</CardTitle>
            <CardDescription>
              Immutable final-output packages, scan state, scientific approval,
              release, and correction history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resultsQuery.isLoading ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading result packages…
              </p>
            ) : (resultsQuery.data ?? []).length ? (
              <div className="space-y-3">
                {resultsQuery.data?.map((item) => (
                  <article key={item.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            Package v{item.packageVersion}
                          </span>
                          <Badge variant="outline">{item.status}</Badge>
                          {item.labSampleId ? (
                            <Badge variant="outline">Sample level</Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.pipelineName} {item.pipelineVersion} ·{' '}
                          {item.artifacts.length} final artifact
                          {item.artifacts.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      {isPhaeno &&
                      session?.capabilities.canReleasePSeqResults &&
                      item.status === 'ReadyForRelease' ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={releaseMutation.isPending}
                          onClick={() =>
                            releaseMutation.mutate({
                              id: item.id,
                              version: item.version,
                            })
                          }
                        >
                          Release to customer
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No governed result packages are available.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {nativeArEnabled ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Immutable PSeq invoices generated from accepted quote snapshots.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesQuery.isLoading ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading invoices…
                </p>
              ) : (invoicesQuery.data ?? []).length ? (
                <InvoiceTable
                  invoices={invoicesQuery.data ?? []}
                  downloading={downloadMutation.isPending}
                  onDownload={(invoice) => downloadMutation.mutate(invoice)}
                />
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No PSeq invoices are available.
                </p>
              )}
            </CardContent>
          </Card>

          {isPhaeno ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receipts and unapplied cash</CardTitle>
                  <CardDescription>
                    Manual and imported USD receipts remain unapplied until an
                    authorized allocation is recorded.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session?.capabilities.canOperateCash ? (
                    <ReceiptEntry onSaved={refresh} />
                  ) : null}
                  <ReceiptList receipts={receiptsQuery.data ?? []} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allocation and aging</CardTitle>
                  <CardDescription>
                    Suggestions never apply cash; an operator chooses every
                    receipt, invoice, and amount.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session?.capabilities.canOperateCash ? (
                    <AllocationEntry
                      invoices={invoicesQuery.data ?? []}
                      receipts={receiptsQuery.data ?? []}
                      onSaved={refresh}
                    />
                  ) : null}
                  {agingQuery.isLoading ? (
                    <p role="status" className="text-sm text-muted-foreground">
                      Calculating aging…
                    </p>
                  ) : (agingQuery.data ?? []).length ? (
                    <ul className="space-y-2">
                      {agingQuery.data?.map((item) => (
                        <li key={item.id} className="rounded-lg border p-3 text-sm">
                          <span className="font-medium">{item.invoiceNumber}</span>{' '}
                          · {money(item.balance, item.currency)} · {item.bucket}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No open invoice balances are aging.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  )
}

function InvoiceTable({
  downloading,
  invoices,
  onDownload,
}: {
  downloading: boolean
  invoices: Invoice[]
  onDownload: (invoice: Invoice) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <th className="py-2 pr-3 font-medium">Invoice</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Issued</th>
            <th className="py-2 pr-3 font-medium">Due</th>
            <th className="py-2 pr-3 text-right font-medium">Total</th>
            <th className="py-2 pr-3 text-right font-medium">Balance</th>
            <th className="py-2 text-right font-medium">Document</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b last:border-0">
              <td className="py-3 pr-3 font-medium">{invoice.invoiceNumber}</td>
              <td className="py-3 pr-3">{invoice.status}</td>
              <td className="py-3 pr-3">{date(invoice.issuedAtUtc)}</td>
              <td className="py-3 pr-3">{date(invoice.dueAtUtc)}</td>
              <td className="py-3 pr-3 text-right">
                {money(invoice.total, invoice.currency)}
              </td>
              <td className="py-3 pr-3 text-right">
                {money(invoice.balance, invoice.currency)}
              </td>
              <td className="py-3 text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={downloading}
                  onClick={() => onDownload(invoice)}
                >
                  <Download data-icon="inline-start" />
                  PDF
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReceiptEntry({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const [organizationId, setOrganizationId] = useState('')
  const [payer, setPayer] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [externalId, setExternalId] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      recordPaymentReceipt({
        organizationId,
        payer,
        amount: Number(amount),
        currency: 'USD',
        receivedAtUtc: new Date().toISOString(),
        method: 'Bank transfer',
        bankReference: reference,
        evidenceReference: null,
        externalId,
        memo: null,
      }),
    onSuccess: async () => {
      setPayer('')
      setAmount('')
      setReference('')
      setExternalId('')
      await onSaved()
    },
  })
  return (
    <form
      className="grid gap-3 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <p className="font-medium">Record USD receipt</p>
      <Field id="receipt-organization" label="Customer organization ID">
        <Input
          id="receipt-organization"
          required
          value={organizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="receipt-payer" label="Payer">
          <Input
            id="receipt-payer"
            required
            value={payer}
            onChange={(event) => setPayer(event.target.value)}
          />
        </Field>
        <Field id="receipt-amount" label="Amount">
          <Input
            id="receipt-amount"
            required
            min="0.01"
            step="0.01"
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field id="receipt-reference" label="Bank reference">
          <Input
            id="receipt-reference"
            required
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
        <Field id="receipt-external-id" label="External ID">
          <Input
            id="receipt-external-id"
            required
            value={externalId}
            onChange={(event) => setExternalId(event.target.value)}
          />
        </Field>
      </div>
      {mutation.error ? (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(mutation.error)}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={mutation.isPending}>
        {mutation.isPending ? 'Recording…' : 'Record receipt'}
      </Button>
    </form>
  )
}

function AllocationEntry({
  invoices,
  onSaved,
  receipts,
}: {
  invoices: Invoice[]
  onSaved: () => Promise<unknown>
  receipts: PaymentReceipt[]
}) {
  const [receiptId, setReceiptId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const mutation = useMutation({
    mutationFn: () =>
      allocatePayment({
        paymentReceiptId: receiptId,
        invoiceId,
        amount: Number(amount),
      }),
    onSuccess: async () => {
      setAmount('')
      await onSaved()
    },
  })
  return (
    <form
      className="grid gap-3 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <p className="font-medium">Apply cash</p>
      <Field id="allocation-receipt" label="Receipt">
        <select
          id="allocation-receipt"
          required
          className={selectClass}
          value={receiptId}
          onChange={(event) => setReceiptId(event.target.value)}
        >
          <option value="">Select unapplied receipt</option>
          {receipts
            .filter((item) => item.unappliedAmount > 0 && item.status !== 'Reversed')
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.receiptNumber} · {money(item.unappliedAmount, item.currency)}
              </option>
            ))}
        </select>
      </Field>
      <Field id="allocation-invoice" label="Invoice">
        <select
          id="allocation-invoice"
          required
          className={selectClass}
          value={invoiceId}
          onChange={(event) => setInvoiceId(event.target.value)}
        >
          <option value="">Select open invoice</option>
          {invoices
            .filter((item) => item.balance > 0)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.invoiceNumber} · {money(item.balance, item.currency)}
              </option>
            ))}
        </select>
      </Field>
      <Field id="allocation-amount" label="Amount">
        <Input
          id="allocation-amount"
          required
          min="0.01"
          step="0.01"
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      {mutation.error ? (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(mutation.error)}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={mutation.isPending}>
        {mutation.isPending ? 'Applying…' : 'Apply cash'}
      </Button>
    </form>
  )
}

function ReceiptList({ receipts }: { receipts: PaymentReceipt[] }) {
  if (!receipts.length) {
    return <p className="text-sm text-muted-foreground">No receipts recorded.</p>
  }
  return (
    <ul className="space-y-2">
      {receipts.map((item) => (
        <li key={item.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{item.receiptNumber}</span>
            <Badge variant="outline">{item.status}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {item.payer} · {money(item.amount, item.currency)} · unapplied{' '}
            {money(item.unappliedAmount, item.currency)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Field({
  children,
  id,
  label,
}: {
  children: React.ReactNode
  id: string
  label: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value)
}

function date(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(value),
  )
}
