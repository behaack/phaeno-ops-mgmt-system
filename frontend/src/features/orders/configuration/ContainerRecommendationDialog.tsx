import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { previewContainerRecommendation, type ContainerRecommendation, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { ContainerField, ContainerFieldError } from './ShippingContainerEditor'
import { containerEffectiveState } from './shipping-container-utils'

const availabilityValue = z.string().trim().refine(value => value === '' || /^\d+$/.test(value) && Number.isSafeInteger(Number(value)), 'Enter zero or a positive whole number, or leave blank for unknown.')
const previewSchema = z.object({
  tubeCount: z.coerce.number().int('Enter a whole number of tubes.').positive('Enter at least one tube.'),
  sampleTypeId: z.string().uuid('Choose one Sample type.'),
  availability: z.record(z.string(), availabilityValue),
})
type Values = z.output<typeof previewSchema>

export function ContainerRecommendationDialog({ definitions, configuration, draftDefinition, onClose }: {
  definitions: ShippingContainerDefinition[]
  configuration: SampleShippingConfiguration
  draftDefinition?: ShippingContainerDefinition
  onClose: () => void
}) {
  const __customerText = useCustomerText()

  const includeDraft = Boolean(draftDefinition && !draftDefinition.isActive && !draftDefinition.deactivatedAt && (!draftDefinition.effectiveTo || new Date(draftDefinition.effectiveTo).getTime() > Date.now()))
  const allCandidates = definitions.filter(item => containerEffectiveState(item) === 'Active now' || includeDraft && item.id === draftDefinition?.id)
  if (includeDraft && draftDefinition && !allCandidates.some(item => item.id === draftDefinition.id)) allCandidates.push(draftDefinition)
  const sampleTypes = [...new Map(configuration.sampleTypes.filter(item => item.isActive)
    .sort((a, b) => a.revision - b.revision).map(item => [item.definitionKey, item])).values()]
  const form = useForm<z.input<typeof previewSchema>, unknown, Values>({
    resolver: zodResolver(previewSchema),
    defaultValues: { tubeCount: '', sampleTypeId: draftDefinition?.sampleTypeAnchorId ?? '', availability: Object.fromEntries(allCandidates.map(item => [item.id, ''])) },
  })
  const __modalGuard = useModalDraftGuard(form.formState.isDirty, form.formState.isSubmitting)

  const preview = useMutation({
    mutationFn: (values: Values) => {
      const availability = Object.entries(values.availability).filter(([, value]) => value !== '').map(([containerDefinitionId, quantity]) => ({ containerDefinitionId, quantity: Number(quantity) }))
      return previewContainerRecommendation({
        tubeCount: values.tubeCount,
        contexts: [{ sampleTypeDefinitionId: values.sampleTypeId }],
        ...(availability.length ? { availability } : {}),
        ...(includeDraft && draftDefinition ? { includeDraftDefinitionId: draftDefinition.id } : {}),
      })
    },
  })
  const selectedSampleTypeId = form.watch('sampleTypeId')
  const selectedType = configuration.sampleTypes.find(item => item.id === selectedSampleTypeId)
  const selectedAnchorId = selectedType && configuration.sampleTypes.find(item => item.definitionKey === selectedType.definitionKey && item.revision === 1)?.id
  const candidates = allCandidates.filter(item => selectedAnchorId && item.sampleTypeAnchorId === selectedAnchorId)
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (open) (open => { if (!open && !preview.isPending) onClose() })(open); else void __modalGuard.close(() => (open => { if (!open && !preview.isPending) onClose() })(false)) }}><DialogContent className="max-w-2xl">
    <DialogHeader><DialogTitle><CustomerText message="m_83efd961fce9" /></DialogTitle><DialogDescription><CustomerText message="m_fb9ba0d4e78b" /></DialogDescription></DialogHeader>
    {preview.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_92c2635cb7b0" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(preview.error, 'Review the context and available quantities, then try again.')} />}</AlertDescription></Alert> : null}
    <form id="container-recommendation-preview" className="space-y-5" noValidate onChangeCapture={() => preview.reset()} onSubmit={form.handleSubmit(values => { if (!preview.isPending) preview.mutate(values) })}>
      {draftDefinition ? <p className="rounded-md border bg-muted/40 p-3 text-sm">{includeDraft ? <CustomerSourceText source={"Including draft"} /> : __customerText('m_afe773e42fa0')} {draftDefinition.commonName} <CustomerText message="m_ce92c91a9097" />{draftDefinition.sku} <CustomerText message="m_3b0e4579f573" />{draftDefinition.revision} <CustomerText message="m_4341fd3d93d3" /></p> : null}
      <ContainerField id="container-preview-tubes" label={__customerText('m_4720e14cbe0a')} required error={errors.tubeCount?.message}><Input id="container-preview-tubes" type="number" min={1} step={1} className="max-w-32" disabled={preview.isPending} aria-invalid={Boolean(errors.tubeCount)} aria-describedby={errors.tubeCount ? "container-preview-tubes-error" : undefined} {...form.register('tubeCount')} /></ContainerField>
      <ContainerField id="container-preview-sample-type" label={__customerText('m_1e3f2e3f87c9')} required error={errors.sampleTypeId?.message}><NativeSelect id="container-preview-sample-type" className="w-full" disabled={preview.isPending} {...form.register('sampleTypeId')}><option value=""><CustomerText message="m_823d33011757" /></option>{sampleTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></ContainerField>
      <fieldset><legend className="text-sm font-medium"><CustomerText message="m_087de845c155" /></legend><p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_b113fa70a16b" /></p>
        <div className="mt-2 divide-y rounded-md border px-3">{candidates.map(item => <div key={item.id} className="py-3"><PortalField className="flex flex-wrap justify-between"><Label htmlFor={`available-${item.id}`} className="block min-w-0 flex-1 wrap-anywhere">{item.commonName}<span className="mt-1 block text-xs font-normal text-muted-foreground"><CustomerText message="m_7370f6c81297" />{item.sku} · {item.tubeCapacity} <CustomerText message="m_4395a5c8bfad" /></span></Label><Input id={`available-${item.id}`} type="number" min={0} step={1} className="w-24" placeholder={__customerText('m_b764cdc0eab7')} disabled={preview.isPending} aria-label={__customerText('m_710ee61f7202', { p0: String(item.commonName), p1: String(item.sku) })} aria-invalid={Boolean(errors.availability?.[item.id])} aria-describedby={errors.availability?.[item.id] ? `available-${item.id}-error` : undefined} {...form.register(`availability.${item.id}`)} /></PortalField><ContainerFieldError id={`available-${item.id}-error`} message={errors.availability?.[item.id]?.message} /></div>)}{!candidates.length ? <p className="py-4 text-sm text-muted-foreground"><CustomerText message="m_acd9d901ee99" /></p> : null}</div>
      </fieldset>
      {preview.data ? <ContainerRecommendationResult result={preview.data} /> : null}
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={preview.isPending} onClick={() => { void __modalGuard.close(() => (onClose)()) }}><CustomerText message="m_7d9eb7acb13e" /></Button><Button type="submit" form="container-recommendation-preview" disabled={preview.isPending}>{preview.isPending ? <CustomerSourceText source={"Calculating…"} /> : __customerText('m_c59e912c5d19')}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

export function ContainerRecommendationResult({ result }: { result: ContainerRecommendation }) {
  const __customerText = useCustomerText()

  return <section className="space-y-3 border-t pt-4" aria-label={__customerText('m_e382350decc1')} aria-live="polite">
    <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium"><CustomerText message="m_10d622c1aade" /></h3><Badge variant={result.isComplete ? "secondary" : "destructive"}>{result.isComplete ? <CustomerSourceText source={"All tubes fit"} /> : __customerText('m_419d64afa56c', { p0: String(result.unallocatedTubes) })}</Badge></div>
    <p className="text-sm">{result.tubeCount} <CustomerText message="m_2fb19d7bbf61" />{result.containerCount} <CustomerText message="m_0dbf35257d8c" />{result.totalCapacity} <CustomerText message="m_74077fee9b7f" />{result.unusedCapacity} <CustomerText message="m_a3577cbf87fa" /></p>
    {result.containers.length ? <ul className="divide-y">{result.containers.map(item => <li key={item.containerDefinitionId} className="py-2 text-sm"><p className="font-medium">{item.quantity} × {item.commonName}</p><p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_7370f6c81297" />{item.sku} · {item.capacity} <CustomerText message="m_7db6aec8f0ba" /></p><p className="mt-1">{item.assignedTubes} <CustomerText message="m_e1b9cdb88511" />{item.unusedCapacity} <CustomerText message="m_a3577cbf87fa" /></p></li>)}</ul> : null}
    <p className="text-sm text-muted-foreground">{result.explanation}</p>
    <p className="text-xs text-muted-foreground"><CustomerText message="m_6104dee85fb8" /></p>
  </section>
}
