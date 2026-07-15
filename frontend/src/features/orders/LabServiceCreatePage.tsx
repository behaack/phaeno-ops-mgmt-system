import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import { createLabOrder, getLabOrder, getOrderErrorMessage, submitLabOrder, updateLabOrder } from '#/api/order-management'
import { api } from '#/api/client'
import type { AnalysisDefinition } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

const sampleSchema = z.object({
  id: z.string().uuid().optional(),
  customerSampleId: z.string().trim().min(1, 'Sample identifier is required.').max(255),
  materialType: z.string().trim().min(1, 'Material type is required.').max(255),
  biologicalSource: z.string().trim().min(1, 'Biological source is required.').max(500),
  quantity: z.coerce.number().positive('Quantity must be greater than zero.'),
  quantityUnit: z.string().trim().min(1, 'Quantity unit is required.').max(100),
  storageRequirements: z.string().trim().min(1, 'Storage requirements are required.').max(2000),
  safetyDeclaration: z.string().trim().min(1, 'Safety declaration is required.').max(2000),
  concentration: z.union([z.coerce.number().nonnegative(), z.literal('')]).optional(),
  notes: z.string().trim().max(4000).optional(),
  analysisDefinitionIds: z.array(z.string().uuid()).min(1, 'Select at least one analysis.'),
})

const schema = z.object({
  customerReference: z.string().trim().max(255).optional(),
  samples: z.array(sampleSchema).min(1).max(100),
  prohibitedDataConfirmed: z.boolean().refine((value) => value, 'Confirm that this request contains no patient identifiers or PHI.'),
})

type FormValues = z.input<typeof schema>
type Values = z.output<typeof schema>

const emptySample: Values['samples'][number] = {
  customerSampleId: '', materialType: '', biologicalSource: '', quantity: 1, quantityUnit: 'tube',
  storageRequirements: '', safetyDeclaration: '', concentration: '', notes: '', analysisDefinitionIds: [],
}

export function LabServiceCreatePage({ orderId }: { orderId?: string }) {
  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const canCreate = Boolean(session?.capabilities.canCreateLabServiceRequests)
  const apiEnabled = canCreate && authProvider !== 'mock'
  const analyses = useQuery({
    queryKey: ['order-catalog', 'analyses'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: AnalysisDefinition[] }>('/order-catalog/analyses')
      return response.data.data
    },
    enabled: apiEnabled,
  })
  const existingOrder = useQuery({ queryKey: ['lab-service-order', orderId], queryFn: () => getLabOrder(orderId!), enabled: apiEnabled && Boolean(orderId) })
  const form = useForm<FormValues, unknown, Values>({ resolver: zodResolver(schema), defaultValues: { customerReference: '', samples: [emptySample], prohibitedDataConfirmed: false } })
  const samples = useFieldArray({ control: form.control, name: 'samples' })
  useEffect(() => {
    if (!existingOrder.data) return
    form.reset({
      customerReference: existingOrder.data.customerReference ?? '',
      prohibitedDataConfirmed: true,
      samples: existingOrder.data.samples.map((sample) => ({
        id: sample.id,
        customerSampleId: sample.customerSampleId,
        materialType: sample.materialType,
        biologicalSource: sample.biologicalSource,
        quantity: sample.quantity,
        quantityUnit: sample.quantityUnit,
        storageRequirements: sample.storageRequirements,
        safetyDeclaration: sample.safetyDeclaration,
        concentration: sample.concentration ?? '',
        notes: sample.notes ?? '',
        analysisDefinitionIds: readAnalysisIds(sample.analysisDefinitionIdsJson),
      })),
    })
  }, [existingOrder.data, form])
  const createMutation = useMutation({
    mutationFn: async ({ values, submit }: { values: Values; submit: boolean }) => {
      const input = {
        customerReference: values.customerReference,
        samples: values.samples.map((sample) => ({ ...sample, concentration: sample.concentration === '' ? null : sample.concentration })),
      }
      const order = orderId
        ? await updateLabOrder(orderId, { ...input, version: existingOrder.data!.version })
        : await createLabOrder(input)
      return submit ? submitLabOrder(order.id, order.version) : order
    },
    onSuccess: (order) => navigate({ to: '/lab-services/$orderId', params: { orderId: order.id } }),
  })

  if (!canCreate) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Request creation unavailable</AlertTitle><AlertDescription>An active Customer administrator is required.</AlertDescription></Alert></main>

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 max-w-3xl">
        <p className="text-sm text-muted-foreground"><Link to="/lab-services" className="hover:underline">Lab services</Link> / {orderId ? 'Edit request' : 'New request'}</p>
        <h1 className="mt-2 text-3xl font-semibold">{orderId ? 'Edit laboratory request' : 'Request laboratory service'}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Describe the job and each physical sample. Phaeno will review the scientific scope and issue job-specific pricing before work is placed.</p>
      </section>
      {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle>Creation is paused in mock-session mode</AlertTitle><AlertDescription>Connect a real Customer session to submit a laboratory request.</AlertDescription></Alert> : null}
      {existingOrder.data && !existingOrder.data.canEdit ? <Alert variant="destructive" className="mb-5"><AlertTitle>Request is no longer editable</AlertTitle><AlertDescription>Return to the request to review its current status.</AlertDescription></Alert> : null}
      {createMutation.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Request was not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(createMutation.error, 'Review the form and try again.')}</AlertDescription></Alert> : null}

      <form onSubmit={form.handleSubmit((values) => createMutation.mutate({ values, submit: true }))} noValidate className="space-y-5">
        <p className="text-sm text-muted-foreground"><span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> Required field</p>
        <Card><CardHeader><CardTitle>Job details</CardTitle><CardDescription>Use an internal reference that is useful to your organization. Do not enter patient names or identifiers.</CardDescription></CardHeader><CardContent><Label htmlFor="customerReference">Customer reference</Label><Input id="customerReference" {...form.register('customerReference')} className="mt-2 max-w-xl" /><FieldError message={form.formState.errors.customerReference?.message} /></CardContent></Card>

        {samples.fields.map((field, index) => (
          <Card key={field.id}>
            <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Sample {index + 1}</CardTitle><CardDescription>Scientific intake information and requested analyses.</CardDescription></div>{samples.fields.length > 1 ? <Button type="button" variant="ghost" size="icon" aria-label={`Remove sample ${index + 1}`} onClick={() => samples.remove(index)}><Trash2 /></Button> : null}</div></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer sample ID" id={`sample-${index}-id`} required error={form.formState.errors.samples?.[index]?.customerSampleId?.message}><Input id={`sample-${index}-id`} {...form.register(`samples.${index}.customerSampleId`)} /></Field>
                <Field label="Material type" id={`sample-${index}-material`} required error={form.formState.errors.samples?.[index]?.materialType?.message}><Input id={`sample-${index}-material`} {...form.register(`samples.${index}.materialType`)} placeholder="RNA, tissue, extract…" /></Field>
                <Field label="Biological source" id={`sample-${index}-source`} required error={form.formState.errors.samples?.[index]?.biologicalSource?.message}><Input id={`sample-${index}-source`} {...form.register(`samples.${index}.biologicalSource`)} /></Field>
                <div className="grid grid-cols-2 gap-3"><Field label="Quantity" id={`sample-${index}-quantity`} required error={form.formState.errors.samples?.[index]?.quantity?.message}><Input id={`sample-${index}-quantity`} type="number" step="any" {...form.register(`samples.${index}.quantity`)} /></Field><Field label="Unit" id={`sample-${index}-unit`} required error={form.formState.errors.samples?.[index]?.quantityUnit?.message}><Input id={`sample-${index}-unit`} {...form.register(`samples.${index}.quantityUnit`)} /></Field></div>
                <Field label="Concentration (optional)" id={`sample-${index}-concentration`} error={form.formState.errors.samples?.[index]?.concentration?.message}><Input id={`sample-${index}-concentration`} type="number" step="any" {...form.register(`samples.${index}.concentration`)} /></Field>
              </div>
              <Field label="Storage requirements" id={`sample-${index}-storage`} required error={form.formState.errors.samples?.[index]?.storageRequirements?.message}><textarea id={`sample-${index}-storage`} {...form.register(`samples.${index}.storageRequirements`)} className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field>
              <Field label="Safety declaration" id={`sample-${index}-safety`} required error={form.formState.errors.samples?.[index]?.safetyDeclaration?.message}><textarea id={`sample-${index}-safety`} {...form.register(`samples.${index}.safetyDeclaration`)} className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" /></Field>
              <fieldset><legend className="text-sm font-medium">Requested analyses <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{(analyses.data ?? []).map((analysis) => <label key={analysis.id} className="flex cursor-pointer items-start gap-2 rounded-lg border p-3"><input type="checkbox" value={analysis.id} {...form.register(`samples.${index}.analysisDefinitionIds`)} className="mt-0.5 size-4 accent-primary" /><span><span className="block text-sm font-medium">{analysis.name}</span><span className="block text-xs text-muted-foreground">{analysis.description}</span></span></label>)}</div><FieldError message={form.formState.errors.samples?.[index]?.analysisDefinitionIds?.message} /></fieldset>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={() => samples.append({ ...emptySample, analysisDefinitionIds: [] })}><Plus data-icon="inline-start" />Add sample</Button>
        <Card><CardHeader><CardTitle>Review and submit</CardTitle><CardDescription>Submission requests pricing; it does not authorize laboratory work. Work begins only after an issued quote is accepted.</CardDescription></CardHeader><CardContent><div className="flex cursor-pointer items-start gap-3"><Checkbox id="labProhibitedData" checked={form.watch('prohibitedDataConfirmed')} onCheckedChange={(checked) => form.setValue('prohibitedDataConfirmed', checked === true, { shouldValidate: true, shouldDirty: true })} /><Label htmlFor="labProhibitedData" className="cursor-pointer text-sm font-normal">I confirm that this request and its sample identifiers contain no patient identifiers, PHI, or unnecessary personal data. <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span></Label></div><FieldError message={form.formState.errors.prohibitedDataConfirmed?.message} /></CardContent></Card>
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" asChild><Link to={orderId ? '/lab-services/$orderId' : '/lab-services'} params={orderId ? { orderId } : undefined}>Cancel</Link></Button><Button type="button" variant="secondary" disabled={!apiEnabled || createMutation.isPending || (Boolean(orderId) && !existingOrder.data?.canEdit)} onClick={form.handleSubmit((values) => createMutation.mutate({ values, submit: false }))}>{createMutation.isPending ? 'Saving…' : 'Save draft'}</Button><Button type="submit" disabled={!apiEnabled || createMutation.isPending || (Boolean(orderId) && !existingOrder.data?.canSubmit)}>{createMutation.isPending ? 'Submitting request…' : 'Submit request for pricing'}</Button></div>
      </form>
    </main>
  )
}

function Field({ label, id, required, error, children }: { label: string; id: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div><Label htmlFor={id}>{label}{required ? <span className="ml-1 text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> : null}</Label><div className="mt-2">{children}</div><FieldError message={error} /></div>
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-destructive" role="alert">{message}</p> : null
}

function readAnalysisIds(value: string) { try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [] } catch { return [] } }
