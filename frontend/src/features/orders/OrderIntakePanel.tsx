import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus, ScanLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getOrderErrorMessage, listPlatformOrders } from '#/api/order-management'
import { scanRegisteredSampleTube, scanSampleShippingPacket } from '#/api/sample-shipping'
import {
  listRelationshipRequests,
  simulateHubSpotHandoff,
  type RelationshipRequest,
} from '#/api/organization-management'
import type { Organization } from '#/api/data-provisioning'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ReturnKitFulfillmentPanel } from './ReturnKitFulfillmentPanel'

type IntakeOrganization = Pick<Organization, 'id' | 'kind' | 'name'>

const simulationSchema = z.object({
  path: z.enum(['SalesAssistedOrder', 'TrialProject']),
  organizationId: z.string(),
  candidateOrganizationName: z.string().trim().max(255),
  requestedService: z.enum(['PSeqLabService', 'PSeqKit']),
  hubSpotDealId: z.string().trim().min(1, 'Enter the HubSpot Deal identifier.').max(242),
  summary: z.string().trim().min(1, 'Describe the requested work.').max(2000),
  internalNotes: z.string().trim().max(3900),
}).superRefine((values, context) => {
  if (values.path === 'SalesAssistedOrder' && !values.organizationId) {
    context.addIssue({
      code: 'custom',
      message: 'Select the Customer or Partner receiving the sales-assisted order.',
      path: ['organizationId'],
    })
  }
  if (values.path === 'TrialProject' && !values.organizationId && !values.candidateOrganizationName) {
    context.addIssue({
      code: 'custom',
      message: 'Select an existing Prospect or enter a new Prospect candidate.',
      path: ['candidateOrganizationName'],
    })
  }
})

type SimulationValues = z.infer<typeof simulationSchema>

const simulationDefaults: SimulationValues = {
  path: 'SalesAssistedOrder',
  organizationId: '',
  candidateOrganizationName: '',
  requestedService: 'PSeqLabService',
  hubSpotDealId: '',
  summary: '',
  internalNotes: '',
}

export function OrderIntakePanel({
  apiEnabled,
  organizations,
}: {
  apiEnabled: boolean
  organizations: IntakeOrganization[]
}) {
  const client = useQueryClient()
  const packetBarcodeInput = useRef<HTMLInputElement>(null)
  const tubeBarcodeInput = useRef<HTMLInputElement>(null)
  const [packetBarcode, setPacketBarcode] = useState('')
  const [tubeBarcode, setTubeBarcode] = useState('')
  const [simulationOpen, setSimulationOpen] = useState(false)
  const [createdHandoff, setCreatedHandoff] = useState<RelationshipRequest | null>(null)
  const orders = useQuery({
    queryKey: ['platform-orders', 'lab', 'intake'],
    queryFn: () => listPlatformOrders('lab', { status: 'PlacedAwaitingSamples' }),
    enabled: apiEnabled,
  })
  const handoffs = useQuery({
    queryKey: ['order-intake-handoffs'],
    queryFn: () => listRelationshipRequests(),
    enabled: apiEnabled,
  })
  const packetScan = useMutation({
    mutationFn: scanSampleShippingPacket,
    onMutate: () => {
      setTubeBarcode('')
      tubeScan.reset()
    },
    onSettled: () => {
      setPacketBarcode('')
      window.requestAnimationFrame(() => packetBarcodeInput.current?.focus())
    },
  })
  const tubeScan = useMutation({
    mutationFn: (barcode: string) => scanRegisteredSampleTube(packetScan.data!.barcode, barcode),
    onSettled: () => {
      setTubeBarcode('')
      window.requestAnimationFrame(() => tubeBarcodeInput.current?.focus())
    },
  })
  const simulation = useMutation({
    mutationFn: (values: SimulationValues) => simulateHubSpotHandoff({
      path: values.path,
      organizationId: values.organizationId || null,
      candidateOrganizationName: values.path === 'TrialProject' && !values.organizationId
        ? values.candidateOrganizationName
        : null,
      requestedService: values.path === 'SalesAssistedOrder' ? values.requestedService : null,
      hubSpotDealId: values.hubSpotDealId,
      summary: values.summary,
      internalNotes: values.internalNotes || null,
    }),
    onSuccess: async (handoff) => {
      setCreatedHandoff(handoff)
      setSimulationOpen(false)
      await client.invalidateQueries({ queryKey: ['order-intake-handoffs'] })
    },
  })
  const relevantHandoffs = (handoffs.data ?? []).filter((item) =>
    item.source === 'HubSpot'
    && (item.requestType === 'SalesAssistedOrder' || item.requestType === 'Evaluation')
    && (item.status === 'PendingReview' || item.status === 'Approved'))

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Order intake</CardTitle>
              <CardDescription className="mt-1">
                Scan an incoming shipment packet, review HubSpot-originated work, then receive and accession specimens for authorized laboratory work.
              </CardDescription>
            </div>
            {import.meta.env.DEV && apiEnabled ? (
              <Button type="button" onClick={() => {
                simulation.reset()
                setSimulationOpen(true)
              }}>
                <Plus data-icon="inline-start" />
                Simulate HubSpot handoff
              </Button>
            ) : null}
          </div>
        </CardHeader>
        {createdHandoff ? (
          <CardContent>
            <Alert>
              <AlertTitle>Simulated handoff received</AlertTitle>
              <AlertDescription>
                {createdHandoff.requestNumber} is pending review. Review it here or in Accounts before creating executable work.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>

      <ReturnKitFulfillmentPanel apiEnabled={apiEnabled} />

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ScanLine className="mt-0.5 size-5 text-primary" />
            <div>
              <CardTitle>Scan shipment packet</CardTitle>
              <CardDescription>
                Scan the Phaeno barcode from the printed page enclosed with a trial or promotional shipment. Lookup does not record receipt or accession.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              const value = packetBarcode.trim()
              if (value) packetScan.mutate(value)
            }}
          >
            <div className="w-full max-w-xl">
              <Label htmlFor="shipment-packet-barcode">Shipment-packet barcode</Label>
              <Input
                ref={packetBarcodeInput}
                id="shipment-packet-barcode"
                className="mt-2 font-mono uppercase"
                value={packetBarcode}
                onChange={(event) => setPacketBarcode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="PH-P-XXXXXXXXXX-X"
              />
            </div>
            <Button type="submit" disabled={!packetBarcode.trim() || packetScan.isPending}>
              <ScanLine data-icon="inline-start" />
              {packetScan.isPending ? 'Looking up…' : 'Look up packet'}
            </Button>
          </form>
          {packetScan.error ? (
            <Alert variant="destructive">
              <AlertTitle>Shipment packet was not found</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(packetScan.error, 'Check the complete barcode and scan again.')}
              </AlertDescription>
            </Alert>
          ) : null}
          {packetScan.data ? (
            <div className="rounded-lg border p-4" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{packetScan.data.packetNumber}</span>
                    <Badge variant="outline">Revision {packetScan.data.packetRevision}</Badge>
                    <Badge variant={packetScan.data.isVoided ? 'destructive' : 'secondary'}>
                      {packetScan.data.isVoided ? 'Voided packet' : packetScan.data.shipmentStatus}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm">
                    {packetScan.data.organizationName} · {formatAuthorizationSource(packetScan.data.authorizationSource)} {packetScan.data.authorizationReference}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {packetScan.data.expectedSampleCount} expected {packetScan.data.expectedSampleCount === 1 ? 'sample' : 'samples'} · ship to {packetScan.data.destinationName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatReceiptState(packetScan.data.receiptState, packetScan.data.receivedSampleCount, packetScan.data.expectedSampleCount)} · Lab work {formatCompactStatus(packetScan.data.labWorkStatus)}
                  </p>
                  {packetScan.data.carrier || packetScan.data.trackingNumber ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {packetScan.data.carrier ?? 'Carrier not recorded'} · {packetScan.data.trackingNumber ?? 'Tracking not recorded'}
                      {packetScan.data.shippedAt ? ` · shipped ${formatDateTime(packetScan.data.shippedAt)}` : ''}
                    </p>
                  ) : null}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{packetScan.data.barcode}</p>
                </div>
                {!packetScan.data.isVoided ? (
                  <Button asChild>
                    <Link to="/lab-operations/$workOrderId" params={{ workOrderId: packetScan.data.labWorkOrderId }} search={{ section: undefined }}>
                      Open Lab work
                    </Link>
                  </Button>
                ) : null}
              </div>
              {packetScan.data.isVoided ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Do not use this packet revision</AlertTitle>
                  <AlertDescription>
                    {packetScan.data.voidReason ?? 'This packet was replaced or cancelled.'}
                    {packetScan.data.replacementBarcode ? ` Scan replacement ${packetScan.data.replacementBarcode}.` : ' Escalate the shipment for review.'}
                  </AlertDescription>
                </Alert>
              ) : null}
              {!packetScan.data.isVoided ? (
                <div className="mt-5 border-t pt-5">
                  <h3 className="font-medium">Expected tube crosswalk</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Scan each physical tube and compare it with the frozen Customer sample mapping before recording receipt or accession.</p>
                  <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="px-2 py-2 font-medium">Customer sample ID</th><th className="px-2 py-2 font-medium">Sample</th><th className="px-2 py-2 font-medium">Expected tube</th><th className="px-2 py-2 font-medium">State</th></tr></thead><tbody>{packetScan.data.crosswalk.map((item) => <tr key={item.shipmentItemId} className="border-b last:border-0"><td className="px-2 py-2 font-medium">{item.customerSampleId}</td><td className="px-2 py-2">{item.sampleName}</td><td className="px-2 py-2 font-mono">{item.supplierTubeBarcode ?? 'Missing assignment'}</td><td className="px-2 py-2">{formatCompactStatus(item.tubeStatus)}</td></tr>)}</tbody></table></div>
                  <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); const value = tubeBarcode.trim(); if (value) tubeScan.mutate(value) }}><div className="w-full max-w-xl"><Label htmlFor="registered-tube-barcode">Supplier tube barcode</Label><Input ref={tubeBarcodeInput} id="registered-tube-barcode" className="mt-2 font-mono uppercase" value={tubeBarcode} onChange={(event) => setTubeBarcode(event.target.value)} autoComplete="off" spellCheck={false} /></div><Button type="submit" disabled={!tubeBarcode.trim() || tubeScan.isPending}><ScanLine data-icon="inline-start" />{tubeScan.isPending ? 'Comparing…' : 'Compare tube'}</Button></form>
                  {tubeScan.error ? <Alert variant="destructive" className="mt-3"><AlertTitle>Tube could not be checked</AlertTitle><AlertDescription>{getOrderErrorMessage(tubeScan.error, 'Check the complete barcode and scan again.')}</AlertDescription></Alert> : null}
                  {tubeScan.data ? <Alert variant={tubeScan.data.isExpected ? 'default' : 'destructive'} className="mt-3"><AlertTitle>{tubeScan.data.isExpected ? (tubeScan.data.isAccessioned ? 'Tube was already accessioned' : 'Tube matches this packet') : 'Stop: tube does not match this packet'}</AlertTitle><AlertDescription>{tubeScan.data.isExpected ? `${tubeScan.data.supplierTubeBarcode} maps to Customer sample ${tubeScan.data.customerSampleId}. This comparison did not record receipt or accession.` : tubeScanOutcome(tubeScan.data.outcome)}</AlertDescription></Alert> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>HubSpot handoffs awaiting review</CardTitle>
          <CardDescription>
            Closed Won bespoke work and requested Trial Projects require Phaeno review. A handoff is not yet an executable order or Trial Project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {handoffs.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>HubSpot handoffs could not be loaded</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(handoffs.error, 'Refresh the intake queue and try again.')}
              </AlertDescription>
            </Alert>
          ) : null}
          {handoffs.isLoading ? <p role="status">Loading HubSpot handoffs…</p> : null}
          <div className="divide-y">
            {relevantHandoffs.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.requestNumber}</span>
                    <Badge variant={item.requestType === 'Evaluation' ? 'secondary' : 'outline'}>
                      {item.requestType === 'Evaluation' ? 'Trial Project · No charge' : 'Sales-assisted'}
                    </Badge>
                    <Badge variant="outline">
                      {item.status === 'PendingReview' ? 'Pending review' : 'Approved'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm">{item.candidateOrganizationName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSourceReference(item.sourceReference)} · received {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/customers">Review in Accounts</Link>
                </Button>
              </div>
            ))}
          </div>
          {!handoffs.isLoading && !relevantHandoffs.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No HubSpot order or Trial Project handoffs are awaiting review.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorized work awaiting specimens</CardTitle>
          <CardDescription>
            Open a linked laboratory work order to record receipt, condition, accession, and disposition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Authorized intake could not be loaded</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(orders.error, 'Refresh the intake queue and try again.')}
              </AlertDescription>
            </Alert>
          ) : null}
          {orders.isLoading ? <p role="status">Loading authorized work…</p> : null}
          <div className="divide-y">
            {orders.data?.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/order-operations/$workflow/$orderId"
                      params={{ workflow: 'lab', orderId: item.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.number}
                    </Link>
                    <Badge variant="outline">Authorized order</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {organizations.find((organization) => organization.id === item.organizationId)?.name ?? item.organizationId}
                    {' · '}
                    {item.reference ?? 'Unnamed job'}
                    {' · '}
                    updated {formatDateTime(item.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={item.status} />
                  <Button asChild>
                    <Link
                      to="/order-operations/intake/$orderId"
                      params={{ orderId: item.id }}
                    >
                      Open intake
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {!orders.isLoading && !orders.data?.items.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No authorized laboratory work is awaiting specimens.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <HubSpotSimulationDialog
        error={simulation.error}
        isPending={simulation.isPending}
        onOpenChange={(open) => {
          setSimulationOpen(open)
          if (!open) simulation.reset()
        }}
        onSubmit={(values) => simulation.mutate(values)}
        open={simulationOpen}
        organizations={organizations}
      />
    </div>
  )
}

function HubSpotSimulationDialog({
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
  organizations,
}: {
  error: Error | null
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SimulationValues) => void
  open: boolean
  organizations: IntakeOrganization[]
}) {
  const form = useForm<SimulationValues>({
    resolver: zodResolver(simulationSchema),
    defaultValues: simulationDefaults,
    mode: 'onBlur',
  })
  const path = form.watch('path')
  const organizationId = form.watch('organizationId')
  const selectedOrganization = organizations.find((item) => item.id === organizationId)
  const eligibleOrganizations = organizations.filter((item) =>
    path === 'TrialProject'
      ? item.kind === 'Prospect'
      : item.kind === 'Customer' || item.kind === 'Partner')

  useEffect(() => {
    if (open) form.reset(simulationDefaults)
  }, [form, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Simulate HubSpot handoff</DialogTitle>
          <DialogDescription>
            Development only. Create the same pending Portal request that an inbound HubSpot event will eventually produce.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Handoff was not created</AlertTitle>
            <AlertDescription>
              {getOrderErrorMessage(error, 'Review the simulation details and try again.')}
            </AlertDescription>
          </Alert>
        ) : null}
        <form id="hubspot-handoff-simulation" className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset>
            <legend className="text-sm font-medium">Handoff path <Required /></legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <PathOption
                checked={path === 'SalesAssistedOrder'}
                description="Closed Won bespoke or exceptional paid work."
                label="Sales-assisted order"
                onChange={() => {
                  form.setValue('path', 'SalesAssistedOrder')
                  form.setValue('organizationId', '')
                  form.setValue('candidateOrganizationName', '')
                }}
                value="SalesAssistedOrder"
              />
              <PathOption
                checked={path === 'TrialProject'}
                description="No-charge Prospect evaluation requiring commercial and scientific approval."
                label="Trial Project"
                onChange={() => {
                  form.setValue('path', 'TrialProject')
                  form.setValue('organizationId', '')
                  form.setValue('candidateOrganizationName', '')
                }}
                value="TrialProject"
              />
            </div>
          </fieldset>

          <div>
            <Label htmlFor="simulation-organization">
              {path === 'TrialProject' ? 'Prospect' : 'Customer or Partner'}
              {path === 'SalesAssistedOrder' ? <> <Required /></> : null}
            </Label>
            <select
              id="simulation-organization"
              className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={organizationId}
              onChange={(event) => {
                form.setValue('organizationId', event.target.value, { shouldValidate: true })
                const organization = organizations.find((item) => item.id === event.target.value)
                if (organization?.kind === 'Customer') form.setValue('requestedService', 'PSeqLabService')
              }}
            >
              <option value="">
                {path === 'TrialProject' ? 'Create a new Prospect candidate…' : 'Select an organization…'}
              </option>
              {eligibleOrganizations.map((item) => (
                <option key={item.id} value={item.id}>{item.name} · {item.kind}</option>
              ))}
            </select>
            <FieldError message={form.formState.errors.organizationId?.message} />
          </div>

          {path === 'TrialProject' && !organizationId ? (
            <Field label="New Prospect candidate" id="simulation-candidate" required error={form.formState.errors.candidateOrganizationName?.message}>
              <Input id="simulation-candidate" {...form.register('candidateOrganizationName')} />
            </Field>
          ) : null}

          {path === 'SalesAssistedOrder' ? (
            <div>
              <Label htmlFor="simulation-service">Service <Required /></Label>
              <select id="simulation-service" className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('requestedService')}>
                <option value="PSeqLabService">PSeq Lab Service</option>
                {selectedOrganization?.kind === 'Partner' ? <option value="PSeqKit">PSeq Kit</option> : null}
              </select>
            </div>
          ) : null}

          <Field label="HubSpot Deal ID" id="simulation-deal" required error={form.formState.errors.hubSpotDealId?.message}>
            <Input id="simulation-deal" {...form.register('hubSpotDealId')} placeholder="e.g. 335881126620" />
          </Field>
          <Field label="Requested outcome" id="simulation-summary" required error={form.formState.errors.summary?.message}>
            <textarea id="simulation-summary" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" {...form.register('summary')} />
          </Field>
          <Field label="Internal simulation notes" id="simulation-notes" error={form.formState.errors.internalNotes?.message}>
            <textarea id="simulation-notes" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" {...form.register('internalNotes')} />
          </Field>
        </form>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="submit" form="hubspot-handoff-simulation" disabled={isPending}>
            {isPending ? 'Creating handoff…' : 'Create simulated handoff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PathOption({
  checked,
  description,
  label,
  onChange,
  value,
}: {
  checked: boolean
  description: string
  label: string
  onChange: () => void
  value: SimulationValues['path']
}) {
  const id = `simulation-path-${value}`
  return (
    <label aria-label={label} htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/20">
      <input id={id} type="radio" name="simulation-path" value={value} checked={checked} onChange={onChange} className="mt-1 size-4 accent-primary" />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function Field({
  children,
  error,
  id,
  label,
  required,
}: {
  children: React.ReactNode
  error?: string
  id: string
  label: string
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}{required ? <> <Required /></> : null}</Label>
      <div className="mt-2">{children}</div>
      <FieldError message={error} />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-destructive" role="alert">{message}</p> : null
}

function Required() {
  return <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span>
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function formatSourceReference(value: string | null) {
  return value?.startsWith('hubspot-deal:')
    ? `HubSpot Deal ${value.slice('hubspot-deal:'.length)}`
    : value ?? 'No HubSpot Deal reference'
}

function formatAuthorizationSource(value: 'ProspectTrialProject' | 'CustomerPromotionalOrder') {
  return value === 'ProspectTrialProject' ? 'Trial Project' : 'Customer promotional order'
}

function tubeScanOutcome(value: string) {
  if (value === 'TubeNotRegistered') return 'The barcode is not registered in POMS. Hold the tube and reconcile the physical kit.'
  if (value === 'TubeNotExpectedForPacket') return 'The tube is registered, but it is not on this packet crosswalk. Hold the package and investigate.'
  if (value === 'PacketVoided') return 'The packet was voided. Scan the replacement packet before continuing.'
  return 'The tube cannot be accepted for this packet.'
}

function formatReceiptState(
  state: 'AwaitingReceipt' | 'PartiallyReceived' | 'ReceiptRecorded' | 'Cancelled' | 'SubmissionMismatch',
  received: number,
  expected: number,
) {
  if (state === 'AwaitingReceipt') return 'Awaiting receipt'
  if (state === 'PartiallyReceived') return `${received} of ${expected} samples received`
  if (state === 'ReceiptRecorded') return `Receipt recorded for ${received} ${received === 1 ? 'sample' : 'samples'}`
  if (state === 'Cancelled') return 'Expected specimens cancelled'
  return 'Manifest needs review'
}

function formatCompactStatus(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}
