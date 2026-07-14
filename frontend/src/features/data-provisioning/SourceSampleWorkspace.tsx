import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileUp,
  LockKeyhole,
  Save,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  archiveSource,
  getApiErrorMessage,
  getSourceSample,
  markSourceReady,
  updateSourceSample,
  uploadSourceFile,
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
import { usePhaenoSession } from '#/features/auth/session-context'

const metadataSchema = z.object({
  label: requiredText('Label', 255),
  description: requiredText('Description', 2000),
  biologicalContext: requiredText('Biological context', 2000),
  assayContext: requiredText('Assay context', 2000),
  analysisSummary: requiredText('Analysis summary', 4000),
  qcStatus: requiredText('QC status', 500),
  provenance: requiredText('Provenance', 2000),
  ownershipBasis: requiredText('Ownership basis', 2000),
  ownershipEvidenceReference: z.string().trim().max(1000),
  deidentificationMethod: requiredText('De-identification method', 1000),
  deidentificationNotes: z.string().trim().max(2000),
})

type MetadataValues = z.infer<typeof metadataSchema>

export function SourceSampleWorkspace({ sourceSampleId }: { sourceSampleId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const apiEnabled =
    authProvider !== 'mock' && Boolean(session?.capabilities.canManageDatasetDrafts)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [readyOpen, setReadyOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const sourceQuery = useQuery({
    queryKey: ['data-provisioning', 'source-samples', sourceSampleId],
    queryFn: () => getSourceSample(sourceSampleId),
    enabled: apiEnabled,
  })
  const source = sourceQuery.data
  const form = useForm<MetadataValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: emptyMetadata,
  })

  useEffect(() => {
    if (!source) return
    form.reset({
      label: source.label,
      description: source.description ?? '',
      biologicalContext: source.biologicalContext ?? '',
      assayContext: source.assayContext ?? '',
      analysisSummary: source.analysisSummary ?? '',
      qcStatus: source.qcStatus ?? '',
      provenance: source.provenance ?? '',
      ownershipBasis: source.ownershipBasis ?? '',
      ownershipEvidenceReference: source.ownershipEvidenceReference ?? '',
      deidentificationMethod: source.deidentificationMethod ?? '',
      deidentificationNotes: source.deidentificationNotes ?? '',
    })
  }, [form, source])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['data-provisioning', 'source-samples', sourceSampleId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['data-provisioning', 'source-samples'],
      }),
    ])
  }
  const saveMutation = useMutation({
    mutationFn: (values: MetadataValues) =>
      updateSourceSample(sourceSampleId, { ...values, version: source!.version }),
    onSuccess: refresh,
  })
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSourceFile(sourceSampleId, file),
    onSuccess: async () => {
      setSelectedFile(null)
      await refresh()
    },
  })
  const readyMutation = useMutation({
    mutationFn: () => markSourceReady(sourceSampleId, source!.version),
    onSuccess: async () => {
      setReadyOpen(false)
      await refresh()
    },
  })
  const archiveMutation = useMutation({
    mutationFn: () => archiveSource(sourceSampleId, source!.version),
    onSuccess: async () => {
      setArchiveOpen(false)
      await refresh()
    },
  })

  if (!apiEnabled) {
    return (
      <main className="page-wrap px-4 py-8">
        <BackLink />
        <Alert className="mt-4">
          <AlertTitle>Connected source data is unavailable in mock-session mode</AlertTitle>
          <AlertDescription>
            Use a real Phaeno sign-in to open this secured source workspace.
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  if (sourceQuery.isLoading) {
    return <main className="page-wrap px-4 py-8"><p>Loading source revision…</p></main>
  }

  if (!source || sourceQuery.error) {
    return (
      <main className="page-wrap px-4 py-8">
        <BackLink />
        <ErrorAlert error={sourceQuery.error} fallback="The source revision could not be loaded." />
      </main>
    )
  }

  const isDraft = source.status === 'Draft'
  const readinessChecks = getReadinessChecks(source)

  return (
    <main className="page-wrap px-4 py-8">
      <BackLink />
      <section className="mt-5 mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-3xl font-semibold leading-tight">{source.label}</h1>
            <Badge variant={isDraft ? 'outline' : 'secondary'}>{source.status}</Badge>
            {source.isSynthetic ? <Badge variant="outline">Synthetic fixture</Badge> : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Source revision {source.revision} · optimistic version {source.version}
          </p>
        </div>
        {!isDraft ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <LockKeyhole aria-hidden="true" className="size-4" />
            Immutable revision
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Scientific context and evidence</CardTitle>
            <CardDescription>
              Keep removed identifiers out of the portal. Record only accountable,
              non-sensitive evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => saveMutation.mutateAsync(values))}>
              <Field label="Internal label" error={form.formState.errors.label?.message} required>
                <Input disabled={!isDraft} {...form.register('label')} />
              </Field>
              <Field label="Sample description" error={form.formState.errors.description?.message} required>
                <textarea className={textareaClass} rows={3} disabled={!isDraft} {...form.register('description')} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Biological context" error={form.formState.errors.biologicalContext?.message} required>
                  <textarea className={textareaClass} rows={3} disabled={!isDraft} {...form.register('biologicalContext')} />
                </Field>
                <Field label="Assay context" error={form.formState.errors.assayContext?.message} required>
                  <textarea className={textareaClass} rows={3} disabled={!isDraft} {...form.register('assayContext')} />
                </Field>
              </div>
              <Field label="Analysis summary" error={form.formState.errors.analysisSummary?.message} required>
                <textarea className={textareaClass} rows={4} disabled={!isDraft} {...form.register('analysisSummary')} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="QC status" error={form.formState.errors.qcStatus?.message} required>
                  <Input disabled={!isDraft} {...form.register('qcStatus')} />
                </Field>
                <Field label="Provenance" error={form.formState.errors.provenance?.message} required>
                  <Input disabled={!isDraft} {...form.register('provenance')} />
                </Field>
              </div>
              <div className="rounded-lg border p-4">
                <h2 className="m-0 text-sm font-semibold">Phaeno ownership evidence</h2>
                <div className="mt-3 grid gap-4">
                  <Field label="Ownership basis" error={form.formState.errors.ownershipBasis?.message} required>
                    <textarea className={textareaClass} rows={3} disabled={!isDraft} {...form.register('ownershipBasis')} />
                  </Field>
                  <Field label="Evidence reference or notes" error={form.formState.errors.ownershipEvidenceReference?.message}>
                    <Input disabled={!isDraft} {...form.register('ownershipEvidenceReference')} />
                  </Field>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h2 className="m-0 text-sm font-semibold">De-identification evidence</h2>
                <div className="mt-3 grid gap-4">
                  <Field label="Method or policy" error={form.formState.errors.deidentificationMethod?.message} required>
                    <Input disabled={!isDraft} {...form.register('deidentificationMethod')} />
                  </Field>
                  <Field label="Non-sensitive notes" error={form.formState.errors.deidentificationNotes?.message}>
                    <textarea className={textareaClass} rows={3} disabled={!isDraft} {...form.register('deidentificationNotes')} />
                  </Field>
                </div>
              </div>
              <ErrorAlert error={saveMutation.error} fallback="The source metadata could not be saved." />
              {isDraft ? (
                <div className="flex justify-end">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    <Save data-icon="inline-start" />
                    {saveMutation.isPending ? 'Saving' : 'Save draft'}
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Managed files</CardTitle>
              <CardDescription>
                File kind, size, checksum, and scan state are server-derived. No content preview is provided.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {source.files.map((file) => (
                <div key={file.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="m-0 min-w-0 truncate font-medium">{file.fileName}</p>
                    <Badge variant={file.scanStatus === 'Clean' ? 'secondary' : 'outline'}>{file.scanStatus}</Badge>
                  </div>
                  <p className="m-0 mt-1 text-xs text-muted-foreground">{file.fileKind} · {formatBytes(file.sizeBytes)}</p>
                  <p className="m-0 mt-2 break-all font-mono text-[0.6875rem] text-muted-foreground">{file.sha256}</p>
                </div>
              ))}
              {source.files.length === 0 ? <p className="m-0 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No managed files attached.</p> : null}
              {isDraft ? (
                <form
                  className="space-y-3 rounded-lg border p-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (selectedFile) uploadMutation.mutate(selectedFile)
                  }}
                >
                  <div className="grid gap-1.5 text-sm font-medium">
                    <label htmlFor="approved-source-file">
                      Approved source file <span className="text-destructive">*</span>
                    </label>
                    <Input id="approved-source-file" type="file" accept=".txt,.csv,.json" required onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
                  </div>
                  <Button type="submit" variant="outline" className="w-full" disabled={!selectedFile || uploadMutation.isPending}>
                    <FileUp data-icon="inline-start" />
                    {uploadMutation.isPending ? 'Uploading and scanning' : 'Upload managed file'}
                  </Button>
                  <ErrorAlert error={uploadMutation.error} fallback="The file could not be uploaded." />
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revision readiness</CardTitle>
              <CardDescription>Every requirement is validated together before the revision becomes immutable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="m-0 space-y-2 p-0">
                {readinessChecks.map((check) => (
                  <li key={check.label} className="flex list-none items-start gap-2 text-sm">
                    {check.complete ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 text-primary" /> : <span aria-hidden="true" className="mt-1 size-3 rounded-full border" />}
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
              <ErrorAlert error={readyMutation.error ?? archiveMutation.error} fallback="The lifecycle action could not be completed." />
              {isDraft ? (
                <Button type="button" className="w-full" onClick={() => setReadyOpen(true)}>
                  <FileCheck2 data-icon="inline-start" />Mark ready
                </Button>
              ) : source.status === 'Ready' ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => setArchiveOpen(true)}>
                  <Archive data-icon="inline-start" />Archive source
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationDialog open={readyOpen} onOpenChange={setReadyOpen} title="Freeze this source revision?" description="The portal will validate the complete metadata, evidence, files, scans, and checksums atomically. A successful transition makes revision 1 immutable." confirmLabel="Validate and mark ready" pending={readyMutation.isPending} onConfirm={() => readyMutation.mutate()} />
      <ConfirmationDialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Archive this source sample?" description="Archiving prevents new curated snapshots. Existing published package versions and organization grants are unchanged." confirmLabel="Archive source" pending={archiveMutation.isPending} onConfirm={() => archiveMutation.mutate()} />
    </main>
  )
}

function ConfirmationDialog({ open, onOpenChange, title, description, confirmLabel, pending, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string; pending: boolean; onConfirm: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" disabled={pending} onClick={onConfirm}>{pending ? 'Working' : confirmLabel}</Button></DialogFooter></DialogContent></Dialog>
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-sm font-medium">{label}{required ? <span className="text-destructive"> *</span> : null}</span>{children}{error ? <span className="text-sm text-destructive" role="alert">{error}</span> : null}</label>
}

function BackLink() {
  return <Link to="/data-provisioning" className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to data provisioning</Link>
}

function ErrorAlert({ error, fallback }: { error: unknown; fallback: string }) {
  return error ? <Alert variant="destructive" role="alert"><AlertTitle>Action failed</AlertTitle><AlertDescription>{getApiErrorMessage(error, fallback)}</AlertDescription></Alert> : null
}

function getReadinessChecks(source: NonNullable<Awaited<ReturnType<typeof getSourceSample>>>) {
  return [
    { label: 'Scientific metadata complete', complete: Boolean(source.description && source.biologicalContext && source.assayContext && source.analysisSummary && source.qcStatus && source.provenance) },
    { label: 'Phaeno ownership confirmed', complete: Boolean(source.ownershipConfirmedAt && source.ownershipBasis) },
    { label: 'De-identification confirmed', complete: Boolean(source.deidentificationConfirmedAt && source.deidentificationMethod) },
    { label: 'At least one managed file attached', complete: source.files.length > 0 },
    { label: 'Every file has a clean scan and checksum', complete: source.files.length > 0 && source.files.every((file) => file.scanStatus === 'Clean' && file.sha256.length === 64) },
  ]
}

function requiredText(label: string, maximumLength: number) {
  return z.string().trim().min(1, `${label} is required.`).max(maximumLength)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const emptyMetadata: MetadataValues = { label: '', description: '', biologicalContext: '', assayContext: '', analysisSummary: '', qcStatus: '', provenance: '', ownershipBasis: '', ownershipEvidenceReference: '', deidentificationMethod: '', deidentificationNotes: '' }
const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60'
