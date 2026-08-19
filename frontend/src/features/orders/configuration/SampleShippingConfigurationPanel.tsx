import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FilePenLine, MapPin, PackageCheck, Plus, SearchCheck, TestTubeDiagonal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { getOrderErrorMessage } from '#/api/order-management'
import {
  createSampleShippingDestination,
  createSampleShippingInstructionRule,
  createSampleTypeDefinition,
  getSampleShippingConfiguration,
  previewSampleShipping,
  type SampleShippingConfiguration,
  type SampleShippingDestination,
  type SampleShippingInstructionRule,
  type SampleShippingPreview,
  type SampleTypeDefinition,
} from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const codePattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const positiveOptionalNumber = z.string().refine(
  (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0),
  'Enter a number greater than zero.',
)
const nonnegativeOptionalNumber = z.string().refine(
  (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0),
  'Enter zero or a positive number.',
)

const destinationSchema = z.object({
  code: z.string().trim().min(1, 'Enter a destination code.').max(50).regex(codePattern, 'Use letters, numbers, hyphens, or underscores.'),
  name: z.string().trim().min(1, 'Enter a destination name.').max(255),
  recipientName: z.string().trim().min(1, 'Enter the receiving person or team.').max(255),
  organizationName: z.string().trim().min(1, 'Enter the receiving organization.').max(255),
  addressLine1: z.string().trim().min(1, 'Enter the street address.').max(255),
  addressLine2: z.string().trim().max(255),
  city: z.string().trim().min(1, 'Enter the city.').max(150),
  stateOrProvince: z.string().trim().min(1, 'Enter the state, province, or region.').max(150),
  postalCode: z.string().trim().min(1, 'Enter the postal code.').max(50),
  countryCode: z.string().trim().length(2, 'Use a two-letter country code.'),
  receivingPhone: z.string().trim().max(50),
  receivingEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid receiving email.').max(255)]),
  receivingHours: z.string().trim().min(1, 'Enter receiving hours.').max(1000),
  timeZoneId: z.string().trim().min(1, 'Enter the receiving time zone.').max(100),
  closureInstructions: z.string().trim().max(2000),
  deliveryInstructions: z.string().trim().min(1, 'Enter detailed delivery instructions.').max(4000),
  carrierRestrictions: z.string().trim().max(2000),
  internationalShippingAllowed: z.boolean(),
  effectiveFrom: z.string().min(1, 'Choose when this revision becomes effective.'),
  isActive: z.boolean(),
})

type DestinationValues = z.infer<typeof destinationSchema>

const sampleTypeSchema = z.object({
  code: z.string().trim().min(1, 'Enter a sample-type code.').max(50).regex(codePattern, 'Use letters, numbers, hyphens, or underscores.'),
  name: z.string().trim().min(1, 'Enter a sample-type name.').max(255),
  description: z.string().trim().max(2000),
  materialClass: z.string().trim().min(1, 'Enter the material class.').max(255),
  minimumQuantity: nonnegativeOptionalNumber,
  maximumQuantity: positiveOptionalNumber,
  quantityUnit: z.string().trim().min(1, 'Enter the quantity unit.').max(100),
  primaryContainerRequirements: z.string().trim().min(1, 'Enter primary-container requirements.').max(2000),
  temperatureRequirements: z.string().trim().min(1, 'Enter temperature requirements.').max(2000),
  stabilizerRequirements: z.string().trim().max(2000),
  packagingInstructions: z.string().trim().min(1, 'Enter sample-type packaging instructions.').max(4000),
  labelingInstructions: z.string().trim().min(1, 'Enter customer label instructions.').max(4000),
  prohibitedIdentifiers: z.string().trim().min(1, 'State which identifiers must not appear.').max(2000),
  safetyRequirements: z.string().trim().min(1, 'Enter safety and hazard requirements.').max(2000),
  carrierRestrictions: z.string().trim().max(2000),
  maximumTransitHours: positiveOptionalNumber,
  effectiveFrom: z.string().min(1, 'Choose when this revision becomes effective.'),
  isActive: z.boolean(),
}).superRefine((values, context) => {
  if (values.minimumQuantity !== '' && values.maximumQuantity !== ''
    && Number(values.maximumQuantity) < Number(values.minimumQuantity)) {
    context.addIssue({ code: 'custom', message: 'Maximum quantity cannot be less than minimum quantity.', path: ['maximumQuantity'] })
  }
})

type SampleTypeValues = z.infer<typeof sampleTypeSchema>

const ruleSchema = z.object({
  destinationId: z.string().uuid('Select a destination revision.'),
  sampleTypeDefinitionId: z.string().uuid('Select a sample-type revision.'),
  compatibilityGroup: z.string().trim().min(1, 'Enter a compatibility group.').max(50).regex(codePattern, 'Use letters, numbers, hyphens, or underscores.'),
  packingInstructions: z.string().trim().min(1, 'Enter packing instructions.').max(4000),
  temperatureInstructions: z.string().trim().min(1, 'Enter temperature instructions.').max(4000),
  carrierInstructions: z.string().trim().min(1, 'Enter carrier instructions.').max(4000),
  dispatchInstructions: z.string().trim().min(1, 'Enter dispatch instructions.').max(4000),
  deliveryInstructions: z.string().trim().min(1, 'Enter delivery instructions.').max(4000),
  requiredDocuments: z.string().trim().min(1, 'List the required documents.').max(4000),
  exceptionInstructions: z.string().trim().min(1, 'Enter exception instructions.').max(4000),
  internationalCustomsInstructions: z.string().trim().max(4000),
  requiresSeparateShipment: z.boolean(),
  effectiveFrom: z.string().min(1, 'Choose when this revision becomes effective.'),
  isActive: z.boolean(),
})

type RuleValues = z.infer<typeof ruleSchema>

const previewSchema = z.object({
  destinationId: z.string().uuid('Select a destination revision.'),
  sampleTypeDefinitionIds: z.array(z.string().uuid()).min(1, 'Select at least one sample type.'),
  effectiveAt: z.string().min(1, 'Choose the preview time.'),
})

type PreviewValues = z.infer<typeof previewSchema>

const emptyDestination: DestinationValues = {
  code: '', name: '', recipientName: '', organizationName: '', addressLine1: '', addressLine2: '', city: '',
  stateOrProvince: '', postalCode: '', countryCode: 'US', receivingPhone: '', receivingEmail: '', receivingHours: '',
  timeZoneId: 'America/Los_Angeles', closureInstructions: '', deliveryInstructions: '', carrierRestrictions: '',
  internationalShippingAllowed: false, effectiveFrom: toLocalDateTime(new Date()), isActive: false,
}

const emptySampleType: SampleTypeValues = {
  code: '', name: '', description: '', materialClass: '', minimumQuantity: '', maximumQuantity: '', quantityUnit: '',
  primaryContainerRequirements: '', temperatureRequirements: '', stabilizerRequirements: '', packagingInstructions: '',
  labelingInstructions: '', prohibitedIdentifiers: '', safetyRequirements: '', carrierRestrictions: '', maximumTransitHours: '',
  effectiveFrom: toLocalDateTime(new Date()), isActive: false,
}

const emptyRule: RuleValues = {
  destinationId: '', sampleTypeDefinitionId: '', compatibilityGroup: '', packingInstructions: '', temperatureInstructions: '',
  carrierInstructions: '', dispatchInstructions: '', deliveryInstructions: '', requiredDocuments: '', exceptionInstructions: '',
  internationalCustomsInstructions: '', requiresSeparateShipment: false, effectiveFrom: toLocalDateTime(new Date()), isActive: false,
}

export function SampleShippingConfigurationPanel({ apiEnabled }: { apiEnabled: boolean }) {
  const [destinationEditor, setDestinationEditor] = useState<SampleShippingDestination | null | undefined>(undefined)
  const [sampleTypeEditor, setSampleTypeEditor] = useState<SampleTypeDefinition | null | undefined>(undefined)
  const [ruleEditor, setRuleEditor] = useState<SampleShippingInstructionRule | null | undefined>(undefined)
  const configuration = useQuery({
    queryKey: ['sample-shipping-configuration'],
    queryFn: getSampleShippingConfiguration,
    enabled: apiEnabled,
  })

  const destinations = useMemo(() => latestRevisions(configuration.data?.destinations ?? []), [configuration.data?.destinations])
  const sampleTypes = useMemo(() => latestRevisions(configuration.data?.sampleTypes ?? []), [configuration.data?.sampleTypes])
  const rules = useMemo(() => latestRevisions(configuration.data?.instructionRules ?? []), [configuration.data?.instructionRules])

  if (configuration.isLoading) return <p role="status">Loading sample-shipping configuration…</p>
  if (configuration.error) {
    return <Alert variant="destructive"><AlertTitle>Sample-shipping configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error, 'Refresh the configuration and try again.')}</AlertDescription></Alert>
  }
  if (!configuration.data) return null

  return (
    <div className="space-y-5">
      <Alert>
        <PackageCheck className="size-4" />
        <AlertTitle>Shared trial and promotional shipping foundation</AlertTitle>
        <AlertDescription>
          Destinations, sample types, and instruction rules are versioned. New records default to inactive; enter only approved operational content before activation. This setup does not create a Trial Project or Customer promotional order.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Ship-to destinations</CardTitle><CardDescription>Receiving addresses, hours, closures, delivery directions, and carrier restrictions printed from a frozen revision.</CardDescription></div>
            <Button type="button" onClick={() => setDestinationEditor(null)}><Plus data-icon="inline-start" />Add destination</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {destinations.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.name}</span><Badge variant="outline">{item.code} · rev {item.revision}</Badge><EffectiveBadge item={item} /></div>
                  <p className="mt-2 text-sm">{item.organizationName} · {item.city}, {item.stateOrProvince} {item.postalCode} · {item.countryCode}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Receiving: {item.receivingHours} · {item.timeZoneId}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setDestinationEditor(item)}><FilePenLine data-icon="inline-start" />Create revision</Button>
              </div>
            ))}
          </div>
          {!destinations.length ? <EmptyConfiguration text="No ship-to destinations are configured." /> : null}
          <RevisionHistory items={configuration.data.destinations} currentItems={destinations} label={(item) => `${item.code} · revision ${item.revision} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Sample types</CardTitle><CardDescription>Material, quantity, container, temperature, packaging, labeling, safety, and transit requirements.</CardDescription></div>
            <Button type="button" onClick={() => setSampleTypeEditor(null)}><Plus data-icon="inline-start" />Add sample type</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {sampleTypes.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.name}</span><Badge variant="outline">{item.code} · rev {item.revision}</Badge><EffectiveBadge item={item} /></div>
                  <p className="mt-2 text-sm">{item.materialClass} · {quantityRange(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.temperatureRequirements}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setSampleTypeEditor(item)}><FilePenLine data-icon="inline-start" />Create revision</Button>
              </div>
            ))}
          </div>
          {!sampleTypes.length ? <EmptyConfiguration text="No sample types are configured." /> : null}
          <RevisionHistory items={configuration.data.sampleTypes} currentItems={sampleTypes} label={(item) => `${item.code} · revision ${item.revision} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Destination and sample instructions</CardTitle><CardDescription>Resolve detailed shipping steps for one exact destination revision and sample-type revision. Compatibility groups decide whether types may share a packet.</CardDescription></div>
            <Button type="button" disabled={!configuration.data.destinations.length || !configuration.data.sampleTypes.length} onClick={() => setRuleEditor(null)}><Plus data-icon="inline-start" />Add instruction rule</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {rules.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.destinationName} + {item.sampleTypeName}</span><Badge variant="outline">{item.compatibilityGroup} · rev {item.revision}</Badge><EffectiveBadge item={item} /></div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.requiresSeparateShipment ? 'Must ship separately' : 'May share a packet with the same compatibility group'}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setRuleEditor(item)}><FilePenLine data-icon="inline-start" />Create revision</Button>
              </div>
            ))}
          </div>
          {!rules.length ? <EmptyConfiguration text="No destination and sample instruction rules are configured." /> : null}
          <RevisionHistory items={configuration.data.instructionRules} currentItems={rules} label={(item) => `${item.destinationName} + ${item.sampleTypeName} · revision ${item.revision} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card>

      <InstructionPreview configuration={configuration.data} />

      <DestinationDialog item={destinationEditor} onClose={() => setDestinationEditor(undefined)} />
      <SampleTypeDialog item={sampleTypeEditor} onClose={() => setSampleTypeEditor(undefined)} />
      <InstructionRuleDialog configuration={configuration.data} item={ruleEditor} onClose={() => setRuleEditor(undefined)} />
    </div>
  )
}

function DestinationDialog({ item, onClose }: { item: SampleShippingDestination | null | undefined; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<DestinationValues>({ resolver: zodResolver(destinationSchema), defaultValues: emptyDestination })
  const mutation = useMutation({
    mutationFn: (values: DestinationValues) => createSampleShippingDestination({
      ...values,
      code: values.code.toUpperCase(),
      addressLine2: values.addressLine2 || null,
      receivingPhone: values.receivingPhone || null,
      receivingEmail: values.receivingEmail || null,
      closureInstructions: values.closureInstructions || null,
      carrierRestrictions: values.carrierRestrictions || null,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
      supersedesDestinationId: item?.id ?? null,
      supersededVersion: item?.version ?? null,
    }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onClose() },
  })
  const resetMutation = mutation.reset

  useEffect(() => {
    if (item === undefined) return
    form.reset(item ? destinationValues(item) : { ...emptyDestination, effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{item ? `Create ${item.code} revision ${item.revision + 1}` : 'Add ship-to destination'}</DialogTitle><DialogDescription>{item ? 'The current revision will end when this new immutable revision begins.' : 'New destinations default to inactive until the operational content is approved.'}</DialogDescription></DialogHeader>
        <form id="sample-shipping-destination-form" noValidate className="grid max-h-[65vh] gap-5 overflow-y-auto px-1 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Destination code" id="destination-code" required error={form.formState.errors.code?.message}><Input id="destination-code" disabled={Boolean(item)} aria-invalid={Boolean(form.formState.errors.code)} {...form.register('code')} /></Field>
          <Field label="Display name" id="destination-name" required error={form.formState.errors.name?.message}><Input id="destination-name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} /></Field>
          <Field label="Recipient or receiving team" id="destination-recipient" required error={form.formState.errors.recipientName?.message}><Input id="destination-recipient" {...form.register('recipientName')} /></Field>
          <Field label="Receiving organization" id="destination-organization" required error={form.formState.errors.organizationName?.message}><Input id="destination-organization" {...form.register('organizationName')} /></Field>
          <Field label="Address line 1" id="destination-line1" required error={form.formState.errors.addressLine1?.message}><Input id="destination-line1" {...form.register('addressLine1')} /></Field>
          <Field label="Address line 2" id="destination-line2" error={form.formState.errors.addressLine2?.message}><Input id="destination-line2" {...form.register('addressLine2')} /></Field>
          <Field label="City" id="destination-city" required error={form.formState.errors.city?.message}><Input id="destination-city" {...form.register('city')} /></Field>
          <Field label="State, province, or region" id="destination-region" required error={form.formState.errors.stateOrProvince?.message}><Input id="destination-region" {...form.register('stateOrProvince')} /></Field>
          <Field label="Postal code" id="destination-postal" required error={form.formState.errors.postalCode?.message}><Input id="destination-postal" {...form.register('postalCode')} /></Field>
          <Field label="Country code" id="destination-country" required error={form.formState.errors.countryCode?.message}><Input id="destination-country" maxLength={2} className="max-w-28 uppercase" {...form.register('countryCode')} /></Field>
          <Field label="Receiving phone" id="destination-phone" error={form.formState.errors.receivingPhone?.message}><Input id="destination-phone" type="tel" {...form.register('receivingPhone')} /></Field>
          <Field label="Receiving email" id="destination-email" error={form.formState.errors.receivingEmail?.message}><Input id="destination-email" type="email" {...form.register('receivingEmail')} /></Field>
          <Field label="Receiving hours" id="destination-hours" required error={form.formState.errors.receivingHours?.message} full><TextArea id="destination-hours" rows={3} registration={form.register('receivingHours')} /></Field>
          <Field label="Receiving time zone" id="destination-time-zone" required error={form.formState.errors.timeZoneId?.message}><Input id="destination-time-zone" placeholder="America/Los_Angeles" {...form.register('timeZoneId')} /></Field>
          <Field label="Effective from" id="destination-effective" required error={form.formState.errors.effectiveFrom?.message}><Input id="destination-effective" type="datetime-local" {...form.register('effectiveFrom')} /></Field>
          <Field label="Closure and holiday instructions" id="destination-closures" error={form.formState.errors.closureInstructions?.message} full><TextArea id="destination-closures" rows={3} registration={form.register('closureInstructions')} /></Field>
          <Field label="Detailed delivery instructions" id="destination-delivery" required error={form.formState.errors.deliveryInstructions?.message} full><TextArea id="destination-delivery" rows={5} registration={form.register('deliveryInstructions')} /></Field>
          <Field label="Carrier restrictions" id="destination-carrier" error={form.formState.errors.carrierRestrictions?.message} full><TextArea id="destination-carrier" rows={3} registration={form.register('carrierRestrictions')} /></Field>
          <div className="flex items-center gap-2"><Checkbox id="destination-international" checked={form.watch('internationalShippingAllowed')} onCheckedChange={(value) => form.setValue('internationalShippingAllowed', value === true, { shouldDirty: true })} /><Label htmlFor="destination-international" className="cursor-pointer font-normal">International shipments are allowed</Label></div>
          <div className="flex items-center gap-2"><Checkbox id="destination-active" checked={form.watch('isActive')} onCheckedChange={(value) => form.setValue('isActive', value === true, { shouldDirty: true })} /><Label htmlFor="destination-active" className="cursor-pointer font-normal">Active for packet resolution</Label></div>
        </form>
        {mutation.error ? <SaveError title="Destination revision was not saved" error={mutation.error} /> : null}
        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="sample-shipping-destination-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add destination'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SampleTypeDialog({ item, onClose }: { item: SampleTypeDefinition | null | undefined; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<SampleTypeValues>({ resolver: zodResolver(sampleTypeSchema), defaultValues: emptySampleType })
  const mutation = useMutation({
    mutationFn: (values: SampleTypeValues) => createSampleTypeDefinition({
      ...values,
      code: values.code.toUpperCase(),
      minimumQuantity: optionalNumber(values.minimumQuantity),
      maximumQuantity: optionalNumber(values.maximumQuantity),
      maximumTransitHours: optionalNumber(values.maximumTransitHours),
      stabilizerRequirements: values.stabilizerRequirements || null,
      carrierRestrictions: values.carrierRestrictions || null,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
      supersedesSampleTypeId: item?.id ?? null,
      supersededVersion: item?.version ?? null,
    }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onClose() },
  })
  const resetMutation = mutation.reset

  useEffect(() => {
    if (item === undefined) return
    form.reset(item ? sampleTypeValues(item) : { ...emptySampleType, effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{item ? `Create ${item.code} revision ${item.revision + 1}` : 'Add sample type'}</DialogTitle><DialogDescription>Describe approved shipment preparation requirements. Do not activate a material type until scientific and operational review is complete.</DialogDescription></DialogHeader>
        <form id="sample-type-form" noValidate className="grid max-h-[65vh] gap-5 overflow-y-auto px-1 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Sample-type code" id="sample-type-code" required error={form.formState.errors.code?.message}><Input id="sample-type-code" disabled={Boolean(item)} {...form.register('code')} /></Field>
          <Field label="Name" id="sample-type-name" required error={form.formState.errors.name?.message}><Input id="sample-type-name" {...form.register('name')} /></Field>
          <Field label="Description" id="sample-type-description" error={form.formState.errors.description?.message} full><TextArea id="sample-type-description" rows={3} registration={form.register('description')} /></Field>
          <Field label="Material class" id="sample-type-material" required error={form.formState.errors.materialClass?.message}><Input id="sample-type-material" {...form.register('materialClass')} /></Field>
          <Field label="Quantity unit" id="sample-type-unit" required error={form.formState.errors.quantityUnit?.message}><Input id="sample-type-unit" placeholder="e.g. ng, µg, tube" {...form.register('quantityUnit')} /></Field>
          <Field label="Minimum quantity" id="sample-type-minimum" error={form.formState.errors.minimumQuantity?.message}><Input id="sample-type-minimum" inputMode="decimal" {...form.register('minimumQuantity')} /></Field>
          <Field label="Maximum quantity" id="sample-type-maximum" error={form.formState.errors.maximumQuantity?.message}><Input id="sample-type-maximum" inputMode="decimal" {...form.register('maximumQuantity')} /></Field>
          <Field label="Maximum transit hours" id="sample-type-transit" error={form.formState.errors.maximumTransitHours?.message}><Input id="sample-type-transit" inputMode="numeric" {...form.register('maximumTransitHours')} /></Field>
          <Field label="Primary-container requirements" id="sample-type-container" required error={form.formState.errors.primaryContainerRequirements?.message} full><TextArea id="sample-type-container" rows={3} registration={form.register('primaryContainerRequirements')} /></Field>
          <Field label="Temperature requirements" id="sample-type-temperature" required error={form.formState.errors.temperatureRequirements?.message} full><TextArea id="sample-type-temperature" rows={3} registration={form.register('temperatureRequirements')} /></Field>
          <Field label="Stabilizer requirements" id="sample-type-stabilizer" error={form.formState.errors.stabilizerRequirements?.message} full><TextArea id="sample-type-stabilizer" rows={3} registration={form.register('stabilizerRequirements')} /></Field>
          <Field label="Sample-type packaging instructions" id="sample-type-packaging" required error={form.formState.errors.packagingInstructions?.message} full><TextArea id="sample-type-packaging" rows={4} registration={form.register('packagingInstructions')} /></Field>
          <Field label="Customer label instructions" id="sample-type-labeling" required error={form.formState.errors.labelingInstructions?.message} full><TextArea id="sample-type-labeling" rows={4} registration={form.register('labelingInstructions')} /></Field>
          <Field label="Prohibited identifiers" id="sample-type-prohibited" required error={form.formState.errors.prohibitedIdentifiers?.message} full><TextArea id="sample-type-prohibited" rows={3} registration={form.register('prohibitedIdentifiers')} /></Field>
          <Field label="Safety and hazard requirements" id="sample-type-safety" required error={form.formState.errors.safetyRequirements?.message} full><TextArea id="sample-type-safety" rows={3} registration={form.register('safetyRequirements')} /></Field>
          <Field label="Carrier restrictions" id="sample-type-carrier" error={form.formState.errors.carrierRestrictions?.message} full><TextArea id="sample-type-carrier" rows={3} registration={form.register('carrierRestrictions')} /></Field>
          <Field label="Effective from" id="sample-type-effective" required error={form.formState.errors.effectiveFrom?.message}><Input id="sample-type-effective" type="datetime-local" {...form.register('effectiveFrom')} /></Field>
          <div className="flex items-center gap-2"><Checkbox id="sample-type-active" checked={form.watch('isActive')} onCheckedChange={(value) => form.setValue('isActive', value === true, { shouldDirty: true })} /><Label htmlFor="sample-type-active" className="cursor-pointer font-normal">Active for packet resolution</Label></div>
        </form>
        {mutation.error ? <SaveError title="Sample-type revision was not saved" error={mutation.error} /> : null}
        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="sample-type-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add sample type'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InstructionRuleDialog({ configuration, item, onClose }: { configuration: SampleShippingConfiguration; item: SampleShippingInstructionRule | null | undefined; onClose: () => void }) {
  const client = useQueryClient()
  const form = useForm<RuleValues>({ resolver: zodResolver(ruleSchema), defaultValues: emptyRule })
  const mutation = useMutation({
    mutationFn: (values: RuleValues) => createSampleShippingInstructionRule({
      ...values,
      compatibilityGroup: values.compatibilityGroup.toUpperCase(),
      internationalCustomsInstructions: values.internationalCustomsInstructions || null,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
      supersedesInstructionRuleId: item?.id ?? null,
      supersededVersion: item?.version ?? null,
    }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onClose() },
  })
  const resetMutation = mutation.reset

  useEffect(() => {
    if (item === undefined) return
    form.reset(item ? ruleValues(item) : { ...emptyRule, effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{item ? `Create instruction revision ${item.revision + 1}` : 'Add destination and sample instruction rule'}</DialogTitle><DialogDescription>The destination and sample-type revisions are fixed for this rule. Create another rule when either revision changes.</DialogDescription></DialogHeader>
        <form id="sample-shipping-rule-form" noValidate className="grid max-h-[65vh] gap-5 overflow-y-auto px-1 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Destination revision" id="shipping-rule-destination" required error={form.formState.errors.destinationId?.message}><select id="shipping-rule-destination" disabled={Boolean(item)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('destinationId')}><option value="">Select destination…</option>{configuration.destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.code} · rev {destination.revision} · {destination.name}</option>)}</select></Field>
          <Field label="Sample-type revision" id="shipping-rule-sample" required error={form.formState.errors.sampleTypeDefinitionId?.message}><select id="shipping-rule-sample" disabled={Boolean(item)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('sampleTypeDefinitionId')}><option value="">Select sample type…</option>{configuration.sampleTypes.map((sampleType) => <option key={sampleType.id} value={sampleType.id}>{sampleType.code} · rev {sampleType.revision} · {sampleType.name}</option>)}</select></Field>
          <Field label="Compatibility group" id="shipping-rule-group" required error={form.formState.errors.compatibilityGroup?.message}><Input id="shipping-rule-group" placeholder="e.g. FROZEN_RNA" {...form.register('compatibilityGroup')} /></Field>
          <Field label="Effective from" id="shipping-rule-effective" required error={form.formState.errors.effectiveFrom?.message}><Input id="shipping-rule-effective" type="datetime-local" {...form.register('effectiveFrom')} /></Field>
          <Field label="Packing instructions" id="shipping-rule-packing" required error={form.formState.errors.packingInstructions?.message} full><TextArea id="shipping-rule-packing" rows={4} registration={form.register('packingInstructions')} /></Field>
          <Field label="Temperature instructions" id="shipping-rule-temperature" required error={form.formState.errors.temperatureInstructions?.message} full><TextArea id="shipping-rule-temperature" rows={4} registration={form.register('temperatureInstructions')} /></Field>
          <Field label="Carrier instructions" id="shipping-rule-carrier" required error={form.formState.errors.carrierInstructions?.message} full><TextArea id="shipping-rule-carrier" rows={4} registration={form.register('carrierInstructions')} /></Field>
          <Field label="Dispatch and timing instructions" id="shipping-rule-dispatch" required error={form.formState.errors.dispatchInstructions?.message} full><TextArea id="shipping-rule-dispatch" rows={4} registration={form.register('dispatchInstructions')} /></Field>
          <Field label="Delivery-window instructions" id="shipping-rule-delivery" required error={form.formState.errors.deliveryInstructions?.message} full><TextArea id="shipping-rule-delivery" rows={4} registration={form.register('deliveryInstructions')} /></Field>
          <Field label="Required documents" id="shipping-rule-documents" required error={form.formState.errors.requiredDocuments?.message} full><TextArea id="shipping-rule-documents" rows={4} registration={form.register('requiredDocuments')} /></Field>
          <Field label="Delay, damage, and temperature-excursion instructions" id="shipping-rule-exceptions" required error={form.formState.errors.exceptionInstructions?.message} full><TextArea id="shipping-rule-exceptions" rows={4} registration={form.register('exceptionInstructions')} /></Field>
          <Field label="International customs instructions" id="shipping-rule-customs" error={form.formState.errors.internationalCustomsInstructions?.message} full><TextArea id="shipping-rule-customs" rows={4} registration={form.register('internationalCustomsInstructions')} /></Field>
          <div className="flex items-center gap-2"><Checkbox id="shipping-rule-separate" checked={form.watch('requiresSeparateShipment')} onCheckedChange={(value) => form.setValue('requiresSeparateShipment', value === true, { shouldDirty: true })} /><Label htmlFor="shipping-rule-separate" className="cursor-pointer font-normal">This sample type must have a separate shipment packet</Label></div>
          <div className="flex items-center gap-2"><Checkbox id="shipping-rule-active" checked={form.watch('isActive')} onCheckedChange={(value) => form.setValue('isActive', value === true, { shouldDirty: true })} /><Label htmlFor="shipping-rule-active" className="cursor-pointer font-normal">Active for packet resolution</Label></div>
        </form>
        {mutation.error ? <SaveError title="Instruction-rule revision was not saved" error={mutation.error} /> : null}
        <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="sample-shipping-rule-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add instruction rule'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InstructionPreview({ configuration }: { configuration: SampleShippingConfiguration }) {
  const [preview, setPreview] = useState<SampleShippingPreview | null>(null)
  const form = useForm<PreviewValues>({ resolver: zodResolver(previewSchema), defaultValues: { destinationId: '', sampleTypeDefinitionIds: [], effectiveAt: toLocalDateTime(new Date()) } })
  const selectedSampleTypes = form.watch('sampleTypeDefinitionIds')
  const mutation = useMutation({
    mutationFn: (values: PreviewValues) => previewSampleShipping({ destinationId: values.destinationId, sampleTypeDefinitionIds: values.sampleTypeDefinitionIds, effectiveAt: new Date(values.effectiveAt).toISOString() }),
    onSuccess: setPreview,
  })

  return (
    <Card>
      <CardHeader><div className="flex items-start gap-3"><SearchCheck className="mt-0.5 size-5 text-primary" /><div><CardTitle>Instruction preview</CardTitle><CardDescription>Resolve exactly what a shipment packet would freeze at a selected time. Incompatible sample types are blocked and must be split.</CardDescription></div></div></CardHeader>
      <CardContent className="space-y-5">
        <form noValidate className="grid gap-5 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => { setPreview(null); mutation.mutate(values) })}>
          <Field label="Destination revision" id="preview-destination" required error={form.formState.errors.destinationId?.message}><select id="preview-destination" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('destinationId')}><option value="">Select destination…</option>{configuration.destinations.map((item) => <option key={item.id} value={item.id}>{item.code} · rev {item.revision} · {item.name}</option>)}</select></Field>
          <Field label="Effective at" id="preview-effective" required error={form.formState.errors.effectiveAt?.message}><Input id="preview-effective" type="datetime-local" {...form.register('effectiveAt')} /></Field>
          <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Sample-type revisions <Required /></legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{configuration.sampleTypes.map((item) => { const id = `preview-sample-${item.id}`; const checked = selectedSampleTypes.includes(item.id); return <label key={item.id} htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"><Checkbox id={id} checked={checked} onCheckedChange={(value) => form.setValue('sampleTypeDefinitionIds', value === true ? [...selectedSampleTypes, item.id] : selectedSampleTypes.filter((valueId) => valueId !== item.id), { shouldValidate: true })} /><span><span className="block text-sm font-medium">{item.name}</span><span className="block text-xs text-muted-foreground">{item.code} · revision {item.revision} · {formatEffectiveRange(item)}</span></span></label> })}</div><ErrorText message={form.formState.errors.sampleTypeDefinitionIds?.message} /></fieldset>
          <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={mutation.isPending || !configuration.destinations.length || !configuration.sampleTypes.length}>{mutation.isPending ? 'Resolving…' : 'Preview instructions'}</Button></div>
        </form>
        {mutation.error ? <SaveError title="Instructions could not be resolved" error={mutation.error} /> : null}
        {preview ? <PreviewResult preview={preview} /> : null}
      </CardContent>
    </Card>
  )
}

function PreviewResult({ preview }: { preview: SampleShippingPreview }) {
  return (
    <div className="space-y-5 rounded-lg border bg-muted/20 p-5" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Resolved packet instructions</h3><p className="mt-1 text-sm text-muted-foreground">Effective {formatDateTime(preview.effectiveAt)} · compatibility group {preview.compatibilityGroup}</p></div><Badge variant="secondary">{preview.sampleRules.length} sample {preview.sampleRules.length === 1 ? 'type' : 'types'}</Badge></div>
      <section><div className="flex items-center gap-2"><MapPin className="size-4" /><h4 className="font-medium">Ship to</h4></div><address className="mt-2 text-sm not-italic leading-6">{preview.destination.recipientName}<br />{preview.destination.organizationName}<br />{preview.destination.addressLine1}<br />{preview.destination.addressLine2 ? <>{preview.destination.addressLine2}<br /></> : null}{preview.destination.city}, {preview.destination.stateOrProvince} {preview.destination.postalCode}<br />{preview.destination.countryCode}</address><p className="mt-2 whitespace-pre-wrap text-sm"><strong>Receiving:</strong> {preview.destination.receivingHours} ({preview.destination.timeZoneId})</p><p className="mt-2 whitespace-pre-wrap text-sm"><strong>Delivery:</strong> {preview.destination.deliveryInstructions}</p>{preview.destination.closureInstructions ? <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Closures:</strong> {preview.destination.closureInstructions}</p> : null}</section>
      {preview.sampleRules.map((rule) => <section key={rule.sampleType.id} className="border-t pt-4"><div className="flex items-center gap-2"><TestTubeDiagonal className="size-4" /><h4 className="font-medium">{rule.sampleType.name}</h4></div><Instruction label="Container" value={rule.sampleType.primaryContainerRequirements} /><Instruction label="Sample temperature" value={rule.sampleType.temperatureRequirements} /><Instruction label="Pack" value={`${rule.sampleType.packagingInstructions}\n${rule.packingInstructions}`} /><Instruction label="Label" value={rule.sampleType.labelingInstructions} /><Instruction label="Do not include" value={rule.sampleType.prohibitedIdentifiers} /><Instruction label="Temperature control" value={rule.temperatureInstructions} /><Instruction label="Carrier" value={rule.carrierInstructions} /><Instruction label="Dispatch" value={rule.dispatchInstructions} /><Instruction label="Delivery window" value={rule.deliveryInstructions} /><Instruction label="Documents" value={rule.requiredDocuments} /><Instruction label="Problems or delays" value={rule.exceptionInstructions} />{rule.internationalCustomsInstructions ? <Instruction label="International customs" value={rule.internationalCustomsInstructions} /> : null}</section>)}
    </div>
  )
}

function Instruction({ label, value }: { label: string; value: string }) {
  return <p className="mt-2 whitespace-pre-wrap text-sm"><strong>{label}:</strong> {value}</p>
}

function EffectiveBadge({ item }: { item: { effectiveFrom: string; effectiveTo: string | null; isActive: boolean } }) {
  const state = effectiveState(item)
  return <Badge variant={state === 'Active now' ? 'secondary' : 'outline'}>{state}</Badge>
}

function RevisionHistory<T extends { id: string }>({ items, currentItems, label }: { items: T[]; currentItems: T[]; label: (item: T) => string }) {
  const currentIds = new Set(currentItems.map((item) => item.id))
  const history = items.filter((item) => !currentIds.has(item.id))
  if (!history.length) return null
  return <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Show {history.length} prior {history.length === 1 ? 'revision' : 'revisions'}</summary><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{history.map((item) => <li key={item.id}>{label(item)}</li>)}</ul></details>
}

function EmptyConfiguration({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>
}

function SaveError({ title, error }: { title: string; error: unknown }) {
  return <Alert variant="destructive"><AlertTitle>{title}</AlertTitle><AlertDescription>{getOrderErrorMessage(error, 'Review the configuration and try again.')}</AlertDescription></Alert>
}

function Field({ children, error, full, id, label, required }: { children: React.ReactNode; error?: string; full?: boolean; id: string; label: string; required?: boolean }) {
  return <div className={full ? 'sm:col-span-2' : undefined}><Label htmlFor={id}>{label}{required ? <> <Required /></> : null}</Label><div className="mt-2">{children}</div><ErrorText message={error} /></div>
}

function TextArea({ id, registration, rows }: { id: string; registration: UseFormRegisterReturn; rows: number }) {
  return <textarea id={id} rows={rows} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" {...registration} />
}

function Required() { return <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> }
function ErrorText({ message }: { message?: string }) { return message ? <p className="mt-1 text-sm text-destructive" role="alert">{message}</p> : null }

function destinationValues(item: SampleShippingDestination): DestinationValues {
  return { code: item.code, name: item.name, recipientName: item.recipientName, organizationName: item.organizationName, addressLine1: item.addressLine1, addressLine2: item.addressLine2 ?? '', city: item.city, stateOrProvince: item.stateOrProvince, postalCode: item.postalCode, countryCode: item.countryCode, receivingPhone: item.receivingPhone ?? '', receivingEmail: item.receivingEmail ?? '', receivingHours: item.receivingHours, timeZoneId: item.timeZoneId, closureInstructions: item.closureInstructions ?? '', deliveryInstructions: item.deliveryInstructions, carrierRestrictions: item.carrierRestrictions ?? '', internationalShippingAllowed: item.internationalShippingAllowed, effectiveFrom: toLocalDateTime(new Date()), isActive: item.isActive }
}

function sampleTypeValues(item: SampleTypeDefinition): SampleTypeValues {
  return { code: item.code, name: item.name, description: item.description, materialClass: item.materialClass, minimumQuantity: optionalNumberText(item.minimumQuantity), maximumQuantity: optionalNumberText(item.maximumQuantity), quantityUnit: item.quantityUnit, primaryContainerRequirements: item.primaryContainerRequirements, temperatureRequirements: item.temperatureRequirements, stabilizerRequirements: item.stabilizerRequirements ?? '', packagingInstructions: item.packagingInstructions, labelingInstructions: item.labelingInstructions, prohibitedIdentifiers: item.prohibitedIdentifiers, safetyRequirements: item.safetyRequirements, carrierRestrictions: item.carrierRestrictions ?? '', maximumTransitHours: optionalNumberText(item.maximumTransitHours), effectiveFrom: toLocalDateTime(new Date()), isActive: item.isActive }
}

function ruleValues(item: SampleShippingInstructionRule): RuleValues {
  return { destinationId: item.destinationId, sampleTypeDefinitionId: item.sampleTypeDefinitionId, compatibilityGroup: item.compatibilityGroup, packingInstructions: item.packingInstructions, temperatureInstructions: item.temperatureInstructions, carrierInstructions: item.carrierInstructions, dispatchInstructions: item.dispatchInstructions, deliveryInstructions: item.deliveryInstructions, requiredDocuments: item.requiredDocuments, exceptionInstructions: item.exceptionInstructions, internationalCustomsInstructions: item.internationalCustomsInstructions ?? '', requiresSeparateShipment: item.requiresSeparateShipment, effectiveFrom: toLocalDateTime(new Date()), isActive: item.isActive }
}

function latestRevisions<T extends { definitionKey: string; revision: number }>(items: T[]) {
  const latest = new Map<string, T>()
  for (const item of items) {
    const current = latest.get(item.definitionKey)
    if (!current || item.revision > current.revision) latest.set(item.definitionKey, item)
  }
  return [...latest.values()]
}

function effectiveState(item: { effectiveFrom: string; effectiveTo: string | null; isActive: boolean }) {
  if (!item.isActive) return 'Inactive'
  const now = Date.now()
  if (new Date(item.effectiveFrom).getTime() > now) return 'Future'
  if (item.effectiveTo && new Date(item.effectiveTo).getTime() <= now) return 'Ended'
  return 'Active now'
}

function formatEffectiveRange(item: { effectiveFrom: string; effectiveTo: string | null; isActive: boolean }) {
  const start = formatDateTime(item.effectiveFrom)
  const end = item.effectiveTo ? formatDateTime(item.effectiveTo) : 'open-ended'
  return `${item.isActive ? 'active' : 'inactive'} · ${start} to ${end}`
}

function quantityRange(item: SampleTypeDefinition) {
  if (item.minimumQuantity == null && item.maximumQuantity == null) return `quantity recorded in ${item.quantityUnit}`
  if (item.minimumQuantity != null && item.maximumQuantity != null) return `${item.minimumQuantity}–${item.maximumQuantity} ${item.quantityUnit}`
  return item.minimumQuantity != null ? `at least ${item.minimumQuantity} ${item.quantityUnit}` : `up to ${item.maximumQuantity} ${item.quantityUnit}`
}

function optionalNumber(value: string) { return value === '' ? null : Number(value) }
function optionalNumberText(value: number | null) { return value == null ? '' : String(value) }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function toLocalDateTime(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}
