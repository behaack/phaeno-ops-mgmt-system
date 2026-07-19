import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BookOpenCheck, ClipboardList, FlaskConical, Layers3, Microscope, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import {
  createLabBatch,
  createLabProtocol,
  createLabSendout,
  getLabOperationsDashboard,
  getLabOperationsError,
  recordLabMaterialQc,
  recordLabCustody,
  setLabRole,
  transitionLabBatch,
  transitionLabProtocolVersion,
  transitionLabSendout,
  type LabBatch,
  type LabMaterialLot,
  type LabProtocol,
} from '#/api/lab-operations'
import { listOrganizationUsers } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

import { LabBarcodeLookup, LabBatchBarcodeScanner } from './LabBarcodeScanner'
import { EquipmentCreateDialog } from './EquipmentCreateDialog'
import { MaterialLotCreateDialog } from './MaterialLotCreateDialog'

type CreateKind = 'protocol' | 'material' | 'equipment' | 'batch' | 'role' | null
type SimpleCreateKind = Exclude<CreateKind, 'material' | 'equipment'>
export type LabSection = 'work' | 'protocols' | 'materials' | 'equipment' | 'batches' | 'access'

const labSections: ReadonlyArray<WorkspaceSidebarItem<LabSection>> = [
  { value: 'work', label: 'Work', description: 'Authorized work and specimen progress', icon: ClipboardList },
  { value: 'protocols', label: 'Protocols', description: 'Controlled methods and approved versions', icon: BookOpenCheck },
  { value: 'materials', label: 'Materials', description: 'Lots, prepared reagents, and QC', icon: FlaskConical },
  { value: 'equipment', label: 'Equipment', description: 'Assets, availability, and calibration', icon: Microscope },
  { value: 'batches', label: 'Batches', description: 'Operational and sequencing batches', icon: Layers3 },
  { value: 'access', label: 'Access', description: 'Laboratory roles and permissions', icon: ShieldCheck },
]

export function LabOperationsPage({ section, onSectionChange }: { section: LabSection; onSectionChange: (section: LabSection) => void }) {
  const { authProvider, session, selectedOrganizationId } = usePhaenoSession()
  const canView = Boolean(session?.capabilities.canManageLabOperations)
  const apiEnabled = canView && authProvider !== 'mock'
  const queryClient = useQueryClient()
  const [createKind, setCreateKind] = useState<CreateKind>(null)
  const dashboard = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: apiEnabled })
  const users = useQuery({
    queryKey: ['lab-operations', 'users', selectedOrganizationId],
    queryFn: () => listOrganizationUsers(selectedOrganizationId!),
    enabled: apiEnabled && Boolean(selectedOrganizationId) && Boolean(session?.capabilities.canManageLabAccess),
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lab-operations'] })

  if (!canView) return <AccessDenied />

  return (
    <main className="py-8">
      <WorkspaceSidebar
        workspaceLabel="Lab operations"
        items={labSections}
        value={section}
        onValueChange={onSectionChange}
      >
        <div className="page-wrap px-4">
          <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold">Lab operations</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Internal accession, protocol execution, materials, equipment, cross-order batching,
                outsourced sequencing, exceptions, and scientific release readiness.
              </p>
            </div>
            <Button type="button" variant="outline" disabled={!apiEnabled || dashboard.isFetching} onClick={() => refresh()}>
              <RefreshCw data-icon="inline-start" /> Refresh
            </Button>
          </section>
          {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Connected Lab operations are paused</AlertTitle><AlertDescription>Use a real Phaeno session to load or change laboratory records.</AlertDescription></Alert> : null}
          {dashboard.error ? <Alert className="mb-5" variant="destructive"><AlertTitle>Lab operations could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(dashboard.error, 'Try refreshing the workspace.')}</AlertDescription></Alert> : null}
          {dashboard.isLoading ? <p role="status">Loading laboratory workspace…</p> : null}
          {dashboard.data && section === 'work' ? <div className="space-y-5"><LabBarcodeLookup /><WorkQueue items={dashboard.data.workOrders} /></div> : null}
          {dashboard.data && section === 'protocols' ? <ProtocolList protocols={dashboard.data.protocols} canManage={Boolean(session?.capabilities.canManageLabProtocols)} onCreate={() => setCreateKind('protocol')} refresh={refresh} /> : null}
          {dashboard.data && section === 'materials' ? <MaterialList items={dashboard.data.materialLots} canManage={Boolean(session?.capabilities.canOperateLabWork)} canApprove={Boolean(session?.capabilities.canSuperviseLabWork)} onCreate={() => setCreateKind('material')} refresh={refresh} /> : null}
          {dashboard.data && section === 'equipment' ? <EquipmentList items={dashboard.data.equipment} canManage={Boolean(session?.capabilities.canSuperviseLabWork)} onCreate={() => setCreateKind('equipment')} /> : null}
          {dashboard.data && section === 'batches' ? <BatchList items={dashboard.data.batches} canManage={Boolean(session?.capabilities.canOperateLabWork)} onCreate={() => setCreateKind('batch')} refresh={refresh} /> : null}
          {dashboard.data && section === 'access' ? <AccessList assignments={dashboard.data.roleAssignments} canManage={Boolean(session?.capabilities.canManageLabAccess)} onCreate={() => setCreateKind('role')} refresh={refresh} /> : null}
          {dashboard.data ? (
            <MaterialLotCreateDialog
              open={createKind === 'material'}
              definitions={dashboard.data.materialDefinitions}
              suppliers={dashboard.data.suppliers}
              storageLocations={dashboard.data.storageLocations}
              materialLots={dashboard.data.materialLots}
              onOpenChange={(open) => {
                if (!open) setCreateKind(null)
              }}
              onSaved={async () => {
                setCreateKind(null)
                await refresh()
              }}
            />
          ) : null}
          {dashboard.data ? (
            <EquipmentCreateDialog
              open={createKind === 'equipment'}
              equipment={dashboard.data.equipment}
              protocols={dashboard.data.protocols}
              storageLocations={dashboard.data.storageLocations}
              onOpenChange={(open) => {
                if (!open) setCreateKind(null)
              }}
              onSaved={async () => {
                setCreateKind(null)
                await refresh()
              }}
            />
          ) : null}
          <CreateRecordDialog
            kind={createKind === 'material' || createKind === 'equipment' ? null : createKind}
            users={users.data ?? []}
            onClose={() => setCreateKind(null)}
            onSaved={async () => {
              setCreateKind(null)
              await refresh()
            }}
          />
        </div>
      </WorkspaceSidebar>
    </main>
  )
}

function WorkQueue({ items }: { items: Awaited<ReturnType<typeof getLabOperationsDashboard>>['workOrders'] }) {
  return <Card><CardHeader><CardTitle>Authorized laboratory work</CardTitle><CardDescription>Open a work order for accession, lineage, execution, exceptions, and scientific review.</CardDescription></CardHeader><CardContent><div className="divide-y">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.id }} search={{ section: undefined }} className="font-medium text-primary hover:underline">{item.commercialOrderNumber ?? item.id}</Link><p className="mt-1 text-xs text-muted-foreground">{item.specimenCount} specimen(s) · {item.openExceptionCount} open exception(s) · updated {formatDate(item.updatedAt)}</p></div><Status value={item.status} /></div>)}</div>{items.length === 0 ? <Empty>No accepted Commercial order has authorized Lab work yet.</Empty> : null}</CardContent></Card>
}

function ProtocolList({ protocols, canManage, onCreate, refresh }: { protocols: LabProtocol[]; canManage: boolean; onCreate: () => void; refresh: () => Promise<unknown> }) {
  const [confirmation, setConfirmation] = useState<{
    protocol: LabProtocol
    version: LabProtocol['versions'][number]
    action: 'discard' | 'withdraw'
  } | null>(null)
  const transition = useMutation({
    mutationFn: ({
      protocol,
      versionId,
      action,
    }: {
      protocol: LabProtocol
      versionId: string
      action: string
    }) => transitionLabProtocolVersion(versionId, {
      action,
      protocolVersion: protocol.version,
    }),
    onSuccess: async () => {
      setConfirmation(null)
      await refresh()
    },
  })
  const applyTransition = (
    protocol: LabProtocol,
    versionId: string,
    action: string,
  ) => {
    transition.reset()
    transition.mutate({ protocol, versionId, action })
  }
  const requestConfirmation = (
    protocol: LabProtocol,
    version: LabProtocol['versions'][number],
    action: 'discard' | 'withdraw',
  ) => {
    transition.reset()
    setConfirmation({ protocol, version, action })
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Controlled protocols</CardTitle>
              <CardDescription>
                Execution pins an approved, active version. Each protocol may have only one open draft or approved candidate.
              </CardDescription>
            </div>
            {canManage ? (
              <Button type="button" onClick={onCreate}>
                <Plus data-icon="inline-start" /> New protocol
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {transition.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Protocol status was not changed</AlertTitle>
              <AlertDescription>
                {getLabOperationsError(transition.error, 'Refresh the protocol and try again.')}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-4">
            {protocols.map((protocol) => {
              const openCandidate = protocol.versions.find(
                (version) => version.status === 'Draft' || version.status === 'Approved',
              )
              return (
                <section key={protocol.id} className="rounded-lg border bg-background p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{protocol.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {protocol.key} · latest v{protocol.latestVersion || 'none'}
                      </p>
                    </div>
                    {canManage && !openCandidate ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/lab-operations/protocols/$protocolId/versions/new"
                          params={{ protocolId: protocol.id }}
                          search={{ section: undefined }}
                        >
                          Add version
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {protocol.versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex flex-wrap items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                      >
                        <span>v{version.protocolVersion}</span>
                        <Status value={version.status} />
                        {canManage && version.status === 'Draft' ? (
                          <>
                            <Button asChild size="sm">
                              <Link
                                to="/lab-operations/protocols/$protocolId/versions/$versionId/edit"
                                params={{ protocolId: protocol.id, versionId: version.id }}
                                search={{ section: undefined }}
                              >
                                Continue editing
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={transition.isPending}
                              onClick={() => applyTransition(protocol, version.id, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={transition.isPending}
                              onClick={() => requestConfirmation(protocol, version, 'discard')}
                            >
                              Discard
                            </Button>
                          </>
                        ) : null}
                        {canManage && version.status === 'Approved' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={transition.isPending}
                              onClick={() => applyTransition(protocol, version.id, 'activate')}
                            >
                              Activate
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={transition.isPending}
                              onClick={() => requestConfirmation(protocol, version, 'withdraw')}
                            >
                              Withdraw approval
                            </Button>
                          </>
                        ) : null}
                        {canManage && version.status === 'Active' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={transition.isPending}
                            onClick={() => applyTransition(protocol, version.id, 'retire')}
                          >
                            Retire
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
          {protocols.length === 0 ? <Empty>No protocols have been authored.</Empty> : null}
        </CardContent>
      </Card>

      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (open) return
          setConfirmation(null)
          transition.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmation?.action === 'discard' ? 'Discard protocol draft?' : 'Withdraw protocol approval?'}
            </DialogTitle>
            <DialogDescription>
              {confirmation?.action === 'discard'
                ? `Version ${confirmation.version.protocolVersion} will remain in history as discarded and cannot be approved or activated.`
                : `Version ${confirmation?.version.protocolVersion} will return to Draft. Its recorded approval will be cleared, and it must be approved again before activation.`}
            </DialogDescription>
          </DialogHeader>
          {transition.error ? (
            <Alert variant="destructive">
              <AlertTitle>Protocol status was not changed</AlertTitle>
              <AlertDescription>
                {getLabOperationsError(transition.error, 'Refresh the protocol and try again.')}
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant={confirmation?.action === 'discard' ? 'destructive' : 'default'}
              disabled={!confirmation || transition.isPending}
              onClick={() => {
                if (!confirmation) return
                applyTransition(
                  confirmation.protocol,
                  confirmation.version.id,
                  confirmation.action,
                )
              }}
            >
              {transition.isPending
                ? 'Saving…'
                : confirmation?.action === 'discard' ? 'Discard draft' : 'Withdraw approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MaterialList({ items, canManage, canApprove, onCreate, refresh }: { items: Awaited<ReturnType<typeof getLabOperationsDashboard>>['materialLots']; canManage: boolean; canApprove: boolean; onCreate: () => void; refresh: () => Promise<unknown> }) {
  const [qcLot, setQcLot] = useState<LabMaterialLot | null>(null)
  const [qcOutcome, setQcOutcome] = useState<'Passed' | 'Failed' | ''>('')
  const [qcPerformedOn, setQcPerformedOn] = useState(todayDateOnly())
  const [qcFailureReason, setQcFailureReason] = useState('')
  const [qcAttempted, setQcAttempted] = useState(false)
  const qc = useMutation({
    mutationFn: ({ lot, outcome }: { lot: LabMaterialLot; outcome: 'Passed' | 'Failed' }) =>
      recordLabMaterialQc(lot.id, {
        version: lot.version,
        disposition: outcome,
        performedOn: qcPerformedOn,
        failureReason: outcome === 'Failed' ? qcFailureReason.trim() : null,
        resultsJson: '{}',
      }),
    onSuccess: async (_result, variables) => {
      setQcLot(null)
      setQcOutcome('')
      setQcPerformedOn(todayDateOnly())
      setQcFailureReason('')
      setQcAttempted(false)
      await refresh()
      requestAnimationFrame(() => document.getElementById(`material-lot-${variables.lot.id}`)?.focus())
    },
  })
  const openQcDialog = (lot: LabMaterialLot) => {
    qc.reset()
    setQcOutcome('')
    setQcPerformedOn(todayDateOnly())
    setQcFailureReason('')
    setQcAttempted(false)
    setQcLot(lot)
  }
  const closeQcDialog = () => {
    if (qc.isPending) return
    const lotId = qcLot?.id
    qc.reset()
    setQcLot(null)
    setQcOutcome('')
    setQcPerformedOn(todayDateOnly())
    setQcFailureReason('')
    setQcAttempted(false)
    if (lotId) {
      requestAnimationFrame(() => document.getElementById(`material-qc-action-${lotId}`)?.focus())
    }
  }
  const submitQc = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!qcLot) return
    if (!qcOutcome || !qcPerformedOn || (qcOutcome === 'Failed' && !qcFailureReason.trim())) {
      setQcAttempted(true)
      return
    }
    qc.mutate({ lot: qcLot, outcome: qcOutcome })
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Material and prepared-reagent lots</CardTitle>
              <CardDescription>
                Controlled identity, QC, expiration or retest date, storage, and available quantity gate execution use.
              </CardDescription>
            </div>
            {canManage ? (
              <Button type="button" onClick={onCreate}>
                <Plus data-icon="inline-start" /> New lot
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                id={`material-lot-${item.id}`}
                tabIndex={-1}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-xs focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div>
                  <p className="font-medium">{item.name} · {item.lotNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.materialKey} · {item.availableQuantity} {item.quantityUnit} · {item.storageLocation}
                    {item.supplier ? ` · ${item.supplier}` : ''}
                    {item.expirationOrRetestDate ? ` · expiration/retest ${formatDateOnly(item.expirationOrRetestDate)}` : ''}
                    {item.qcPerformedOn ? ` · QC ${formatDateOnly(item.qcPerformedOn)}` : ''}
                  </p>
                  {item.qcDisposition === 'Failed' && item.qcFailureReason ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      QC failure reason: {item.qcFailureReason}
                    </p>
                  ) : null}
                  {item.components.length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prepared from {item.components.map((component) => `${component.materialName} ${component.lotNumber}`).join(', ')}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Status value={item.qcDisposition} prefix="QC" />
                  {canApprove && item.qcDisposition === 'Pending' ? (
                    <Button
                      id={`material-qc-action-${item.id}`}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openQcDialog(item)}
                    >
                      Record QC
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {items.length === 0 ? <Empty>No material lots have been created.</Empty> : null}
        </CardContent>
      </Card>

      <Dialog
        open={qcLot !== null}
        onOpenChange={(open) => {
          if (!open) closeQcDialog()
        }}
      >
        <DialogContent className="max-w-lg">
          <form noValidate onSubmit={submitQc}>
            <DialogHeader>
              <DialogTitle>Record material QC</DialogTitle>
              <DialogDescription>
                {qcLot
                  ? `Record the QC outcome for ${qcLot.name}, lot ${qcLot.lotNumber}.`
                  : 'Record the QC outcome for this material lot.'}
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="material-qc-date">
                  QC date <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="material-qc-date"
                  type="date"
                  max={todayDateOnly()}
                  value={qcPerformedOn}
                  aria-invalid={qcAttempted && !qcPerformedOn}
                  onChange={(event) => setQcPerformedOn(event.target.value)}
                />
                {qcAttempted && !qcPerformedOn ? (
                  <p className="text-sm text-destructive" role="alert">Enter the QC date.</p>
                ) : null}
              </div>

              <fieldset className="grid gap-3" aria-invalid={qcAttempted && !qcOutcome}>
                <legend className="mb-1 text-sm font-medium">
                  QC outcome <span className="text-destructive" aria-hidden="true">*</span>
                </legend>
                <Label htmlFor="material-qc-passed" className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors ${
                  qcOutcome === 'Passed' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/40'
                }`}>
                  <input
                    id="material-qc-passed"
                    type="radio"
                    name="material-qc-outcome"
                    value="Passed"
                    checked={qcOutcome === 'Passed'}
                    className="mt-0.5 size-4 accent-primary"
                    onChange={() => {
                      setQcOutcome('Passed')
                      setQcFailureReason('')
                    }}
                  />
                  <span>
                    <span className="block font-medium">Pass QC</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      The lot may be used in controlled work when its other eligibility rules are met.
                    </span>
                  </span>
                </Label>
                <Label htmlFor="material-qc-failed" className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors ${
                  qcOutcome === 'Failed' ? 'border-destructive bg-destructive/5 ring-1 ring-destructive' : 'hover:bg-muted/40'
                }`}>
                  <input
                    id="material-qc-failed"
                    type="radio"
                    name="material-qc-outcome"
                    value="Failed"
                    checked={qcOutcome === 'Failed'}
                    className="mt-0.5 size-4 accent-destructive"
                    onChange={() => setQcOutcome('Failed')}
                  />
                  <span>
                    <span className="block font-medium">Fail QC</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      The lot remains blocked from controlled work.
                    </span>
                  </span>
                </Label>
                {qcAttempted && !qcOutcome ? (
                  <p className="text-sm text-destructive" role="alert">Choose Pass QC or Fail QC.</p>
                ) : null}
              </fieldset>

              {qcOutcome === 'Failed' ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="material-qc-failure-reason">
                    Failure reason <span className="text-destructive" aria-hidden="true">*</span>
                  </Label>
                  <textarea
                    id="material-qc-failure-reason"
                    value={qcFailureReason}
                    maxLength={1000}
                    rows={3}
                    aria-invalid={qcAttempted && !qcFailureReason.trim()}
                    className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    onChange={(event) => setQcFailureReason(event.target.value)}
                  />
                  {qcAttempted && !qcFailureReason.trim() ? (
                    <p className="text-sm text-destructive" role="alert">Enter why the lot failed QC.</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {qc.error ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>QC outcome was not recorded</AlertTitle>
                <AlertDescription>
                  {getLabOperationsError(qc.error, 'Refresh the material lot and try again.')}
                </AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" disabled={qc.isPending} onClick={closeQcDialog}>Cancel</Button>
              <Button type="submit" disabled={qc.isPending}>
                {qc.isPending ? 'Recording…' : 'Record QC outcome'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function EquipmentList({ items, canManage, onCreate }: { items: Awaited<ReturnType<typeof getLabOperationsDashboard>>['equipment']; canManage: boolean; onCreate: () => void }) {
  return <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Equipment</CardTitle><CardDescription>Lightweight asset availability and calibration visibility for execution traceability.</CardDescription></div>{canManage ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> New equipment</Button> : null}</div></CardHeader><CardContent><div className="divide-y">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.assetCode} · {item.name}</p><p className="text-xs text-muted-foreground">{item.equipmentType} · {item.location}{item.calibrationDueOn ? ` · calibration due ${formatDateOnly(item.calibrationDueOn)}` : ''}</p></div><Status value={item.status} /></div>)}</div></CardContent></Card>
}

function BatchList({ items, canManage, onCreate, refresh }: { items: Awaited<ReturnType<typeof getLabOperationsDashboard>>['batches']; canManage: boolean; onCreate: () => void; refresh: () => Promise<unknown> }) {
  const [dialog, setDialog] = useState<{ batch: LabBatch; kind: 'sendout' | 'custody' } | null>(null)
  const [transitionDialog, setTransitionDialog] = useState<{ batch: LabBatch; action: 'start' | 'complete' } | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState('All')
  const [transitionAt, setTransitionAt] = useState('')
  const transition = useMutation({ mutationFn: ({ id, version, action, occurredAtUtc }: { id: string; version: number; action: 'start' | 'complete'; occurredAtUtc: string }) => transitionLabBatch(id, { version, action, occurredAtUtc }), onSuccess: async () => { setTransitionDialog(null); setTransitionAt(''); await refresh() } })
  const sendoutTransition = useMutation({ mutationFn: ({ item, status }: { item: LabBatch; status: string }) => transitionLabSendout(item.sendoutId!, { status, version: item.sendoutVersion }), onSuccess: refresh })
  const save = useMutation({ mutationFn: async () => {
    if (!dialog) throw new Error('Choose a batch action.')
    if (dialog.kind === 'sendout') return createLabSendout(dialog.batch.id, { providerName: form.providerName, providerReference: form.providerReference || null, manifestJson: form.manifestJson || '{}', expectedCompletionAtUtc: form.expectedCompletionAtUtc ? new Date(form.expectedCompletionAtUtc).toISOString() : null })
    return recordLabCustody(dialog.batch.sendoutId!, { labContainerId: null, eventCode: form.eventCode, locationOrParty: form.locationOrParty, detailsJson: form.detailsJson || '{}' })
  }, onSuccess: async () => { setDialog(null); setForm({}); await refresh() } })
  const nextStatus = (status: string | null) => status === 'Preparing' ? 'Shipped' : status === 'Shipped' ? 'ReceivedByProvider' : status === 'ReceivedByProvider' ? 'Sequencing' : status === 'Sequencing' ? 'Complete' : null
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const filteredItems = statusFilter === 'All' ? items : items.filter((item) => item.status === statusFilter)
  const openTransition = (batch: LabBatch, action: 'start' | 'complete') => { transition.reset(); setTransitionDialog({ batch, action }); setTransitionAt(nowDateTimeLocal()) }
  const saveTransition = () => {
    if (!transitionDialog || !transitionAt) return
    const occurredAtUtc = new Date(transitionAt)
    if (Number.isNaN(occurredAtUtc.getTime())) return
    transition.mutate({ id: transitionDialog.batch.id, version: transitionDialog.batch.version, action: transitionDialog.action, occurredAtUtc: occurredAtUtc.toISOString() })
  }

  return (
    <>
      <div className="space-y-5">
        {canManage ? <LabBatchBarcodeScanner batches={items} onAdded={refresh} /> : null}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Operational and sequencing batches</CardTitle>
                <CardDescription>Libraries may cross Commercial orders while retaining work-order and specimen lineage.</CardDescription>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label htmlFor="batch-status-filter">Status</Label>
                  <select
                    id="batch-status-filter"
                    className="mt-2 h-9 min-w-44 rounded-lg border border-input bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="All">All statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="InProgress">In progress</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
                {canManage ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> New batch</Button> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No batches match this status.</p>
            ) : (
              <div className="divide-y">
                {filteredItems.map((item) => {
                  const next = nextStatus(item.sendoutStatus)
                  return (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.batchNumber} · {humanize(item.batchType)} · {item.memberCount} libraries
                          {item.startedAtUtc ? ` · started ${formatDate(item.startedAtUtc)}` : ''}
                          {item.completedAtUtc ? ` · completed ${formatDate(item.completedAtUtc)}` : ''}
                          {item.sendoutStatus ? ` · sendout ${humanize(item.sendoutStatus)}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Status value={item.status} />
                        {canManage && item.status === 'Draft' ? <Button type="button" size="sm" disabled={transition.isPending} onClick={() => openTransition(item, 'start')}>Start</Button> : null}
                        {canManage && item.status === 'InProgress' && !item.sendoutId && item.memberCount > 0 ? <Button type="button" size="sm" onClick={() => setDialog({ batch: item, kind: 'sendout' })}>Create sendout</Button> : null}
                        {canManage && item.sendoutId ? <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ batch: item, kind: 'custody' })}>Custody event</Button> : null}
                        {canManage && item.sendoutId && next ? <Button type="button" size="sm" disabled={sendoutTransition.isPending} onClick={() => sendoutTransition.mutate({ item, status: next })}>Mark {humanize(next)}</Button> : null}
                        {canManage && item.status === 'InProgress' && (!item.sendoutId || item.sendoutStatus === 'Complete') ? <Button type="button" size="sm" disabled={transition.isPending} onClick={() => openTransition(item, 'complete')}>Complete batch</Button> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={transitionDialog !== null} onOpenChange={(open) => !open && setTransitionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{transitionDialog?.action === 'start' ? 'Start batch' : 'Complete batch'}</DialogTitle>
            <DialogDescription>Record when the laboratory work actually {transitionDialog?.action === 'start' ? 'started' : 'completed'}. The time is prefilled with now and saved as UTC.</DialogDescription>
          </DialogHeader>
          <div className="my-5 grid gap-4">
            <div>
              <Label htmlFor="batch-transition-at">{transitionDialog?.action === 'start' ? 'Started at' : 'Completed at'} <span aria-hidden="true">*</span></Label>
              <Input id="batch-transition-at" className="mt-2" type="datetime-local" value={transitionAt} onChange={(event) => setTransitionAt(event.target.value)} required />
            </div>
          </div>
          {transition.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Batch transition failed</AlertTitle><AlertDescription>{getLabOperationsError(transition.error, 'Check the entered time and try again.')}</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" disabled={transition.isPending || !transitionAt} onClick={saveTransition}>{transitionDialog?.action === 'start' ? 'Start batch' : 'Complete batch'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.kind === 'sendout' ? 'Create sequencing sendout' : 'Record custody event'}</DialogTitle>
            <DialogDescription>Provider-neutral metadata and custody evidence only; no sequencing files or pipeline orchestration are created.</DialogDescription>
          </DialogHeader>
          <div className="my-5 grid gap-4">
            {dialog?.kind === 'sendout' ? (
              <>
                <Field label="Provider name" value={form.providerName} onChange={set('providerName')} required />
                <Field label="Provider reference" value={form.providerReference} onChange={set('providerReference')} />
                <Field label="Expected completion" type="datetime-local" value={form.expectedCompletionAtUtc} onChange={set('expectedCompletionAtUtc')} />
                <TextField label="Manifest JSON" value={form.manifestJson || '{}'} onChange={set('manifestJson')} />
              </>
            ) : (
              <>
                <Field label="Event code" value={form.eventCode} onChange={set('eventCode')} required />
                <Field label="Location or party" value={form.locationOrParty} onChange={set('locationOrParty')} required />
                <TextField label="Details JSON" value={form.detailsJson || '{}'} onChange={set('detailsJson')} />
              </>
            )}
          </div>
          {save.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Batch action failed</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Check the entered values.')}</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
function AccessList({ assignments, canManage, onCreate, refresh }: { assignments: Awaited<ReturnType<typeof getLabOperationsDashboard>>['roleAssignments']; canManage: boolean; onCreate: () => void; refresh: () => Promise<unknown> }) {
  const toggle = useMutation({ mutationFn: (item: typeof assignments[number]) => setLabRole(item.userId, item.role, { isActive: !item.isActive, version: item.version }), onSuccess: refresh })
  return <Card><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Laboratory roles</CardTitle><CardDescription>Roles are additive and internal to Phaeno; platform administrators retain bootstrap access.</CardDescription></div>{canManage ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> Assign role</Button> : null}</div></CardHeader><CardContent><div className="divide-y">{assignments.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.userName}</p><p className="text-xs text-muted-foreground">{item.email} · {humanize(item.role)}</p></div><div className="flex items-center gap-2"><Status value={item.isActive ? 'Active' : 'Inactive'} />{canManage ? <Button type="button" size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate(item)}>{item.isActive ? 'Deactivate' : 'Reactivate'}</Button> : null}</div></div>)}</div></CardContent></Card>
}

function CreateRecordDialog({ kind, users, onClose, onSaved }: { kind: SimpleCreateKind; users: Array<{ id: string; firstName: string; lastName: string; email: string }>; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [form, setForm] = useState<Record<string, string>>({})
  const mutation = useMutation({ mutationFn: async () => {
    if (kind === 'protocol') return createLabProtocol({ name: form.name, description: form.description })
    if (kind === 'batch') return createLabBatch({ name: form.name, notes: form.notes || null })
    if (kind === 'role') return setLabRole(form.userId, form.role || 'Operator', { isActive: true })
    throw new Error('Choose a record type.')
  }, onSuccess: async () => { setForm({}); await onSaved() } })
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate() }
  return <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>{kind ? `Create ${humanize(kind)}` : 'Create record'}</DialogTitle><DialogDescription>{kind === 'protocol' ? 'Enter the controlled protocol details. POMS assigns its immutable key.' : kind === 'batch' ? 'Name the batch. POMS assigns its batch number and external sequencing type.' : 'Required fields are marked. Laboratory records remain internal to Phaeno.'}</DialogDescription></DialogHeader><div className="my-5 grid gap-4 sm:grid-cols-2">{kind === 'protocol' ? <><div className="sm:col-span-2"><Field label="Name" value={form.name} onChange={set('name')} required /></div><TextField label="Description" value={form.description} onChange={set('description')} /></> : null}{kind === 'batch' ? <><div className="sm:col-span-2"><Field label="Batch name" value={form.name} onChange={set('name')} required /></div><TextField label="Notes" value={form.notes} onChange={set('notes')} /></> : null}{kind === 'role' ? <><SelectField label="Phaeno user" value={form.userId || ''} onChange={set('userId')} options={users.map((user) => ({ value: user.id, label: `${user.firstName} ${user.lastName} · ${user.email}` }))} /><SelectField label="Role" value={form.role || 'Operator'} onChange={set('role')} options={['Operator', 'Supervisor', 'ProtocolAdministrator', 'ScientificReviewer', 'OperationsAdministrator']} /></> : null}</div>{mutation.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Record was not created</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'Check the entered values.')}</AlertDescription></Alert> : null}<DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{kind ? createActionLabel(kind) : 'Create'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function Field({ label, value = '', onChange, required, type = 'text' }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLInputElement>; required?: boolean; type?: string }) { const id = `lab-${label.toLowerCase().replaceAll(' ', '-')}`; return <div><Label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</Label><Input id={id} className="mt-2" type={type} value={value ?? ''} onChange={onChange} required={required} /></div> }
function TextField({ label, value = '', onChange }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement> }) { const id = `lab-${label.toLowerCase().replaceAll(' ', '-')}`; return <div className="sm:col-span-2"><Label htmlFor={id}>{label}</Label><textarea id={id} className="mt-2 min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={value ?? ''} onChange={onChange} /></div> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; options: Array<string | { value: string; label: string }> }) { const id = `lab-${label.toLowerCase().replaceAll(' ', '-')}`; return <div><Label htmlFor={id}>{label} <span aria-hidden="true">*</span></Label><select id={id} className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm" value={value} onChange={onChange} required><option value="" disabled>Select…</option>{options.map((option) => { const value = typeof option === 'string' ? option : option.value; const text = typeof option === 'string' ? humanize(option) : option.label; return <option key={value} value={value}>{text}</option> })}</select></div> }
function Status({ value, prefix }: { value: string; prefix?: string }) { return <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">{prefix ? `${prefix}: ` : ''}{humanize(value)}</span> }
function Empty({ children }: { children: React.ReactNode }) { return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p> }
function AccessDenied() { return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Lab operations unavailable</AlertTitle><AlertDescription>An assigned Phaeno laboratory role is required.</AlertDescription></Alert></main> }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase()) }
function createActionLabel(kind: Exclude<CreateKind, null>) { return kind === 'role' ? 'Assign role' : `Create ${humanize(kind).toLowerCase()}` }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function nowDateTimeLocal() { const now = new Date(); const offset = now.getTimezoneOffset(); return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 16) }
function formatDateOnly(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) }
function todayDateOnly() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
