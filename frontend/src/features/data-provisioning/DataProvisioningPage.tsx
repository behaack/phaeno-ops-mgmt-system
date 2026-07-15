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
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  createDataset,
  createDatasetVersion,
  createProvisionedOrganization,
  createSourceSample,
  deactivateDataset,
  getApiErrorMessage,
  grantDataset,
  listDatasets,
  listOrganizationGrants,
  listOrganizations,
  listProvisioningActivity,
  listProvisioningRuns,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { usePhaenoSession } from '#/features/auth/session-context'
import { GovernancePanel } from './GovernancePanel'

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
  datasetVersionId: z.string().uuid('Select an eligible version.'),
})

const upgradeSchema = z.object({
  datasetVersionId: z.string().uuid('Select a newer eligible version.'),
})

const organizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required.').max(255),
  description: z.string().trim().max(2000),
  kind: z.enum(['Prospect', 'Customer', 'Partner']),
  datasetVersionIds: z.array(z.string().uuid()),
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
type OrganizationValues = z.infer<typeof organizationSchema>
type RevokeValues = z.infer<typeof revokeSchema>
type EligibilityRemovalValues = z.infer<typeof eligibilityRemovalSchema>

type CatalogLifecycleAction =
  | { kind: 'deactivate'; dataset: CuratedDataset }
  | { kind: 'retire'; dataset: CuratedDataset; datasetVersion: CuratedDatasetVersion }

export function DataProvisioningPage() {
  const { authProvider, session } = usePhaenoSession()
  const canManage = Boolean(session?.capabilities.canViewDatasetConfiguration)
  const apiEnabled = canManage && authProvider !== 'mock'

  if (!canManage) {
    return <UnavailableState />
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 max-w-3xl">
        <Badge variant="secondary" className="mb-3">
          Phaeno-only configuration
        </Badge>
        <h1 className="text-3xl font-semibold leading-tight">Data provisioning</h1>
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

      <Tabs defaultValue="sources" className="gap-5">
        <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="sources">Source registry</TabsTrigger>
          <TabsTrigger value="catalog">Curated catalog</TabsTrigger>
          <TabsTrigger value="grants">Organization grants</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>
        <TabsContent value="sources">
          <SourceRegistryPanel apiEnabled={apiEnabled} />
        </TabsContent>
        <TabsContent value="catalog">
          <CuratedCatalogPanel apiEnabled={apiEnabled} />
        </TabsContent>
        <TabsContent value="grants">
          <OrganizationGrantsPanel apiEnabled={apiEnabled} />
        </TabsContent>
        <TabsContent value="governance">
          <GovernancePanel apiEnabled={apiEnabled} />
        </TabsContent>
      </Tabs>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register source sample</DialogTitle>
            <DialogDescription>
              This creates a draft shell. Scientific context, evidence, and files
              are completed in its dedicated workspace.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => createMutation.mutateAsync(values))}
          >
            <FormField label="Internal label" error={form.formState.errors.label?.message} required>
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
            <MutationError error={createMutation.error} fallback="The source sample could not be created." />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registering' : 'Register source'}
              </Button>
            </DialogFooter>
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
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    editForm.reset({ name: dataset.name, description: dataset.description })
                    setEditingDataset(dataset)
                  }}>
                    Edit details
                  </Button>
                  {dataset.isActive ? (
                    <>
                      <Button type="button" size="sm" variant="outline" onClick={() => setVersionDataset(dataset)}>
                        <Plus data-icon="inline-start" />Create version
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => setLifecycleAction({ kind: 'deactivate', dataset })}>
                        Deactivate
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(dataset)}>
                      Reactivate
                    </Button>
                  )}
                </div>
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
                      <div className="flex flex-wrap gap-2">
                        {version.status === 'Draft' ? (
                          <Button type="button" size="sm" onClick={() => setPublishVersion(version)}>
                            <CheckCircle2 data-icon="inline-start" />Publish
                          </Button>
                        ) : null}
                        {version.status === 'Published' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={eligible ? 'outline' : 'default'}
                            disabled={eligibilityMutation.isPending}
                            onClick={() => eligible
                              ? setRemovingEligibility(dataset)
                              : eligibilityMutation.mutate({ dataset, versionId: version.id, eligible: true })}
                          >
                            {eligible ? 'Remove eligibility' : 'Mark eligible'}
                          </Button>
                        ) : null}
                        {version.status === 'Published' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setLifecycleAction({ kind: 'retire', dataset, datasetVersion: version })}
                          >
                            Retire version
                          </Button>
                        ) : null}
                      </div>
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
  const [organizationOpen, setOrganizationOpen] = useState(false)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [revokingGrant, setRevokingGrant] = useState<DatasetGrant | null>(null)
  const [upgradingGrant, setUpgradingGrant] = useState<DatasetGrant | null>(null)
  const organizationsQuery = useQuery({ queryKey: ['organizations', 'external'], queryFn: listOrganizations, enabled: apiEnabled })
  const datasetsQuery = useQuery({ queryKey: ['data-provisioning', 'datasets'], queryFn: listDatasets, enabled: apiEnabled })
  const grantsQuery = useQuery({
    queryKey: ['data-provisioning', 'grants', selectedOrganizationId],
    queryFn: () => listOrganizationGrants(selectedOrganizationId),
    enabled: apiEnabled && Boolean(selectedOrganizationId),
  })
  const runsQuery = useQuery({
    queryKey: ['data-provisioning', 'runs', selectedOrganizationId],
    queryFn: () => listProvisioningRuns(selectedOrganizationId),
    enabled: apiEnabled && Boolean(selectedOrganizationId),
  })
  const activityQuery = useQuery({
    queryKey: ['data-provisioning', 'activity', selectedOrganizationId],
    queryFn: () => listProvisioningActivity(selectedOrganizationId),
    enabled: apiEnabled && Boolean(selectedOrganizationId),
  })
  const grantForm = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { organizationId: '', datasetVersionId: '' },
  })
  const upgradeForm = useForm<UpgradeValues>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: { datasetVersionId: '' },
  })
  const organizationForm = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: '', description: '', kind: 'Prospect', datasetVersionIds: [] },
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
  const createOrganizationMutation = useMutation({
    mutationFn: (values: OrganizationValues) => createProvisionedOrganization({
      ...values,
      description: values.description || undefined,
    }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['organizations', 'external'] })
      setSelectedOrganizationId(result.organization.id)
      await refreshOrganizationData(result.organization.id)
      organizationForm.reset()
      setOrganizationOpen(false)
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
              <Button type="button" variant="outline" disabled={!apiEnabled} onClick={() => setOrganizationOpen(true)}>
                <Plus data-icon="inline-start" />New organization
              </Button>
              <Button type="button" disabled={!apiEnabled || eligibleVersions.length === 0} onClick={() => setGrantOpen(true)}>
                <UserRoundCheck data-icon="inline-start" />Assign data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid max-w-md gap-1.5">
            <Label htmlFor="grant-organization-filter">Organization</Label>
            <select id="grant-organization-filter" className={selectClass} value={selectedOrganizationId} onChange={(event) => setSelectedOrganizationId(event.target.value)} disabled={!apiEnabled}>
              <option value="">Select an organization</option>
              {(organizationsQuery.data ?? []).map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name} ({organization.kind})</option>
              ))}
            </select>
          </div>
          <QueryError error={organizationsQuery.error ?? grantsQuery.error ?? runsQuery.error ?? activityQuery.error} fallback="Organization provisioning data could not be loaded." />
          {(grantsQuery.data ?? []).map((grant) => (
            <div key={grant.id} className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{grant.datasetName}</span>
                  <StatusBadge status={grant.status} />
                </div>
                <p className="m-0 mt-1 text-sm text-muted-foreground">Pinned to version {grant.datasetVersionNumber}</p>
              </div>
              {grant.status === 'Active' ? (
                <div className="flex flex-wrap gap-2">
                  {eligibleVersions.some(({ dataset, version }) => dataset.id === grant.curatedDatasetId && version.versionNumber > grant.datasetVersionNumber) ? (
                    <Button type="button" size="sm" onClick={() => setUpgradingGrant(grant)}>Upgrade version</Button>
                  ) : null}
                  <Button type="button" size="sm" variant="destructive" onClick={() => setRevokingGrant(grant)}>Revoke access</Button>
                </div>
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
                  {(runsQuery.data ?? []).slice(0, 20).map((run) => (
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
                  {!runsQuery.isLoading && (runsQuery.data?.length ?? 0) === 0 ? <p className="m-0 text-sm text-muted-foreground">No provisioning attempts recorded.</p> : null}
                </div>
              </section>
              <section aria-labelledby="organization-activity-heading" className="rounded-lg border p-4">
                <h3 id="organization-activity-heading" className="m-0 font-medium">Organization activity</h3>
                <div className="mt-3 space-y-2">
                  {(activityQuery.data ?? []).slice(0, 20).map((notice) => (
                    <div key={notice.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{notice.subject}</span>
                        <Badge variant="outline">{notice.kind}</Badge>
                      </div>
                      <p className="m-0 mt-1 text-muted-foreground">{notice.body}</p>
                    </div>
                  ))}
                  {!activityQuery.isLoading && (activityQuery.data?.length ?? 0) === 0 ? <p className="m-0 text-sm text-muted-foreground">No organization notices recorded.</p> : null}
                </div>
              </section>
            </div>
          ) : null}
          <MutationError error={retryMutation.error} fallback="The provisioning retry could not be completed." />
        </CardContent>
      </Card>

      <GrantDialog open={grantOpen} onOpenChange={setGrantOpen} form={grantForm} organizations={organizationsQuery.data ?? []} eligibleVersions={eligibleVersions} mutation={grantMutation} />
      <OrganizationCreateDialog open={organizationOpen} onOpenChange={setOrganizationOpen} form={organizationForm} eligibleVersions={eligibleVersions} mutation={createOrganizationMutation} />
      <UpgradeDialog grant={upgradingGrant} onOpenChange={(open) => !open && setUpgradingGrant(null)} form={upgradeForm} eligibleVersions={eligibleVersions} mutation={upgradeMutation} />
      <RevokeDialog grant={revokingGrant} onOpenChange={(open) => !open && setRevokingGrant(null)} form={revokeForm} mutation={revokeMutation} />
    </>
  )
}

// Dialog components keep all data-entry forms out of management lists.
function DatasetCreateDialog({ open, onOpenChange, form, mutation }: { open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<DatasetValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, DatasetValues>> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create curated dataset</DialogTitle><DialogDescription>Create the stable catalog identity. Exact versions are added separately.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync(values))}><FormField label="Name" error={form.formState.errors.name?.message} required><Input {...form.register('name')} /></FormField><FormField label="Description" error={form.formState.errors.description?.message} required><textarea className={textareaClass} rows={4} {...form.register('description')} /></FormField><MutationError error={mutation.error} fallback="The curated dataset could not be created." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating' : 'Create dataset'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function DatasetEditDialog({ dataset, onOpenChange, form, mutation }: { dataset: CuratedDataset | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<DatasetValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { dataset: CuratedDataset; values: DatasetValues }>> }) {
  return <Dialog open={Boolean(dataset)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Edit curated dataset details</DialogTitle><DialogDescription>This changes catalog metadata only. Immutable version contents and every organization grant remain unchanged.</DialogDescription></DialogHeader>{dataset ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ dataset, values }))}><FormField label="Name" error={form.formState.errors.name?.message} required><Input {...form.register('name')} /></FormField><FormField label="Description" error={form.formState.errors.description?.message} required><textarea className={textareaClass} rows={4} {...form.register('description')} /></FormField><MutationError error={mutation.error} fallback="The curated dataset could not be updated." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving' : 'Save details'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function CatalogLifecycleDialog({ action, onOpenChange, form, mutation }: { action: CatalogLifecycleAction | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<RevokeValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { action: CatalogLifecycleAction; reason: string }>> }) {
  const isRetirement = action?.kind === 'retire'
  return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{isRetirement ? 'Retire this exact version?' : 'Deactivate this curated dataset?'}</DialogTitle><DialogDescription>{isRetirement ? 'The version can never receive a new grant or be made eligible again. Existing grants and tenant access remain active, and all history is preserved.' : 'The dataset disappears from future assignment choices. Existing organization grants and access remain unchanged.'}</DialogDescription></DialogHeader>{action ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ action, reason: values.reason }))}><FormField label="Reason" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField><MutationError error={mutation.error} fallback="The lifecycle change could not be completed." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? 'Saving' : isRetirement ? 'Retire version' : 'Deactivate dataset'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function EligibilityRemovalDialog({ dataset, onOpenChange, form, mutation }: { dataset: CuratedDataset | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<EligibilityRemovalValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { dataset: CuratedDataset; values: EligibilityRemovalValues }>> }) {
  const revoke = form.watch('revokeAllActiveGrants')
  return <Dialog open={Boolean(dataset)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Remove this version from the eligible catalog?</DialogTitle><DialogDescription>By default this affects future assignments only and preserves every existing organization grant. Bulk revocation is a separate, explicit destructive option.</DialogDescription></DialogHeader>{dataset ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ dataset, values }))}><label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-0.5 size-4" {...form.register('revokeAllActiveGrants')} /><span><span className="font-medium">Also revoke every active organization grant for this dataset.</span><span className="mt-1 block text-muted-foreground">Access ends immediately. Previously downloaded copies cannot be recalled.</span></span></label>{revoke ? <FormField label="Bulk revocation reason" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField> : null}<MutationError error={mutation.error} fallback="Eligibility could not be removed." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" variant={revoke ? 'destructive' : 'default'} disabled={mutation.isPending}>{mutation.isPending ? 'Saving' : revoke ? 'Remove and revoke all' : 'Remove eligibility only'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function VersionCreateDialog({ dataset, onOpenChange, form, readySources, mutation }: { dataset: CuratedDataset | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<VersionValues>>; readySources: Awaited<ReturnType<typeof listSourceSamples>>; mutation: ReturnType<typeof useMutation<unknown, Error, { dataset: CuratedDataset; values: VersionValues }>> }) {
  return <Dialog open={Boolean(dataset)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create immutable-version draft</DialogTitle><DialogDescription>Select one ready source revision. Its metadata, evidence, checksums, and files are snapshotted.</DialogDescription></DialogHeader>{dataset ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ dataset, values }))}><FormField label="Ready source" error={form.formState.errors.sourceSampleId?.message} required><select className={selectClass} {...form.register('sourceSampleId')}><option value="">Select a source</option>{readySources.map((source) => <option key={source.id} value={source.id}>{source.label} · revision {source.revision}</option>)}</select></FormField><FormField label="Release notes" error={form.formState.errors.releaseNotes?.message} required><textarea className={textareaClass} rows={4} {...form.register('releaseNotes')} /></FormField><MutationError error={mutation.error} fallback="The version draft could not be created." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending || readySources.length === 0}>{mutation.isPending ? 'Snapshotting' : 'Create version draft'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function PublishDialog({ version, onOpenChange, onConfirm, pending, error }: { version: CuratedDatasetVersion | null; onOpenChange: (open: boolean) => void; onConfirm: () => void; pending: boolean; error: unknown }) {
  return <Dialog open={Boolean(version)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Publish immutable version?</DialogTitle><DialogDescription>Publication validates the complete manifest atomically and freezes this exact source snapshot. A failed validation leaves it in Draft.</DialogDescription></DialogHeader>{version ? <div className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="m-0 font-medium">{version.sampleLabel} · version {version.versionNumber}</p><p className="m-0 mt-1">{version.files.length} file{version.files.length === 1 ? '' : 's'}</p><p className="m-0 mt-1 break-all font-mono text-xs text-muted-foreground">{version.contentChecksum}</p></div> : null}<MutationError error={error} fallback="The version could not be published." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={pending} onClick={onConfirm}>{pending ? 'Publishing' : 'Publish version'}</Button></DialogFooter></DialogContent></Dialog>
}

function GrantDialog({ open, onOpenChange, form, organizations, eligibleVersions, mutation }: { open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<GrantValues>>; organizations: Awaited<ReturnType<typeof listOrganizations>>; eligibleVersions: { dataset: CuratedDataset; version: CuratedDatasetVersion }[]; mutation: ReturnType<typeof useMutation<unknown, Error, GrantValues>> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Assign curated sample data</DialogTitle><DialogDescription>All active users in the selected organization can access the exact pinned version. Catalog eligibility alone does not grant access.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync(values))}><FormField label="Organization" error={form.formState.errors.organizationId?.message} required><select className={selectClass} {...form.register('organizationId')}><option value="">Select an organization</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name} ({organization.kind})</option>)}</select></FormField><FormField label="Eligible package version" error={form.formState.errors.datasetVersionId?.message} required><select className={selectClass} {...form.register('datasetVersionId')}><option value="">Select a version</option>{eligibleVersions.map(({ dataset, version }) => <option key={version.id} value={version.id}>{dataset.name} · version {version.versionNumber}</option>)}</select></FormField><MutationError error={mutation.error} fallback="The package could not be assigned." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Assigning' : 'Assign exact version'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function OrganizationCreateDialog({ open, onOpenChange, form, eligibleVersions, mutation }: { open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<OrganizationValues>>; eligibleVersions: { dataset: CuratedDataset; version: CuratedDatasetVersion }[]; mutation: ReturnType<typeof useMutation<unknown, Error, OrganizationValues>> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create tenant organization</DialogTitle><DialogDescription>The organization is committed first. Curated packages are optional, exact-version assignments; a failed assignment does not roll back the organization or block invitations.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync(values))}><FormField label="Organization name" error={form.formState.errors.name?.message} required><Input {...form.register('name')} /></FormField><FormField label="Organization kind" error={form.formState.errors.kind?.message} required><select className={selectClass} {...form.register('kind')}><option value="Prospect">Prospect</option><option value="Customer">Customer</option><option value="Partner">Partner</option></select></FormField><FormField label="Description" error={form.formState.errors.description?.message}><textarea className={textareaClass} rows={3} {...form.register('description')} /></FormField><fieldset className="space-y-2"><legend className="text-sm font-medium">Optional eligible packages</legend>{eligibleVersions.map(({ dataset, version }) => <label key={version.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-0.5 size-4" value={version.id} {...form.register('datasetVersionIds')} /><span><span className="block font-medium">{dataset.name} · version {version.versionNumber}</span><span className="block text-muted-foreground">One explicit grant pinned to this immutable version.</span></span></label>)}{eligibleVersions.length === 0 ? <p className="m-0 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No curated versions are currently eligible. The organization can still be created.</p> : null}</fieldset><MutationError error={mutation.error} fallback="The organization could not be created." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating organization' : 'Create organization'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function UpgradeDialog({ grant, onOpenChange, form, eligibleVersions, mutation }: { grant: DatasetGrant | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<UpgradeValues>>; eligibleVersions: { dataset: CuratedDataset; version: CuratedDatasetVersion }[]; mutation: ReturnType<typeof useMutation<unknown, Error, { grant: DatasetGrant; values: UpgradeValues }>> }) {
  const newerVersions = grant ? eligibleVersions.filter(({ dataset, version }) => dataset.id === grant.curatedDatasetId && version.versionNumber > grant.datasetVersionNumber) : []
  return <Dialog open={Boolean(grant)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Upgrade this organization to a newer exact version?</DialogTitle><DialogDescription>The new version becomes the organization's only active grant for this dataset. The prior grant and its download history remain preserved as superseded evidence.</DialogDescription></DialogHeader>{grant ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ grant, values }))}><FormField label="Newer eligible version" error={form.formState.errors.datasetVersionId?.message} required><select className={selectClass} {...form.register('datasetVersionId')}><option value="">Select a version</option>{newerVersions.map(({ dataset, version }) => <option key={version.id} value={version.id}>{dataset.name} · version {version.versionNumber}</option>)}</select></FormField><MutationError error={mutation.error} fallback="The organization grant could not be upgraded." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending || newerVersions.length === 0}>{mutation.isPending ? 'Upgrading' : 'Upgrade exact version'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function RevokeDialog({ grant, onOpenChange, form, mutation }: { grant: DatasetGrant | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<RevokeValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, { grant: DatasetGrant; values: RevokeValues }>> }) {
  return <Dialog open={Boolean(grant)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Revoke organization access?</DialogTitle><DialogDescription>Portal access ends immediately for every user in this organization. Previously downloaded copies cannot be recalled.</DialogDescription></DialogHeader>{grant ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ grant, values }))}><FormField label="Reason" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField><MutationError error={mutation.error} fallback="Access could not be revoked." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? 'Revoking' : 'Revoke access'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function FormField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-sm font-medium">{label}{required ? <span className="text-destructive"> *</span> : null}</span>{children}{error ? <span className="text-sm text-destructive" role="alert">{error}</span> : null}</label>
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

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
