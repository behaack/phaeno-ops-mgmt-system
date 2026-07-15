import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, Plus, Send, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  addGovernanceFollowUp,
  clearGovernanceIncident,
  downloadGovernanceInvestigationArchive,
  getApiErrorMessage,
  listDatasets,
  listGovernanceIncidents,
  listSourceSamples,
  quarantineSource,
  recordGovernanceAttestation,
  remindAffectedOrganization,
  withdrawGovernanceIncident,
  type GovernanceAffectedOrganization,
  type GovernanceIncident,
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

const quarantineSchema = z.object({
  sourceSampleId: z.string().uuid('Select a source sample.'),
  category: z.enum(['Deidentification', 'Ownership', 'SharingRights', 'Other']),
  reason: z.string().trim().min(1, 'A concern summary is required.').max(2000),
  externalGuidance: z.string().trim().min(1, 'Customer guidance is required.').max(4000),
  internalNotes: z.string().trim().min(1, 'Internal investigation notes are required.').max(4000),
  attestationDueAt: z.string().min(1, 'An attestation due date is required.'),
})

const resolutionSchema = z.object({
  resolution: z.string().trim().min(1, 'A documented outcome is required.').max(4000),
  immutableContentConfirmedUnchanged: z.boolean(),
})

const notesSchema = z.object({
  notes: z.string().trim().min(1, 'Notes are required.').max(4000),
})

const attestationSchema = z.object({
  organizationContact: z.string().trim().min(1, 'Organization contact is required.').max(500),
  evidenceSource: z.string().trim().min(1, 'Evidence source is required.').max(1000),
  notes: z.string().trim().min(1, 'Attestation notes are required.').max(4000),
})

const investigationSchema = z.object({
  reason: z.string().trim().min(1, 'An investigation purpose is required.').max(2000),
})

type QuarantineValues = z.infer<typeof quarantineSchema>
type ResolutionValues = z.infer<typeof resolutionSchema>
type NotesValues = z.infer<typeof notesSchema>
type AttestationValues = z.infer<typeof attestationSchema>
type InvestigationValues = z.infer<typeof investigationSchema>

type ResolutionAction = {
  incident: GovernanceIncident
  kind: 'clear' | 'withdraw'
}

type OrganizationAction = {
  incident: GovernanceIncident
  organization: GovernanceAffectedOrganization
  kind: 'remind' | 'attest'
}

type InvestigationAction = {
  incident: GovernanceIncident
  datasetVersionId: string
  fileName: string
}

export function GovernancePanel({ apiEnabled }: { apiEnabled: boolean }) {
  const queryClient = useQueryClient()
  const [quarantineOpen, setQuarantineOpen] = useState(false)
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction | null>(null)
  const [organizationAction, setOrganizationAction] = useState<OrganizationAction | null>(null)
  const [followUpIncident, setFollowUpIncident] = useState<GovernanceIncident | null>(null)
  const [investigationAction, setInvestigationAction] = useState<InvestigationAction | null>(null)
  const incidentsQuery = useQuery({
    queryKey: ['data-provisioning', 'governance-incidents'],
    queryFn: () => listGovernanceIncidents(),
    enabled: apiEnabled,
  })
  const sourcesQuery = useQuery({
    queryKey: ['data-provisioning', 'source-samples'],
    queryFn: listSourceSamples,
    enabled: apiEnabled,
  })
  const datasetsQuery = useQuery({
    queryKey: ['data-provisioning', 'datasets'],
    queryFn: listDatasets,
    enabled: apiEnabled,
  })
  const quarantineForm = useForm<QuarantineValues>({
    resolver: zodResolver(quarantineSchema),
    defaultValues: {
      sourceSampleId: '',
      category: 'Deidentification',
      reason: '',
      externalGuidance: '',
      internalNotes: '',
      attestationDueAt: '',
    },
  })
  const resolutionForm = useForm<ResolutionValues>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: { resolution: '', immutableContentConfirmedUnchanged: false },
  })
  const notesForm = useForm<NotesValues>({
    resolver: zodResolver(notesSchema),
    defaultValues: { notes: '' },
  })
  const attestationForm = useForm<AttestationValues>({
    resolver: zodResolver(attestationSchema),
    defaultValues: { organizationContact: '', evidenceSource: '', notes: '' },
  })
  const investigationForm = useForm<InvestigationValues>({
    resolver: zodResolver(investigationSchema),
    defaultValues: { reason: '' },
  })

  async function refreshGovernance() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'governance-incidents'] }),
      queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'datasets'] }),
      queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'grants'] }),
      queryClient.invalidateQueries({ queryKey: ['data-provisioning', 'activity'] }),
    ])
  }

  const quarantineMutation = useMutation({
    mutationFn: (values: QuarantineValues) => quarantineSource({
      ...values,
      attestationDueAt: new Date(`${values.attestationDueAt}T23:59:59Z`).toISOString(),
    }),
    onSuccess: async () => {
      await refreshGovernance()
      quarantineForm.reset()
      setQuarantineOpen(false)
    },
  })
  const resolutionMutation = useMutation({
    mutationFn: ({ action, values }: { action: ResolutionAction; values: ResolutionValues }) =>
      action.kind === 'clear'
        ? clearGovernanceIncident({
            incidentId: action.incident.id,
            resolution: values.resolution,
            immutableContentConfirmedUnchanged: values.immutableContentConfirmedUnchanged,
            version: action.incident.version,
          })
        : withdrawGovernanceIncident({
            incidentId: action.incident.id,
            resolution: values.resolution,
            version: action.incident.version,
          }),
    onSuccess: async () => {
      await refreshGovernance()
      resolutionForm.reset()
      setResolutionAction(null)
    },
  })
  const followUpMutation = useMutation({
    mutationFn: ({ incidentId, notes }: { incidentId: string; notes: string }) =>
      addGovernanceFollowUp(incidentId, notes),
    onSuccess: async () => {
      await refreshGovernance()
      notesForm.reset()
      setFollowUpIncident(null)
    },
  })
  const reminderMutation = useMutation({
    mutationFn: ({ action, notes }: { action: OrganizationAction; notes: string }) =>
      remindAffectedOrganization({
        incidentId: action.incident.id,
        organizationId: action.organization.organizationId,
        notes,
      }),
    onSuccess: async () => {
      await refreshGovernance()
      notesForm.reset()
      setOrganizationAction(null)
    },
  })
  const attestationMutation = useMutation({
    mutationFn: ({ action, values }: { action: OrganizationAction; values: AttestationValues }) =>
      recordGovernanceAttestation({
        incidentId: action.incident.id,
        organizationId: action.organization.organizationId,
        version: action.organization.version,
        ...values,
      }),
    onSuccess: async () => {
      await refreshGovernance()
      attestationForm.reset()
      setOrganizationAction(null)
    },
  })
  const investigationMutation = useMutation({
    mutationFn: ({ action, reason }: { action: InvestigationAction; reason: string }) =>
      downloadGovernanceInvestigationArchive({
        incidentId: action.incident.id,
        datasetVersionId: action.datasetVersionId,
        fileName: action.fileName,
        reason,
      }),
    onSuccess: () => {
      investigationForm.reset()
      setInvestigationAction(null)
    },
  })

  const versionLabels = new Map(
    (datasetsQuery.data ?? []).flatMap((dataset) => dataset.versions.map((version) => [
      version.id,
      `${dataset.name}-v${version.versionNumber}`,
    ] as const)),
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Data-governance incidents</CardTitle>
              <CardDescription>
                Quarantine every published version derived from a source, investigate safely,
                and document customer remediation.
              </CardDescription>
            </div>
            <Button type="button" disabled={!apiEnabled} onClick={() => setQuarantineOpen(true)}>
              <ShieldAlert data-icon="inline-start" />Start quarantine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <QueryError error={incidentsQuery.error} fallback="Governance incidents could not be loaded." />
          {(incidentsQuery.data ?? []).map((incident) => (
            <article key={incident.id} className="rounded-lg border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 font-medium">{incident.sourceSampleLabel}</h3>
                    <StatusBadge status={incident.status} />
                    <Badge variant="outline">{incident.category}</Badge>
                  </div>
                  <p className="m-0 mt-2 text-sm">{incident.reason}</p>
                  <p className="m-0 mt-1 text-sm text-muted-foreground">{incident.externalGuidance}</p>
                  <p className="m-0 mt-2 text-xs text-muted-foreground">
                    {incident.affectedDatasetVersionIds.length} affected version(s) ·{' '}
                    {incident.affectedOrganizations.length} organization(s) · attestation due{' '}
                    {formatDate(incident.attestationDueAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setFollowUpIncident(incident)}>
                    <Plus data-icon="inline-start" />Follow-up
                  </Button>
                  {incident.status === 'Open' ? (
                    <>
                      <Button type="button" size="sm" variant="outline" onClick={() => setResolutionAction({ incident, kind: 'clear' })}>
                        Clear unchanged
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => setResolutionAction({ incident, kind: 'withdraw' })}>
                        Confirm unsafe
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {incident.status !== 'Cleared' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {incident.affectedDatasetVersionIds.map((versionId) => (
                    <Button
                      key={versionId}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setInvestigationAction({
                        incident,
                        datasetVersionId: versionId,
                        fileName: `investigation-${versionLabels.get(versionId) ?? versionId}.zip`,
                      })}
                    >
                      <Download data-icon="inline-start" />
                      {versionLabels.get(versionId) ?? 'Affected version'}
                    </Button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                {incident.affectedOrganizations.map((organization) => (
                  <div key={organization.organizationId} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="m-0 text-sm font-medium">{organization.organizationName}</p>
                      <p className="m-0 mt-1 text-xs text-muted-foreground">
                        {organization.status} · {organization.affectedGrantCount} grant(s) · {organization.reminderCount} reminder(s)
                      </p>
                    </div>
                    {organization.status === 'AwaitingAttestation' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setOrganizationAction({ incident, organization, kind: 'remind' })}>
                          <Send data-icon="inline-start" />Remind
                        </Button>
                        <Button type="button" size="sm" onClick={() => setOrganizationAction({ incident, organization, kind: 'attest' })}>
                          Record attestation
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!incidentsQuery.isLoading && (incidentsQuery.data?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              <AlertTriangle aria-hidden="true" className="mb-2 size-5" />
              <p className="m-0 font-medium text-foreground">No governance incidents</p>
              <p className="m-0 mt-1">No curated source is currently quarantined.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <QuarantineDialog
        open={quarantineOpen}
        onOpenChange={setQuarantineOpen}
        form={quarantineForm}
        sources={sourcesQuery.data ?? []}
        mutation={quarantineMutation}
      />
      <ResolutionDialog action={resolutionAction} onOpenChange={(open) => !open && setResolutionAction(null)} form={resolutionForm} mutation={resolutionMutation} />
      <NotesDialog
        title="Add investigation follow-up"
        description="Record a dated internal note without changing the incident status."
        open={Boolean(followUpIncident)}
        onOpenChange={(open) => !open && setFollowUpIncident(null)}
        form={notesForm}
        pending={followUpMutation.isPending}
        error={followUpMutation.error}
        onSubmit={(values) => followUpIncident
          ? followUpMutation.mutateAsync({ incidentId: followUpIncident.id, notes: values.notes })
          : undefined}
      />
      <OrganizationActionDialog action={organizationAction} onOpenChange={(open) => !open && setOrganizationAction(null)} notesForm={notesForm} attestationForm={attestationForm} reminderMutation={reminderMutation} attestationMutation={attestationMutation} />
      <InvestigationDialog action={investigationAction} onOpenChange={(open) => !open && setInvestigationAction(null)} form={investigationForm} mutation={investigationMutation} />
    </>
  )
}

function QuarantineDialog({ open, onOpenChange, form, sources, mutation }: { open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<QuarantineValues>>; sources: Awaited<ReturnType<typeof listSourceSamples>>; mutation: ReturnType<typeof useMutation<GovernanceIncident, Error, QuarantineValues>> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Quarantine a source and every derived version?</DialogTitle><DialogDescription>Tenant access is blocked immediately across all active grants. Customer notices receive only the concern category and external guidance; internal notes remain Phaeno-only.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync(values))}><FormField label="Source sample" error={form.formState.errors.sourceSampleId?.message} required><select className={selectClass} {...form.register('sourceSampleId')}><option value="">Select a source</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.label} · revision {source.revision}</option>)}</select></FormField><FormField label="Concern category" error={form.formState.errors.category?.message} required><select className={selectClass} {...form.register('category')}><option value="Deidentification">De-identification</option><option value="Ownership">Ownership</option><option value="SharingRights">Sharing rights</option><option value="Other">Other</option></select></FormField><FormField label="Concern summary" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={3} {...form.register('reason')} /></FormField><FormField label="Customer guidance" error={form.formState.errors.externalGuidance?.message} required><textarea className={textareaClass} rows={4} {...form.register('externalGuidance')} /></FormField><FormField label="Internal investigation notes" error={form.formState.errors.internalNotes?.message} required><textarea className={textareaClass} rows={4} {...form.register('internalNotes')} /></FormField><FormField label="Attestation due date if content is withdrawn" error={form.formState.errors.attestationDueAt?.message} required><Input type="date" {...form.register('attestationDueAt')} /></FormField><MutationError error={mutation.error} fallback="The source could not be quarantined." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? 'Quarantining' : 'Quarantine all derived versions'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function ResolutionDialog({ action, onOpenChange, form, mutation }: { action: ResolutionAction | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<ResolutionValues>>; mutation: ReturnType<typeof useMutation<GovernanceIncident, Error, { action: ResolutionAction; values: ResolutionValues }>> }) {
  const isClear = action?.kind === 'clear'
  return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{isClear ? 'Clear quarantine and restore active grants?' : 'Confirm content is unsafe and withdraw it?'}</DialogTitle><DialogDescription>{isClear ? 'Access resumes only for grants that remain active. Eligibility stays off until Phaeno deliberately approves it again.' : 'The affected versions remain preserved as evidence but can never be accessed through tenant grants. Every affected organization must attest to remediation.'}</DialogDescription></DialogHeader>{action ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ action, values }))}><FormField label="Documented investigation outcome" error={form.formState.errors.resolution?.message} required><textarea className={textareaClass} rows={5} {...form.register('resolution')} /></FormField>{isClear ? <label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" className="mt-0.5 size-4" {...form.register('immutableContentConfirmedUnchanged')} /><span><span className="font-medium">I confirmed the immutable curated content and checksums are unchanged.</span><span className="mt-1 block text-muted-foreground">This scientific-integrity confirmation is required before suspended grants resume.</span></span></label> : null}<MutationError error={mutation.error} fallback="The incident could not be resolved." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" variant={isClear ? 'default' : 'destructive'} disabled={mutation.isPending || (isClear && !form.watch('immutableContentConfirmedUnchanged'))}>{mutation.isPending ? 'Saving' : isClear ? 'Clear quarantine' : 'Withdraw content'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function NotesDialog({ title, description, open, onOpenChange, form, pending, error, onSubmit }: { title: string; description: string; open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<NotesValues>>; pending: boolean; error: unknown; onSubmit: (values: NotesValues) => Promise<unknown> | undefined }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}><FormField label="Notes" error={form.formState.errors.notes?.message} required><textarea className={textareaClass} rows={5} {...form.register('notes')} /></FormField><MutationError error={error} fallback="The follow-up could not be saved." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? 'Saving' : 'Save follow-up'}</Button></DialogFooter></form></DialogContent></Dialog>
}

function OrganizationActionDialog({ action, onOpenChange, notesForm, attestationForm, reminderMutation, attestationMutation }: { action: OrganizationAction | null; onOpenChange: (open: boolean) => void; notesForm: ReturnType<typeof useForm<NotesValues>>; attestationForm: ReturnType<typeof useForm<AttestationValues>>; reminderMutation: ReturnType<typeof useMutation<GovernanceIncident, Error, { action: OrganizationAction; notes: string }>>; attestationMutation: ReturnType<typeof useMutation<GovernanceIncident, Error, { action: OrganizationAction; values: AttestationValues }>> }) {
  const isReminder = action?.kind === 'remind'
  return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{isReminder ? 'Send attestation reminder' : 'Record organization attestation'}</DialogTitle><DialogDescription>{action?.organization.organizationName} · {isReminder ? 'A durable portal notice and follow-up record will be created.' : 'Use this only for evidence received outside the portal.'}</DialogDescription></DialogHeader>{action && isReminder ? <form className="space-y-4" onSubmit={notesForm.handleSubmit((values) => reminderMutation.mutateAsync({ action, notes: values.notes }))}><FormField label="Internal reminder notes" error={notesForm.formState.errors.notes?.message} required><textarea className={textareaClass} rows={4} {...notesForm.register('notes')} /></FormField><MutationError error={reminderMutation.error} fallback="The reminder could not be sent." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={reminderMutation.isPending}>{reminderMutation.isPending ? 'Sending' : 'Send reminder'}</Button></DialogFooter></form> : null}{action && !isReminder ? <form className="space-y-4" onSubmit={attestationForm.handleSubmit((values) => attestationMutation.mutateAsync({ action, values }))}><FormField label="Organization contact" error={attestationForm.formState.errors.organizationContact?.message} required><Input {...attestationForm.register('organizationContact')} /></FormField><FormField label="Evidence source" error={attestationForm.formState.errors.evidenceSource?.message} required><Input {...attestationForm.register('evidenceSource')} /></FormField><FormField label="Attestation notes" error={attestationForm.formState.errors.notes?.message} required><textarea className={textareaClass} rows={4} {...attestationForm.register('notes')} /></FormField><MutationError error={attestationMutation.error} fallback="The attestation could not be recorded." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={attestationMutation.isPending}>{attestationMutation.isPending ? 'Recording' : 'Record attestation'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function InvestigationDialog({ action, onOpenChange, form, mutation }: { action: InvestigationAction | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<InvestigationValues>>; mutation: ReturnType<typeof useMutation<void, Error, { action: InvestigationAction; reason: string }>> }) {
  return <Dialog open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Download quarantined content for investigation?</DialogTitle><DialogDescription>This dedicated Phaeno-only path records the user, incident, version, time, and required purpose. Do not redistribute the archive.</DialogDescription></DialogHeader>{action ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ action, reason: values.reason }))}><FormField label="Investigation purpose" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField><MutationError error={mutation.error} fallback="The investigation archive could not be downloaded." /><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Preparing archive' : 'Download audited archive'}</Button></DialogFooter></form> : null}</DialogContent></Dialog>
}

function FormField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-1.5"><span className="text-sm font-medium">{label}{required ? <span className="text-destructive"> *</span> : null}</span>{children}{error ? <span className="text-sm text-destructive" role="alert">{error}</span> : null}</label>
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={status === 'Open' ? 'destructive' : status === 'Cleared' ? 'secondary' : 'outline'}>{status}</Badge>
}

function QueryError({ error, fallback }: { error: unknown; fallback: string }) {
  return error ? <Alert variant="destructive" role="alert"><AlertTitle>Unable to load data</AlertTitle><AlertDescription>{getApiErrorMessage(error, fallback)}</AlertDescription></Alert> : null
}

function MutationError({ error, fallback }: { error: unknown; fallback: string }) {
  return error ? <Alert variant="destructive" role="alert"><AlertTitle>Action failed</AlertTitle><AlertDescription>{getApiErrorMessage(error, fallback)}</AlertDescription></Alert> : null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

const selectClass = 'h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
