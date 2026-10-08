import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  apiErrorMessage,
  listDepartments,
  listEntitlements,
  type RelationshipRequest,
  type RequestedServiceEntitlement,
  type ServiceEntitlement,
} from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { selectClass, textareaClass } from '#/features/organizations/OrganizationFormDialog'

const grantSchema = z.object({
  service: z.enum(['PSeqLabService', 'PSeqKit']),
  departmentId: z.string(),
  effectiveFrom: z.string().min(1, 'Select a start date.'),
  effectiveTo: z.string(),
  configurationStatus: z.enum(['Pending', 'Ready', 'Blocked']),
  existingEntitlementId: z.string(),
}).superRefine((grant, context) => {
  const start = new Date(grant.effectiveFrom).getTime()
  if (!Number.isFinite(start)) context.addIssue({ code: 'custom', path: ['effectiveFrom'], message: 'Select a valid start date.' })
  if (grant.effectiveTo && (!Number.isFinite(new Date(grant.effectiveTo).getTime()) || new Date(grant.effectiveTo).getTime() <= start))
    context.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'End must be after the start.' })
})

const schema = z.object({ approvalNote: z.string().trim().max(2000), grants: z.array(grantSchema).min(1) })
type Values = z.infer<typeof schema>

function localDate(value: string | Date) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function permissionFor(entitlements: ServiceEntitlement[], service: Values['grants'][number]['service'], departmentId: string) {
  const matches = entitlements.filter(item => item.service === service
    && (item.departmentId ?? '') === departmentId && !item.endReason)
  return matches.length === 1 ? matches[0] : undefined
}

function valuesFor(request: RelationshipRequest, entitlements: ServiceEntitlement[]): Values {
  const now = localDate(new Date())
  return {
    approvalNote: '',
    grants: request.requestedServices.map(service => {
      const linked = entitlements.find(item => item.service === service && item.sourceRequestId === request.id && !item.endReason)
      const existing = linked ?? permissionFor(entitlements, service, '')
      return {
        service,
        departmentId: existing?.departmentId ?? '',
        effectiveFrom: existing ? localDate(existing.effectiveFrom) : now,
        effectiveTo: existing?.effectiveTo ? localDate(existing.effectiveTo) : '',
        configurationStatus: existing?.configurationStatus ?? 'Pending',
        existingEntitlementId: existing?.id ?? '',
      }
    }),
  }
}

export function ServiceRequestEntitlementsDialog({ request, mode, error, isPending, onOpenChange, onSubmit }: {
  request: RelationshipRequest
  mode: 'approve' | 'setup'
  error?: unknown
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { approvalNote: string; serviceEntitlements: RequestedServiceEntitlement[] }) => void
}) {
  const organizationId = request.organizationId
  const entitlements = useQuery({
    queryKey: ['organization-entitlements', organizationId],
    queryFn: () => listEntitlements(organizationId!),
    enabled: Boolean(organizationId),
    refetchOnMount: 'always',
  })
  const departments = useQuery({
    queryKey: ['organization-departments', organizationId, false],
    queryFn: () => listDepartments(organizationId!, false),
    enabled: Boolean(organizationId),
    refetchOnMount: 'always',
  })
  const initialized = useRef(false)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesFor(request, []) })
  useEffect(() => {
    if (initialized.current || entitlements.isFetching || departments.isFetching || !entitlements.data || !departments.data) return
    form.reset(valuesFor(request, entitlements.data))
    initialized.current = true
  }, [departments.data, departments.isFetching, entitlements.data, entitlements.isFetching, form, request])

  const busy = isPending || !organizationId || entitlements.isPending || departments.isPending
    || entitlements.isFetching || departments.isFetching || !initialized.current
  const grants = form.watch('grants')
  const available = entitlements.data ?? []

  function chooseExisting(index: number, id: string) {
    const selected = available.find(item => item.id === id)
    form.setValue(`grants.${index}.existingEntitlementId`, id, { shouldValidate: true })
    form.setValue(`grants.${index}.effectiveFrom`, selected ? localDate(selected.effectiveFrom) : localDate(new Date()), { shouldValidate: true })
    form.setValue(`grants.${index}.effectiveTo`, selected?.effectiveTo ? localDate(selected.effectiveTo) : '', { shouldValidate: true })
    form.setValue(`grants.${index}.configurationStatus`, selected?.configurationStatus ?? 'Pending', { shouldValidate: true })
  }

  return <Dialog open onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{mode === 'approve' ? 'Approve and set up services' : 'Set up approved services'}</DialogTitle>
        <DialogDescription>
          Request {request.requestNumber} for {request.candidateOrganizationName}. Save the approved service scope here.
          Ready enables a current permission; Pending leaves a setup task in this request. A future start waits until that date.
        </DialogDescription>
      </DialogHeader>
      {!organizationId ? <Alert variant="destructive"><AlertDescription>This request has no Company access scope. Complete Company access setup before saving services.</AlertDescription></Alert> : null}
      {entitlements.error || departments.error || error ? <Alert variant="destructive"><AlertDescription className="space-y-2">
        <p>{apiErrorMessage(error ?? entitlements.error ?? departments.error)}</p>
        {entitlements.error || departments.error ? <Button type="button" size="sm" variant="outline" onClick={() => {
          if (entitlements.error) void entitlements.refetch()
          if (departments.error) void departments.refetch()
        }}>Retry loading</Button> : null}
      </AlertDescription></Alert> : null}
      {busy && organizationId && !entitlements.error && !departments.error ? <p role="status" className="text-sm text-muted-foreground">Loading current service permissions and Departments…</p> : null}
      {!busy ? <form id="service-request-entitlements" className="space-y-5" noValidate onSubmit={form.handleSubmit(values => {
        onSubmit({
          approvalNote: values.approvalNote,
          serviceEntitlements: values.grants.map(grant => {
            const existing = available.find(item => item.id === grant.existingEntitlementId)
            return {
              service: grant.service,
              departmentId: grant.departmentId || null,
              effectiveFrom: new Date(grant.effectiveFrom).toISOString(),
              effectiveTo: grant.effectiveTo ? new Date(grant.effectiveTo).toISOString() : null,
              configurationStatus: grant.configurationStatus,
              existingEntitlementId: existing?.id ?? null,
              existingEntitlementVersion: existing?.version ?? null,
            }
          }),
        })
      })}>
        {grants.map((grant, index) => {
          const candidates = available.filter(item => item.service === grant.service
            && (item.departmentId ?? '') === grant.departmentId && !item.endReason)
          const name = grant.service === 'PSeqLabService' ? 'PSeq Lab Service' : 'PSeq Kit (includes data assembly)'
          return <fieldset key={grant.service} className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 font-medium">{name}</legend>
            <div className="grid gap-1.5">
              <Label htmlFor={`service-department-${index}`}><RequiredFieldName>Applies to</RequiredFieldName></Label>
              <select id={`service-department-${index}`} className={selectClass} value={grant.departmentId}
                onChange={event => {
                  const departmentId = event.target.value
                  form.setValue(`grants.${index}.departmentId`, departmentId, { shouldValidate: true })
                  const match = permissionFor(available, grant.service, departmentId)
                  chooseExisting(index, match?.id ?? '')
                }}>
                <option value="">All departments (Company default)</option>
                {(departments.data ?? []).filter(department => department.isActive).map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
            {candidates.length ? <div className="grid gap-1.5">
              <Label htmlFor={`service-existing-${index}`}>Existing permission</Label>
              <select id={`service-existing-${index}`} className={selectClass} value={grant.existingEntitlementId}
                onChange={event => chooseExisting(index, event.target.value)}>
                <option value="">Create a new permission</option>
                {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>
                  Update existing · {new Date(candidate.effectiveFrom).toLocaleDateString()} · {candidate.configurationStatus}
                </option>)}
              </select>
              <p className="text-xs text-muted-foreground">Update an existing overlapping permission to avoid a duplicate. Its current dates and status are loaded for review.</p>
            </div> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`service-start-${index}`}><RequiredFieldName>Effective from</RequiredFieldName></Label>
                <Input id={`service-start-${index}`} type="datetime-local" aria-invalid={Boolean(form.formState.errors.grants?.[index]?.effectiveFrom)} {...form.register(`grants.${index}.effectiveFrom`)} />
                {form.formState.errors.grants?.[index]?.effectiveFrom ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.grants[index]?.effectiveFrom?.message}</p> : null}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`service-end-${index}`}>Effective to (optional)</Label>
                <Input id={`service-end-${index}`} type="datetime-local" aria-invalid={Boolean(form.formState.errors.grants?.[index]?.effectiveTo)} {...form.register(`grants.${index}.effectiveTo`)} />
                {form.formState.errors.grants?.[index]?.effectiveTo ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.grants[index]?.effectiveTo?.message}</p> : null}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`service-status-${index}`}><RequiredFieldName>Service configuration</RequiredFieldName></Label>
              <select id={`service-status-${index}`} className={selectClass} {...form.register(`grants.${index}.configurationStatus`)}>
                <option value="Pending">Pending setup</option>
                <option value="Ready">Ready to use</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </fieldset>
        })}
        {mode === 'approve' ? <div className="grid gap-1.5">
          <Label htmlFor="service-approval-note">Approval note (optional)</Label>
          <textarea id="service-approval-note" className={textareaClass} rows={3} maxLength={2000} {...form.register('approvalNote')} />
        </div> : null}
      </form> : null}
      <RequiredDialogFooter showLegend>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Keep unchanged</Button>
        <Button type="submit" form="service-request-entitlements" disabled={busy || Boolean(entitlements.error || departments.error) || isPending}>
          {isPending ? 'Saving…' : mode === 'approve' ? 'Approve and save services' : 'Save services'}
        </Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}
