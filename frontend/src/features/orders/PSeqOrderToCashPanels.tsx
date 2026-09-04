import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import {
  allocatePayment,
  adjustInvoice,
  authorizeResultReissue,
  approveTaxDecision,
  approveReconciliation,
  assignOperationalAttention,
  confirmPaymentImport,
  createReconciliation,
  createStagedPSeqOrder,
  exportAccountsReceivableReport,
  getAgingSummary,
  listAccountsReceivableCustomers,
  listInvoices,
  listMatchingInvoices,
  listOperationalAttention,
  listPaymentReceipts,
  listReconciliations,
  listResultPackages,
  listStageEligibleCustomers,
  previewPaymentImport,
  recordPaymentReceipt,
  reversePaymentReceipt,
  releaseResultPackage,
  resolveOperationalAttention,
  submitReconciliation,
  updateBillingProfile,
  withdrawResultPackage,
  type PaymentImportBatch,
  type AccountsReceivableCustomer,
  type ResultPackage,
} from '#/api/pseq-order-to-cash'
import { getOrderConfiguration, getOrderErrorMessage } from '#/api/order-management'
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
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

type OrganizationOption = { id: string; name: string }

export function PSeqStagingPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const client = useQueryClient()
  const customers = useQuery({
    queryKey: ['pseq-staging-customers'],
    queryFn: listStageEligibleCustomers,
    enabled: apiEnabled,
  })
  const configuration = useQuery({
    queryKey: ['order-configuration'],
    queryFn: getOrderConfiguration,
    enabled: apiEnabled,
  })
  const [organizationId, setOrganizationId] = useState('')
  const [customerReference, setCustomerReference] = useState('')
  const [sampleId, setSampleId] = useState('')
  const [materialType, setMaterialType] = useState('RNA')
  const [biologicalSource, setBiologicalSource] = useState('')
  const [quantity, setQuantity] = useState('')
  const [quantityUnit, setQuantityUnit] = useState('ng')
  const [storageRequirements, setStorageRequirements] = useState('Frozen')
  const [safetyDeclaration, setSafetyDeclaration] = useState('No known hazards')
  const [analysisDefinitionId, setAnalysisDefinitionId] = useState('')
  const selected = customers.data?.find(
    (customer) => customer.organizationId === organizationId,
  )
  const create = useMutation({
    mutationFn: () =>
      createStagedPSeqOrder({
        organizationId,
        customerReference: customerReference.trim() || null,
        samples: [
          {
            customerSampleId: sampleId.trim(),
            materialType: materialType.trim(),
            biologicalSource: biologicalSource.trim(),
            quantity: Number(quantity),
            quantityUnit: quantityUnit.trim(),
            storageRequirements: storageRequirements.trim(),
            safetyDeclaration: safetyDeclaration.trim(),
            analysisDefinitionIds: [analysisDefinitionId],
          },
        ],
      }),
    onSuccess: async () => {
      setCustomerReference('')
      setSampleId('')
      setBiologicalSource('')
      setQuantity('')
      await client.invalidateQueries({ queryKey: ['platform-orders', 'lab'] })
      await client.invalidateQueries({ queryKey: ['operational-attention'] })
    },
  })
  const canSubmit = Boolean(
    selected?.canStageOrder &&
      sampleId.trim() &&
      biologicalSource.trim() &&
      Number(quantity) > 0 &&
      analysisDefinitionId,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage a PSeq order</CardTitle>
        <CardDescription>
          Commercial operators can prepare an internal order before a Customer
          administrator is active. Every Customer remains visible with its
          blockers; quote issuance requires every non-billing readiness item
          and an active Customer administrator.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {customers.error || configuration.error || create.error ? (
          <Alert variant="destructive">
            <AlertTitle>Staging is unavailable</AlertTitle>
            <AlertDescription>
              {getOrderErrorMessage(
                customers.error ?? configuration.error ?? create.error,
                'Refresh after resolving the configuration issue.',
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        {customers.isLoading || configuration.isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Checking stage-eligible Customers and offerings…
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" htmlFor="stage-customer">
            <select
              id="stage-customer"
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm"
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              <option value="">Select a Customer</option>
              {customers.data?.map((customer) => (
                <option key={customer.organizationId} value={customer.organizationId}>
                  {customer.organizationName} — {customer.readiness}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer reference" htmlFor="stage-reference">
            <Input id="stage-reference" value={customerReference} onChange={(event) => setCustomerReference(event.target.value)} />
          </Field>
        </div>
        {selected ? (
          <Alert variant={selected.canStageOrder ? 'default' : 'destructive'}>
            <AlertTitle>
              {selected.canStageOrder ? 'Internal staging allowed' : 'Internal staging blocked'}
            </AlertTitle>
            <AlertDescription>
              {selected.blockers.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {selected.blockers.map((blocker) => (
                    <li key={blocker.code}>
                      {blocker.label}: {blocker.nextAction}
                    </li>
                  ))}
                </ul>
              ) : (
                'The Customer is fully ready for quote issuance and commitment.'
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Initial sample</legend>
          <Field label="Customer sample ID" htmlFor="stage-sample-id">
            <Input id="stage-sample-id" required value={sampleId} onChange={(event) => setSampleId(event.target.value)} />
          </Field>
          <Field label="Analysis" htmlFor="stage-analysis">
            <select id="stage-analysis" required className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={analysisDefinitionId} onChange={(event) => setAnalysisDefinitionId(event.target.value)}>
              <option value="">Select an active analysis</option>
              {configuration.data?.analyses.filter((analysis) => analysis.isActive).map((analysis) => <option key={analysis.id} value={analysis.id}>{analysis.name}</option>)}
            </select>
          </Field>
          <Field label="Material type" htmlFor="stage-material">
            <Input id="stage-material" required value={materialType} onChange={(event) => setMaterialType(event.target.value)} />
          </Field>
          <Field label="Biological source" htmlFor="stage-biological-source">
            <Input id="stage-biological-source" required value={biologicalSource} onChange={(event) => setBiologicalSource(event.target.value)} />
          </Field>
          <Field label="Quantity" htmlFor="stage-quantity">
            <Input id="stage-quantity" required type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </Field>
          <Field label="Quantity unit" htmlFor="stage-quantity-unit">
            <Input id="stage-quantity-unit" required value={quantityUnit} onChange={(event) => setQuantityUnit(event.target.value)} />
          </Field>
          <Field label="Storage requirements" htmlFor="stage-storage">
            <Input id="stage-storage" required value={storageRequirements} onChange={(event) => setStorageRequirements(event.target.value)} />
          </Field>
          <Field label="Safety declaration" htmlFor="stage-safety">
            <Input id="stage-safety" required value={safetyDeclaration} onChange={(event) => setSafetyDeclaration(event.target.value)} />
          </Field>
        </fieldset>
        <Button type="button" disabled={!canSubmit || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Creating staged order…' : 'Create staged order'}
        </Button>
        {create.isSuccess ? (
          <p role="status" className="text-sm text-muted-foreground">
            Staged order {create.data.orderNumber} created. It remains internal until readiness and approval are complete.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function OperationalAttentionPanel({
  apiEnabled,
  userId,
}: {
  apiEnabled: boolean
  userId: string | null
}) {
  const client = useQueryClient()
  const [category, setCategory] = useState('')
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [resolution, setResolution] = useState('')
  const query = useQuery({
    queryKey: ['operational-attention', category],
    queryFn: () => listOperationalAttention(category),
    enabled: apiEnabled,
  })
  const refresh = () => client.invalidateQueries({ queryKey: ['operational-attention'] })
  const assign = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      assignOperationalAttention(id, userId, version),
    onSuccess: refresh,
  })
  const resolve = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      resolveOperationalAttention(id, resolution, version),
    onSuccess: async () => {
      setResolveId(null)
      setResolution('')
      await refresh()
    },
  })
  const error = query.error ?? assign.error ?? resolve.error
  return (
    <Card>
      <CardHeader>
        <CardTitle>Owned attention queues</CardTitle>
        <CardDescription>
          Failures and blockers stay visible until an operator owns and resolves them.
        </CardDescription>
        <div className="max-w-sm pt-2">
          <Label htmlFor="attention-category">Queue</Label>
          <select id="attention-category" className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All attention</option>
            <option value="InvitationFailure">Invitation failures</option>
            <option value="ReadinessBlocker">Readiness blockers</option>
            <option value="StagedOrderAwaitingAdminOrApproval">Staged orders</option>
            <option value="ResultProcessingFailure">Projection and scanning failures</option>
            <option value="ScientificallyApprovedUnreleased">Approved, unreleased results</option>
            <option value="OverdueInvoice">Overdue invoices</option>
            <option value="UnappliedCash">Unapplied cash</option>
            <option value="ReconciliationDifference">Reconciliation differences</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <Alert variant="destructive"><AlertTitle>Attention queue could not be updated</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Refresh and try again.')}</AlertDescription></Alert> : null}
        {query.isLoading || query.isFetching ? <p role="status" className="py-4 text-sm text-muted-foreground">Checking attention queues…</p> : null}
        <div className="divide-y">
          {query.data?.map((item) => (
            <article key={item.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge variant={item.ownerUserId ? 'secondary' : 'outline'}>{item.ownerUserId === userId ? 'Owned by you' : item.ownerUserId ? 'Owned' : 'Unassigned'}</Badge>
                  </div>
                  <h3 className="mt-2 font-medium">{item.summary}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Age {item.ageDays} day(s) · Attempts {item.attemptCount} · Status {item.status}</p>
                  <p className="mt-2 text-sm"><strong>Next action:</strong> {item.nextAction}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.ownerUserId !== userId ? <Button type="button" size="sm" variant="outline" disabled={!userId || assign.isPending} onClick={() => assign.mutate({ id: item.id, version: item.version })}>Assign to me</Button> : null}
                  <Button type="button" size="sm" disabled={resolve.isPending} onClick={() => setResolveId(item.id)}>Resolve</Button>
                </div>
              </div>
              {resolveId === item.id ? (
                <div className="mt-3 flex flex-col gap-2 rounded-md bg-muted/50 p-3 sm:flex-row sm:items-end">
                  <Field label="Resolution" htmlFor={`resolution-${item.id}`} className="flex-1">
                    <Input id={`resolution-${item.id}`} value={resolution} onChange={(event) => setResolution(event.target.value)} />
                  </Field>
                  <Button type="button" variant="outline" onClick={() => { setResolveId(null); setResolution('') }}>Cancel</Button>
                  <Button type="button" disabled={!resolution.trim() || resolve.isPending} onClick={() => resolve.mutate({ id: item.id, version: item.version })}>Save resolution</Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        {!query.isLoading && !query.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No unresolved items in this queue.</p> : null}
      </CardContent>
    </Card>
  )
}

export function ResultReleasePanel({ apiEnabled }: { apiEnabled: boolean }) {
  const client = useQueryClient()
  const [state, setState] = useState('ScientificallyApproved')
  const [withdrawTarget, setWithdrawTarget] = useState<ResultPackage | null>(null)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [reissueTarget, setReissueTarget] = useState<ResultPackage | null>(null)
  const [reissueReason, setReissueReason] = useState('')
  const query = useQuery({
    queryKey: ['pseq-result-packages', state],
    queryFn: () => listResultPackages(state),
    enabled: apiEnabled,
  })
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['pseq-result-packages'] }),
    client.invalidateQueries({ queryKey: ['operational-attention'] }),
  ])
  const release = useMutation({ mutationFn: (item: ResultPackage) => releaseResultPackage(item.id, item.version), onSuccess: refresh })
  const withdraw = useMutation({
    mutationFn: (item: ResultPackage) => withdrawResultPackage(item.id, item.version, withdrawReason),
    onSuccess: async () => { setWithdrawTarget(null); setWithdrawReason(''); await refresh() },
  })
  const reissue = useMutation({
    mutationFn: (item: ResultPackage) => authorizeResultReissue(item.id, item.version, reissueReason),
    onSuccess: async () => { setReissueTarget(null); setReissueReason(''); await refresh() },
  })
  const error = query.error ?? release.error ?? withdraw.error ?? reissue.error
  return (
    <Card>
      <CardHeader>
        <CardTitle>PSeq result release</CardTitle>
        <CardDescription>
          Release only complete, checksummed, malware-clean packages with pinned scientific approval. Customer balance and credit status never gate release.
        </CardDescription>
        <div className="max-w-sm pt-2">
          <Label htmlFor="result-package-state">Package state</Label>
          <select id="result-package-state" className="mt-2 h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={state} onChange={(event) => setState(event.target.value)}>
            {['ScientificallyApproved', 'ReadyForRelease', 'Released', 'ReadyForReview', 'Failed', 'Withdrawn'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <Alert variant="destructive"><AlertTitle>Result packages could not be updated</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Refresh and verify the package state.')}</AlertDescription></Alert> : null}
        {query.isLoading || query.isFetching ? <p role="status" className="py-4 text-sm text-muted-foreground">Checking governed result packages…</p> : null}
        <div className="divide-y">
          {query.data?.map((item) => (
            <article key={item.id} className="py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{item.state}</Badge><span className="text-sm font-medium">Sample {item.labSampleId}</span><span className="text-xs text-muted-foreground">Version {item.packageVersion}</span></div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.artifacts.length}/{item.expectedArtifactCount} artifacts · Manifest {item.manifestSha256.slice(0, 12)}…{item.retentionState ? ` · Retention ${item.retentionState}` : ''}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{item.artifacts.map((artifact) => <li key={artifact.id}>{artifact.fileName} · {artifact.scanState} · SHA-256 {artifact.sha256.slice(0, 12)}…</li>)}</ul>
                  {item.failureDetail ? <p className="mt-2 text-sm text-destructive">{item.failureCode}: {item.failureDetail}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.state === 'ScientificallyApproved' || item.state === 'ReadyForRelease' ? <Button type="button" size="sm" disabled={release.isPending} onClick={() => release.mutate(item)}>Release to Customer</Button> : null}
                  {item.state === 'Released' && item.retentionState === 'Deleted' ? <Button type="button" size="sm" variant="outline" disabled={reissue.isPending} onClick={() => setReissueTarget(item)}>Authorize reissue</Button> : null}
                  {!['Withdrawn', 'Failed'].includes(item.state) ? <Button type="button" size="sm" variant="destructive" disabled={withdraw.isPending} onClick={() => setWithdrawTarget(item)}>Withdraw</Button> : null}
                </div>
              </div>
              {withdrawTarget?.id === item.id ? <div className="mt-3 flex flex-col gap-2 rounded-md bg-muted/50 p-3 sm:flex-row sm:items-end"><Field label="Withdrawal reason" htmlFor={`withdraw-${item.id}`} className="flex-1"><Input id={`withdraw-${item.id}`} value={withdrawReason} onChange={(event) => setWithdrawReason(event.target.value)} /></Field><Button type="button" variant="outline" onClick={() => { setWithdrawTarget(null); setWithdrawReason('') }}>Cancel</Button><Button type="button" variant="destructive" disabled={!withdrawReason.trim() || withdraw.isPending} onClick={() => withdraw.mutate(item)}>Confirm withdrawal</Button></div> : null}
              {reissueTarget?.id === item.id ? <div className="mt-3 flex flex-col gap-2 rounded-md bg-muted/50 p-3 sm:flex-row sm:items-end"><Field label="Reissue reason" htmlFor={`reissue-${item.id}`} className="flex-1"><Input id={`reissue-${item.id}`} value={reissueReason} onChange={(event) => setReissueReason(event.target.value)} /></Field><Button type="button" variant="outline" onClick={() => { setReissueTarget(null); setReissueReason('') }}>Cancel</Button><Button type="button" disabled={!reissueReason.trim() || reissue.isPending} onClick={() => reissue.mutate(item)}>Confirm reissue authorization</Button></div> : null}
            </article>
          ))}
        </div>
        {!query.isLoading && !query.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No result packages in this state.</p> : null}
      </CardContent>
    </Card>
  )
}

export function FinanceOperationsPanel({
  apiEnabled,
  canBill,
  canManageCash,
  canReconcile,
}: {
  apiEnabled: boolean
  canBill: boolean
  canManageCash: boolean
  canReconcile: boolean
}) {
  const client = useQueryClient()
  const customers = useQuery({ queryKey: ['accounts-receivable', 'customers'], queryFn: listAccountsReceivableCustomers, enabled: apiEnabled && (canBill || canManageCash || canReconcile) })
  const organizations = customers.data?.map((item) => ({ id: item.organizationId, name: item.organizationName })) ?? []
  const invoices = useQuery({ queryKey: ['accounts-receivable', 'invoices'], queryFn: () => listInvoices(), enabled: apiEnabled && canBill })
  const aging = useQuery({ queryKey: ['accounts-receivable', 'aging'], queryFn: getAgingSummary, enabled: apiEnabled && canBill })
  const receipts = useQuery({ queryKey: ['accounts-receivable', 'receipts'], queryFn: () => listPaymentReceipts(), enabled: apiEnabled && canManageCash })
  const reconciliations = useQuery({ queryKey: ['accounts-receivable', 'reconciliations'], queryFn: listReconciliations, enabled: apiEnabled && (canManageCash || canReconcile) })
  const [receipt, setReceipt] = useState({ organizationId: '', externalId: '', payer: '', amount: '', receivedOn: new Date().toISOString().slice(0, 10), method: '', bankReference: '', evidenceStorageKey: '', memo: '' })
  const [selectedReceiptId, setSelectedReceiptId] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [allocationAmount, setAllocationAmount] = useState('')
  const [adjustment, setAdjustment] = useState({ invoiceId: '', kind: 'Credit' as 'Credit' | 'Debit' | 'WriteOff', amount: '', reason: '' })
  const [reversal, setReversal] = useState({ receiptId: '', reason: '' })
  const selectedReceipt = receipts.data?.find((item) => item.id === selectedReceiptId)
  const suggestions = useQuery({ queryKey: ['accounts-receivable', 'matching', selectedReceiptId], queryFn: () => listMatchingInvoices(selectedReceiptId), enabled: apiEnabled && canManageCash && Boolean(selectedReceiptId) })
  const selectedInvoice = suggestions.data?.find((item) => item.id === selectedInvoiceId)
  const [importValues, setImportValues] = useState({ organizationId: '', source: '', csvText: '' })
  const [preview, setPreview] = useState<PaymentImportBatch | null>(null)
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([])
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10))
  const [bankTotal, setBankTotal] = useState('')
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['accounts-receivable'] }),
    client.invalidateQueries({ queryKey: ['operational-attention'] }),
  ])
  const record = useMutation({ mutationFn: () => recordPaymentReceipt({ ...receipt, amount: Number(receipt.amount), currency: 'USD', memo: receipt.memo || null }), onSuccess: async () => { setReceipt((value) => ({ ...value, externalId: '', payer: '', amount: '', method: '', bankReference: '', evidenceStorageKey: '', memo: '' })); await refresh() } })
  const allocate = useMutation({ mutationFn: () => allocatePayment(selectedReceipt!.id, { invoiceId: selectedInvoice!.id, amount: Number(allocationAmount), receiptVersion: selectedReceipt!.version, invoiceVersion: selectedInvoice!.version }), onSuccess: async () => { setAllocationAmount(''); await refresh(); await client.invalidateQueries({ queryKey: ['accounts-receivable', 'matching'] }) } })
  const applyAdjustment = useMutation({ mutationFn: () => { const invoice = invoices.data!.find((item) => item.id === adjustment.invoiceId)!; return adjustInvoice(invoice.id, { kind: adjustment.kind, amount: Number(adjustment.amount), reason: adjustment.reason, invoiceVersion: invoice.version }) }, onSuccess: async () => { setAdjustment({ invoiceId: '', kind: 'Credit', amount: '', reason: '' }); await refresh() } })
  const reverseReceipt = useMutation({ mutationFn: () => { const item = receipts.data!.find((receiptItem) => receiptItem.id === reversal.receiptId)!; return reversePaymentReceipt(item.id, item.version, reversal.reason) }, onSuccess: async () => { setReversal({ receiptId: '', reason: '' }); await refresh() } })
  const exportReport = useMutation({ mutationFn: exportAccountsReceivableReport })
  const previewImport = useMutation({ mutationFn: () => previewPaymentImport(importValues), onSuccess: setPreview })
  const confirmImport = useMutation({ mutationFn: () => confirmPaymentImport(preview!.id, preview!.version), onSuccess: async () => { setPreview(null); setImportValues({ organizationId: '', source: '', csvText: '' }); await refresh() } })
  const createBatch = useMutation({ mutationFn: () => createReconciliation({ periodEnd, bankTotal: Number(bankTotal), paymentReceiptIds: selectedReceiptIds, paymentAllocationIds: [], invoiceAdjustmentIds: [] }), onSuccess: async () => { setSelectedReceiptIds([]); setBankTotal(''); await refresh() } })
  const mutateBatch = useMutation({ mutationFn: ({ id, version, action }: { id: string; version: number; action: 'submit' | 'approve' }) => action === 'submit' ? submitReconciliation(id, version) : approveReconciliation(id, version), onSuccess: refresh })
  const error = customers.error ?? invoices.error ?? aging.error ?? receipts.error ?? reconciliations.error ?? record.error ?? allocate.error ?? applyAdjustment.error ?? reverseReceipt.error ?? exportReport.error ?? previewImport.error ?? confirmImport.error ?? createBatch.error ?? mutateBatch.error
  return (
    <div className="space-y-5">
      {error ? <Alert variant="destructive"><AlertTitle>Finance workflow could not be updated</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Refresh the finance workspace and verify the record versions.')}</AlertDescription></Alert> : null}
      {canBill ? <BillingConfigurationCard apiEnabled={apiEnabled} customers={customers.data ?? []} customersLoading={customers.isLoading} /> : null}
      {canBill ? <Card><CardHeader><CardTitle>Accounts receivable</CardTitle><CardDescription>Native POMS invoices replace the manual billing report as the active workflow. Issued invoices are immutable; corrections use append-only adjustments.</CardDescription></CardHeader><CardContent>{aging.isLoading || invoices.isLoading ? <p role="status" className="text-sm text-muted-foreground">Checking open invoices and aging…</p> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Current" value={money(aging.data?.current ?? 0)} /><Metric label="1–30 days" value={money(aging.data?.days1To30 ?? 0)} /><Metric label="31–60 days" value={money(aging.data?.days31To60 ?? 0)} /><Metric label="61–90 days" value={money(aging.data?.days61To90 ?? 0)} /><Metric label="Over 90 days" value={money(aging.data?.over90 ?? 0)} /></div><div className="mt-5 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate('invoices')}>Export invoices</Button><Button type="button" size="sm" variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate('aging')}>Export aging</Button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[48rem] text-left text-sm"><caption className="sr-only">Issued and historical POMS invoices</caption><thead><tr className="border-b"><th className="py-2 pr-3">Invoice</th><th className="py-2 pr-3">Customer</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Due</th><th className="py-2 text-right">Balance</th></tr></thead><tbody>{invoices.data?.map((invoice) => <tr key={invoice.id} className="border-b"><td className="py-3 pr-3 font-medium">{invoice.invoiceNumber}</td><td className="py-3 pr-3">{organizationName(organizations, invoice.organizationId)}</td><td className="py-3 pr-3"><Badge variant="outline">{invoice.status}</Badge></td><td className="py-3 pr-3">{formatDate(invoice.dueOn)}{invoice.daysPastDue > 0 ? ` · ${invoice.daysPastDue} days overdue` : ''}</td><td className="py-3 text-right">{money(invoice.balance)}</td></tr>)}</tbody></table>{!invoices.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No POMS invoices have been issued.</p> : null}</div><div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Invoice adjustment" htmlFor="adjustment-invoice"><select id="adjustment-invoice" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={adjustment.invoiceId} onChange={(event) => setAdjustment((value) => ({ ...value, invoiceId: event.target.value }))}><option value="">Select invoice</option>{invoices.data?.filter((item) => !['Voided', 'WrittenOff'].includes(item.status)).map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber} · {money(item.balance)}</option>)}</select></Field><Field label="Adjustment kind" htmlFor="adjustment-kind"><select id="adjustment-kind" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={adjustment.kind} onChange={(event) => setAdjustment((value) => ({ ...value, kind: event.target.value as typeof value.kind }))}><option value="Credit">Credit</option><option value="Debit">Debit</option><option value="WriteOff">Write-off</option></select></Field><Field label="Amount (USD)" htmlFor="adjustment-amount"><Input id="adjustment-amount" type="number" min="0" step="0.01" value={adjustment.amount} onChange={(event) => setAdjustment((value) => ({ ...value, amount: event.target.value }))} /></Field><Field label="Reason" htmlFor="adjustment-reason"><Input id="adjustment-reason" value={adjustment.reason} onChange={(event) => setAdjustment((value) => ({ ...value, reason: event.target.value }))} /></Field></div><Button type="button" className="mt-3" disabled={applyAdjustment.isPending || !adjustment.invoiceId || Number(adjustment.amount) <= 0 || !adjustment.reason.trim()} onClick={() => applyAdjustment.mutate()}>{applyAdjustment.isPending ? 'Recording adjustment…' : 'Record append-only adjustment'}</Button></>}</CardContent></Card> : null}
      {canManageCash ? <><Card><CardHeader><CardTitle>Record a receipt</CardTitle><CardDescription>Manual Finance entry records payer, evidence, reference, and external identity. Matching suggestions never auto-apply.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><SelectOrganization id="receipt-organization" label="Customer" organizations={organizations} value={receipt.organizationId} onChange={(organizationId) => setReceipt((value) => ({ ...value, organizationId }))} /><Field label="External ID" htmlFor="receipt-external"><Input id="receipt-external" required value={receipt.externalId} onChange={(event) => setReceipt((value) => ({ ...value, externalId: event.target.value }))} /></Field><Field label="Payer" htmlFor="receipt-payer"><Input id="receipt-payer" required value={receipt.payer} onChange={(event) => setReceipt((value) => ({ ...value, payer: event.target.value }))} /></Field><Field label="Amount (USD)" htmlFor="receipt-amount"><Input id="receipt-amount" required type="number" min="0" step="0.01" value={receipt.amount} onChange={(event) => setReceipt((value) => ({ ...value, amount: event.target.value }))} /></Field><Field label="Received date" htmlFor="receipt-date"><Input id="receipt-date" required type="date" value={receipt.receivedOn} onChange={(event) => setReceipt((value) => ({ ...value, receivedOn: event.target.value }))} /></Field><Field label="Method" htmlFor="receipt-method"><Input id="receipt-method" required value={receipt.method} onChange={(event) => setReceipt((value) => ({ ...value, method: event.target.value }))} /></Field><Field label="Bank reference" htmlFor="receipt-reference"><Input id="receipt-reference" required value={receipt.bankReference} onChange={(event) => setReceipt((value) => ({ ...value, bankReference: event.target.value }))} /></Field><Field label="Evidence storage key" htmlFor="receipt-evidence"><Input id="receipt-evidence" required value={receipt.evidenceStorageKey} onChange={(event) => setReceipt((value) => ({ ...value, evidenceStorageKey: event.target.value }))} /></Field><Field label="Memo" htmlFor="receipt-memo"><Input id="receipt-memo" value={receipt.memo} onChange={(event) => setReceipt((value) => ({ ...value, memo: event.target.value }))} /></Field></div><Button type="button" disabled={record.isPending || !receipt.organizationId || !receipt.externalId.trim() || !receipt.payer.trim() || Number(receipt.amount) <= 0 || !receipt.method.trim() || !receipt.bankReference.trim() || !receipt.evidenceStorageKey.trim()} onClick={() => record.mutate()}>{record.isPending ? 'Recording…' : 'Record unapplied receipt'}</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Allocate cash</CardTitle><CardDescription>Select an unapplied receipt, review same-Customer suggestions, and explicitly allocate an amount.</CardDescription></CardHeader><CardContent className="space-y-4">{receipts.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading receipts…</p> : null}<div className="grid gap-4 sm:grid-cols-3"><Field label="Receipt" htmlFor="allocation-receipt"><select id="allocation-receipt" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={selectedReceiptId} onChange={(event) => { setSelectedReceiptId(event.target.value); setSelectedInvoiceId('') }}><option value="">Select unapplied receipt</option>{receipts.data?.filter((item) => item.unappliedAmount > 0 && item.status !== 'Reversed').map((item) => <option key={item.id} value={item.id}>{item.receiptNumber} · {money(item.unappliedAmount)} · {item.payer}</option>)}</select></Field><Field label="Suggested invoice" htmlFor="allocation-invoice"><select id="allocation-invoice" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={selectedInvoiceId} disabled={!selectedReceiptId || suggestions.isLoading} onChange={(event) => setSelectedInvoiceId(event.target.value)}><option value="">Select invoice</option>{suggestions.data?.map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber} · {money(item.balance)}</option>)}</select></Field><Field label="Allocation amount" htmlFor="allocation-amount"><Input id="allocation-amount" type="number" min="0" step="0.01" value={allocationAmount} onChange={(event) => setAllocationAmount(event.target.value)} /></Field></div><Button type="button" disabled={allocate.isPending || !selectedReceipt || !selectedInvoice || Number(allocationAmount) <= 0 || Number(allocationAmount) > Math.min(selectedReceipt?.unappliedAmount ?? 0, selectedInvoice?.balance ?? 0)} onClick={() => allocate.mutate()}>{allocate.isPending ? 'Allocating…' : 'Apply selected amount'}</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Reverse a receipt</CardTitle><CardDescription>A reversal preserves the receipt, actor, and reason and is allowed only before any remaining allocation is left unreversed.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Receipt" htmlFor="reversal-receipt"><select id="reversal-receipt" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={reversal.receiptId} onChange={(event) => setReversal((value) => ({ ...value, receiptId: event.target.value }))}><option value="">Select receipt</option>{receipts.data?.filter((item) => item.status !== 'Reversed').map((item) => <option key={item.id} value={item.id}>{item.receiptNumber} · {item.status} · {money(item.amount)}</option>)}</select></Field><Field label="Reversal reason" htmlFor="reversal-reason"><Input id="reversal-reason" value={reversal.reason} onChange={(event) => setReversal((value) => ({ ...value, reason: event.target.value }))} /></Field></div><div className="flex flex-wrap gap-2"><Button type="button" variant="destructive" disabled={reverseReceipt.isPending || !reversal.receiptId || !reversal.reason.trim()} onClick={() => reverseReceipt.mutate()}>{reverseReceipt.isPending ? 'Reversing…' : 'Reverse receipt'}</Button><Button type="button" variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate('receipts')}>Export receipts</Button><Button type="button" variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate('unapplied-cash')}>Export unapplied cash</Button></div></CardContent></Card><Card><CardHeader><CardTitle>CSV receipt import</CardTitle><CardDescription>Preview is mandatory. Required headers: source, external_id, date, amount, currency, payer, reference, memo.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><SelectOrganization id="import-organization" label="Customer" organizations={organizations} value={importValues.organizationId} onChange={(organizationId) => setImportValues((value) => ({ ...value, organizationId }))} /><Field label="Source" htmlFor="import-source"><Input id="import-source" required value={importValues.source} onChange={(event) => setImportValues((value) => ({ ...value, source: event.target.value }))} /></Field></div><Field label="CSV content" htmlFor="import-csv"><textarea id="import-csv" className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" value={importValues.csvText} onChange={(event) => setImportValues((value) => ({ ...value, csvText: event.target.value }))} /></Field><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={previewImport.isPending || !importValues.organizationId || !importValues.source.trim() || !importValues.csvText.trim()} onClick={() => previewImport.mutate()}>{previewImport.isPending ? 'Checking…' : 'Preview import'}</Button>{preview ? <Button type="button" disabled={confirmImport.isPending} onClick={() => confirmImport.mutate()}>{confirmImport.isPending ? 'Importing…' : `Confirm ${preview.rowCount} row(s) · ${money(preview.totalAmount)}`}</Button> : null}</div>{preview ? <Alert><AlertTitle>Preview only — no receipts applied</AlertTitle><AlertDescription>Batch {preview.id} passed duplicate, currency, and required-field validation. Confirming creates unapplied receipts; it never applies cash.</AlertDescription></Alert> : null}</CardContent></Card></> : null}
      {canManageCash || canReconcile ? <Card><CardHeader><CardTitle>Cash reconciliation</CardTitle><CardDescription>A Cash Operator creates and submits a balanced batch. A different Cash Reconciler approves the immutable closeout report.</CardDescription></CardHeader><CardContent className="space-y-4">{canManageCash ? <><div className="grid gap-4 sm:grid-cols-2"><Field label="Period end" htmlFor="reconciliation-period"><Input id="reconciliation-period" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></Field><Field label="Bank total (USD)" htmlFor="reconciliation-bank-total"><Input id="reconciliation-bank-total" type="number" step="0.01" value={bankTotal} onChange={(event) => setBankTotal(event.target.value)} /></Field></div><fieldset className="rounded-lg border p-3"><legend className="px-1 text-sm font-medium">Included receipts</legend><div className="mt-2 grid gap-2">{receipts.data?.filter((item) => item.status !== 'Reversed').map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={selectedReceiptIds.includes(item.id)} onCheckedChange={(checked) => setSelectedReceiptIds((ids) => checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} />{item.receiptNumber} · {money(item.amount)} · {item.payer}</label>)}</div></fieldset><Button type="button" disabled={createBatch.isPending || !selectedReceiptIds.length || Number.isNaN(Number(bankTotal))} onClick={() => createBatch.mutate()}>{createBatch.isPending ? 'Creating…' : 'Create reconciliation batch'}</Button></> : null}<div className="divide-y">{reconciliations.data?.map((batch) => <div key={batch.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{batch.batchNumber} · {batch.status}</p><p className="text-sm text-muted-foreground">Ledger {money(batch.ledgerReceiptTotal)} · Bank {money(batch.bankTotal)} · Difference {money(batch.difference)}</p>{batch.closeoutReportJson ? <p className="mt-1 text-xs text-muted-foreground">Immutable closeout report retained.</p> : null}</div><div className="flex gap-2">{canManageCash && batch.status === 'Draft' ? <Button type="button" size="sm" variant="outline" disabled={mutateBatch.isPending || batch.difference !== 0} onClick={() => mutateBatch.mutate({ id: batch.id, version: batch.version, action: 'submit' })}>Submit balanced batch</Button> : null}{canReconcile && batch.status === 'Submitted' ? <Button type="button" size="sm" disabled={mutateBatch.isPending} onClick={() => mutateBatch.mutate({ id: batch.id, version: batch.version, action: 'approve' })}>Approve independently</Button> : null}</div></div>)}</div>{!reconciliations.isLoading && !reconciliations.data?.length ? <p className="text-sm text-muted-foreground">No reconciliation batches yet.</p> : null}<Button type="button" size="sm" variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate('reconciliations')}>Export reconciliations</Button></CardContent></Card> : null}
    </div>
  )
}

type TaxDecision = 'Taxable' | 'Exempt' | 'NonTaxable'
type BillingAddress = {
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  countryCode: string
}
type BillingValues = {
  contactName: string
  contactEmail: string
  address: BillingAddress
  paymentTermsDays: string
  taxDecision: TaxDecision
  taxRatePercent: string
  exemptionEvidence: string
}

const emptyBillingValues: BillingValues = {
  contactName: '',
  contactEmail: '',
  address: { line1: '', line2: '', city: '', region: '', postalCode: '', countryCode: 'US' },
  paymentTermsDays: '30',
  taxDecision: 'NonTaxable',
  taxRatePercent: '',
  exemptionEvidence: '',
}

function BillingConfigurationCard({
  apiEnabled,
  customers,
  customersLoading,
}: {
  apiEnabled: boolean
  customers: AccountsReceivableCustomer[]
  customersLoading: boolean
}) {
  const client = useQueryClient()
  const [organizationId, setOrganizationId] = useState('')
  const [values, setValues] = useState<BillingValues>(emptyBillingValues)
  const [approvalNotes, setApprovalNotes] = useState('')
  const selected = customers.find((customer) => customer.organizationId === organizationId)
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['accounts-receivable', 'customers'] }),
    client.invalidateQueries({ queryKey: ['organization-operational-readiness'] }),
    client.invalidateQueries({ queryKey: ['pseq-staging-customers'] }),
  ])
  const save = useMutation({
    mutationFn: () => updateBillingProfile(organizationId, {
      version: selected?.profileVersion ?? 0,
      billingContactName: values.contactName.trim(),
      billingContactEmail: values.contactEmail.trim(),
      billingAddressJson: JSON.stringify({
        ...values.address,
        line1: values.address.line1.trim(),
        line2: values.address.line2.trim() || null,
        city: values.address.city.trim(),
        region: values.address.region.trim(),
        postalCode: values.address.postalCode.trim(),
        countryCode: values.address.countryCode.trim().toUpperCase(),
      }),
      paymentTermsDays: Number(values.paymentTermsDays),
      taxDecision: values.taxDecision,
      approvedTaxRate: values.taxDecision === 'Taxable' ? Number(values.taxRatePercent) / 100 : null,
      taxExemptionEvidence: values.taxDecision === 'Exempt' ? values.exemptionEvidence.trim() : null,
    }),
    onSuccess: refresh,
  })
  const approve = useMutation({
    mutationFn: () => approveTaxDecision(organizationId, selected!.profileVersion!, approvalNotes.trim()),
    onSuccess: async () => { setApprovalNotes(''); await refresh() },
  })

  function selectCustomer(id: string) {
    setOrganizationId(id)
    setApprovalNotes('')
    const customer = customers.find((item) => item.organizationId === id)
    if (!customer) { setValues(emptyBillingValues); return }
    setValues({
      contactName: customer.billingContactName ?? '',
      contactEmail: customer.billingContactEmail ?? '',
      address: parseBillingAddress(customer.billingAddressJson),
      paymentTermsDays: String(customer.paymentTermsDays || 30),
      taxDecision: customer.taxDecision ?? 'NonTaxable',
      taxRatePercent: customer.approvedTaxRate == null ? '' : String(customer.approvedTaxRate * 100),
      exemptionEvidence: customer.taxExemptionEvidence ?? '',
    })
  }
  function updateAddress(field: keyof BillingAddress, value: string) {
    setValues((current) => ({ ...current, address: { ...current.address, [field]: value } }))
  }
  const validTax = values.taxDecision === 'Taxable'
    ? Number(values.taxRatePercent) >= 0 && Number(values.taxRatePercent) <= 100 && values.taxRatePercent !== ''
    : values.taxDecision !== 'Exempt' || Boolean(values.exemptionEvidence.trim())
  const canSave = Boolean(
    apiEnabled && organizationId && values.contactName.trim() && values.contactEmail.trim()
      && values.address.line1.trim() && values.address.city.trim() && values.address.region.trim()
      && values.address.postalCode.trim() && values.address.countryCode.trim().length === 2
      && Number.isInteger(Number(values.paymentTermsDays)) && Number(values.paymentTermsDays) >= 0
      && Number(values.paymentTermsDays) <= 365 && validTax,
  )
  const error = save.error ?? approve.error

  return <Card><CardHeader><CardTitle>Customer billing and tax configuration</CardTitle><CardDescription>Finance owns the billing contact, address, payment terms, and effective tax decision. Saving resets Finance approval. Approval is required to include tax in a quote and must be complete before invoice issuance.</CardDescription></CardHeader><CardContent className="space-y-5">{error ? <Alert variant="destructive"><AlertTitle>Billing configuration was not updated</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Refresh the Customer profile and try again.')}</AlertDescription></Alert> : null}{customersLoading ? <p role="status" className="text-sm text-muted-foreground">Loading Customer billing profiles…</p> : null}<Field label="Customer *" htmlFor="billing-customer"><select id="billing-customer" required className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={organizationId} onChange={(event) => selectCustomer(event.target.value)}><option value="">Select a Customer</option>{customers.map((customer) => <option key={customer.organizationId} value={customer.organizationId}>{customer.organizationName}</option>)}</select></Field>{selected ? <><div className="flex flex-wrap items-center gap-2"><Badge variant={selected.financeApprovedAtUtc ? 'secondary' : 'outline'}>{selected.financeApprovedAtUtc ? 'Finance approved' : 'Finance approval required'}</Badge><span className="text-xs text-muted-foreground">Configuration version {selected.configurationVersion || 'not configured'}</span></div><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (canSave) save.mutate() }}><div className="grid gap-4 sm:grid-cols-2"><Field label="Billing contact name *" htmlFor="billing-contact-name"><Input id="billing-contact-name" required value={values.contactName} onChange={(event) => setValues((current) => ({ ...current, contactName: event.target.value }))} /></Field><Field label="Billing contact email *" htmlFor="billing-contact-email"><Input id="billing-contact-email" required type="email" value={values.contactEmail} onChange={(event) => setValues((current) => ({ ...current, contactEmail: event.target.value }))} /></Field><Field label="Address line 1 *" htmlFor="billing-line1"><Input id="billing-line1" required value={values.address.line1} onChange={(event) => updateAddress('line1', event.target.value)} /></Field><Field label="Address line 2" htmlFor="billing-line2"><Input id="billing-line2" value={values.address.line2} onChange={(event) => updateAddress('line2', event.target.value)} /></Field><Field label="City *" htmlFor="billing-city"><Input id="billing-city" required value={values.address.city} onChange={(event) => updateAddress('city', event.target.value)} /></Field><Field label="State or region *" htmlFor="billing-region"><Input id="billing-region" required value={values.address.region} onChange={(event) => updateAddress('region', event.target.value)} /></Field><Field label="Postal code *" htmlFor="billing-postal"><Input id="billing-postal" required value={values.address.postalCode} onChange={(event) => updateAddress('postalCode', event.target.value)} /></Field><Field label="Country code *" htmlFor="billing-country"><Input id="billing-country" required maxLength={2} value={values.address.countryCode} onChange={(event) => updateAddress('countryCode', event.target.value)} /></Field><Field label="Payment terms (days) *" htmlFor="billing-terms"><Input id="billing-terms" required type="number" min="0" max="365" step="1" value={values.paymentTermsDays} onChange={(event) => setValues((current) => ({ ...current, paymentTermsDays: event.target.value }))} /></Field><Field label="Tax decision *" htmlFor="billing-tax-decision"><select id="billing-tax-decision" required className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={values.taxDecision} onChange={(event) => setValues((current) => ({ ...current, taxDecision: event.target.value as TaxDecision }))}><option value="Taxable">Taxable</option><option value="Exempt">Exempt</option><option value="NonTaxable">Non-taxable</option></select></Field>{values.taxDecision === 'Taxable' ? <Field label="Approved tax rate (%) *" htmlFor="billing-tax-rate"><Input id="billing-tax-rate" required type="number" min="0" max="100" step="0.0001" value={values.taxRatePercent} onChange={(event) => setValues((current) => ({ ...current, taxRatePercent: event.target.value }))} /></Field> : null}{values.taxDecision === 'Exempt' ? <Field label="Exemption evidence *" htmlFor="billing-exemption"><Input id="billing-exemption" required value={values.exemptionEvidence} onChange={(event) => setValues((current) => ({ ...current, exemptionEvidence: event.target.value }))} /></Field> : null}</div><Button type="submit" disabled={!canSave || save.isPending}>{save.isPending ? 'Saving billing configuration…' : 'Save billing configuration'}</Button></form><div className="border-t pt-4"><Field label="Finance approval notes *" htmlFor="billing-approval-notes"><Input id="billing-approval-notes" value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} /></Field><Button type="button" className="mt-3" variant="outline" disabled={!selected.profileVersion || !selected.taxDecision || !approvalNotes.trim() || approve.isPending} onClick={() => approve.mutate()}>{approve.isPending ? 'Approving…' : 'Approve current tax decision'}</Button>{selected.financeApprovedAtUtc ? <p className="mt-2 text-xs text-muted-foreground">Approved {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.financeApprovedAtUtc))}. Any billing or tax change requires a new approval.</p> : null}</div></> : !customersLoading ? <p className="text-sm text-muted-foreground">Select a Customer to configure PSeq billing.</p> : null}</CardContent></Card>
}

function parseBillingAddress(value: string | null): BillingAddress {
  if (!value) return emptyBillingValues.address
  try {
    const parsed = JSON.parse(value) as Partial<BillingAddress>
    return {
      line1: parsed.line1 ?? '',
      line2: parsed.line2 ?? '',
      city: parsed.city ?? '',
      region: parsed.region ?? '',
      postalCode: parsed.postalCode ?? '',
      countryCode: parsed.countryCode ?? 'US',
    }
  } catch {
    return emptyBillingValues.address
  }
}

function SelectOrganization({ id, label, organizations, value, onChange }: { id: string; label: string; organizations: OrganizationOption[]; value: string; onChange: (id: string) => void }) {
  return <Field label={label} htmlFor={id}><select id={id} required className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select a Customer</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></Field>
}

function Field({ label, htmlFor, children, className = '' }: { label: string; htmlFor: string; children: ReactNode; className?: string }) {
  return <div className={`grid gap-1.5 ${className}`}><Label htmlFor={htmlFor}>{label}</Label>{children}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
}

function organizationName(organizations: OrganizationOption[], id: string) {
  return organizations.find((organization) => organization.id === id)?.name ?? id
}
