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
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { ContainerField, ContainerFieldError } from './ShippingContainerEditor'
import { containerEffectiveState } from './shipping-container-utils'

const availabilityValue = z.string().trim().refine(value => value === '' || /^\d+$/.test(value) && Number.isSafeInteger(Number(value)), 'Enter zero or a positive whole number, or leave blank for unknown.')
const previewSchema = z.object({
  tubeCount: z.coerce.number().int('Enter a whole number of tubes.').positive('Enter at least one tube.'),
  ruleIds: z.array(z.string()).min(1, 'Select the applicable sample and handling context.'),
  availability: z.record(z.string(), availabilityValue),
})
type Values = z.output<typeof previewSchema>

export function ContainerRecommendationDialog({ definitions, configuration, draftDefinition, onClose }: {
  definitions: ShippingContainerDefinition[]
  configuration: SampleShippingConfiguration
  draftDefinition?: ShippingContainerDefinition
  onClose: () => void
}) {
  const includeDraft = Boolean(draftDefinition && !draftDefinition.isActive && !draftDefinition.deactivatedAt && (!draftDefinition.effectiveTo || new Date(draftDefinition.effectiveTo).getTime() > Date.now()))
  const candidates = definitions.filter(item => containerEffectiveState(item) === 'Active now' || includeDraft && item.id === draftDefinition?.id)
  if (includeDraft && draftDefinition && !candidates.some(item => item.id === draftDefinition.id)) candidates.push(draftDefinition)
  const form = useForm<z.input<typeof previewSchema>, unknown, Values>({
    resolver: zodResolver(previewSchema),
    defaultValues: { tubeCount: '', ruleIds: draftDefinition?.compatibilities.map(value => value.instructionRuleId) ?? [], availability: Object.fromEntries(candidates.map(item => [item.id, ''])) },
  })
  const preview = useMutation({
    mutationFn: (values: Values) => {
      const availability = Object.entries(values.availability).filter(([, value]) => value !== '').map(([containerDefinitionId, quantity]) => ({ containerDefinitionId, quantity: Number(quantity) }))
      return previewContainerRecommendation({
        tubeCount: values.tubeCount,
        contexts: values.ruleIds.map(id => {
          const rule = configuration.instructionRules.find(value => value.id === id)
          if (!rule) throw new Error('An applicable handling rule is unavailable. Reload configuration before previewing.')
          return { sampleTypeDefinitionId: rule.sampleTypeDefinitionId, instructionRuleId: rule.id }
        }),
        ...(availability.length ? { availability } : {}),
        ...(includeDraft && draftDefinition ? { includeDraftDefinitionId: draftDefinition.id } : {}),
      })
    },
  })
  const selectedRules = form.watch('ruleIds')
  const errors = form.formState.errors
  return <Dialog open onOpenChange={open => { if (!open && !preview.isPending) onClose() }}><DialogContent className="max-w-2xl">
    <DialogHeader><DialogTitle>Preview recommendation</DialogTitle><DialogDescription>Compare containers for a tube count and handling context. This preview does not create kits, reserve stock, or create shipments.</DialogDescription></DialogHeader>
    {preview.error ? <Alert variant="destructive"><AlertTitle>Recommendation unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(preview.error, 'Review the context and available quantities, then try again.')}</AlertDescription></Alert> : null}
    <form id="container-recommendation-preview" className="space-y-5" noValidate onChangeCapture={() => preview.reset()} onSubmit={form.handleSubmit(values => { if (!preview.isPending) preview.mutate(values) })}>
      {draftDefinition ? <p className="rounded-md border bg-muted/40 p-3 text-sm">{includeDraft ? 'Including draft' : 'Using the handling context from'} {draftDefinition.commonName} · SKU {draftDefinition.sku} · revision {draftDefinition.revision} for this preview only.</p> : null}
      <ContainerField id="container-preview-tubes" label="Tubes to ship" required error={errors.tubeCount?.message}><Input id="container-preview-tubes" type="number" min={1} step={1} className="max-w-32" disabled={preview.isPending} aria-invalid={Boolean(errors.tubeCount)} aria-describedby={errors.tubeCount ? 'container-preview-tubes-error' : undefined} {...form.register('tubeCount')} /></ContainerField>
      <fieldset aria-describedby={errors.ruleIds ? 'container-preview-context-error' : undefined}>
        <legend className="text-sm font-medium"><RequiredFieldName>Sample and handling context</RequiredFieldName></legend>
        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
          {configuration.instructionRules.map(rule => <label key={rule.id} className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={selectedRules.includes(rule.id)} disabled={preview.isPending} onChange={event => form.setValue('ruleIds', event.target.checked ? [...selectedRules, rule.id] : selectedRules.filter(id => id !== rule.id), { shouldDirty: true, shouldValidate: true })} /><span className="min-w-0 wrap-anywhere">{rule.sampleTypeName} · {rule.destinationName}<span className="block text-xs text-muted-foreground">{rule.compatibilityGroup} · revision {rule.revision}{rule.isActive ? '' : ' · inactive'}</span></span></label>)}
          {!configuration.instructionRules.length ? <p className="text-sm text-muted-foreground">Configure a sample type and instruction rule before previewing.</p> : null}
        </div><ContainerFieldError id="container-preview-context-error" message={errors.ruleIds?.message} />
      </fieldset>
      <fieldset><legend className="text-sm font-medium">Available containers</legend><p className="mt-1 text-xs text-muted-foreground">Optional upper limits for this preview. Leave blank when availability is unknown; enter zero to exclude a size.</p>
        <div className="mt-2 divide-y rounded-md border px-3">{candidates.map(item => <div key={item.id} className="py-3"><div className="flex flex-wrap items-start justify-between gap-3"><Label htmlFor={`available-${item.id}`} className="block min-w-0 flex-1 wrap-anywhere">{item.commonName}<span className="mt-1 block text-xs font-normal text-muted-foreground">SKU {item.sku} · {item.tubeCapacity} tubes each</span></Label><Input id={`available-${item.id}`} type="number" min={0} step={1} className="w-24" placeholder="Unknown" disabled={preview.isPending} aria-label={`Available quantity of ${item.commonName} (${item.sku})`} aria-invalid={Boolean(errors.availability?.[item.id])} aria-describedby={errors.availability?.[item.id] ? `available-${item.id}-error` : undefined} {...form.register(`availability.${item.id}`)} /></div><ContainerFieldError id={`available-${item.id}-error`} message={errors.availability?.[item.id]?.message} /></div>)}{!candidates.length ? <p className="py-4 text-sm text-muted-foreground">No active container sizes are effective now. An inactive revision can be previewed from its detail page.</p> : null}</div>
      </fieldset>
      {preview.data ? <ContainerRecommendationResult result={preview.data} /> : null}
    </form>
    <RequiredDialogFooter><Button variant="outline" disabled={preview.isPending} onClick={onClose}>Close</Button><Button type="submit" form="container-recommendation-preview" disabled={preview.isPending}>{preview.isPending ? 'Calculating…' : 'Calculate recommendation'}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}

export function ContainerRecommendationResult({ result }: { result: ContainerRecommendation }) {
  return <section className="space-y-3 border-t pt-4" aria-label="Container recommendation" aria-live="polite">
    <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">Recommended containers</h3><Badge variant={result.isComplete ? 'secondary' : 'destructive'}>{result.isComplete ? 'All tubes fit' : `${result.unallocatedTubes} tubes unallocated`}</Badge></div>
    <p className="text-sm">{result.tubeCount} tubes · {result.containerCount} containers · {result.totalCapacity} usable slots · {result.unusedCapacity} unused slots</p>
    {result.containers.length ? <ul className="divide-y">{result.containers.map(item => <li key={item.containerDefinitionId} className="py-2 text-sm"><p className="font-medium">{item.quantity} × {item.commonName}</p><p className="mt-1 text-xs text-muted-foreground">SKU {item.sku} · {item.capacity} tubes per container</p><p className="mt-1">{item.assignedTubes} tubes assigned · {item.unusedCapacity} unused slots</p></li>)}</ul> : null}
    <p className="text-sm text-muted-foreground">{result.explanation}</p>
    <p className="text-xs text-muted-foreground">This recommendation prioritizes fewer containers, then less unused capacity. It does not estimate shipping cost or verify stock.</p>
  </section>
}
