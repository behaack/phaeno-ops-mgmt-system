import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, Pencil, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  fileManagementErrorMessage,
  getReleasedDeliverablePolicy,
  updateReleasedDeliverablePolicy,
  type ReleasedDeliverablePolicyConfiguration,
} from '#/api/file-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

const policySchema = z.object({
  standardRetentionDays: z.number().int('Enter a whole number of days.').positive('Retention must be at least 1 day.'),
  undownloadedWarningLeadDays: z.number().int('Enter a whole number of days.').positive('Warning lead must be at least 1 day.'),
  undownloadedGraceDays: z.number().int('Enter a whole number of days.').positive('Grace must be at least 1 day.'),
  reason: z.string().trim().min(1, 'Enter a reason for this change.').max(2000, 'Keep the reason to 2,000 characters or fewer.'),
}).superRefine((values, context) => {
  if (values.undownloadedWarningLeadDays >= values.standardRetentionDays) {
    context.addIssue({
      code: 'custom',
      path: ['undownloadedWarningLeadDays'],
      message: 'Warning lead must be shorter than standard retention.',
    })
  }
})

type PolicyFormValues = z.infer<typeof policySchema>

export function FileManagementPage() {
  const { authProvider, session } = usePhaenoSession()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const canManage = Boolean(session?.capabilities.canManageFileManagementConfiguration)
  const apiEnabled = canManage && authProvider !== 'mock'
  const query = useQuery({
    queryKey: ['released-deliverable-policy'],
    queryFn: getReleasedDeliverablePolicy,
    enabled: apiEnabled,
  })
  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      standardRetentionDays: 30,
      undownloadedWarningLeadDays: 5,
      undownloadedGraceDays: 5,
      reason: '',
    },
  })
  const mutation = useMutation({
    mutationFn: (values: PolicyFormValues) => updateReleasedDeliverablePolicy({
      ...values,
      reason: values.reason.trim(),
      version: query.data!.global.version,
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(['released-deliverable-policy'], data)
      setEditOpen(false)
      setSaved(true)
    },
  })

  function openEditor(configuration: ReleasedDeliverablePolicyConfiguration) {
    form.reset({
      ...configuration.global.values,
      reason: '',
    })
    mutation.reset()
    setSaved(false)
    setEditOpen(true)
  }

  if (!canManage) {
    return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>File management unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>
  }

  const configuration = query.data
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">File management</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Control the retention schedule applied to future released result and output packages.
          </p>
        </div>
        {configuration ? (
          <Button type="button" onClick={() => openEditor(configuration)}>
            <Pencil data-icon="inline-start" />Edit global policy
          </Button>
        ) : null}
      </section>

      {authProvider === 'mock' ? (
        <Alert>
          <AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle>
          <AlertDescription>Use a real Phaeno session to load and change file-management configuration.</AlertDescription>
        </Alert>
      ) : null}
      {query.error ? (
        <Alert variant="destructive">
          <AlertTitle>Retention policy could not be loaded</AlertTitle>
          <AlertDescription>{fileManagementErrorMessage(query.error, 'Try refreshing this page.')}</AlertDescription>
        </Alert>
      ) : null}
      {saved ? (
        <Alert>
          <ShieldCheck />
          <AlertTitle>Global policy updated</AlertTitle>
          <AlertDescription>Existing released packages keep their previously snapshotted deadlines.</AlertDescription>
        </Alert>
      ) : null}
      {query.isLoading ? <p role="status">Loading file-management configuration…</p> : null}

      {configuration ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Global released-deliverable policy</h2>
              </CardTitle>
              <CardDescription>
                <span>Revision {configuration.global.revision}</span>. One configured day is an exact 24-hour interval from release.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <PolicyValue label="Standard retention" value={configuration.global.values.standardRetentionDays} />
                <PolicyValue label="Undownloaded warning lead" value={configuration.global.values.undownloadedWarningLeadDays} />
                <PolicyValue label="Conditional grace" value={configuration.global.values.undownloadedGraceDays} />
              </div>
              <p className="text-sm text-muted-foreground">
                If every file has been downloaded before the standard deadline, the package is deleted then. If any file remains undownloaded, the whole package receives the configured grace period before deletion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Policy history</h2>
              </CardTitle>
              <CardDescription>Prior revisions remain available for audit and never recalculate an existing package.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {configuration.globalHistory.map((version) => (
                  <div key={version.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">Revision {version.revision}</span>
                        <Badge variant={version.isActive ? 'secondary' : 'outline'}>{version.isActive ? 'Current' : 'Replaced'}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{version.changeReason}</p>
                    </div>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {version.values.standardRetentionDays} / {version.values.undownloadedWarningLeadDays} / {version.values.undownloadedGraceDays} days · {formatDateTime(version.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Dialog open={editOpen} onOpenChange={(open) => !mutation.isPending && setEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit global retention policy</DialogTitle>
            <DialogDescription>
              This change applies only to packages released afterward. Existing package deadlines do not move.
            </DialogDescription>
          </DialogHeader>
          <form id="global-retention-policy-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <p className="text-sm text-muted-foreground"><span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> Required fields</p>
            <NumberField form={form} name="standardRetentionDays" label="Standard retention (days)" />
            <NumberField form={form} name="undownloadedWarningLeadDays" label="Undownloaded warning lead (days)" />
            <NumberField form={form} name="undownloadedGraceDays" label="Conditional grace (days)" />
            <div>
              <Label htmlFor="global-policy-reason">Change reason <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></Label>
              <textarea
                id="global-policy-reason"
                className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                required
                aria-invalid={Boolean(form.formState.errors.reason)}
                aria-describedby={form.formState.errors.reason ? 'global-policy-reason-error' : undefined}
                {...form.register('reason')}
              />
              {form.formState.errors.reason ? <p id="global-policy-reason-error" role="alert" className="mt-1 text-sm text-destructive">{form.formState.errors.reason.message}</p> : null}
            </div>
          </form>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Policy was not saved</AlertTitle>
              <AlertDescription>{fileManagementErrorMessage(mutation.error, 'Reload the policy and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" form="global-retention-policy-form" disabled={!form.formState.isDirty || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function PolicyValue({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border p-4"><Clock3 className="mb-3 size-4 text-muted-foreground" aria-hidden="true" /><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value} days</p></div>
}

function NumberField({ form, label, name }: {
  form: ReturnType<typeof useForm<PolicyFormValues>>
  label: string
  name: 'standardRetentionDays' | 'undownloadedWarningLeadDays' | 'undownloadedGraceDays'
}) {
  const error = form.formState.errors[name]
  const id = `global-policy-${name}`
  return <div><Label htmlFor={id}>{label} <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></Label><Input id={id} type="number" min={1} step={1} className="mt-2" required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...form.register(name, { valueAsNumber: true })} />{error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">{error.message}</p> : null}</div>
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
