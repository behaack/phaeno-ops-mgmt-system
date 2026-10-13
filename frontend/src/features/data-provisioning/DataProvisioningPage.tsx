import { RecordPagination } from '#/components/RecordPagination'
import { GuardedFormDialog, ConfirmationFormContent } from '#/components/GuardedFormDialog'
import { Field, FieldError } from '#/components/ui/field'
import { useScopedRecordPage } from '#/components/use-scoped-record-page'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Archive,
  CheckCircle2,
  Database,
  FileStack,
  Plus,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  createDataset,
  createDatasetVersion,
  createSourceSample,
  deactivateDataset,
  getApiErrorMessage,
  grantDataset,
  listDatasets,
  listOrganizationGrants,
  listOrganizations,
  listProvisioningActivityPage,
  listProvisioningRunsPage,
  listSourceSamples,
  publishDatasetVersion,
  reactivateDataset,
  removeDatasetEligibility,
  retireDatasetVersion,
  revokeGrant,
  setDatasetEligibility,
  updateDataset,
  upgradeGrant,
  type CuratedDataset,
  type CuratedDatasetVersion,
  type DatasetGrant,
  type ProvisioningRun,
} from '#/api/data-provisioning'
import { listDepartments, type Department } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { WorkspaceSidebar, type WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFeedback,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'
import { GovernancePanel } from './GovernancePanel'
import type { DataProvisioningSection } from './data-provisioning-sections'

const sourceSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.').max(255),
  isSynthetic: z.boolean(),
})

const datasetSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(255),
  description: z.string().trim().min(1, 'Description is required.').max(2000),
})

const versionSchema = z.object({
  sourceSampleId: z.string().uuid('Select a ready source sample.'),
  releaseNotes: z.string().trim().min(1, 'Release notes are required.').max(4000),
})

const grantSchema = z.object({
  organizationId: z.string().uuid('Select an organization.'),
  departmentId: z.string(),
  datasetVersionId: z.string().uuid('Select an eligible version.'),
})

const upgradeSchema = z.object({
  datasetVersionId: z.string().uuid('Select a newer eligible version.'),
})

const revokeSchema = z.object({
  reason: z.string().trim().min(1, 'A revocation reason is required.').max(2000),
})

const eligibilityRemovalSchema = z.object({
  revokeAllActiveGrants: z.boolean(),
  reason: z.string().trim().max(2000),
}).superRefine((values, context) => {
  if (values.revokeAllActiveGrants && !values.reason) {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'A reason is required when revoking active grants.' })
  }
})

type SourceValues = z.infer<typeof sourceSchema>
type DatasetValues = z.infer<typeof datasetSchema>
type VersionValues = z.infer<typeof versionSchema>
type GrantValues = z.infer<typeof grantSchema>
type UpgradeValues = z.infer<typeof upgradeSchema>
type RevokeValues = z.infer<typeof revokeSchema>
type EligibilityRemovalValues = z.infer<typeof eligibilityRemovalSchema>

const dataProvisioningSections: ReadonlyArray<WorkspaceSidebarItem<DataProvisioningSection>> = [
  { value: 'sources', label: 'Source registry', description: 'Phaeno-owned curation inputs', icon: Database },
  { value: 'catalog', label: 'Curated catalog', description: 'Datasets and immutable versions', icon: FileStack },
  { value: 'grants', label: 'Organization grants', description: 'Exact-version customer access', icon: UserRoundCheck },
  { value: 'governance', label: 'Governance', description: 'Eligibility, activity, and controls', icon: ShieldCheck },
]

type CatalogLifecycleAction =
  | { kind: 'deactivate'; dataset: CuratedDataset }
  | { kind: 'retire'; dataset: CuratedDataset; datasetVersion: CuratedDatasetVersion }

export function DataProvisioningPage({ section, onSectionChange }: { section: DataProvisioningSection; onSectionChange: (section: DataProvisioningSection) => void }) {
  const { authProvider, session } = usePhaenoSession()
  const canManage = Boolean(session?.capabilities.canViewDatasetConfiguration)
  const apiEnabled = canManage && authProvider !== 'mock'

  if (!canManage) {
    return <UnavailableState />
  }

  return (
    <main className="py-8">
      <WorkspaceSidebar
        workspaceLabel="Data provisioning"
        items={dataProvisioningSections}
        value={section}
        onValueChange={onSectionChange}
      >
        <div className="page-wrap px-4">
          <section className="mb-6 max-w-3xl">
            <Badge variant="secondary" className="mb-3">
              Phaeno-only configuration
            </Badge>
            <h1 id="data-provisioning-heading" tabIndex={-1} className="text-3xl font-semibold leading-tight">Data provisioning</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Register Phaeno-owned source samples, publish immutable curated versions,
              and grant one exact version to an organization.
            </p>
          </section>

          {authProvider === 'mock' ? (
            <Alert className="mb-5">
              <AlertTitle>Connected data is paused in mock-session mode</AlertTitle>
              <AlertDescription>
                Set <code>VITE_USE_MOCK_SESSION=false</code> to exercise the secured API
                with a real Phaeno sign-in. The workspace remains visible for UI review.
              </AlertDescription>
            </Alert>
          ) : null}

          {section === 'sources' ? <SourceRegistryPanel apiEnabled={apiEnabled} /> : null}
          {section === 'catalog' ? <CuratedCatalogPanel apiEnabled={apiEnabled} /> : null}
          {section === 'grants' ? <OrganizationGrantsPanel apiEnabled={apiEnabled} /> : null}
          {section === 'governance' ? <GovernancePanel apiEnabled={apiEnabled} /> : null}
        </div>
      </WorkspaceSidebar>
    </main>
  )
}

function SourceRegistryPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const sourceQuery = useQuery({
    queryKey: ['data-provisioning', 'source-samples'],
    queryFn: listSourceSamples,
    enabled: apiEnabled,
  })
  const form = useForm<SourceValues>({
    resolver: zodResolver(sourceSchema),
    defaultValues: { label: '', isSynthetic: true },
  })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting, dialogOpen)

  const createMutation = useMutation({
    mutationFn: createSourceSample,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['data-provisioning', 'source-samples'],
      })
      form.reset({ label: '', isSynthetic: true })
      setDialogOpen(false)
    },
  })

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Source-sample registry</CardTitle>
              <CardDescription>
                Phaeno-owned, de-identified source revisions used for curation.
              </CardDescription>
            </div>
            <Button type="button" disabled={!apiEnabled} onClick={() => setDialogOpen(true)}>
              <Plus data-icon="inline-start" />
              Register source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <QueryError error={sourceQuery.error} fallback="Source samples could not be loaded." />
          <div className="grid gap-3 md:grid-cols-2">
            {(sourceQuery.data ?? []).map((source) => (
              <Link
                key={source.id}
                to="/data-provisioning/sources/$sourceSampleId"
                params={{ sourceSampleId: source.id }}
                search={{ section: 'sources' }}
                className="rounded-lg border bg-background p-4 text-inherit no-underline transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 truncate font-medium">{source.label}</p>
                    <p className="m-0 mt-1 text-xs text-muted-foreground">
                      Revision {source.revision} · {source.files.length} file
                      {source.files.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <StatusBadge status={source.status} />
                </div>
                {source.isSynthetic ? (
                  <Badge variant="outline" className="mt-3">Synthetic fixture</Badge>
                ) : null}
              </Link>
            ))}
          </div>
          <EmptyState
            show={!sourceQuery.isLoading && (sourceQuery.data?.length ?? 0) === 0}
            icon={FileStack}
            title="No source samples registered"
            description={
              apiEnabled
                ? 'Register the first approved Phaeno-owned source sample.'
                : 'Connect a real Phaeno session to load the registry.'
            }
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={open => { if (open) setDialogOpen(true); else void __modalGuard.close(() => { form.reset(); createMutation.reset(); setDialogOpen(false) }) }}>
        <DialogContent showCloseButton={!createMutation.isPending}>
          <DialogHeader>
            <DialogTitle>Register source sample</DialogTitle>
            <DialogDescription>
              This creates a draft shell. Scientific context, evidence, and files
              are completed in its dedicated workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFeedback><MutationError error={createMutation.error} fallback="The source sample could not be created." /></DialogFeedback>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => createMutation.isPending ? undefined : createMutation.mutate(values))}
          >
            <fieldset disabled={createMutation.isPending} className="space-y-4"><FormField label="Internal label" error={form.formState.errors.label?.message} required>
              <Input {...form.register('label')} />
            </FormField>
            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4" {...form.register('isSynthetic')} />
              <span>
                <span className="block font-medium">Synthetic development fixture</span>
                <span className="block text-muted-foreground">
                  This marker is rejected by production publication and grant boundaries.
                </span>
              </span>
            </label>
            </fieldset><RequiredDialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={createMutation.isPending}>Cancel</Button></DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registering' : 'Register source'}
              </Button>
            </RequiredDialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CuratedCatalogPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingDataset, setEditingDataset] = useState<CuratedDataset | null>(null)
  const [versionDataset, setVersionDataset] = useState<CuratedDataset | null>(null)
  const [publishVersion, setPublishVersion] = useState<CuratedDatasetVersion | null>(null)
  const [lifecycleAction, setLifecycleAction] = useState<CatalogLifecycleAction | null>(null)
  const [removingEligibility, setRemovingEligibility] = useState<CuratedDataset | null>(null)
  const dialogOpening = useRef(false)
  function openDialog(action: () => void) { dialogOpening.current = true; action() }
  function closeMenu(event: Event) { if (dialogOpening.current) { event.preventDefault(); dialogOpening.current = false } }
  useEffect(() => {
    if (!editingDataset && !versionDataset && !publishVersion && !lifecycleAction && !removingEligibility) dialogOpening.current = false
  }, [editingDataset, versionDataset, publishVersion, lifecycleAction, removingEligibility])
  const datasetsQuery = useQuery({
    queryKey: ['data-provisioning', 'datasets'],
    queryFn: listDatasets,
    enabled: apiEnabled,
  })
  const sourcesQuery = useQuery({
    queryKey: ['data-provisioning', 'source-samples'],
    queryFn: listSourceSamples,
    enabled: apiEnabled,
  })
  const readySources = (sourcesQuery.data ?? []).filter((source) => source.status === 'Ready')
  const createForm = useForm<DatasetValues>({
    resolver: zodResolver(datasetSchema),
    defaultValues: { name: '', description: '' },
  })
  const editForm = useForm<DatasetValues>({
    resolver: zodResolver(datasetSchema),
    defaultValues: { name: '', description: '' },
  })
  const versionForm = useForm<VersionValues>({
    resolver: zodResolver(versionSchema),
    defaultValues: { sourceSampleId: '', releaseNotes: '' },
  })
  const lifecycleForm = useForm<RevokeValues>({
    resolver: zodResolver(revokeSchema),
    defaultValues: { reason: '' },
  })
  const eligibilityRemovalForm = useForm<EligibilityRemovalValues>({
    resolver: zodResolver(eligibilityRemovalSchema),
    defaultValues: { revokeAllActiveGrants: false, reason: '' },
  })
  const createMutation = useMutation({
    mutationFn: createDataset,
    onSuccess: () => refreshDatasets(() => {
      createForm.reset()
      setCreateOpen(false)
    }),
  })
  const versionMutation = useMutation({
    mutationFn: ({ dataset, values }: { dataset: CuratedDataset; values: VersionValues }) =>
      createDatasetVersion(dataset.id, { ...values, datasetVersion: dataset.version }),
    onSuccess: () => refreshDatasets(() => {
      versionForm.reset()
      setVersionDataset(null)
    }),
  })
  const updateMutation = useMutation({
    mutationFn: ({ dataset, values }: { dataset: CuratedDataset; values: DatasetValues }) =>
      updateDataset({ datasetId: dataset.id, version: dataset.version, ...values }),
    onSuccess: () => refreshDatasets(() => {
      editForm.reset()
      setEditingDataset(null)
    }),
  })
  const publishMutation = useMutation({
    mutationFn: ({ datasetId, version }: { datasetId: string; version: CuratedDatasetVersion }) =>
      publishDatasetVersion(datasetId, version),
    onSuccess: () => refreshDatasets(() => setPublishVersion(null)),
  })
  const eligibilityMutation = useMutation({
    mutationFn: ({ dataset, versionId, eligible }: { dataset: CuratedDataset; versionId: string; eligible: boolean }) =>
      setDatasetEligibility(dataset, versionId, eligible),
    onSuccess: () => refreshDatasets(),
  })
  const lifecycleMutation = useMutation<
    CuratedDataset | CuratedDatasetVersion,
    Error,
    { action: CatalogLifecycleAction; reason: string }
  >({
    mutationFn: ({ action, reason }: { action: CatalogLifecycleAction; reason: string }) =>
      action.kind === 'deactivate'
        ? deactivateDataset({ datasetId: action.dataset.id, version: action.dataset.version, reason })
        : retireDatasetVersion({
            datasetId: action.dataset.id,
            datasetVersionId: action.datasetVersion.id,
            version: action.datasetVersion.version,
            reason,
          }),
    onSuccess: () => refreshDatasets(() => {
      lifecycleForm.reset()
      setLifecycleAction(null)
    }),
  })
  const reactivateMutation = useMutation({
    mutationFn: (dataset: CuratedDataset) => reactivateDataset(dataset.id, dataset.version),
    onSuccess: () => refreshDatasets(),
  })
  const removalMutation = useMutation({
    mutationFn: ({ dataset, values }: { dataset: CuratedDataset; values: EligibilityRemovalValues }) =>
      removeDatasetEligibility({ datasetId: dataset.id, version: dataset.version, ...values }),
    onSuccess: () => refreshDatasets(() => {
      eligibilityRemovalForm.reset()
      setRemovingEligibility(null)
    }),
  })

  async function refreshDatasets(after?: () => void) {
    await queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'datasets'] })
    after?.()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Curated sample-data catalog</CardTitle>
              <CardDescription>
                Published immutable snapshots and the one version currently eligible for assignment.
              </CardDescription>
            </div>
            <Button type="button" disabled={!apiEnabled} onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />New dataset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <QueryError error={datasetsQuery.error} fallback="Curated datasets could not be loaded." />
          {(datasetsQuery.data ?? []).map((dataset) => (
            <div key={dataset.id} className="rounded-lg border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="m-0 font-medium">{dataset.name}</p>
                  <p className="m-0 mt-1 text-sm text-muted-foreground">{dataset.description}</p>
                </div>
                <ActionMenu><DropdownMenuTrigger asChild><Button id={`dataset-actions-${dataset.id}`} type="button" size="sm" variant="outline" disabled={!apiEnabled} aria-label={`Actions for ${dataset.name}`}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" onCloseAutoFocus={closeMenu}>
                  <DropdownMenuItem onSelect={() => openDialog(() => {
                    editForm.reset({ name: dataset.name, description: dataset.description })
                    setEditingDataset(dataset)
                  })}>
                    Edit details
                  </DropdownMenuItem>
                  {dataset.isActive ? (
                    <>
                      <DropdownMenuItem onSelect={() => openDialog(() => setVersionDataset(dataset))}>
                        <Plus data-icon="inline-start" />Create version
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => openDialog(() => setLifecycleAction({ kind: 'deactivate', dataset }))}>
                        Deactivate
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem disabled={reactivateMutation.isPending} onSelect={() => reactivateMutation.mutate(dataset)}>
                      Reactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent></ActionMenu>
              </div>
              <div className="mt-4 space-y-2">
                {dataset.versions.map((version) => {
                  const eligible = dataset.eligibleVersionId === version.id
                  return (
                    <div key={version.id} className="flex flex-col gap-3 rounded-md border p-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">Version {version.versionNumber}</span>
                          <StatusBadge status={version.status} />
                          {eligible ? <Badge variant="secondary">Eligible catalog version</Badge> : null}
                          {version.isSynthetic ? <Badge variant="outline">Synthetic</Badge> : null}
                        </div>
                        <p className="m-0 mt-1 truncate font-mono text-xs text-muted-foreground">
                          SHA-256 {version.contentChecksum}
                        </p>
                      </div>
                      <ActionMenu><DropdownMenuTrigger asChild><Button id={`version-actions-${version.id}`} type="button" size="sm" variant="outline" disabled={!apiEnabled} aria-label={`Actions for ${dataset.name} version ${version.versionNumber}`}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" onCloseAutoFocus={closeMenu}>
                        {version.status === 'Draft' ? (
                          <DropdownMenuItem onSelect={() => openDialog(() => setPublishVersion(version))}>
                            <CheckCircle2 data-icon="inline-start" />Publish
                          </DropdownMenuItem>
                        ) : null}
                        {version.status === 'Published' ? (
                          <DropdownMenuItem
                            disabled={eligibilityMutation.isPending}
                            onSelect={() => eligible
                              ? openDialog(() => setRemovingEligibility(dataset))
                              : eligibilityMutation.mutate({ dataset, versionId: version.id, eligible: true })}
                          >
                            {eligible ? 'Remove eligibility' : 'Mark eligible'}
                          </DropdownMenuItem>
                        ) : null}
                        {version.status === 'Published' ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => openDialog(() => setLifecycleAction({ kind: 'retire', dataset, datasetVersion: version }))}
                          >
                            Retire version
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent></ActionMenu>
                    </div>
                  )
                })}
                {dataset.versions.length === 0 ? (
                  <p className="m-0 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No immutable versions yet.
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          <MutationError error={eligibilityMutation.error} fallback="Catalog eligibility could not be changed." />
          <MutationError error={reactivateMutation.error} fallback="The dataset could not be reactivated." />
          <EmptyState show={!datasetsQuery.isLoading && (datasetsQuery.data?.length ?? 0) === 0} icon={Database} title="No curated datasets" description={apiEnabled ? 'Create a dataset, then snapshot a ready source revision.' : 'Connect a real Phaeno session to load the catalog.'} />
        </CardContent>
      </Card>

      <DatasetCreateDialog open={createOpen} onOpenChange={setCreateOpen} form={createForm} mutation={createMutation} />
      <DatasetEditDialog dataset={editingDataset} onOpenChange={(open) => !open && setEditingDataset(null)} form={editForm} mutation={updateMutation} />
      <VersionCreateDialog dataset={versionDataset} onOpenChange={(open) => !open && setVersionDataset(null)} form={versionForm} readySources={readySources} mutation={versionMutation} />
      <PublishDialog version={publishVersion} onOpenChange={(open) => !open && setPublishVersion(null)} onConfirm={() => publishVersion && publishMutation.mutate({ datasetId: publishVersion.curatedDatasetId, version: publishVersion })} pending={publishMutation.isPending} error={publishMutation.error} />
      <CatalogLifecycleDialog action={lifecycleAction} onOpenChange={(open) => !open && setLifecycleAction(null)} form={lifecycleForm} mutation={lifecycleMutation} />
      <EligibilityRemovalDialog dataset={removingEligibility} onOpenChange={(open) => !open && setRemovingEligibility(null)} form={eligibilityRemovalForm} mutation={removalMutation} />
    </>
  )
}

function OrganizationGrantsPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const queryClient = useQueryClient()
  const [grantOpen, setGrantOpen] = useState(false)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [revokingGrant, setRevokingGrant] = useState<DatasetGrant | null>(null)
  const dialogOpening = useRef(false)
  const [upgradingGrant, setUpgradingGrant] = useState<DatasetGrant | null>(null)
  useEffect(() => {
    if (!upgradingGrant && !revokingGrant) dialogOpening.current = false
  }, [upgradingGrant, revokingGrant])
  const organizationsQuery = useQuery({ queryKey: ['organizations', 'external'], queryFn: listOrganizations, enabled: apiEnabled })
  const datasetsQuery = useQuery({ queryKey: ['data-provisioning', 'datasets'], queryFn: listDatasets, enabled: apiEnabled })
  const grantForm = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: readGrantDraft(),
  })
  useEffect(() => {
    const subscription = grantForm.watch(values => {
      try { sessionStorage.setItem('phaeno-pending-data-grant', JSON.stringify(values)) } catch { /* The form remains usable without browser storage. */ }
    })
    return () => subscription.unsubscribe()
  }, [grantForm])
  const grantsQuery = useQuery({
    queryKey: ['data-provisioning', 'grants', selectedOrganizationId],
    queryFn: () => listOrganizationGrants(selectedOrganizationId),
    enabled: apiEnabled && Boolean(selectedOrganizationId),
  })
  const grantOrganizationId = grantForm.watch('organizationId')
  const grantDepartmentsQuery = useQuery({
    queryKey: ['organization-departments', grantOrganizationId, false],
    queryFn: () => listDepartments(grantOrganizationId, false),
    enabled: apiEnabled && Boolean(grantOrganizationId),
  })
  const runsQuerySelection = useScopedRecordPage(selectedOrganizationId)
  const runsQueryPage = useQuery({
    queryKey: ['data-provisioning', 'runs', selectedOrganizationId, selectedOrganizationId, runsQuerySelection.page],
    queryFn: () => listProvisioningRunsPage(selectedOrganizationId, runsQuerySelection.page),
    enabled: apiEnabled && Boolean(selectedOrganizationId),
  })
  const runsQuery = { ...runsQueryPage, data: runsQueryPage.isError ? undefined : runsQueryPage.data?.items }
  const activityQuerySelection = useScopedRecordPage(selectedOrganizationId)
  const activityQueryPage = useQuery({
    queryKey: ['data-provisioning', 'activity', selectedOrganizationId, selectedOrganizationId, activityQuerySelection.page],
    queryFn: () => listProvisioningActivityPage(selectedOrganizationId, activityQuerySelection.page),
    enabled: apiEnabled && Boolean(selectedOrganizationId),
  })
  const activityQuery = { ...activityQueryPage, data: activityQueryPage.isError ? undefined : activityQueryPage.data?.items }
  const upgradeForm = useForm<UpgradeValues>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: { datasetVersionId: '' },
  })
  const revokeForm = useForm<RevokeValues>({ resolver: zodResolver(revokeSchema), defaultValues: { reason: '' } })
  const eligibleVersions = useMemo(
    () => (datasetsQuery.data ?? []).flatMap((dataset) => {
      const version = dataset.versions.find((item) => item.id === dataset.eligibleVersionId)
      return version ? [{ dataset, version }] : []
    }),
    [datasetsQuery.data],
  )
  const grantMutation = useMutation({
    mutationFn: (values: GrantValues) => grantDataset({
      ...values,
      departmentId: values.departmentId || undefined,
      idempotencyKey: crypto.randomUUID(),
    }),
    onSuccess: async (_, values) => {
      setSelectedOrganizationId(values.organizationId)
      await refreshOrganizationData(values.organizationId)
      grantForm.reset()
      setGrantOpen(false)
    },
  })
  const revokeMutation = useMutation({
    mutationFn: ({ grant, values }: { grant: DatasetGrant; values: RevokeValues }) =>
      revokeGrant({ grantId: grant.id, reason: values.reason, version: grant.version }),
    onSuccess: async () => {
      await refreshOrganizationData()
      revokeForm.reset()
      setRevokingGrant(null)
    },
  })
  const upgradeMutation = useMutation({
    mutationFn: ({ grant, values }: { grant: DatasetGrant; values: UpgradeValues }) =>
      upgradeGrant({
        grantId: grant.id,
        datasetVersionId: values.datasetVersionId,
        idempotencyKey: crypto.randomUUID(),
        version: grant.version,
      }),
    onSuccess: async () => {
      await refreshOrganizationData()
      upgradeForm.reset()
      setUpgradingGrant(null)
    },
  })
  const retryMutation = useMutation({
    mutationFn: (run: ProvisioningRun) => grantDataset({
      organizationId: run.organizationId,
      datasetVersionId: run.datasetVersionId,
      idempotencyKey: crypto.randomUUID(),
    }),
    onSuccess: () => refreshOrganizationData(),
  })

  async function refreshOrganizationData(organizationId = selectedOrganizationId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'grants', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'runs', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'activity', organizationId] }),
    ])
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Explicit organization grants</CardTitle>
              <CardDescription>
                Eligibility does not create access. Each organization receives one exact immutable version.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link to="/crm/companies" search={{ returnTo: 'data-provisioning' }}>Open Company access setup</Link></Button>
              <Button id="assign-data-action" type="button" disabled={!apiEnabled || eligibleVersions.length === 0} onClick={() => setGrantOpen(true)}>
                <UserRoundCheck data-icon="inline-start" />Assign data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid max-w-md gap-1.5">
            <Label htmlFor="grant-organization-filter">Organization</Label>
            <NativeSelect id="grant-organization-filter" className={selectClass} value={selectedOrganizationId} onChange={(event) => setSelectedOrganizationId(event.target.value)} disabled={!apiEnabled}>
              <option value="">Select an organization</option>
              {(organizationsQuery.data ?? []).map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name} ({organization.kind})</option>
              ))}
            </NativeSelect>
          </div>
          <QueryError error={organizationsQuery.error ?? grantsQuery.error ?? runsQuery.error ?? activityQuery.error} fallback="Organization provisioning data could not be loaded." />
          {(grantsQuery.data ?? []).map((grant) => (
            <div key={grant.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{grant.datasetName}</span>
                  <StatusBadge status={grant.status} />
                </div>
                <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {grant.departmentName ?? 'All departments'} · pinned to version {grant.datasetVersionNumber}
                </p>
              </div>
              {grant.status === 'Active' ? (
                <ActionMenu><DropdownMenuTrigger asChild><Button id={`grant-actions-${grant.id}`} type="button" size="sm" variant="outline" aria-label={`Actions for ${grant.datasetName}`} disabled={!apiEnabled}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end" onCloseAutoFocus={event => { if (dialogOpening.current) { event.preventDefault(); dialogOpening.current = false } }}>
                  {eligibleVersions.some(({ dataset, version }) => dataset.id === grant.curatedDatasetId && version.versionNumber > grant.datasetVersionNumber) ? (
                    <DropdownMenuItem onSelect={() => { dialogOpening.current = true; setUpgradingGrant(grant) }}>Upgrade version</DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem variant="destructive" onSelect={() => { dialogOpening.current = true; setRevokingGrant(grant) }}>Revoke access</DropdownMenuItem>
                </DropdownMenuContent></ActionMenu>
              ) : null}
            </div>
          ))}
          <EmptyState show={Boolean(selectedOrganizationId) && !grantsQuery.isLoading && (grantsQuery.data?.length ?? 0) === 0} icon={ShieldCheck} title="No sample data assigned yet" description="This organization has no explicit curated-data grants." />
          {!selectedOrganizationId ? (
            <EmptyState show icon={UserRoundCheck} title="Select an organization" description="Review its current and historical grants without exposing another tenant's data." />
          ) : null}

          {selectedOrganizationId ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <section aria-labelledby="provisioning-runs-heading" className="rounded-lg border p-4">
                <h3 id="provisioning-runs-heading" className="m-0 font-medium">Provisioning history</h3>
                <div className="mt-3 space-y-2">
                  {(runsQuery.data ?? []).map((run) => (
                    <div key={run.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{run.kind}</span>
                        <StatusBadge status={run.status} />
                      </div>
                      <p className="m-0 mt-1 text-xs text-muted-foreground">{formatDateTime(run.requestedAt)}</p>
                      {run.failureMessage ? <p className="m-0 mt-2 text-destructive">{run.failureMessage}</p> : null}
                      {run.status === 'Failed' ? (
                        <Button type="button" className="mt-2" size="sm" variant="outline" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate(run)}>
                          Retry assignment
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {!runsQuery.isLoading && !runsQuery.isError && runsQueryPage.data?.totalCount === 0 ? <p className="m-0 text-sm text-muted-foreground">No provisioning attempts recorded.</p> : null}
                </div>
              <RecordPagination label={'Provisioning history pages'} data={runsQueryPage.isError ? undefined : runsQueryPage.data} busy={runsQueryPage.isFetching} onPage={runsQuerySelection.setPage} />
              </section>
              <section aria-labelledby="organization-activity-heading" className="rounded-lg border p-4">
                <h3 id="organization-activity-heading" className="m-0 font-medium">Organization activity</h3>
                <div className="mt-3 space-y-2">
                  {(activityQuery.data ?? []).map((notice) => (
                    <div key={notice.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{notice.subject}</span>
                        <Badge variant="outline">{notice.kind}</Badge>
                      </div>
                      <p className="m-0 mt-1 text-muted-foreground">{notice.body}</p>
                    </div>
                  ))}
                  {!activityQuery.isLoading && !activityQuery.isError && activityQueryPage.data?.totalCount === 0 ? <p className="m-0 text-sm text-muted-foreground">No organization notices recorded.</p> : null}
                </div>
                <RecordPagination label="Organization activity pages" data={activityQueryPage.isError ? undefined : activityQueryPage.data} busy={activityQueryPage.isFetching} onPage={activityQuerySelection.setPage} />
              </section>
            </div>
          ) : null}
          <MutationError error={retryMutation.error} fallback="The provisioning retry could not be completed." />
        </CardContent>
      </Card>

      <GrantDialog open={grantOpen} onOpenChange={setGrantOpen} form={grantForm} organizations={organizationsQuery.data ?? []} departments={grantDepartmentsQuery.data ?? []} eligibleVersions={eligibleVersions} mutation={grantMutation} />
      <UpgradeDialog grant={upgradingGrant} onOpenChange={(open) => !open && setUpgradingGrant(null)} form={upgradeForm} eligibleVersions={eligibleVersions} mutation={upgradeMutation} />
      <RevokeDialog grant={revokingGrant} onOpenChange={(open) => !open && setRevokingGrant(null)} form={revokeForm} mutation={revokeMutation} />
    </>
  )
}

// Dialog components keep all data-entry forms out of management lists.
function DatasetCreateDialog({ open, onOpenChange, form, mutation }: { open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<DatasetValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, DatasetValues>> }) {
  const { isDirty: __formDraftDirty } = form.formState

  useOrderDraftGuard(open && __formDraftDirty, open && mutation.isPending)
  async function close() {
    if (mutation.isPending || (__formDraftDirty && !(await confirmPortal('Discard unsaved dataset changes?')))) return
    form.reset()
    mutation.reset()
    onOpenChange(false)
  }
  return <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) close() }}>
    <DialogContent showCloseButton={!mutation.isPending}>
      <DialogHeader><DialogTitle>Create curated dataset</DialogTitle><DialogDescription>Create the stable catalog identity. Exact versions are added separately.</DialogDescription></DialogHeader>
      {mutation.error ? <DialogFeedback><MutationError error={mutation.error} fallback="The curated dataset could not be created." /></DialogFeedback> : null}
      <form id="catalog-create-dataset-form" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate(values) })}>
        <fieldset disabled={mutation.isPending} className="space-y-4">
          <FormField label="Name" error={form.formState.errors.name?.message} required><Input {...form.register('name')} /></FormField>
          <FormField label="Description" error={form.formState.errors.description?.message} required><textarea className={textareaClass} rows={4} {...form.register('description')} /></FormField>
        </fieldset>
      </form>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="catalog-create-dataset-form" disabled={mutation.isPending}>{mutation.isPending ? 'Creating' : 'Create dataset'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function DatasetEditDialog({ dataset, onOpenChange, form, mutation }: { dataset: CuratedDataset | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<DatasetValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { dataset: CuratedDataset; values: DatasetValues }>> }) {
  const { isDirty: __formDraftDirty } = form.formState

  useOrderDraftGuard(Boolean(dataset) && __formDraftDirty, Boolean(dataset) && mutation.isPending)
  async function close() {
    if (mutation.isPending || (__formDraftDirty && !(await confirmPortal('Discard unsaved dataset changes?')))) return
    form.reset()
    mutation.reset()
    onOpenChange(false)
  }
  return <Dialog open={Boolean(dataset)} onOpenChange={open => { if (!open) close() }}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); const id = dataset ? `dataset-actions-${dataset.id}` : null; (id ? document.getElementById(id) : document.getElementById('data-provisioning-heading'))?.focus() }} showCloseButton={!mutation.isPending}>
      <DialogHeader><DialogTitle>Edit curated dataset details</DialogTitle><DialogDescription>This changes catalog metadata only. Immutable version contents and every organization grant remain unchanged.</DialogDescription></DialogHeader>
      {mutation.error ? <DialogFeedback><MutationError error={mutation.error} fallback="The curated dataset could not be updated." /></DialogFeedback> : null}
      {dataset ? <form id="catalog-edit-dataset-form" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate({ dataset, values }) })}>
        <fieldset disabled={mutation.isPending} className="space-y-4">
          <FormField label="Name" error={form.formState.errors.name?.message} required><Input {...form.register('name')} /></FormField>
          <FormField label="Description" error={form.formState.errors.description?.message} required><textarea className={textareaClass} rows={4} {...form.register('description')} /></FormField>
        </fieldset>
      </form> : null}
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="catalog-edit-dataset-form" disabled={mutation.isPending || !__formDraftDirty}>{mutation.isPending ? 'Saving' : 'Save details'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}

function CatalogLifecycleDialog({ action, onOpenChange, form, mutation }: { action: CatalogLifecycleAction | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<RevokeValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { action: CatalogLifecycleAction; reason: string }>> }) {
  const { isDirty: __formDraftDirty } = form.formState

  const isRetirement = action?.kind === 'retire'
  useOrderDraftGuard(Boolean(action) && __formDraftDirty, Boolean(action) && mutation.isPending)
  async function close() {
    if (mutation.isPending || (__formDraftDirty && !(await confirmPortal('Discard the unsaved lifecycle reason?')))) return
    form.reset()
    mutation.reset()
    onOpenChange(false)
  }
  return <Dialog open={Boolean(action)} onOpenChange={open => { if (!open) close() }}>
    <DialogContent onCloseAutoFocus={event => { event.preventDefault(); const id = action ? action.kind === 'retire' ? `version-actions-${action.datasetVersion.id}` : `dataset-actions-${action.dataset.id}` : null; (id ? document.getElementById(id) : document.getElementById('data-provisioning-heading'))?.focus() }} showCloseButton={!mutation.isPending}>
      <DialogHeader><DialogTitle>{isRetirement ? 'Retire this exact version?' : 'Deactivate this curated dataset?'}</DialogTitle><DialogDescription>{isRetirement ? 'The version can never receive a new grant or be made eligible again. Existing grants and tenant access remain active, and all history is preserved.' : 'The dataset disappears from future assignment choices. Existing organization grants and access remain unchanged.'}</DialogDescription></DialogHeader>
      {mutation.error ? <DialogFeedback><MutationError error={mutation.error} fallback="The lifecycle change could not be completed." /></DialogFeedback> : null}
      {action ? <form id="catalog-lifecycle-form" noValidate onSubmit={form.handleSubmit(values => { if (!mutation.isPending) mutation.mutate({ action, reason: values.reason }) })}>
        <fieldset disabled={mutation.isPending} className="space-y-4">
          <FormField label="Reason" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField>
        </fieldset>
      </form> : null}
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="catalog-lifecycle-form" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? 'Saving' : isRetirement ? 'Retire version' : 'Deactivate dataset'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}
function EligibilityRemovalDialog({ dataset, onOpenChange, form, mutation }: { dataset: CuratedDataset | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<EligibilityRemovalValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { dataset: CuratedDataset; values: EligibilityRemovalValues }>> }) {
  const formId = useId()
  function changeOpen(next: boolean) {
    if (!next) { form.reset(); mutation.reset() }
    onOpenChange(next)
  }
  const revoke = form.watch('revokeAllActiveGrants')
  return <GuardedFormDialog fallbackFocusId="data-provisioning-heading" returnFocusId={dataset ? `version-actions-${dataset.eligibleVersionId}` : undefined} open={Boolean(dataset)} dirty={form.formState.isDirty} pending={mutation.isPending} onOpenChange={changeOpen}><ConfirmationFormContent showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>Remove this version from the eligible catalog?</DialogTitle></DialogHeader><div><DialogDescription>By default this affects future assignments only and preserves every existing organization grant. Bulk revocation is a separate, explicit destructive option.</DialogDescription></div>{dataset ? <form id={formId} className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => mutation.isPending ? undefined : mutation.mutate({ dataset, values }))}><fieldset disabled={mutation.isPending} className="space-y-4"><label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-0.5 size-4" {...form.register('revokeAllActiveGrants')} /><span><span className="font-medium">Also revoke every active organization grant for this dataset.</span><span className="mt-1 block text-muted-foreground">Access ends immediately. Previously downloaded copies cannot be recalled.</span></span></label>{revoke ? <FormField label="Bulk revocation reason" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField> : null}</fieldset></form> : null}<DialogFeedback><MutationError error={mutation.error} fallback="Eligibility could not be removed." /></DialogFeedback><RequiredDialogFooter showLegend={revoke}><DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>Cancel</Button></DialogClose><Button type="submit" form={formId} variant={revoke ? 'destructive' : 'default'} disabled={mutation.isPending}>{mutation.isPending ? 'Saving' : revoke ? 'Remove and revoke all' : 'Remove eligibility only'}</Button></RequiredDialogFooter></ConfirmationFormContent></GuardedFormDialog>
}

function VersionCreateDialog({ dataset, onOpenChange, form, readySources, mutation }: { dataset: CuratedDataset | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<VersionValues>>; readySources: Awaited<ReturnType<typeof listSourceSamples>>; mutation: ReturnType<typeof useMutation<unknown, Error, { dataset: CuratedDataset; values: VersionValues }>> }) {
  const formId = useId()
  function changeOpen(next: boolean) {
    if (!next) { form.reset(); mutation.reset() }
    onOpenChange(next)
  }
  return <GuardedFormDialog fallbackFocusId="data-provisioning-heading" returnFocusId={dataset ? `dataset-actions-${dataset.id}` : undefined} open={Boolean(dataset)} dirty={form.formState.isDirty} pending={mutation.isPending} onOpenChange={changeOpen}><DialogContent showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>Create immutable-version draft</DialogTitle></DialogHeader><div><DialogDescription>Select one ready source revision. Its metadata, evidence, checksums, and files are snapshotted.</DialogDescription></div>{dataset ? <form id={formId} className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => mutation.isPending ? undefined : mutation.mutate({ dataset, values }))}><fieldset disabled={mutation.isPending} className="space-y-4"><FormField label="Ready source" error={form.formState.errors.sourceSampleId?.message} required><NativeSelect className={selectClass} {...form.register('sourceSampleId')}><option value="">Select a source</option>{readySources.map((source) => <option key={source.id} value={source.id}>{source.label} · revision {source.revision}</option>)}</NativeSelect></FormField><FormField label="Release notes" error={form.formState.errors.releaseNotes?.message} required><textarea className={textareaClass} rows={4} {...form.register('releaseNotes')} /></FormField></fieldset></form> : null}<DialogFeedback><MutationError error={mutation.error} fallback="The version draft could not be created." /></DialogFeedback><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>Cancel</Button></DialogClose><Button type="submit" form={formId} disabled={mutation.isPending || readySources.length === 0}>{mutation.isPending ? 'Snapshotting' : 'Create version draft'}</Button></RequiredDialogFooter></DialogContent></GuardedFormDialog>
}

function PublishDialog({ version, onOpenChange, onConfirm, pending, error }: { version: CuratedDatasetVersion | null; onOpenChange: (open: boolean) => void; onConfirm: () => void; pending: boolean; error: unknown }) {
  return <GuardedFormDialog fallbackFocusId="data-provisioning-heading" returnFocusId={version ? `version-actions-${version.id}` : undefined} open={Boolean(version)} dirty={false} pending={pending} onOpenChange={onOpenChange}><ConfirmationFormContent showCloseButton={!pending}><DialogHeader><DialogTitle>Publish immutable version?</DialogTitle></DialogHeader><div><DialogDescription>Publication validates the complete manifest atomically and freezes this exact source snapshot. A failed validation leaves it in Draft.</DialogDescription></div>{version ? <div className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="m-0 font-medium">{version.sampleLabel} · version {version.versionNumber}</p><p className="m-0 mt-1">{version.files.length} file{version.files.length === 1 ? '' : 's'}</p><p className="m-0 mt-1 break-all font-mono text-xs text-muted-foreground">{version.contentChecksum}</p></div> : null}<DialogFeedback><MutationError error={error} fallback="The version could not be published." /></DialogFeedback><DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="button" disabled={pending} onClick={() => { if (!pending) onConfirm() }}>{pending ? 'Publishing' : 'Publish version'}</Button></DialogFooter></ConfirmationFormContent></GuardedFormDialog>
}

function GrantDialog({ open, onOpenChange, form, organizations, departments, eligibleVersions, mutation }: { open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<GrantValues>>; organizations: Awaited<ReturnType<typeof listOrganizations>>; departments: Department[]; eligibleVersions: { dataset: CuratedDataset; version: CuratedDatasetVersion }[]; mutation: ReturnType<typeof useMutation<unknown, Error, GrantValues>> }) {
  const formId = useId()
  function changeOpen(next: boolean) {
    if (!next) { form.reset(); mutation.reset() }
    onOpenChange(next)
  }
  const organizationField = form.register('organizationId')
  return <GuardedFormDialog fallbackFocusId="data-provisioning-heading" returnFocusId={'assign-data-action'} open={open} dirty={form.formState.isDirty} pending={mutation.isPending} onOpenChange={changeOpen}><DialogContent showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>Assign curated sample data</DialogTitle></DialogHeader><div><DialogDescription>Choose whether the exact pinned version is available throughout the organization or only inside one department. Catalog eligibility alone does not grant access.</DialogDescription></div><form id={formId} className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => mutation.isPending ? undefined : mutation.mutate(values))}><fieldset disabled={mutation.isPending} className="space-y-4"><FormField label="Organization" error={form.formState.errors.organizationId?.message} required><NativeSelect className={selectClass} {...organizationField} onChange={(event) => { void organizationField.onChange(event); form.setValue('departmentId', '') }}><option value="">Select an organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} ({organization.kind})</option>)}</NativeSelect></FormField><FormField label="Access scope" error={form.formState.errors.departmentId?.message}><NativeSelect className={selectClass} {...form.register('departmentId')} disabled={!form.watch('organizationId')}><option value="">All departments (organization-wide)</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</NativeSelect></FormField><FormField label="Eligible package version" error={form.formState.errors.datasetVersionId?.message} required><NativeSelect className={selectClass} {...form.register('datasetVersionId')}><option value="">Select a version</option>{eligibleVersions.map(({ dataset, version }) => <option key={version.id} value={version.id}>{dataset.name} · version {version.versionNumber}</option>)}</NativeSelect></FormField></fieldset></form><DialogFeedback><MutationError error={mutation.error} fallback="The package could not be assigned." /></DialogFeedback><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>Cancel</Button></DialogClose><Button type="submit" form={formId} disabled={mutation.isPending}>{mutation.isPending ? 'Assigning' : 'Assign exact version'}</Button></RequiredDialogFooter></DialogContent></GuardedFormDialog>
}

function UpgradeDialog({ grant, onOpenChange, form, eligibleVersions, mutation }: { grant: DatasetGrant | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<UpgradeValues>>; eligibleVersions: { dataset: CuratedDataset; version: CuratedDatasetVersion }[]; mutation: ReturnType<typeof useMutation<unknown, Error, { grant: DatasetGrant; values: UpgradeValues }>> }) {
  const formId = useId()
  function changeOpen(next: boolean) {
    if (!next) { form.reset(); mutation.reset() }
    onOpenChange(next)
  }
  const newerVersions = grant ? eligibleVersions.filter(({ dataset, version }) => dataset.id === grant.curatedDatasetId && version.versionNumber > grant.datasetVersionNumber) : []
  return <GuardedFormDialog fallbackFocusId="data-provisioning-heading" returnFocusId={grant ? `grant-actions-${grant.id}` : undefined} open={Boolean(grant)} dirty={form.formState.isDirty} pending={mutation.isPending} onOpenChange={changeOpen}><ConfirmationFormContent showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>Upgrade this organization to a newer exact version?</DialogTitle></DialogHeader><div><DialogDescription>The new version becomes the organization's only active grant for this dataset. The prior grant and its download history remain preserved as superseded evidence.</DialogDescription></div>{grant ? <form id={formId} className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => mutation.isPending ? undefined : mutation.mutate({ grant, values }))}><fieldset disabled={mutation.isPending} className="space-y-4"><FormField label="Newer eligible version" error={form.formState.errors.datasetVersionId?.message} required><NativeSelect className={selectClass} {...form.register('datasetVersionId')}><option value="">Select a version</option>{newerVersions.map(({ dataset, version }) => <option key={version.id} value={version.id}>{dataset.name} · version {version.versionNumber}</option>)}</NativeSelect></FormField></fieldset></form> : null}<DialogFeedback><MutationError error={mutation.error} fallback="The organization grant could not be upgraded." /></DialogFeedback><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>Cancel</Button></DialogClose><Button type="submit" form={formId} disabled={mutation.isPending || newerVersions.length === 0}>{mutation.isPending ? 'Upgrading' : 'Upgrade exact version'}</Button></RequiredDialogFooter></ConfirmationFormContent></GuardedFormDialog>
}

function RevokeDialog({ grant, onOpenChange, form, mutation }: { grant: DatasetGrant | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<RevokeValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { grant: DatasetGrant; values: RevokeValues }>> }) {
  const formId = useId()
  function changeOpen(next: boolean) {
    if (!next) { form.reset(); mutation.reset() }
    onOpenChange(next)
  }
  return <GuardedFormDialog fallbackFocusId="data-provisioning-heading" returnFocusId={grant ? `grant-actions-${grant.id}` : undefined} open={Boolean(grant)} dirty={form.formState.isDirty} pending={mutation.isPending} onOpenChange={changeOpen}><ConfirmationFormContent showCloseButton={!mutation.isPending}><DialogHeader><DialogTitle>Revoke {grant?.departmentName ? `${grant.departmentName} department` : 'organization'} access?</DialogTitle></DialogHeader><div><DialogDescription>Portal access ends immediately for users in this grant's scope. Previously downloaded copies cannot be recalled.</DialogDescription></div>{grant ? <form id={formId} className="space-y-4" noValidate onSubmit={form.handleSubmit((values) => mutation.isPending ? undefined : mutation.mutate({ grant, values }))}><fieldset disabled={mutation.isPending} className="space-y-4"><FormField label="Reason" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField></fieldset></form> : null}<DialogFeedback><MutationError error={mutation.error} fallback="Access could not be revoked." /></DialogFeedback><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={mutation.isPending}>Cancel</Button></DialogClose><Button type="submit" form={formId} variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? 'Revoking' : 'Revoke access'}</Button></RequiredDialogFooter></ConfirmationFormContent></GuardedFormDialog>
}

function FormField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
  const id = useId()
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string }>(children) ? children : null
  const controlId = control?.props.id ?? id
  return <Field><Label htmlFor={controlId}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>
    {control ? cloneElement(control as ReactElement<Record<string, unknown>>, { id: controlId, 'aria-invalid': Boolean(error), 'aria-required': required || undefined,
      'aria-describedby': [control.props['aria-describedby'], error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined }) : children}
    <FieldError id={`${id}-error`}>{error}</FieldError>
  </Field>
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={status === 'Active' || status === 'Ready' || status === 'Published' ? 'secondary' : 'outline'}>{status}</Badge>
}

function EmptyState({ show, icon: Icon, title, description }: { show: boolean; icon: typeof Archive; title: string; description: string }) {
  if (!show) return null
  return <div className="mt-3 flex flex-col items-start gap-2 rounded-lg border border-dashed p-5 text-sm text-muted-foreground"><Icon aria-hidden="true" className="size-5" /><div><p className="m-0 font-medium text-foreground">{title}</p><p className="m-0 mt-1">{description}</p></div></div>
}

function QueryError({ error, fallback }: { error: unknown; fallback: string }) {
  return error ? <Alert variant="destructive" className="mb-3" role="alert"><AlertTitle>Unable to load data</AlertTitle><AlertDescription>{getApiErrorMessage(error, fallback)}</AlertDescription></Alert> : null
}

function MutationError({ error, fallback }: { error: unknown; fallback: string }) {
  return error ? <Alert variant="destructive" role="alert"><AlertTitle>Action failed</AlertTitle><AlertDescription>{getApiErrorMessage(error, fallback)}</AlertDescription></Alert> : null
}

function UnavailableState() {
  return <main className="page-wrap px-4 py-8"><Card className="max-w-2xl"><CardHeader><CardTitle>Data provisioning unavailable</CardTitle><CardDescription>This Phaeno-only workspace requires dataset-configuration permission.</CardDescription></CardHeader></Card></main>
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const selectClass = 'w-full'
const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

function readGrantDraft(): GrantValues {
  const empty = { organizationId: '', departmentId: '', datasetVersionId: '' }
  try {
    const value = JSON.parse(sessionStorage.getItem('phaeno-pending-data-grant') ?? '{}') as Partial<GrantValues>
    return { organizationId: typeof value.organizationId === 'string' ? value.organizationId : '', departmentId: typeof value.departmentId === 'string' ? value.departmentId : '', datasetVersionId: typeof value.datasetVersionId === 'string' ? value.datasetVersionId : '' }
  } catch { return empty }
}
