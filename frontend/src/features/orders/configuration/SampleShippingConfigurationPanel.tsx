import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, FilePenLine, MapPin, Plus, SearchCheck, TestTubeDiagonal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { sampleTypeChoices } from './sample-type-options'
import { ContainerSizesPanel } from './ContainerSizesPanel'
import type { ShippingSettingsSection } from './shipping-settings-navigation'
import { instructionPreviewTime, instructionPreviewUnavailable } from './instruction-rule-preview'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { ScientificTextField } from '#/features/lab-operations/ScientificTextField'
import { useOrderDraftGuard } from '../use-order-draft-guard'

const codePattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const positiveOptionalNumber = z.string().refine(
  (value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0),
  'Enter a number greater than zero.',
)
const optionalQuantity = z.string().trim().refine(
  value => value === '' || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 1),
  'Enter a whole number of 1 or more.',
)
const sampleSizeUnits = ['µL', 'mL']
const instructionUnits = [
  'nL', 'µL', 'mL', 'L', 'pg', 'ng', 'µg', 'mg', 'g', 'kg',
  'ng/µL', 'µg/µL', 'µg/mL', 'mg/mL', 'g/L', 'nM', 'µM', 'mM', 'M',
  'µm', 'mm', 'cm', 'm', '°C', '°F', 'K', 's', 'min', 'h', 'day',
  '%', '% v/v', '% w/v', '% w/w', 'rpm', '× g', 'kPa', 'psi',
]
const instructionSymbols = [
  ['µ', 'Micro'], ['Δ', 'Delta'], ['°', 'Degree'], ['±', 'Plus or minus'],
  ['×', 'Multiplication'], ['÷', 'Division'], ['≤', 'Less than or equal to'],
  ['≥', 'Greater than or equal to'], ['≈', 'Approximately equal to'], ['≠', 'Not equal to'],
  ['−', 'Minus'], ['–', 'Range'], ['→', 'Arrow'], ['α', 'Alpha'], ['β', 'Beta'],
  ['γ', 'Gamma'], ['²', 'Squared'], ['³', 'Cubed'], ['₂', 'Subscript two'], ['₃', 'Subscript three'],
] as const


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
  materialClass: z.string().trim().min(1, 'Select a material type.').max(255),
  minimumQuantity: optionalQuantity,
  maximumQuantity: optionalQuantity,
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
    && Number(values.minimumQuantity) >= 0 && Number(values.maximumQuantity) > 0
    && Number(values.maximumQuantity) < Number(values.minimumQuantity)) {
    context.addIssue({ code: 'custom', message: 'Max must be greater than or equal to Min.', path: ['maximumQuantity'] })
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

const emptyDestination: DestinationValues = {
  code: '', name: '', recipientName: '', organizationName: '', addressLine1: '', addressLine2: '', city: '',
  stateOrProvince: '', postalCode: '', countryCode: 'US', receivingPhone: '', receivingEmail: '', receivingHours: '',
  timeZoneId: 'America/Los_Angeles', closureInstructions: '', deliveryInstructions: '', carrierRestrictions: '',
  internationalShippingAllowed: false, effectiveFrom: toLocalDateTime(new Date()), isActive: false,
}

const emptySampleType: SampleTypeValues = {
  code: '', name: '', description: '', materialClass: '', minimumQuantity: '1', maximumQuantity: '', quantityUnit: '',
  primaryContainerRequirements: '', temperatureRequirements: '', stabilizerRequirements: '', packagingInstructions: '',
  labelingInstructions: '', prohibitedIdentifiers: '', safetyRequirements: '', carrierRestrictions: '', maximumTransitHours: '',
  effectiveFrom: toLocalDateTime(new Date()), isActive: false,
}

const emptyRule: RuleValues = {
  destinationId: '', sampleTypeDefinitionId: '', compatibilityGroup: '', packingInstructions: '', temperatureInstructions: '',
  carrierInstructions: '', dispatchInstructions: '', deliveryInstructions: '', requiredDocuments: '', exceptionInstructions: '',
  internationalCustomsInstructions: '', requiresSeparateShipment: false, effectiveFrom: toLocalDateTime(new Date()), isActive: false,
}

export function SampleShippingConfigurationPanel({ apiEnabled, section, sampleTypeId }: { apiEnabled: boolean; section: ShippingSettingsSection | 'sample-types'; sampleTypeId?: string }) {
  const navigate = useNavigate()
  const [destinationEditor, setDestinationEditor] = useState<SampleShippingDestination | null | undefined>(undefined)
  const [sampleTypeEditor, setSampleTypeEditor] = useState<SampleTypeDefinition | null | undefined>(undefined)
  const [previewRule, setPreviewRule] = useState<SampleShippingInstructionRule | null>(null)
  const ruleActionsRef = useRef<HTMLButtonElement | null>(null)
  const [ruleEditor, setRuleEditor] = useState<SampleShippingInstructionRule | null | undefined>(undefined)
  const configuration = useQuery({
    queryKey: ['sample-shipping-configuration'],
    queryFn: getSampleShippingConfiguration,
    enabled: apiEnabled,
  })

  const destinations = useMemo(() => latestRevisions(configuration.data?.destinations ?? []), [configuration.data?.destinations])
  const sampleTypes = useMemo(() => latestRevisions(configuration.data?.sampleTypes ?? []), [configuration.data?.sampleTypes])
  const rules = useMemo(() => latestRevisions(configuration.data?.instructionRules ?? []), [configuration.data?.instructionRules])
  const selectedSampleType = configuration.data?.sampleTypes.find(item => item.id === sampleTypeId)

  if (configuration.isLoading) return <p role="status">Loading sample-shipping configuration…</p>
  if (configuration.error) {
    return <Alert variant="destructive"><AlertTitle>Sample-shipping configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error, 'Refresh the configuration and try again.')} <Button variant="outline" onClick={() => void configuration.refetch()}>Retry</Button></AlertDescription></Alert>
  }
  if (!configuration.data) return null

  return (
    <div className="space-y-5">
      {section === 'containers' ? <ContainerSizesPanel apiEnabled={apiEnabled} configuration={configuration.data} /> : null}

      {section === 'destinations' ? <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle>Ship-to destinations</CardTitle><CardDescription>Receiving addresses, hours, closures, delivery directions, and carrier restrictions printed from a frozen revision.</CardDescription></div>
            <Button type="button" onClick={() => setDestinationEditor(null)}><Plus data-icon="inline-start" />Add destination</Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="divide-y">
            {destinations.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.name}</span><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all">{item.code} · rev {item.revision}</Badge><EffectiveBadge item={item} /></div>
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
      </Card> : null}

      {section === 'sample-types' && sampleTypeId ? <>
        <Link className="text-sm text-primary underline" to="/order-configuration" search={{ configurationSection: 'sample-types' }}>Back to sample types</Link>
        {selectedSampleType ? <SampleTypeDetails item={selectedSampleType} revisions={configuration.data.sampleTypes.filter(item => item.definitionKey === selectedSampleType.definitionKey)} onCreateRevision={setSampleTypeEditor} /> : <Alert><AlertTitle>Sample type not found</AlertTitle><AlertDescription>Return to Sample types and choose an available record.</AlertDescription></Alert>}
      </> : null}

      {section === 'sample-types' && !sampleTypeId ? <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
          <CardTitle className="min-w-0">Sample types</CardTitle>
          <Button className="col-start-2 row-start-1 justify-self-end" type="button" onClick={() => setSampleTypeEditor(null)}><Plus data-icon="inline-start" />Add sample type</Button>
          <CardDescription className="col-span-full">Shared material, quantity, container, temperature, packaging, labeling, safety, and transit requirements. New revisions start inactive until approved content is ready.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="divide-y">
            {sampleTypes.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><SampleTypeLink item={item} /><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all">{item.code} · rev {item.revision}</Badge><EffectiveBadge item={item} /></div>
                  <p className="mt-2 text-sm">{item.materialClass === 'extracted_rna' ? 'Total RNA' : item.materialClass === 'enriched_rna' ? 'Enriched RNA' : item.materialClass} · {quantityRange(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.temperatureRequirements}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setSampleTypeEditor(item)}><FilePenLine data-icon="inline-start" />Create revision</Button>
              </div>
            ))}
          </div>
          {!sampleTypes.length ? <EmptyConfiguration text="No sample types are configured." /> : null}
          <RevisionHistory items={configuration.data.sampleTypes} currentItems={sampleTypes} label={(item) => `${item.code} · revision ${item.revision} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card> : null}

      {section === 'instructions' ? <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
          <CardTitle className="min-w-0">Sample shipping instructions</CardTitle>
          <Button className="col-start-2 row-start-1 justify-self-end" type="button" disabled={!configuration.data.destinations.length || !configuration.data.sampleTypes.length} onClick={() => setRuleEditor(null)}><Plus data-icon="inline-start" />Add instruction rule</Button>
          <CardDescription className="col-span-full">Packing and shipping instructions for each destination and sample type.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="divide-y">
            {rules.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.destinationName} + {item.sampleTypeName}</span><Badge variant="outline">{item.compatibilityGroup} · rev {item.revision}</Badge><EffectiveBadge item={item} /></div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.requiresSeparateShipment ? 'Must ship separately' : 'May share a packet with the same compatibility group'}</p>
                </div>
                <ActionMenu>
                  <DropdownMenuTrigger asChild><Button type="button" variant="outline" onPointerDown={event => { ruleActionsRef.current = event.currentTarget }} onFocus={event => { ruleActionsRef.current = event.currentTarget }}>Actions<ChevronDown aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => setPreviewRule(item)}><SearchCheck aria-hidden="true" />Preview instructions</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRuleEditor(item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem>
                  </DropdownMenuContent>
                </ActionMenu>
              </div>
            ))}
          </div>
          {!rules.length ? <EmptyConfiguration text="No sample shipping instruction rules are configured." /> : null}
          <RevisionHistory items={configuration.data.instructionRules} currentItems={rules} label={(item) => `${item.destinationName} + ${item.sampleTypeName} · revision ${item.revision} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card> : null}

      {previewRule ? <InstructionPreview key={previewRule.id} rule={previewRule} configuration={configuration.data} onClose={() => setPreviewRule(null)} restoreFocus={() => ruleActionsRef.current?.focus()} /> : null}

      <DestinationDialog item={destinationEditor} onClose={() => setDestinationEditor(undefined)} />
      {sampleTypeEditor !== undefined ? <SampleTypeDialog item={sampleTypeEditor} onClose={() => setSampleTypeEditor(undefined)} onSaved={item => { void navigate({ to: '/order-configuration/sample-types/$sampleTypeId', params: { sampleTypeId: item.id }, search: { configurationSection: 'sample-types' } }) }} /> : null}
      <InstructionRuleDialog configuration={configuration.data} item={ruleEditor} onClose={() => setRuleEditor(undefined)} restoreFocus={() => ruleActionsRef.current?.focus()} />
    </div>
  )
}

function SampleTypeLink({ item, children }: { item: SampleTypeDefinition; children?: React.ReactNode }) {
  return <Link
    to="/order-configuration/sample-types/$sampleTypeId"
    params={{ sampleTypeId: item.id }}
    search={{ configurationSection: 'sample-types' }}
    className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
  >{children ?? item.name}</Link>
}

function SampleTypeDetails({ item, revisions, onCreateRevision }: {
  item: SampleTypeDefinition
  revisions: SampleTypeDefinition[]
  onCreateRevision: (item: SampleTypeDefinition) => void
}) {
  const history = [...revisions].sort((a, b) => b.revision - a.revision)
  const latest = history[0]
  const requirements = [
    ['Primary container', item.primaryContainerRequirements],
    ['Temperature', item.temperatureRequirements],
    ['Stabilizer', item.stabilizerRequirements],
    ['Packaging', item.packagingInstructions],
    ['Customer labeling', item.labelingInstructions],
    ['Prohibited identifiers', item.prohibitedIdentifiers],
    ['Safety and hazards', item.safetyRequirements],
    ['Carrier restrictions', item.carrierRestrictions],
  ]
  return <div className="space-y-5">
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold">{item.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all">{item.code} · revision {item.revision}</Badge><EffectiveBadge item={item} /></div>
          </div>
          {latest?.id === item.id ? <Button className="shrink-0" variant="outline" onClick={() => onCreateRevision(item)}><FilePenLine data-icon="inline-start" />Create revision</Button> : null}
        </div>
        <CardDescription className="mt-2 whitespace-pre-wrap">{item.description || 'No description provided.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {latest && latest.id !== item.id ? <p className="text-sm">You are viewing a historical revision. <SampleTypeLink item={latest}>View latest revision ({latest.revision})</SampleTypeLink>.</p> : null}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Material type</dt><dd>{item.materialClass === 'extracted_rna' ? 'Total RNA' : item.materialClass === 'enriched_rna' ? 'Enriched RNA' : item.materialClass}</dd></div>
          <div><dt className="text-muted-foreground">Quantity</dt><dd>{quantityRange(item)}</dd></div>
          <div><dt className="text-muted-foreground">Maximum transit time</dt><dd>{item.maximumTransitHours == null ? 'Not specified' : `${item.maximumTransitHours} hours`}</dd></div>
          <div><dt className="text-muted-foreground">Effective period</dt><dd>{formatDateTime(item.effectiveFrom)} to {item.effectiveTo ? formatDateTime(item.effectiveTo) : 'no end date'} (your local time)</dd></div>
        </dl>
      </CardContent>
    </Card>
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Sample requirements</CardTitle></CardHeader>
      <CardContent className="p-4"><dl className="space-y-5 text-sm">
        {requirements.map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value || 'Not specified'}</dd></div>)}
      </dl></CardContent>
    </Card>
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4"><CardTitle>Revision history</CardTitle><CardDescription>Each link opens that exact revision. Existing shipments retain their saved instructions.</CardDescription></CardHeader>
      <CardContent className="p-4"><ul className="divide-y">
        {history.map(revision => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div><SampleTypeLink item={revision}>Revision {revision.revision} · {revision.name}</SampleTypeLink>{revision.id === item.id ? <span className="ml-2 text-xs text-muted-foreground">Viewing</span> : null}<p className="mt-1 text-xs text-muted-foreground">{formatEffectiveRange(revision)}</p></div>
          <EffectiveBadge item={revision} />
        </li>)}
      </ul></CardContent>
    </Card>
  </div>
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
    form.reset(item ? destinationValues(item) : { ...emptyDestination, code: 'DEST-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(), effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{item ? `Create ${item.name} revision ${item.revision + 1}` : 'Add ship-to destination'}</DialogTitle><DialogDescription>{item ? 'The current revision will end when this new immutable revision begins.' : 'New destinations default to inactive until the operational content is approved.'}</DialogDescription></DialogHeader>
        <form id="sample-shipping-destination-form" noValidate className="grid gap-5 px-1 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Display name" id="destination-name" required error={form.formState.errors.name?.message} full><Input id="destination-name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} /></Field>
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
        <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="sample-shipping-destination-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add destination'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SampleTypeDialog({ item, onClose, onSaved }: { item: SampleTypeDefinition | null | undefined; onClose: () => void; onSaved: (item: SampleTypeDefinition) => void }) {
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
    onSuccess: async (saved) => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); allowNavigation(); form.reset(); onClose(); onSaved(saved) },
  })
  const resetMutation = mutation.reset
  const allowNavigation = useOrderDraftGuard(item !== undefined && form.formState.isDirty, mutation.isPending)
  function close() {
    if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard unsaved sample-type changes?'))) onClose()
  }

  useEffect(() => {
    if (item === undefined) return
    form.reset(item ? sampleTypeValues(item) : { ...emptySampleType, code: 'SAMPLE-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(), effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={!mutation.isPending} aria-busy={mutation.isPending} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{item ? `Create ${item.name} revision ${item.revision + 1}` : 'Add sample type'}</DialogTitle></DialogHeader>
        <form id="sample-type-form" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <fieldset disabled={mutation.isPending} className="grid gap-5 px-1 sm:grid-cols-2">
          <Field label="Name" id="sample-type-name" required error={form.formState.errors.name?.message} full><Input id="sample-type-name" {...form.register('name')} /></Field>
          <Field label="Description" id="sample-type-description" error={form.formState.errors.description?.message} full><TextArea id="sample-type-description" rows={3} registration={form.register('description')} /></Field>
          <Field label="Material type" id="sample-type-material" required error={form.formState.errors.materialClass?.message} full>
            <select id="sample-type-material" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" aria-invalid={Boolean(form.formState.errors.materialClass)} {...form.register('materialClass')}>
              <option value="" disabled>Select material type…</option>
              <option value="extracted_rna">Total RNA</option>
              <option value="enriched_rna">Enriched RNA</option>
              {item && !['extracted_rna', 'enriched_rna'].includes(item.materialClass) ? <option value={item.materialClass}>{item.materialClass} (previously saved)</option> : null}
            </select>
          </Field>
          <Card role="group" aria-label="Quantity" className="min-w-0 gap-0 rounded-lg py-0 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-t-lg border-b bg-muted/50 px-3 py-1.5">
              <h3 className="text-sm font-medium">Quantity</h3>
            </div>
            <CardContent className="grid grid-cols-1 gap-x-3 gap-y-2 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="sample-type-unit"><RequiredFieldName>Submission unit</RequiredFieldName></Label>
                <ScientificTextField control={form.control} name="quantityUnit" id="sample-type-unit" label="Submission unit" unit insertUnits unitOptions={sampleSizeUnits} showSymbols={false} disabled={mutation.isPending} placeholder="e.g. 20 mL tube" describedBy={form.formState.errors.quantityUnit ? 'sample-type-unit-error' : undefined} />
                <ErrorText id="sample-type-unit-error" message={form.formState.errors.quantityUnit?.message} />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="sample-type-minimum">Min</Label>
                <Input id="sample-type-minimum" type="text" inputMode="numeric" placeholder="1" aria-invalid={Boolean(form.formState.errors.minimumQuantity)} aria-describedby={form.formState.errors.minimumQuantity ? 'sample-type-minimum-error' : undefined} {...form.register('minimumQuantity', {
                  onBlur: () => { void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                  onChange: () => { if (form.formState.errors.minimumQuantity || form.formState.errors.maximumQuantity) void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                })} />
                <ErrorText id="sample-type-minimum-error" message={form.formState.errors.minimumQuantity?.message} />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="sample-type-maximum">Max <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="sample-type-maximum" type="text" inputMode="numeric" placeholder="No limit" aria-invalid={Boolean(form.formState.errors.maximumQuantity)} aria-describedby={form.formState.errors.maximumQuantity ? 'sample-type-maximum-error' : undefined} {...form.register('maximumQuantity', {
                  onBlur: () => { void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                  onChange: () => { if (form.formState.errors.minimumQuantity || form.formState.errors.maximumQuantity) void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                })} />
                <ErrorText id="sample-type-maximum-error" message={form.formState.errors.maximumQuantity?.message} />
              </div>
            </CardContent>
          </Card>
          <Field label="Maximum transit hours" id="sample-type-transit" error={form.formState.errors.maximumTransitHours?.message}><Input id="sample-type-transit" inputMode="numeric" {...form.register('maximumTransitHours')} /></Field>
          <Field label="Primary-container requirements" id="sample-type-container" required error={form.formState.errors.primaryContainerRequirements?.message} full><ScientificTextField control={form.control} name="primaryContainerRequirements" id="sample-type-container" label="Primary-container requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.primaryContainerRequirements ? 'sample-type-container-error' : undefined} /></Field>
          <Field label="Temperature requirements" id="sample-type-temperature" required error={form.formState.errors.temperatureRequirements?.message} full><ScientificTextField control={form.control} name="temperatureRequirements" id="sample-type-temperature" label="Temperature requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.temperatureRequirements ? 'sample-type-temperature-error' : undefined} /></Field>
          <Field label="Stabilizer requirements" id="sample-type-stabilizer" error={form.formState.errors.stabilizerRequirements?.message} full><ScientificTextField control={form.control} name="stabilizerRequirements" id="sample-type-stabilizer" label="Stabilizer requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.stabilizerRequirements ? 'sample-type-stabilizer-error' : undefined} /></Field>
          <Field label="Sample-type packaging instructions" id="sample-type-packaging" required error={form.formState.errors.packagingInstructions?.message} full><ScientificTextField control={form.control} name="packagingInstructions" id="sample-type-packaging" label="Sample-type packaging instructions" multiline rows={4} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.packagingInstructions ? 'sample-type-packaging-error' : undefined} /></Field>
          <Field label="Customer label instructions" id="sample-type-labeling" required error={form.formState.errors.labelingInstructions?.message} full><ScientificTextField control={form.control} name="labelingInstructions" id="sample-type-labeling" label="Customer label instructions" multiline rows={4} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.labelingInstructions ? 'sample-type-labeling-error' : undefined} /></Field>
          <Field label="Prohibited identifiers" id="sample-type-prohibited" required error={form.formState.errors.prohibitedIdentifiers?.message} full><ScientificTextField control={form.control} name="prohibitedIdentifiers" id="sample-type-prohibited" label="Prohibited identifiers" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.prohibitedIdentifiers ? 'sample-type-prohibited-error' : undefined} /></Field>
          <Field label="Safety and hazard requirements" id="sample-type-safety" required error={form.formState.errors.safetyRequirements?.message} full><ScientificTextField control={form.control} name="safetyRequirements" id="sample-type-safety" label="Safety and hazard requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.safetyRequirements ? 'sample-type-safety-error' : undefined} /></Field>
          <Field label="Carrier restrictions" id="sample-type-carrier" error={form.formState.errors.carrierRestrictions?.message} full><ScientificTextField control={form.control} name="carrierRestrictions" id="sample-type-carrier" label="Carrier restrictions" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.carrierRestrictions ? 'sample-type-carrier-error' : undefined} /></Field>
          <div className="grid gap-x-5 gap-y-2 sm:col-span-2 sm:grid-cols-2">
            <Label htmlFor="sample-type-effective" className="sm:col-span-2"><RequiredFieldName>Effective from</RequiredFieldName></Label>
            <div>
              <Input id="sample-type-effective" type="datetime-local" aria-invalid={Boolean(form.formState.errors.effectiveFrom)} aria-describedby={form.formState.errors.effectiveFrom ? 'sample-type-effective-error' : undefined} {...form.register('effectiveFrom')} />
              <ErrorText id="sample-type-effective-error" message={form.formState.errors.effectiveFrom?.message} />
            </div>
            <div className="flex min-h-8 items-center gap-2 self-start"><Checkbox id="sample-type-active" checked={form.watch('isActive')} onCheckedChange={(value) => form.setValue('isActive', value === true, { shouldDirty: true })} /><Label htmlFor="sample-type-active" className="cursor-pointer font-normal">Active for packet resolution</Label></div>
          </div>
          </fieldset>
        </form>
        {mutation.error ? <SaveError title="Sample-type revision was not saved" error={mutation.error} /> : null}
        <RequiredDialogFooter><Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>Cancel</Button><Button type="submit" form="sample-type-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add sample type'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InstructionRuleDialog({ configuration, item, onClose, restoreFocus }: { configuration: SampleShippingConfiguration; item: SampleShippingInstructionRule | null | undefined; onClose: () => void; restoreFocus: () => void }) {
  const client = useQueryClient()
  const openedFromRule = useRef(false)
  const form = useForm<RuleValues>({ resolver: zodResolver(ruleSchema), defaultValues: emptyRule })
  const [selectionTime, setSelectionTime] = useState(Date.now)
  useEffect(() => {
    if (item === undefined) return
    const timer = window.setInterval(() => setSelectionTime(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [item])
  const choices = useMemo(() => sampleTypeChoices(configuration.sampleTypes, selectionTime), [configuration.sampleTypes, selectionTime])
  const selectedSampleId = form.watch('sampleTypeDefinitionId')
  const selectedSample = choices.find(choice => choice.revisions.some(revision => revision.id === selectedSampleId))

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
    openedFromRule.current = item !== null
    form.reset(item ? ruleValues(item) : { ...emptyRule, effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-3xl" onCloseAutoFocus={event => { if (openedFromRule.current) { event.preventDefault(); restoreFocus() } }}>
        <DialogHeader><DialogTitle>{item ? `Create instruction revision ${item.revision + 1}` : 'Add sample shipping instruction rule'}</DialogTitle><DialogDescription>The destination revision is fixed. The sample type automatically uses its latest active, effective revision for new shipments. Issued instructions keep their recorded revision.</DialogDescription></DialogHeader>
        <form id="sample-shipping-rule-form" noValidate className="grid gap-5 px-1 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Destination revision" id="shipping-rule-destination" required error={form.formState.errors.destinationId?.message}><select id="shipping-rule-destination" disabled={Boolean(item)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('destinationId')}><option value="">Select destination…</option>{configuration.destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.code} · rev {destination.revision} · {destination.name}</option>)}</select></Field>
          <Field label="Sample type" id="shipping-rule-sample" required error={form.formState.errors.sampleTypeDefinitionId?.message}>
            <select id="shipping-rule-sample" disabled={Boolean(item)} aria-describedby="shipping-rule-sample-status" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" {...form.register('sampleTypeDefinitionId')}>
              <option value="">Select sample type…</option>
              {choices.map(choice => <option key={choice.key} value={choice.revisions.some(revision => revision.id === selectedSampleId) ? selectedSampleId : choice.anchor.id}>{choice.name}</option>)}
            </select>
            <p id="shipping-rule-sample-status" className={selectedSample && !selectedSample.current ? 'mt-1 text-xs text-destructive' : 'mt-1 text-xs text-muted-foreground'}>
              {selectedSample ? selectedSample.current ? `Currently using revision ${selectedSample.current.revision} · Active` : 'No active revision is currently effective. Shipping instructions cannot be issued until an approved revision becomes active.' : 'Automatically follows the latest active, effective revision.'}
            </p>
          </Field>
          <Field label="Compatibility group" id="shipping-rule-group" required error={form.formState.errors.compatibilityGroup?.message}>
            <Input id="shipping-rule-group" list="shipping-compatibility-groups" aria-describedby="shipping-rule-group-help" placeholder="e.g. FROZEN_RNA" {...form.register('compatibilityGroup')} />
            <datalist id="shipping-compatibility-groups">{[...new Set(['FROZEN_RNA', ...configuration.instructionRules.map(rule => rule.compatibilityGroup)])].sort().map(group => <option key={group} value={group} />)}</datalist>
            <p id="shipping-rule-group-help" className="mt-1 text-xs text-muted-foreground">A shared handling label. Use FROZEN_RNA for frozen RNA. Give sample types the same group only when they can safely share a shipment. The separate-shipment setting below always takes priority.</p>
          </Field>
          <Field label="Effective from" id="shipping-rule-effective" required error={form.formState.errors.effectiveFrom?.message}><Input id="shipping-rule-effective" type="datetime-local" {...form.register('effectiveFrom')} /></Field>
          <Field label="Packing instructions" id="shipping-rule-packing" required error={form.formState.errors.packingInstructions?.message} full><TextArea id="shipping-rule-packing" rows={4} registration={form.register('packingInstructions')} /></Field>
          <Field label="Temperature instructions" id="shipping-rule-temperature" required error={form.formState.errors.temperatureInstructions?.message} full><TextArea id="shipping-rule-temperature" rows={4} registration={form.register('temperatureInstructions')} /></Field>
          <Field label="Carrier instructions" id="shipping-rule-carrier" required error={form.formState.errors.carrierInstructions?.message} full><TextArea id="shipping-rule-carrier" rows={4} registration={form.register('carrierInstructions')} /></Field>
          <Field label="Dispatch and timing instructions" id="shipping-rule-dispatch" required error={form.formState.errors.dispatchInstructions?.message} full><TextArea id="shipping-rule-dispatch" rows={4} registration={form.register('dispatchInstructions')} /></Field>
          <Field label="Delivery-window instructions" id="shipping-rule-delivery" required error={form.formState.errors.deliveryInstructions?.message} full><TextArea id="shipping-rule-delivery" rows={4} registration={form.register('deliveryInstructions')} /></Field>
          <Field label="Required documents" id="shipping-rule-documents" required error={form.formState.errors.requiredDocuments?.message} full><TextArea id="shipping-rule-documents" rows={4} registration={form.register('requiredDocuments')} /></Field>
          <Field label="Delay, damage, and temperature-excursion instructions" id="shipping-rule-exceptions" required error={form.formState.errors.exceptionInstructions?.message} full><TextArea id="shipping-rule-exceptions" rows={4} registration={form.register('exceptionInstructions')} /></Field>
          <Field label="International customs instructions" id="shipping-rule-customs" error={form.formState.errors.internationalCustomsInstructions?.message} full><TextArea id="shipping-rule-customs" rows={4} registration={form.register('internationalCustomsInstructions')} /></Field>
          <div className="flex items-center gap-2 sm:col-span-2"><Checkbox id="shipping-rule-separate" checked={form.watch('requiresSeparateShipment')} onCheckedChange={(value) => form.setValue('requiresSeparateShipment', value === true, { shouldDirty: true })} /><Label htmlFor="shipping-rule-separate" className="cursor-pointer font-normal">This sample type must have a separate shipment packet</Label></div>
          <div className="flex items-center gap-2 sm:col-span-2"><Checkbox id="shipping-rule-active" checked={form.watch('isActive')} onCheckedChange={(value) => form.setValue('isActive', value === true, { shouldDirty: true })} /><Label htmlFor="shipping-rule-active" className="cursor-pointer font-normal">Active for packet resolution</Label></div>
        </form>
        {mutation.error ? <SaveError title="Instruction-rule revision was not saved" error={mutation.error} /> : null}
        <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="sample-shipping-rule-form" disabled={mutation.isPending}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add instruction rule'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InstructionPreview({ configuration, rule, onClose, restoreFocus }: { configuration: SampleShippingConfiguration; rule: SampleShippingInstructionRule; onClose: () => void; restoreFocus: () => void }) {
  const [effectiveAt] = useState(() => instructionPreviewTime(rule))
  const [additionalSampleIds, setAdditionalSampleIds] = useState<string[]>([])
  const baseSample = configuration.sampleTypes.find(item => item.id === rule.sampleTypeDefinitionId)
  const additionalSamples = configuration.sampleTypes.filter(item => item.id !== rule.sampleTypeDefinitionId
    && item.definitionKey !== baseSample?.definitionKey
    && item.isActive && new Date(item.effectiveFrom).getTime() <= new Date(effectiveAt).getTime() && (!item.effectiveTo || new Date(item.effectiveTo).getTime() > new Date(effectiveAt).getTime()))
  const sampleTypeDefinitionIds = [rule.sampleTypeDefinitionId, ...additionalSampleIds].sort()
  const unavailable = instructionPreviewUnavailable(rule, effectiveAt)
  const preview = useQuery({
    queryKey: ['shipping-rule-preview', rule.id, rule.version, effectiveAt, sampleTypeDefinitionIds],
    queryFn: () => previewSampleShipping({ destinationId: rule.destinationId, sampleTypeDefinitionIds, effectiveAt }),
    enabled: !unavailable,
    retry: false,
  })

  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <DialogHeader>
        <DialogTitle>Instructions preview</DialogTitle>
        <DialogDescription>{rule.destinationName} + {rule.sampleTypeName} · rule revision {rule.revision}. This preview does not save or issue a shipment packet.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Preview date: {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(effectiveAt))}{effectiveAt === new Date(rule.effectiveFrom).toISOString() ? ' (rule start date)' : ''}.</p>
        {unavailable ? <Alert><AlertTitle>Preview unavailable</AlertTitle><AlertDescription>{unavailable}</AlertDescription></Alert> : <>
          <details>
            <summary className="cursor-pointer text-sm font-medium">Add sample types{additionalSampleIds.length ? ` (${additionalSampleIds.length} added)` : ''}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{rule.sampleTypeName} stays included. Select other types to check whether they can share the same shipment.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {additionalSamples.map(item => <label key={item.id} htmlFor={`preview-sample-${item.id}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                <Checkbox id={`preview-sample-${item.id}`} checked={additionalSampleIds.includes(item.id)} onCheckedChange={checked => setAdditionalSampleIds(previous => checked === true ? [...previous, item.id] : previous.filter(id => id !== item.id))} />
                <span><span className="block text-sm font-medium">{item.name}</span><span className="block text-xs text-muted-foreground">{item.code} · revision {item.revision}</span></span>
              </label>)}
            </div>
            {!additionalSamples.length ? <p className="mt-2 text-sm text-muted-foreground">No other sample types are active on the preview date.</p> : null}
          </details>
          {preview.isFetching ? <p role="status">Resolving instructions…</p> : null}
          {preview.error ? <Alert variant="destructive"><AlertTitle>Instructions could not be resolved</AlertTitle><AlertDescription>{getOrderErrorMessage(preview.error, 'Review the rule and selected sample types, then try again.')} <Button type="button" variant="outline" disabled={preview.isFetching} onClick={() => void preview.refetch()}>Retry preview</Button></AlertDescription></Alert> : null}
          {preview.data && !preview.isFetching ? <PreviewResult preview={preview.data} /> : null}
        </>}
      </div>
      <RequiredDialogFooter showLegend={false}><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></RequiredDialogFooter>
    </DialogContent>
  </Dialog>
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
  return <div className={full ? 'sm:col-span-2' : undefined}><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><div className="mt-2">{children}</div><ErrorText id={`${id}-error`} message={error} /></div>
}

function TextArea({ id, registration, rows }: { id: string; registration: UseFormRegisterReturn; rows: number }) {
  return <textarea id={id} rows={rows} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" {...registration} />
}

function ErrorText({ message, id }: { message?: string; id?: string }) { return message ? <p id={id} className="mt-1 text-sm text-destructive" role="alert">{message}</p> : null }

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
