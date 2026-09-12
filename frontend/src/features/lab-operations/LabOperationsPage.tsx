import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Cog, CheckCircle2, ChevronDown, ClipboardList, FileX, FlaskConical, Layers3, Microscope, PackageCheck, Pencil, Plus, RefreshCw, ScanLine, Trash2, Workflow } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Archive } from 'lucide-react'
import { retireLabProtocol } from '#/api/lab-operations'
import { ProtocolRetirementDialog } from './ProtocolRetirementDialog'

import {
  createLabBatch,
  createLabProtocol,
  createLabSendout,
  deleteLabProtocol,
  getLabOperationsDashboard,
  labWorkOrderLabel,
  getLabOperationsError,
  recordLabMaterialQc,
  retireLabEquipment,
  recordLabCustody,
  transitionLabBatch,
  transitionLabProtocolVersion,
  transitionLabSendout,
  updateLabProtocol,
  type LabBatch,
  type LabMaterialLot,
  type LabProtocol,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import {
  ActionMenu as DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'

import { LabBarcodeLookup, LabBatchBarcodeScanner } from './LabBarcodeScanner'
import { EquipmentCreateDialog } from './EquipmentCreateDialog'
import { EquipmentRetirementDialog } from './EquipmentRetirementDialog'
import { MaterialLotCreateDialog } from './MaterialLotCreateDialog'
import { LabManufacturingQueue } from './LabManufacturingPage'
import { LabReceiptAccessionPanel } from './LabReceiptAccessionPanel'
import { ProtocolApprovalDialog } from './ProtocolApprovalDialog'
import { ProtocolIdentityDialog, type ProtocolIdentityFormValues } from './ProtocolIdentityDialog'
import { isProtocolVisible } from './protocol-list'
import { ServiceWorkflowList } from './ServiceWorkflowList'
import { PreparationBatchList } from './PreparationBatchList'
import { TrayFormatList } from './TrayFormatList'
import { labConfigurationTabs, parseLabConfigurationTab, type LabConfigurationTab } from './lab-configuration-tabs'

type CreateKind = 'protocol' | 'material' | 'equipment' | 'batch' | null
type SimpleCreateKind = Exclude<CreateKind, 'material' | 'equipment'>
export type { LabSection } from './lab-sections'
import type { LabReceiptTab } from './lab-receipt-tabs'
import type { LabSection } from './lab-sections'

const labSections: ReadonlyArray<WorkspaceSidebarItem<LabSection>> = [
  { value: 'receipt', label: 'Receipt & accession', description: 'Transport kits, shipment intake, and accession', icon: ScanLine },
  { value: 'work', label: 'Library prep', description: 'Source tubes, preparation, and library QC', icon: ClipboardList },
  { value: 'batches', label: 'Sequencing batches', description: 'Group libraries and track sequencing', icon: Layers3 },
  { value: 'results', label: 'Results & review', description: 'Result evidence, scientific review, and release readiness', icon: ClipboardList },
  { value: 'kits', label: 'PSeq kits', separatorBefore: true, description: 'Preparation, shipping, and fulfillment', icon: PackageCheck },
  { value: 'assembly', label: 'Data assembly', description: 'Input validation, processing, and release', icon: Workflow },
  { value: 'materials', label: 'Materials', separatorBefore: true, description: 'Lots, prepared reagents, and QC', icon: FlaskConical },
  { value: 'equipment', label: 'Equipment', description: 'Assets, availability, and calibration', icon: Microscope },
  { value: 'protocols', label: 'Lab configurations', separatorBefore: true, description: 'Protocols, workflows, and tray formats', icon: Cog },
]

export function LabOperationsPage({ section, shipmentId, receiptTab, onReceiptTabChange, configurationTab, onConfigurationTabChange, onSectionChange }: { section: LabSection; shipmentId?: string; receiptTab?: LabReceiptTab; onReceiptTabChange?: (tab: LabReceiptTab) => void; configurationTab?: LabConfigurationTab; onConfigurationTabChange?: (tab: LabConfigurationTab) => void; onSectionChange: (section: LabSection) => void }) {
  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const canView = Boolean(session?.capabilities.canManageLabOperations)
  const apiEnabled = canView && authProvider !== 'mock'
  const queryClient = useQueryClient()
  const [createKind, setCreateKind] = useState<CreateKind>(null)
  const [localConfigurationTab, setLocalConfigurationTab] = useState<LabConfigurationTab>('protocols')
  const dashboard = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled: apiEnabled })
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ['lab-operations'] }), queryClient.invalidateQueries({ queryKey: ['lab-preparation'] })])

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
                Internal kit fulfillment, receipt and accession, protocol execution, data assembly,
                materials, equipment, cross-order batching, exceptions, and release readiness.
              </p>
            </div>
            <Button type="button" variant="outline" disabled={!apiEnabled || dashboard.isFetching} onClick={() => refresh()}>
              <RefreshCw data-icon="inline-start" /> Refresh
            </Button>
          </section>
          {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Connected Lab operations are paused</AlertTitle><AlertDescription>Use a real Phaeno session to load or change laboratory records.</AlertDescription></Alert> : null}
          {dashboard.error ? <Alert className="mb-5" variant="destructive"><AlertTitle>Lab operations could not be loaded</AlertTitle><AlertDescription>{getLabOperationsError(dashboard.error, 'Try refreshing the workspace.')}</AlertDescription></Alert> : null}
          {dashboard.isLoading ? <p role="status">Loading laboratory workspace…</p> : null}
          {dashboard.data && section === 'receipt' ? <LabReceiptAccessionPanel canReceiveShipments={Boolean(session?.capabilities.canOperateLabWork)} tab={receiptTab} onTabChange={onReceiptTabChange} canManageKitSupply={Boolean(session?.capabilities.canManageOrderConfiguration)} shipmentId={shipmentId} apiEnabled={apiEnabled} workOrders={dashboard.data.workOrders} /> : null}
          {dashboard.data && section === 'work' ? <div className="space-y-5"><PreparationBatchList /><details className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">Find a job or existing specimen record</summary><div className="mt-4 space-y-5"><LabBarcodeLookup /><WorkQueue items={dashboard.data.workOrders.filter((item) => item.status !== 'AwaitingSpecimens')} /></div></details></div> : null}
          {dashboard.data && section === 'results' ? <WorkQueue items={dashboard.data.workOrders.filter((item) => item.status !== 'AwaitingSpecimens')} results /> : null}
          {section === 'kits' ? <LabManufacturingQueue workflow="reagent" apiEnabled={apiEnabled} /> : null}
          {section === 'assembly' ? <LabManufacturingQueue workflow="assembly" apiEnabled={apiEnabled} /> : null}
          {dashboard.data && section === 'protocols' ? (
            <Tabs value={configurationTab ?? localConfigurationTab} onValueChange={value => {
              const nextTab = parseLabConfigurationTab(value)
              if (!nextTab) return
              setLocalConfigurationTab(nextTab)
              onConfigurationTabChange?.(nextTab)
            }} className="gap-4">
              <TabsList aria-label="Lab configurations" className="grid w-full grid-cols-3">
                {labConfigurationTabs.map(tab => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
              </TabsList>
              <TabsContent value="protocols">
                <ProtocolList protocols={dashboard.data.protocols} canManage={Boolean(session?.capabilities.canManageLabProtocols)} onCreate={() => setCreateKind('protocol')} refresh={refresh} />
              </TabsContent>
              <TabsContent value="workflows">
                <ServiceWorkflowList workflows={dashboard.data.serviceWorkflows} marketedServices={dashboard.data.marketedServices} canManage={Boolean(session?.capabilities.canManageLabProtocols)} refresh={refresh} />
              </TabsContent>
              <TabsContent value="tray-formats">
                <TrayFormatList />
              </TabsContent>
            </Tabs>
          ) : null}
          {dashboard.data && section === 'materials' ? <MaterialList items={dashboard.data.materialLots} canManage={Boolean(session?.capabilities.canOperateLabWork)} canApprove={Boolean(session?.capabilities.canSuperviseLabWork)} onCreate={() => setCreateKind('material')} refresh={refresh} /> : null}
          {dashboard.data && section === 'equipment' ? <EquipmentList items={dashboard.data.equipment} canManage={Boolean(session?.capabilities.canSuperviseLabWork)} onCreate={() => setCreateKind('equipment')} /> : null}
          {dashboard.data && section === 'batches' ? <BatchList items={dashboard.data.batches} canManage={Boolean(session?.capabilities.canOperateLabWork)} onCreate={() => setCreateKind('batch')} refresh={refresh} /> : null}
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
            onClose={() => setCreateKind(null)}
            onSaved={async (record) => {
              setCreateKind(null)
              await refresh()
              if (record.kind === 'protocol') {
                await navigate({
                  to: '/lab-operations/protocols/$protocolId/versions/new',
                  params: { protocolId: record.id },
                  search: { section: undefined },
                })
              }
            }}
          />
        </div>
      </WorkspaceSidebar>
    </main>
  )
}

function WorkQueue({ items, results = false }: { items: Awaited<ReturnType<typeof getLabOperationsDashboard>>['workOrders']; results?: boolean }) {
  return <Card className="gap-0 py-0">
    <CardHeader className="border-b bg-muted/50 p-4">
      <CardTitle>{results ? 'Results & review' : 'Job and specimen history'}</CardTitle>
      <CardDescription>{results ? 'Open a job to inspect scientific approval and release readiness. Jobs remain visible while their required evidence is being completed.' : 'Look up receipt, specimen, execution and library records. Assemble new preparation work in a batch above.'}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 p-4">
      {items.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs">
        <div><Link to="/lab-operations/$workOrderId" params={{ workOrderId: item.id }} search={{ section: results ? 'results' : 'work', tab: results ? 'review' : 'specimens' }} className="font-medium text-primary hover:underline">{labWorkOrderLabel(item)}</Link>
          <p className="mt-1 text-xs text-muted-foreground">{item.specimenCount} specimen(s) · {item.openExceptionCount} open exception(s) · updated {formatDate(item.updatedAt)}</p>
        </div><Status value={item.status} />
      </div>)}
      {items.length === 0 ? <Empty>{results ? 'No received laboratory jobs are available for results review.' : 'No received laboratory jobs are available for preparation.'}</Empty> : null}
    </CardContent>
  </Card>
}
export function ProtocolList({ protocols, canManage, onCreate, refresh }: { protocols: LabProtocol[]; canManage: boolean; onCreate: () => void; refresh: () => Promise<unknown> }) {
  const [showRetired, setShowRetired] = useState(false)
  const retiredFilterRef = useRef<HTMLButtonElement>(null)
  const [retirementTarget, setRetirementTarget] = useState<LabProtocol | null>(null)
  const retirement = useMutation({
    mutationFn: ({ protocol, reason, impactToken, confirmImpact }: { protocol: LabProtocol; reason: string; impactToken: string; confirmImpact: boolean }) => retireLabProtocol(protocol.id, { reason, version: protocol.version, impactToken, confirmImpact }),
    onSuccess: async () => {
      setRetirementTarget(null)
      await refresh()
      retiredFilterRef.current?.focus()
    },
  })
  const [editTarget, setEditTarget] = useState<LabProtocol | null>(null)
  const [approvalTarget, setApprovalTarget] = useState<{
    protocol: LabProtocol
    version: LabProtocol['versions'][number]
  } | null>(null)
  const [discardTarget, setDiscardTarget] = useState<{
    protocol: LabProtocol
    version: LabProtocol['versions'][number]
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LabProtocol | null>(null)
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
      setApprovalTarget(null)
      setDiscardTarget(null)
      await refresh()
    },
  })
  const remove = useMutation({
    mutationFn: (protocol: LabProtocol) => deleteLabProtocol(protocol.id, protocol.version),
    onSuccess: async () => {
      setDeleteTarget(null)
      await refresh()
    },
  })
  const edit = useMutation({
    mutationFn: ({
      protocol,
      values,
    }: {
      protocol: LabProtocol
      values: ProtocolIdentityFormValues
    }) => updateLabProtocol(protocol.id, {
      name: values.name,
      description: values.description || null,
      version: protocol.version,
    }),
    onSuccess: async () => {
      setEditTarget(null)
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
  const visibleProtocols = protocols.filter((protocol) => isProtocolVisible(protocol, showRetired))

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Controlled protocols</CardTitle>
              <CardDescription>
                Drafts remain editable. Approval is a formal release that locks the version; later changes require a new draft.
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
          <div className="mb-4 flex items-center gap-2">
            <Checkbox ref={retiredFilterRef} id="show-retired-protocols" checked={showRetired} onCheckedChange={(checked) => setShowRetired(checked === true)} />
            <Label htmlFor="show-retired-protocols" className="cursor-pointer">Show retired</Label>
          </div>
          {transition.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Protocol status was not changed</AlertTitle>
              <AlertDescription>
                {getLabOperationsError(transition.error, 'Refresh the protocol and try again.')}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-4">
            {visibleProtocols.map((protocol) => {
              const draft = protocol.versions.find((version) => version.status === 'Draft')
              const hasEverBeenApproved = protocol.versions.some(
                (version) => version.approvedByUserId !== null
                  || ['Approved', 'Active', 'Retired'].includes(version.status),
              )
              const hasDefinition = protocol.latestVersion > 0
              const approvedVersion = protocol.versions
                .filter((version) => version.status === 'Approved' || version.status === 'Active')
                .at(-1)
              return (
                <section key={protocol.id} className="rounded-lg border bg-background p-4 shadow-xs">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0 wrap-anywhere">
                      <h3 className="font-medium">{protocol.name}</h3>
                      {protocol.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{protocol.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Status value={protocol.retiredAtUtc ? 'Retired' : draft
                          ? `Draft v${draft.protocolVersion}`
                          : approvedVersion
                            ? `Approved v${approvedVersion.protocolVersion}`
                            : protocol.versions.at(-1)?.status ?? 'Setup incomplete'} />
                      </div>
                      {!hasDefinition ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Edit the protocol to define its ordered procedure before approval.
                        </p>
                      ) : null}
                    </div>
                    {canManage && !protocol.retiredAtUtc ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="sm" variant="outline">
                            Actions <ChevronDown data-icon="inline-end" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuLabel>Protocol actions</DropdownMenuLabel>
                          {draft ? (
                            <DropdownMenuItem asChild>
                              <Link
                                to="/lab-operations/protocols/$protocolId/versions/$versionId/edit"
                                params={{ protocolId: protocol.id, versionId: draft.id }}
                                search={{ section: undefined }}
                              >
                                <Pencil /> Edit protocol
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem asChild>
                              <Link
                                to="/lab-operations/protocols/$protocolId/versions/new"
                                params={{ protocolId: protocol.id }}
                                search={{ section: undefined }}
                              >
                                <Plus /> {hasDefinition ? 'Create new version' : 'Edit protocol'}
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {draft ? (
                            <DropdownMenuItem
                              disabled={transition.isPending}
                              onSelect={() => {
                                transition.reset()
                                setApprovalTarget({ protocol, version: draft })
                              }}
                            >
                              <CheckCircle2 /> Review and approve
                            </DropdownMenuItem>
                          ) : null}
                          {!hasEverBeenApproved ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                edit.reset()
                                setEditTarget(protocol)
                              }}
                            >
                              <Pencil /> Edit name and description
                            </DropdownMenuItem>
                          ) : null}
                          {draft && hasEverBeenApproved ? (
                            <DropdownMenuItem
                              onSelect={() => {
                                transition.reset()
                                setDiscardTarget({ protocol, version: draft })
                              }}
                            >
                              <FileX /> Discard draft
                            </DropdownMenuItem>
                          ) : null}
                          {hasEverBeenApproved ? <DropdownMenuItem onSelect={() => { retirement.reset(); setRetirementTarget(protocol) }}><Archive /> Retire protocol</DropdownMenuItem> : null}
                          {!hasEverBeenApproved ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => {
                                  remove.reset()
                                  setDeleteTarget(protocol)
                                }}
                              >
                                <Trash2 /> Delete protocol
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                  {protocol.retiredAtUtc ? <p className="mt-3 text-sm text-muted-foreground">Retired {formatDate(protocol.retiredAtUtc)} · {protocol.retirementReason}</p> : null}
                  {hasDefinition ? (
                    <div className="mt-3 divide-y rounded-md border bg-muted/30 px-3">
                      {[...protocol.versions].reverse().map((version) => (
                        <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Version {version.protocolVersion}</span>
                            <Status value={protocolVersionStatusLabel(version.status)} />
                          </div>
                          {version.approvedAtUtc ? (
                            <span className="text-xs text-muted-foreground">Approved {formatDate(version.approvedAtUtc)}</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
          {visibleProtocols.length === 0 ? <Empty>{protocols.length > 0 ? 'No protocols match the selected visibility filters.' : 'No protocols have been authored.'}</Empty> : null}
        </CardContent>
      </Card>

      <ProtocolIdentityDialog
        protocol={editTarget}
        error={edit.error ? getLabOperationsError(edit.error, 'Refresh the protocol and try again.') : undefined}
        isPending={edit.isPending}
        onOpenChange={(open) => {
          if (open) return
          setEditTarget(null)
          edit.reset()
        }}
        onSubmit={(values) => {
          if (editTarget) edit.mutate({ protocol: editTarget, values })
        }}
      />

      <ProtocolApprovalDialog
        protocol={approvalTarget?.protocol ?? null}
        version={approvalTarget?.version ?? null}
        error={approvalTarget && transition.error
          ? getLabOperationsError(transition.error, 'Refresh the protocol and try again.')
          : undefined}
        isPending={transition.isPending}
        onOpenChange={(open) => {
          if (open || transition.isPending) return
          setApprovalTarget(null)
          transition.reset()
        }}
        onApprove={() => {
          if (!approvalTarget) return
          applyTransition(approvalTarget.protocol, approvalTarget.version.id, 'approve')
        }}
      />

      {retirementTarget ? <ProtocolRetirementDialog
        protocol={retirementTarget} pending={retirement.isPending}
        error={retirement.error ? getLabOperationsError(retirement.error, 'Refresh the list and try again.') : undefined}
        onClose={() => { setRetirementTarget(null); retirement.reset() }}
        onRetire={(reason, impactToken, confirmImpact) => retirement.mutate({ protocol: retirementTarget, reason, impactToken, confirmImpact })}
      /> : null}
      <Dialog
        open={discardTarget !== null}
        onOpenChange={(open) => {
          if (open || transition.isPending) return
          setDiscardTarget(null)
          transition.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard protocol draft?</DialogTitle>
            <DialogDescription>
              Version {discardTarget?.version.protocolVersion} will remain in history as discarded and cannot be approved.
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
              variant="destructive"
              disabled={!discardTarget || transition.isPending}
              onClick={() => {
                if (!discardTarget) return
                applyTransition(discardTarget.protocol, discardTarget.version.id, 'discard')
              }}
            >
              {transition.isPending ? 'Discarding…' : 'Discard draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (open || remove.isPending) return
          setDeleteTarget(null)
          remove.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the unapproved protocol and all of its draft or discarded versions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {remove.error ? (
            <Alert variant="destructive">
              <AlertTitle>Protocol was not deleted</AlertTitle>
              <AlertDescription>{getLabOperationsError(remove.error, 'Refresh the protocol and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={remove.isPending}>Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={!deleteTarget || remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget)}
            >
              {remove.isPending ? 'Deleting…' : 'Delete protocol'}
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
                  <RequiredFieldName>QC date</RequiredFieldName>
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
                  <RequiredFieldName>QC outcome</RequiredFieldName>
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
                    <RequiredFieldName>Failure reason</RequiredFieldName>
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

            <RequiredDialogFooter>
              <Button type="button" variant="outline" disabled={qc.isPending} onClick={closeQcDialog}>Cancel</Button>
              <Button type="submit" disabled={qc.isPending}>
                {qc.isPending ? 'Recording…' : 'Record QC outcome'}
              </Button>
            </RequiredDialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function EquipmentList({ items, canManage, onCreate }: { items: Awaited<ReturnType<typeof getLabOperationsDashboard>>['equipment']; canManage: boolean; onCreate: () => void }) {
  const queryClient = useQueryClient()
  const [showRetired, setShowRetired] = useState(false)
  const retiredFilterRef = useRef<HTMLButtonElement>(null)
  const [retirementTarget, setRetirementTarget] = useState<(typeof items)[number] | null>(null)
  const retirement = useMutation({
    mutationFn: ({ equipment, reason }: { equipment: (typeof items)[number]; reason: string }) => retireLabEquipment(equipment.id, { reason, version: equipment.version }),
    onSuccess: async () => {
      setRetirementTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['lab-operations'] })
      retiredFilterRef.current?.focus()
    },
  })
  const visibleItems = items.filter((item) => showRetired || item.status !== 'Retired')
  return (
    <>
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Equipment</CardTitle>
            <CardDescription>Lightweight asset availability and calibration visibility for execution traceability.</CardDescription>
          </div>
          {canManage ? <Button type="button" onClick={onCreate}><Plus data-icon="inline-start" /> New equipment</Button> : null}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Checkbox ref={retiredFilterRef} id="show-retired-equipment" checked={showRetired} onCheckedChange={(checked) => setShowRetired(checked === true)} />
          <Label htmlFor="show-retired-equipment" className="cursor-pointer">Show retired</Label>
        </div>
        {visibleItems.length === 0 ? <Empty>{items.length > 0 ? 'No current equipment. Select Show retired to view retired assets.' : 'No equipment has been created.'}</Empty> : (
          <ul aria-label="Equipment assets" className="space-y-3">
            {visibleItems.map((item) => (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-background p-4 shadow-xs">
                <div className="min-w-0 wrap-anywhere">
                  <h3 className="font-medium">{item.name} · {item.assetCode}</h3>
                  <p className="text-xs text-muted-foreground">{item.equipmentType} · {item.location}{item.calibrationDueOn ? ` · calibration due ${formatDateOnly(item.calibrationDueOn)}` : ''}</p>
                  {item.status === 'Retired' ? <p className="mt-2 text-xs text-muted-foreground">{item.retiredAtUtc ? `Retired ${new Date(item.retiredAtUtc).toLocaleDateString('en-US')} · ` : ''}{item.retirementReason ?? 'Retirement reason not recorded.'}</p> : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Status value={item.status} />
                  {canManage && item.status !== 'Retired' ? <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="outline" aria-label={`Actions for ${item.name}`}>Actions <ChevronDown data-icon="inline-end" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onSelect={() => { retirement.reset(); setRetirementTarget(item) }}>Retire equipment</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
    {retirementTarget ? <EquipmentRetirementDialog
      equipment={retirementTarget}
      pending={retirement.isPending}
      error={retirement.error ? getLabOperationsError(retirement.error, 'Refresh the equipment list and try again.') : undefined}
      onClose={() => { if (!retirement.isPending) setRetirementTarget(null) }}
      onRetire={(reason) => retirement.mutate({ equipment: retirementTarget, reason })}
    /> : null}
    </>
  )
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
    if (dialog.kind === 'sendout') return createLabSendout(dialog.batch.id, { providerName: form.providerName, providerReference: form.providerReference || null, manifestJson: JSON.stringify({ notes: form.manifestNotes?.trim() || null }), expectedCompletionAtUtc: form.expectedCompletionAtUtc ? new Date(form.expectedCompletionAtUtc).toISOString() : null })
    return recordLabCustody(dialog.batch.sendoutId!, { labContainerId: null, eventCode: form.eventCode, locationOrParty: form.locationOrParty, detailsJson: JSON.stringify({ carrierReference: form.carrierReference?.trim() || null, notes: form.custodyNotes?.trim() || null }) })
  }, onSuccess: async () => { setDialog(null); setForm({}); await refresh() } })
  const openBatchAction = (batch: LabBatch, kind: 'sendout' | 'custody') => { save.reset(); setForm({}); setDialog({ batch, kind }) }
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
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Sequencing batches</CardTitle>
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
          <CardContent className="p-4">
            {filteredItems.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No batches match this status.</p>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const next = nextStatus(item.sendoutStatus)
                  return (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4 shadow-xs">
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
                        {canManage && item.status === 'InProgress' && !item.sendoutId && item.memberCount > 0 ? <Button type="button" size="sm" onClick={() => openBatchAction(item, 'sendout')}>Create sendout</Button> : null}
                        {canManage && item.sendoutId ? <Button type="button" size="sm" variant="outline" onClick={() => openBatchAction(item, 'custody')}>Custody event</Button> : null}
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
              <Label htmlFor="batch-transition-at"><RequiredFieldName>{transitionDialog?.action === 'start' ? 'Started at' : 'Completed at'}</RequiredFieldName></Label>
              <Input id="batch-transition-at" className="mt-2" type="datetime-local" value={transitionAt} onChange={(event) => setTransitionAt(event.target.value)} required />
            </div>
          </div>
          {transition.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Batch transition failed</AlertTitle><AlertDescription>{getLabOperationsError(transition.error, 'Check the entered time and try again.')}</AlertDescription></Alert> : null}
          <RequiredDialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" disabled={transition.isPending || !transitionAt} onClick={saveTransition}>{transitionDialog?.action === 'start' ? 'Start batch' : 'Complete batch'}</Button>
          </RequiredDialogFooter>
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
                <p className="text-sm text-muted-foreground">POMS freezes the current {dialog.batch.memberCount} libraries and their container barcodes in the sendout manifest for {dialog.batch.batchNumber}. Confirm the physical contents against the batch before saving.</p>
                <TextField label="Additional manifest notes (optional)" value={form.manifestNotes} onChange={set('manifestNotes')} />
              </>
            ) : (
              <>
                <Field label="Event code" value={form.eventCode} onChange={set('eventCode')} required />
                <Field label="Location or party" value={form.locationOrParty} onChange={set('locationOrParty')} required />
                <Field label="Carrier or tracking reference (optional)" value={form.carrierReference} onChange={set('carrierReference')} />
                <TextField label="Custody note (optional)" value={form.custodyNotes} onChange={set('custodyNotes')} />
              </>
            )}
          </div>
          {save.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Batch action failed</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Check the entered values.')}</AlertDescription></Alert> : null}
          <RequiredDialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>Save</Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
function CreateRecordDialog({ kind, onClose, onSaved }: { kind: SimpleCreateKind; onClose: () => void; onSaved: (record: { kind: 'protocol' | 'batch'; id: string }) => Promise<unknown> }) {
  const [form, setForm] = useState<Record<string, string>>({})
  const mutation = useMutation({ mutationFn: async () => {
    if (kind === 'protocol') return createLabProtocol({ name: form.name, description: form.description })
    if (kind === 'batch') return createLabBatch({ name: form.name, notes: form.notes || null })
    throw new Error('Choose a record type.')
  }, onSuccess: async (record) => {
    if (kind !== 'protocol' && kind !== 'batch') return
    setForm({})
    await onSaved({ kind, id: record.id })
  } })
  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }))
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate() }
  return <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>{kind ? `Create ${humanize(kind)}` : 'Create record'}</DialogTitle><DialogDescription>{kind === 'protocol' ? 'Name the controlled procedure. After this step, define its ordered instructions, captures, resources, and QC gates.' : kind === 'batch' ? 'Name the batch. POMS assigns its batch number and external sequencing type.' : 'Laboratory records remain internal to Phaeno.'}</DialogDescription></DialogHeader><div className="my-5 grid gap-4 sm:grid-cols-2">{kind === 'protocol' ? <><div className="sm:col-span-2"><Field label="Name" value={form.name} onChange={set('name')} required /></div><TextField label="Description" value={form.description} onChange={set('description')} /></> : null}{kind === 'batch' ? <><div className="sm:col-span-2"><Field label="Batch name" value={form.name} onChange={set('name')} required /></div><TextField label="Notes" value={form.notes} onChange={set('notes')} /></> : null}</div>{mutation.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Record was not created</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'Check the entered values.')}</AlertDescription></Alert> : null}<RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : kind === 'protocol' ? 'Continue to definition' : kind ? createActionLabel(kind) : 'Create'}</Button></RequiredDialogFooter></form></DialogContent></Dialog>
}

function Field({ label, value = '', onChange, required, type = 'text' }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLInputElement>; required?: boolean; type?: string }) { const id = `lab-${label.toLowerCase().replaceAll(' ', '-')}`; return <div><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><Input id={id} className="mt-2" type={type} value={value ?? ''} onChange={onChange} required={required} /></div> }
function TextField({ label, value = '', onChange }: { label: string; value?: string; onChange: React.ChangeEventHandler<HTMLTextAreaElement> }) { const id = `lab-${label.toLowerCase().replaceAll(' ', '-')}`; return <div className="sm:col-span-2"><Label htmlFor={id}>{label}</Label><textarea id={id} className="mt-2 min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={value ?? ''} onChange={onChange} /></div> }
function Status({ value, prefix }: { value: string; prefix?: string }) { return <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">{prefix ? `${prefix}: ` : ''}{humanize(value)}</span> }
function protocolVersionStatusLabel(status: string) { if (status === 'Approved' || status === 'Active') return 'Approved'; if (status === 'Retired') return 'Superseded'; return status }
function Empty({ children }: { children: React.ReactNode }) { return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p> }
function AccessDenied() { return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Lab operations unavailable</AlertTitle><AlertDescription>An assigned Phaeno laboratory role is required.</AlertDescription></Alert></main> }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase()) }
function createActionLabel(kind: Exclude<CreateKind, null>) { return `Create ${humanize(kind).toLowerCase()}` }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function nowDateTimeLocal() { const now = new Date(); const offset = now.getTimezoneOffset(); return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 16) }
function formatDateOnly(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) }
function todayDateOnly() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
