import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  getApiErrorMessage,
  listTenantActivity,
  listTenantGovernanceIncidents,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

const attestationSchema = z.object({
  notes: z.string().trim().min(1, 'Remediation details are required.').max(4000),
})

type AttestationValues = z.infer<typeof attestationSchema>

export function GovernanceNoticePanel({
  apiEnabled,
  isOrganizationAdmin,
  selectedOrganizationId,
}: {
  apiEnabled: boolean
  isOrganizationAdmin: boolean
  selectedOrganizationId: string | null
}) {
  const queryClient = useQueryClient()
  const [attestingIncident, setAttestingIncident] = useState<TenantGovernanceIncident | null>(null)
  const incidentsQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, 'governance-incidents'],
    queryFn: listTenantGovernanceIncidents,
    enabled: apiEnabled,
  })
  const activityQuery = useQuery({
    queryKey: ['curated-data', selectedOrganizationId, 'activity'],
    queryFn: listTenantActivity,
    enabled: apiEnabled,
  })
  const form = useForm<AttestationValues>({
    resolver: zodResolver(attestationSchema),
    defaultValues: { notes: '' },
  })
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
              ? 'Curated data access is temporarily paused'
              : 'Action required for withdrawn curated data'}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="m-0">{incident.externalGuidance}</p>
            {incident.organizationStatus === 'AwaitingAttestation' ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>Attestation due {formatDate(incident.attestationDueAt)}.</span>
                {isOrganizationAdmin ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setAttestingIncident(incident)}>
                    Submit attestation
                  </Button>
                ) : (
                  <span>Ask an organization administrator to submit the required attestation.</span>
                )}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ))}

      {incidentsQuery.error ? (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertTitle>Governance status could not be loaded</AlertTitle>
          <AlertDescription>{getApiErrorMessage(incidentsQuery.error, 'Try again or contact Phaeno support.')}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Bell aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <CardTitle>Data activity</CardTitle>
              <CardDescription>
                Assignment, upgrade, revocation, and governance notices for this organization.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(activityQuery.data ?? []).slice(0, 20).map((notice) => (
            <div key={notice.id} className="rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 text-sm font-medium">{notice.subject}</p>
                <Badge variant="outline">{notice.kind}</Badge>
              </div>
              <p className="m-0 mt-1 text-sm text-muted-foreground">{notice.body}</p>
              <p className="m-0 mt-2 text-xs text-muted-foreground">{formatDateTime(notice.createdAt)}</p>
            </div>
          ))}
          {!activityQuery.isLoading && (activityQuery.data?.length ?? 0) === 0 ? (
            <p className="m-0 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No data-provisioning activity has been recorded for this organization.
            </p>
          ) : null}
          {activityQuery.error ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              {getApiErrorMessage(activityQuery.error, 'Data activity could not be loaded.')}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(attestingIncident)} onOpenChange={(open) => !open && setAttestingIncident(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit remediation attestation</DialogTitle>
            <DialogDescription>
              Confirm what your organization did with previously downloaded affected copies.
              Your identity and submission time are recorded.
            </DialogDescription>
          </DialogHeader>
          {attestingIncident ? (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => mutation.mutateAsync({ incident: attestingIncident, values }))}
            >
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">
                  Remediation details <span className="text-destructive">*</span>
                </span>
                <textarea className={textareaClass} rows={5} {...form.register('notes')} />
                {form.formState.errors.notes?.message ? (
                  <span className="text-sm text-destructive" role="alert">{form.formState.errors.notes.message}</span>
                ) : null}
              </label>
              {mutation.error ? (
                <Alert variant="destructive" role="alert">
                  <AlertTitle>Attestation could not be submitted</AlertTitle>
                  <AlertDescription>{getApiErrorMessage(mutation.error, 'Try again or contact Phaeno support.')}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Submitting' : 'Submit attestation'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const textareaClass = 'min-h-20 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
