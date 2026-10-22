import { ErrorState, EmptyState } from '#/components/ui/content-state'
import { GovernanceStatusBadge as StatusBadge } from './DataStatusBadge'
import { formatDisplayDate } from '#/lib/display-format'
import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { GuardedFormDialog, ConfirmationFormContent } from '#/components/GuardedFormDialog'
import { NativeSelect } from '#/components/ui/native-select'
import { RecordPagination } from '#/components/RecordPagination'
import { useScopedRecordPage } from '#/components/use-scoped-record-page'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Download, Plus, Send, ShieldAlert } from 'lucide-react'
import { useState, useId, isValidElement, cloneElement } from 'react'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  addGovernanceFollowUp,
  clearGovernanceIncident,
  downloadGovernanceInvestigationArchive,
  getApiErrorMessage,
  listDatasets,
  listGovernanceIncidentsPage,
  listSourceSamples,
  quarantineSource,
  recordGovernanceAttestation,
  remindAffectedOrganization,
  withdrawGovernanceIncident,
  type GovernanceAffectedOrganization,
  type GovernanceIncident,
} from '#/api/data-provisioning'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '#/components/ui/dropdown-menu'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
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
  const incidentsQuerySelection = useScopedRecordPage('global-governance')
  const incidentsQueryPage = useQuery({
    queryKey: ['data-provisioning', 'governance-incidents', 'global-governance', incidentsQuerySelection.page],
    queryFn: () => listGovernanceIncidentsPage(incidentsQuerySelection.page),
    enabled: apiEnabled,
  })
  const incidentsQuery = { ...incidentsQueryPage, data: incidentsQueryPage.isError ? undefined : incidentsQueryPage.data?.items }
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
            <Button type="button" id="governance-start" disabled={!apiEnabled} onClick={() => setQuarantineOpen(true)}>
              <ShieldAlert data-icon="inline-start" />Start quarantine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <QueryError error={incidentsQuery.error} fallback="Governance incidents could not be loaded." onRetry={()=>void incidentsQuery.refetch()} busy={incidentsQuery.isFetching} />
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
                <ActionMenu>
                  <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="outline" id={`governance-${incident.id}-actions`} aria-label={`Actions for ${incident.sourceSampleLabel}`}>Actions</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setFollowUpIncident(incident)}>
                    <Plus data-icon="inline-start" />Follow-up
                  </DropdownMenuItem>
                  {incident.status === 'Open' ? (
                    <>
                      <DropdownMenuItem onSelect={() => setResolutionAction({ incident, kind: 'clear' })}>
                        Clear unchanged
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setResolutionAction({ incident, kind: 'withdraw' })}>
                        Confirm unsafe
                      </DropdownMenuItem>
                    </>
                  ) : null}
                  {incident.status !== 'Cleared' ? incident.affectedDatasetVersionIds.map((versionId) => (
                    <DropdownMenuItem
                      key={versionId}
                      onSelect={() => setInvestigationAction({
                        incident,
                        datasetVersionId: versionId,
                        fileName: `investigation-${versionLabels.get(versionId) ?? versionId}.zip`,
                      })}
                    >
                      <Download data-icon="inline-start" />
                      Investigate {versionLabels.get(versionId) ?? 'affected version'}
                    </DropdownMenuItem>
                  )) : null}
                  </DropdownMenuContent>
                </ActionMenu>
              </div>

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
                      <ActionMenu>
                        <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="outline" id={`governance-${incident.id}-${organization.organizationId}-actions`} aria-label={`Actions for ${organization.organizationName}`}>Actions</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setOrganizationAction({ incident, organization, kind: 'remind' })}>
                          <Send data-icon="inline-start" />Remind
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setOrganizationAction({ incident, organization, kind: 'attest' })}>
                          Record attestation
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                      </ActionMenu>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!incidentsQuery.isLoading && !incidentsQuery.isError && incidentsQueryPage.data?.totalCount === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              <AlertTriangle aria-hidden="true" className="mb-2 size-5" />
              <p className="m-0 font-medium text-foreground">No governance incidents</p>
              <EmptyState  kind="empty" title={<>No governance incidents have been recorded.</>} />
            </div>
          ) : null}
        <RecordPagination label={'Governance incident pages'} data={incidentsQueryPage.isError ? undefined : incidentsQueryPage.data} busy={incidentsQueryPage.isFetching} onPage={incidentsQuerySelection.setPage} />
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
        returnFocusId={`governance-${followUpIncident?.id}-actions`}
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
  return <GuardedFormDialog dirty={form.formState.isDirty} pending={mutation.isPending} returnFocusId={'governance-start'} open={open} onOpenChange={onOpenChange}><ConfirmationFormContent><DialogHeader><DialogTitle>Quarantine a source and every derived version?</DialogTitle><DialogDescription>Tenant access is blocked immediately across all active grants. Customer notices receive only the concern category and external guidance; internal notes remain Phaeno-only.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync(values))}><p className="text-sm">Quarantine blocks tenant access to every derived version immediately. It preserves immutable content, grants and download evidence.</p><FormField label="Source sample" error={form.formState.errors.sourceSampleId?.message} required><NativeSelect {...form.register('sourceSampleId')}><option value="">Select a source</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.label} · revision {source.revision}</option>)}</NativeSelect></FormField><FormField label="Concern category" error={form.formState.errors.category?.message} required><NativeSelect {...form.register('category')}><option value="Deidentification">De-identification</option><option value="Ownership">Ownership</option><option value="SharingRights">Sharing rights</option><option value="Other">Other</option></NativeSelect></FormField><FormField label="Concern summary" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={3} {...form.register('reason')} /></FormField><FormField label="Customer guidance" error={form.formState.errors.externalGuidance?.message} required><textarea className={textareaClass} rows={4} {...form.register('externalGuidance')} /></FormField><FormField label="Internal investigation notes" error={form.formState.errors.internalNotes?.message} required><textarea className={textareaClass} rows={4} {...form.register('internalNotes')} /></FormField><FormField label="Attestation due date if content is withdrawn" error={form.formState.errors.attestationDueAt?.message} required><Input type="date" {...form.register('attestationDueAt')} /></FormField><MutationError error={mutation.error} fallback="The source could not be quarantined." /><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" variant="destructive" disabled={mutation.isPending}>{mutation.isPending ? 'Quarantining' : 'Quarantine all derived versions'}</Button></RequiredDialogFooter></form></ConfirmationFormContent></GuardedFormDialog>
}

function ResolutionDialog({ action, onOpenChange, form, mutation }: { action: ResolutionAction | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<ResolutionValues>>; mutation: ReturnType<typeof useMutation<GovernanceIncident, Error, { action: ResolutionAction; values: ResolutionValues }>> }) {
  const isClear = action?.kind === 'clear'
  return <GuardedFormDialog dirty={form.formState.isDirty} pending={mutation.isPending} returnFocusId={`governance-${action?.incident.id}-actions`} open={Boolean(action)} onOpenChange={onOpenChange}><ConfirmationFormContent><DialogHeader><DialogTitle>{isClear ? 'Clear quarantine and restore active grants?' : 'Confirm content is unsafe and withdraw it?'}</DialogTitle><DialogDescription>{isClear ? 'Access resumes only for grants that remain active. Eligibility stays off until Phaeno deliberately approves it again.' : 'The affected versions remain preserved as evidence but can never be accessed through tenant grants. Every affected organization must attest to remediation.'}</DialogDescription></DialogHeader>{action ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ action, values }))}><p className="text-sm">{action.incident.sourceSampleLabel}: {isClear ? "Still-active grants resume only after unchanged content is confirmed safe. Revoked grants remain unavailable." : "All affected versions remain evidence and become unavailable to tenants. Every affected organization must attest to remediation."}</p><FormField label="Documented investigation outcome" error={form.formState.errors.resolution?.message} required><textarea className={textareaClass} rows={5} {...form.register('resolution')} /></FormField>{isClear ? <label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><NativeCheckbox   {...form.register('immutableContentConfirmedUnchanged')} /><span><span className="font-medium">I confirmed the immutable curated content and checksums are unchanged.</span><span className="mt-1 block text-muted-foreground">This scientific-integrity confirmation is required before suspended grants resume.</span></span></label> : null}<MutationError error={mutation.error} fallback="The incident could not be resolved." /><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" variant={isClear ? 'default' : 'destructive'} disabled={mutation.isPending || (isClear && !form.watch('immutableContentConfirmedUnchanged'))}>{mutation.isPending ? 'Saving' : isClear ? 'Clear quarantine' : 'Withdraw content'}</Button></RequiredDialogFooter></form> : null}</ConfirmationFormContent></GuardedFormDialog>
}

function NotesDialog({ title, description, open, onOpenChange, form, pending, error, onSubmit, returnFocusId }: { title: string; description: string; open: boolean; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<NotesValues>>; pending: boolean; error: unknown; onSubmit: (values: NotesValues) => Promise<unknown> | undefined; returnFocusId?: string }) {
  return <GuardedFormDialog dirty={form.formState.isDirty} pending={pending} returnFocusId={returnFocusId} open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}><FormField label="Notes" error={form.formState.errors.notes?.message} required><textarea className={textareaClass} rows={5} {...form.register('notes')} /></FormField><MutationError error={error} fallback="The follow-up could not be saved." /><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? 'Saving' : 'Save follow-up'}</Button></RequiredDialogFooter></form></DialogContent></GuardedFormDialog>
}

function OrganizationActionDialog({ action, onOpenChange, notesForm, attestationForm, reminderMutation, attestationMutation }: { action: OrganizationAction | null; onOpenChange: (open: boolean) => void; notesForm: ReturnType<typeof useForm<NotesValues>>; attestationForm: ReturnType<typeof useForm<AttestationValues>>; reminderMutation: ReturnType<typeof useMutation<GovernanceIncident, Error, { action: OrganizationAction; notes: string }>>; attestationMutation: ReturnType<typeof useMutation<GovernanceIncident, Error, { action: OrganizationAction; values: AttestationValues }>> }) {
  const isReminder = action?.kind === 'remind'
  return <GuardedFormDialog dirty={isReminder ? notesForm.formState.isDirty : attestationForm.formState.isDirty} pending={isReminder ? reminderMutation.isPending : attestationMutation.isPending} returnFocusId={`governance-${action?.incident.id}-${action?.organization.organizationId}-actions`} open={Boolean(action)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{isReminder ? 'Send attestation reminder' : 'Record organization attestation'}</DialogTitle><DialogDescription>{action?.organization.organizationName} · {isReminder ? 'A durable portal notice and follow-up record will be created.' : 'Use this only for evidence received outside the portal.'}</DialogDescription></DialogHeader>{action && isReminder ? <form className="space-y-4" onSubmit={notesForm.handleSubmit((values) => reminderMutation.mutateAsync({ action, notes: values.notes }))}><FormField label="Internal reminder notes" error={notesForm.formState.errors.notes?.message} required><textarea className={textareaClass} rows={4} {...notesForm.register('notes')} /></FormField><MutationError error={reminderMutation.error} fallback="The reminder could not be sent." /><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={reminderMutation.isPending}>{reminderMutation.isPending ? 'Sending' : 'Send reminder'}</Button></RequiredDialogFooter></form> : null}{action && !isReminder ? <form className="space-y-4" onSubmit={attestationForm.handleSubmit((values) => attestationMutation.mutateAsync({ action, values }))}><FormField label="Organization contact" error={attestationForm.formState.errors.organizationContact?.message} required><Input {...attestationForm.register('organizationContact')} /></FormField><FormField label="Evidence source" error={attestationForm.formState.errors.evidenceSource?.message} required><Input {...attestationForm.register('evidenceSource')} /></FormField><FormField label="Attestation notes" error={attestationForm.formState.errors.notes?.message} required><textarea className={textareaClass} rows={4} {...attestationForm.register('notes')} /></FormField><MutationError error={attestationMutation.error} fallback="The attestation could not be recorded." /><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={attestationMutation.isPending}>{attestationMutation.isPending ? 'Recording' : 'Record attestation'}</Button></RequiredDialogFooter></form> : null}</DialogContent></GuardedFormDialog>
}

function InvestigationDialog({ action, onOpenChange, form, mutation }: { action: InvestigationAction | null; onOpenChange: (open: boolean) => void; form: ReturnType<typeof useForm<InvestigationValues>>; mutation: ReturnType<typeof useMutation<void, Error, { action: InvestigationAction; reason: string }>> }) {
  return <GuardedFormDialog dirty={form.formState.isDirty} pending={mutation.isPending} returnFocusId={`governance-${action?.incident.id}-actions`} open={Boolean(action)} onOpenChange={onOpenChange}><ConfirmationFormContent><DialogHeader><DialogTitle>Download quarantined content for investigation?</DialogTitle><DialogDescription>This dedicated Phaeno-only path records the user, incident, version, time, and required purpose. Do not redistribute the archive.</DialogDescription></DialogHeader>{action ? <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ action, reason: values.reason }))}><p className="text-sm">{action.fileName}: this audited download is for the named investigation. Do not redistribute the archive.</p><FormField label="Investigation purpose" error={form.formState.errors.reason?.message} required><textarea className={textareaClass} rows={4} {...form.register('reason')} /></FormField><MutationError error={mutation.error} fallback="The investigation archive could not be downloaded." /><RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Preparing archive' : 'Download audited archive'}</Button></RequiredDialogFooter></form> : null}</ConfirmationFormContent></GuardedFormDialog>
}

function FormField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  const generatedId = useId()
  const control = isValidElement<{ id?: string }>(children) ? cloneElement(children, { id: children.props.id ?? generatedId }) : children
  const id = isValidElement<{ id?: string }>(control) ? control.props.id : generatedId
  return <Field><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{control}<FieldError>{error}</FieldError></Field>
}



function QueryError({ error, fallback, onRetry, busy }: { error: unknown; fallback: string; onRetry?:()=>void; busy?:boolean }) { return error ? <ErrorState title="Unable to load data" onRetry={onRetry} busy={busy}>{getApiErrorMessage(error, fallback)}</ErrorState> : null }

function MutationError({ error, fallback }: { error: unknown; fallback: string }) { return error ? <ErrorState title="Action failed">{getApiErrorMessage(error, fallback)}</ErrorState> : null }

function formatDate(value: string) { return formatDisplayDate(value) }

const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
