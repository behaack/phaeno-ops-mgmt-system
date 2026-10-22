import { EmptyState } from '#/components/ui/content-state'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { RecordPagination } from '#/components/RecordPagination'
import { useScopedRecordPage } from '#/components/use-scoped-record-page'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { CustomerText, useCustomerText, useCustomerDateFormatter } from '#/features/customer-i18n/customer-text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  getApiErrorMessage,
  listTenantActivityPage,
  listTenantGovernanceIncidentsPage,
  submitTenantGovernanceAttestation,
  type TenantGovernanceIncident,
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
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'

const attestationSchema = z.object({
  notes: z.string().trim().min(1, 'Remediation details are required.').max(4000),
})

type AttestationValues = z.infer<typeof attestationSchema>

export function GovernanceNoticePanel({
  apiEnabled,
  isOrganizationAdmin,
  selectedOrganizationId,
  selectedDepartmentId,
}: {
  apiEnabled: boolean
  isOrganizationAdmin: boolean
  selectedOrganizationId: string | null
  selectedDepartmentId?: string | null
}) {
  const __customerText = useCustomerText()
  const dates = useCustomerDateFormatter()
  const timestamps = useCustomerDateFormatter(true)

  const queryClient = useQueryClient()
  const [attestingIncident, setAttestingIncident] = useState<TenantGovernanceIncident | null>(null)
  const incidentsQuerySelection = useScopedRecordPage(`${selectedOrganizationId}:${selectedDepartmentId}`)
  const incidentsQueryPage = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, 'governance-incidents', `${selectedOrganizationId}:${selectedDepartmentId}`, incidentsQuerySelection.page],
    queryFn: () => listTenantGovernanceIncidentsPage(incidentsQuerySelection.page),
    enabled: apiEnabled,
  })
  const incidentsQuery = { ...incidentsQueryPage, data: incidentsQueryPage.isError ? undefined : incidentsQueryPage.data?.items }
  const activityQuerySelection = useScopedRecordPage(`${selectedOrganizationId}:${selectedDepartmentId}`)
  const activityQueryPage = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, 'activity', `${selectedOrganizationId}:${selectedDepartmentId}`, activityQuerySelection.page],
    queryFn: () => listTenantActivityPage(activityQuerySelection.page),
    enabled: apiEnabled,
  })
  const activityQuery = { ...activityQueryPage, data: activityQueryPage.isError ? undefined : activityQueryPage.data?.items }
  const form = useForm<AttestationValues>({
    resolver: zodResolver(attestationSchema),
    defaultValues: { notes: '' },
  })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting)

  const mutation = useMutation({
    mutationFn: ({ incident, values }: { incident: TenantGovernanceIncident; values: AttestationValues }) =>
      submitTenantGovernanceAttestation({
        incidentId: incident.id,
        notes: values.notes,
        version: incident.version,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['curated-data', selectedOrganizationId, 'governance-incidents'] }),
        queryClient.invalidateQueries({ queryKey: ['curated-data', selectedOrganizationId, 'activity'] }),
      ])
      form.reset()
      setAttestingIncident(null)
    },
  })

  const activeIncidents = (incidentsQuery.data ?? []).filter(
    (incident) => incident.organizationStatus === 'Blocked'
      || incident.organizationStatus === 'AwaitingAttestation',
  )

  if (!apiEnabled) {
    return null
  }

  return (
    <>
      {activeIncidents.map((incident) => (
        <Alert key={incident.id} variant="destructive" className="mb-4">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>
            {incident.organizationStatus === 'Blocked'
              ? <CustomerSourceText source="Curated data access is temporarily paused" />
              : __customerText('m_5f2c18e67914')}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="m-0">{incident.externalGuidance}</p>
            {incident.organizationStatus === 'AwaitingAttestation' ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span><CustomerText message="m_834d6f6a2b14" />{dates.format(new Date(incident.attestationDueAt))}.</span>
                {isOrganizationAdmin ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setAttestingIncident(incident)}>
                    <CustomerText message="m_5728818ab1b2" /></Button>
                ) : (
                  <span><CustomerText message="m_ed09dca76f3f" /></span>
                )}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ))}

      <RecordPagination label={__customerText('governance_attention_pages')} data={incidentsQueryPage.isError ? undefined : incidentsQueryPage.data} busy={incidentsQueryPage.isFetching} onPage={incidentsQuerySelection.setPage} />
      {incidentsQuery.error ? (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertTitle><CustomerText message="m_733f935ce0bb" /></AlertTitle>
          <AlertDescription><CustomerSourceText source={getApiErrorMessage(incidentsQuery.error, 'Try again or contact Phaeno support.')} /></AlertDescription>
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Bell aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <CardTitle><CustomerText message="m_3d2dfdbdd955" /></CardTitle>
              <CardDescription>
                <CustomerText message="m_05bded18185a" /></CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(activityQuery.data ?? []).map((notice) => (
            <div key={notice.id} className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 text-sm font-medium">{notice.subject}</p>
                <Badge variant="outline">{notice.kind}</Badge>
              </div>
              <p className="m-0 mt-1 text-sm text-muted-foreground">{notice.body}</p>
              <p className="m-0 mt-2 text-xs text-muted-foreground">{timestamps.format(new Date(notice.createdAt))}</p>
            </div>
          ))}
          {!activityQuery.isLoading && !activityQuery.isError && activityQueryPage.data?.totalCount === 0 ? (
            <EmptyState  kind="empty" title={<>
              <CustomerText message="m_7b52d70bb96c" /></>} />
          ) : null}
          <RecordPagination label={__customerText('data_activity_pages')} data={activityQueryPage.isError ? undefined : activityQueryPage.data} busy={activityQueryPage.isFetching} onPage={activityQuerySelection.setPage} />
          {activityQuery.error ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              <CustomerSourceText source={getApiErrorMessage(activityQuery.error, 'Data activity could not be loaded.')} />
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(attestingIncident)} onOpenChange={open => { if (open) ((open) => !open && setAttestingIncident(null))(open); else void __modalGuard.close(() => ((open) => !open && setAttestingIncident(null))(false)) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><CustomerText message="m_16976dba1a15" /></DialogTitle>
            <DialogDescription>
              <CustomerText message="m_c9b8d6760d4c" /></DialogDescription>
          </DialogHeader>
          {attestingIncident ? (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ incident: attestingIncident, values }))}
            >
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">
                  <RequiredFieldName><CustomerText message="m_15b72350f1d1" /></RequiredFieldName>
                </span>
                <textarea className={textareaClass} rows={5} {...form.register('notes')} />
                {form.formState.errors.notes?.message ? (
                  <span className="text-sm text-destructive" role="alert"><CustomerSourceText source={form.formState.errors.notes.message} /></span>
                ) : null}
              </label>
              {mutation.error ? (
                <Alert variant="destructive" role="alert">
                  <AlertTitle><CustomerText message="m_f31031e36bbb" /></AlertTitle>
                  <AlertDescription><CustomerSourceText source={getApiErrorMessage(mutation.error, 'Try again or contact Phaeno support.')} /></AlertDescription>
                </Alert>
              ) : null}
              <RequiredDialogFooter>
                <DialogClose asChild><Button type="button" variant="outline"><CustomerText message="m_19766ed6ccb2" /></Button></DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? <CustomerSourceText source={"Submitting"} /> : __customerText('m_5728818ab1b2')}
                </Button>
              </RequiredDialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
