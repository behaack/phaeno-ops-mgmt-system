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
  createSourceSample,
  getApiErrorMessage,
  grantDataset,
  listDatasets,
  listOrganizationGrants,
  listOrganizations,
  listSourceSamples,
  publishDatasetVersion,
  revokeGrant,
  setDatasetEligibility,
  type CuratedDataset,
  type CuratedDatasetVersion,
  type DatasetGrant,
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

const revokeSchema = z.object({
  reason: z.string().trim().min(1, 'A revocation reason is required.').max(2000),
})

type SourceValues = z.infer<typeof sourceSchema>
type DatasetValues = z.infer<typeof datasetSchema>
type VersionValues = z.infer<typeof versionSchema>
type GrantValues = z.infer<typeof grantSchema>
type RevokeValues = z.infer<typeof revokeSchema>

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
        <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="sources">Source registry</TabsTrigger>
          <TabsTrigger value="catalog">Curated catalog</TabsTrigger>
          <TabsTrigger value="grants">Organization grants</TabsTrigger>
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
  const [versionDataset, setVersionDataset] = useState<CuratedDataset | null>(null)
  const [publishVersion, setPublishVersion] = useState<CuratedDatasetVersion | null>(null)
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
  const versionForm = useForm<VersionValues>({
    resolver: zodResolver(versionSchema),
    defaultValues: { sourceSampleId: '', releaseNotes: '' },
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
                <Button type="button" size="sm" variant="outline" onClick={() => setVersionDataset(dataset)}>
                  <Plus data-icon="inline-start" />Create version
                </Button>
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
                            onClick={() => eligibilityMutation.mutate({ dataset, versionId: version.id, eligible: !eligible })}
                          >
                            {eligible ? 'Remove eligibility' : 'Mark eligible'}
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
          <EmptyState show={!datasetsQuery.isLoading && (datasetsQuery.data?.length ?? 0) === 0} icon={Database} title="No curated datasets" description={apiEnabled ? 'Create a dataset, then snapshot a ready source revision.' : 'Connect a real Phaeno session to load the catalog.'} />
        </CardContent>
      </Card>

      <DatasetCreateDialog open={createOpen} onOpenChange={setCreateOpen} form={createForm} mutation={createMutation} />
      <VersionCreateDialog dataset={versionDataset} onOpenChange={(open) => !open && setVersionDataset(null)} form={versionForm} readySources={readySources} mutation={versionMutation} />
      <PublishDialog version={publishVersion} onOpenChange={(open) => !open && setPublishVersion(null)} onConfirm={() => publishVersion && publishMutation.mutate({ datasetId: publishVersion.curatedDatasetId, version: publishVersion })} pending={publishMutation.isPending} error={publishMutation.error} />
    </>
  )
}

function OrganizationGrantsPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const queryClient = useQueryClient()
  const [grantOpen, setGrantOpen] = useState(false)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('')
  const [revokingGrant, setRevokingGrant] = useState<DatasetGrant | null>(null)
  const organizationsQuery = useQuery({ queryKey: ['organizations', 'external'], queryFn: listOrganizations, enabled: apiEnabled })
  const datasetsQuery = useQuery({ queryKey: ['data-provisioning', 'datasets'], queryFn: listDatasets, enabled: apiEnabled })
  const grantsQuery = useQuery({
    queryKey: ['data-provisioning', 'grants', selectedOrganizationId],
    queryFn: () => listOrganizationGrants(selectedOrganizationId),
    enabled: apiEnabled && Boolean(selectedOrganizationId),
  })
  const grantForm = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { organizationId: '', datasetVersionId: '' },
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
      await queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'grants', values.organizationId] })
      grantForm.reset()
      setGrantOpen(false)
    },
  })
  const revokeMutation = useMutation({
    mutationFn: ({ grant, values }: { grant: DatasetGrant; values: RevokeValues }) =>
      revokeGrant({ grantId: grant.id, reason: values.reason, version: grant.version }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'grants', selectedOrganizationId] })
      revokeForm.reset()
      setRevokingGrant(null)
    },
  })

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
            <Button type="button" disabled={!apiEnabled || eligibleVersions.length === 0} onClick={() => setGrantOpen(true)}>
              <UserRoundCheck data-icon="inline-start" />Assign data
            </Button>
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
          <QueryError error={organizationsQuery.error ?? grantsQuery.error} fallback="Organization grants could not be loaded." />
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
                <Button type="button" size="sm" variant="destructive" onClick={() => setRevokingGrant(grant)}>Revoke access</Button>
              ) : null}
            </div>
          ))}
          <EmptyState show={Boolean(selectedOrganizationId) && !grantsQuery.isLoading && (grantsQuery.data?.length ?? 0) === 0} icon={ShieldCheck} title="No sample data assigned yet" description="This organization has no explicit curated-data grants." />
          {!selectedOrganizationId ? (
            <EmptyState show icon={UserRoundCheck} title="Select an organization" description="Review its current and historical grants without exposing another tenant's data." />
          ) : null}
        </CardContent>
      </Card>

      <GrantDialog open={grantOpen} onOpenChange={setGrantOpen} form={grantForm} organizations={organizationsQuery.data ?? []} eligibleVersions={eligibleVersions} mutation={grantMutation} />
      <RevokeDialog grant={revokingGrant} onOpenChange={(open) => !open && setRevokingGrant(null)} form={revokeForm} mutation={revokeMutation} />
    </>
  )
}

// Dialog components keep all data-entry forms out of management lists.
function DatasetCreateDialog({ open, onOpenChange, form, mutation }: { open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<DatasetValues>>; mutation: ReturnType<typeof useMutation<unknown, Error, DatasetValues>> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create curated dataset</DialogTitle><DialogDescription>Create the stable catalog identity. Exact versions are added separately.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync(values))}><FormField label="Name" error={form.formState.errors.name?.message} required><Input {...form.register('name')} /></FormField><FormField label="Description" error={form.formState.errors.description?.message} required><textarea className={textareaClass} rows={4} {...form.register('description')} /></FormField><MutationError error={mutation.error} fallback="The curated dataset could not be created." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating' : 'Create dataset'}</Button></DialogFooter></form></DialogContent></Dialog>
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

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
