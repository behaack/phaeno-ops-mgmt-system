import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, FilePenLine, MapPin, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { getOrderErrorMessage } from '#/api/order-management'
import { getShippingContainerDefinitions } from '#/api/shipping-containers'
import {
  createSampleShippingDestination,
  createSampleTypeDefinition,
  getSampleShippingConfiguration,
  setDefaultShippingDestination,
  type SampleShippingConfiguration,
  type SampleShippingDestination,
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
import { recordLinkClassName } from '#/components/ui/record-link'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { ShippingProceduresPanel } from './ShippingProceduresPanel'
import { currentShippingProcedure } from './current-shipping-procedure'
import { containerDependencyWarnings } from './shipping-dependency-health'
import { SampleTypePackingPanel } from './SampleTypePackingPanel'
import { SampleTypeActions, SampleTypeActiveRevisionNote } from './SampleTypeActions'
import { ShippingAvailabilityDialog, type ShippingStatusChange } from './ShippingAvailabilityDialog'
import { ShippingActivationBadge } from './ShippingActivationBadge'
import { ContainerSizesPanel } from './ContainerSizesPanel'
import { parseSampleTypeListSearch, type SampleTypeListSearch } from './sample-type-list-navigation'
import { parseDestinationListSearch, type DestinationListSearch } from './destination-list-navigation'
import type { ShippingSettingsSection } from './shipping-settings-navigation'
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

const sampleTypePageSize = 12
const destinationPageSize = 12

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
  shippingProcedureId: z.string().uuid('Choose one shared shipping procedure.'),
  code: z.string().trim().min(1, 'Enter a sample-type code.').max(50).regex(codePattern, 'Use letters, numbers, hyphens, or underscores.'),
  name: z.string().trim().min(1, 'Enter a sample-type name.').max(255),
  description: z.string().trim().max(2000),
  materialClass: z.string().trim().min(1, 'Select a material type.').max(255),
  minimumQuantity: optionalQuantity,
  maximumQuantity: optionalQuantity,
  quantityUnit: z.string().trim().min(1, 'Enter the quantity unit.').max(100),
  primaryContainerRequirements: z.string().trim().min(1, 'Enter primary-container requirements.').max(2000),
  temperatureRequirements: z.string().trim().min(1, 'Enter preservation requirements.').max(2000),
  stabilizerRequirements: z.string().trim().max(2000),
  packagingInstructions: z.string().trim().max(4000),
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

const emptyDestination: DestinationValues = {
  code: '', name: '', recipientName: '', organizationName: '', addressLine1: '', addressLine2: '', city: '',
  stateOrProvince: '', postalCode: '', countryCode: 'US', receivingPhone: '', receivingEmail: '', receivingHours: '',
  timeZoneId: 'America/Los_Angeles', closureInstructions: '', deliveryInstructions: '', carrierRestrictions: '',
  internationalShippingAllowed: false, effectiveFrom: toLocalDateTime(new Date()), isActive: true,
}

const emptySampleType: SampleTypeValues = {
  shippingProcedureId: '',
  code: '', name: '', description: '', materialClass: '', minimumQuantity: '1', maximumQuantity: '', quantityUnit: '',
  primaryContainerRequirements: '', temperatureRequirements: '', stabilizerRequirements: '', packagingInstructions: '',
  labelingInstructions: '', prohibitedIdentifiers: '', safetyRequirements: '', carrierRestrictions: '', maximumTransitHours: '',
  effectiveFrom: toLocalDateTime(new Date()), isActive: true,
}

export function SampleShippingConfigurationPanel({ apiEnabled, section, sampleTypeId, destinationId, procedureId }: { apiEnabled: boolean; section: ShippingSettingsSection; sampleTypeId?: string; destinationId?: string; procedureId?: string }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const routeSearch = useSearch({ strict: false })
  const sampleTypeListSearch = useMemo(() => parseSampleTypeListSearch(routeSearch), [routeSearch])
  const [sampleTypeSearchText, setSampleTypeSearchText] = useState(sampleTypeListSearch.sampleTypeSearch ?? '')
  const destinationListSearch = useMemo(() => parseDestinationListSearch(routeSearch), [routeSearch])
  const [destinationSearchText, setDestinationSearchText] = useState(destinationListSearch.destinationSearch ?? '')
  const [destinationEditor, setDestinationEditor] = useState<SampleShippingDestination | null | undefined>(undefined)
  const [sampleTypeEditor, setSampleTypeEditor] = useState<SampleTypeDefinition | null | undefined>(undefined)
  const statusActionsRef = useRef<HTMLButtonElement | null>(null)
  const [statusChange, setStatusChange] = useState<ShippingStatusChange | null>(null)
  const configuration = useQuery({
    queryKey: ['sample-shipping-configuration'],
    queryFn: getSampleShippingConfiguration,
    enabled: apiEnabled,
  })
  const kitDefinitions = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions,
    enabled: apiEnabled && section === 'sample-types' })
  const defaultDestination = useMutation({
    mutationFn: (definitionKey: string) => setDefaultShippingDestination(definitionKey, configuration.data?.defaultDestinationVersion ?? 0),
    onSuccess: value => { client.setQueryData(['sample-shipping-configuration'], value) },
  })

  const destinations = useMemo(() => latestRevisions(configuration.data?.destinations ?? []), [configuration.data?.destinations])
  const activeDestinationChoices = useMemo(() => {
    const current = (configuration.data?.destinations ?? []).filter(item => item.isActive && revisionHasNotEnded(item) && Date.parse(item.effectiveFrom) <= Date.now())
    return latestRevisions(current).sort((a, b) => a.name.localeCompare(b.name))
  }, [configuration.data?.destinations])
  const destinationFamilies = useMemo(() => {
    const families = new Map<string, SampleShippingDestination[]>()
    for (const revision of configuration.data?.destinations ?? []) {
      const family = families.get(revision.definitionKey) ?? []
      family.push(revision)
      families.set(revision.definitionKey, family)
    }
    return families
  }, [configuration.data?.destinations])
  const selectedDestination = configuration.data?.destinations.find(item => item.id === destinationId)
  const sampleTypes = useMemo(() => latestRevisions(configuration.data?.sampleTypes ?? []), [configuration.data?.sampleTypes])
  const sampleTypeFamilies = useMemo(() => {
    const families = new Map<string, SampleTypeDefinition[]>()
    for (const revision of configuration.data?.sampleTypes ?? []) {
      const family = families.get(revision.definitionKey) ?? []
      family.push(revision)
      families.set(revision.definitionKey, family)
    }
    return families
  }, [configuration.data?.sampleTypes])
  const selectedSampleType = configuration.data?.sampleTypes.find(item => item.id === sampleTypeId)
  useEffect(() => {
    if (sampleTypeSearchText.trim() === (sampleTypeListSearch.sampleTypeSearch ?? '')) return
    const timer = window.setTimeout(() => {
      void navigate({ to: '/sample-shipping-settings', search: previous => ({ ...previous, sampleTypeSearch: sampleTypeSearchText.trim() || undefined, sampleTypePage: 1 }), replace: true, resetScroll: false })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [navigate, sampleTypeListSearch.sampleTypeSearch, sampleTypeSearchText])

  useEffect(() => {
    if (destinationSearchText.trim() === (destinationListSearch.destinationSearch ?? '')) return
    const timer = window.setTimeout(() => {
      void navigate({ to: '/sample-shipping-settings', search: previous => ({ ...previous, destinationSearch: destinationSearchText.trim() || undefined, destinationPage: 1 }), replace: true, resetScroll: false })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [navigate, destinationListSearch.destinationSearch, destinationSearchText])

  function changeDestinationListSearch(update: DestinationListSearch) {
    void navigate({ to: '/sample-shipping-settings', search: previous => ({ ...previous, ...update, shippingSection: 'destinations' }), replace: true, resetScroll: false })
  }
  const destinationNeedle = (destinationListSearch.destinationSearch ?? '').trim().toLocaleLowerCase()
  const filteredDestinations = destinations.filter(item => {
    const revisions = destinationFamilies.get(item.definitionKey) ?? [item]
    return (destinationListSearch.destinationShowInactive || revisions.some(value => value.isActive && revisionHasNotEnded(value)))
      && (!destinationNeedle || revisions.some(value => `${value.name} ${value.code} ${value.recipientName} ${value.organizationName} ${value.addressLine1} ${value.addressLine2 ?? ''} ${value.city} ${value.stateOrProvince} ${value.postalCode} ${value.countryCode}`.toLocaleLowerCase().includes(destinationNeedle)))
  })
  const destinationPageCount = Math.max(1, Math.ceil(filteredDestinations.length / destinationPageSize))
  const destinationPage = Math.min(destinationListSearch.destinationPage ?? 1, destinationPageCount)
  const visibleDestinations = filteredDestinations.slice((destinationPage - 1) * destinationPageSize, destinationPage * destinationPageSize)

  function changeSampleTypeListSearch(update: SampleTypeListSearch) {
    void navigate({ to: '/sample-shipping-settings', search: previous => ({ ...previous, ...update, shippingSection: 'sample-types', sampleTypeId: undefined }), replace: true, resetScroll: false })
  }
  const sampleTypeNeedle = (sampleTypeListSearch.sampleTypeSearch ?? '').trim().toLocaleLowerCase()
  const filteredSampleTypes = sampleTypes.filter(item => {
    const revisions = sampleTypeFamilies.get(item.definitionKey) ?? [item]
    return (sampleTypeListSearch.sampleTypeShowInactive || revisions.some(value => value.isActive && revisionHasNotEnded(value)))
      && (!sampleTypeNeedle || revisions.some(value => `${value.name} ${value.code} ${value.materialClass} ${value.description}`.toLocaleLowerCase().includes(sampleTypeNeedle)))
  })
  const sampleTypePageCount = Math.max(1, Math.ceil(filteredSampleTypes.length / sampleTypePageSize))
  const sampleTypePage = Math.min(sampleTypeListSearch.sampleTypePage ?? 1, sampleTypePageCount)
  const visibleSampleTypes = filteredSampleTypes.slice((sampleTypePage - 1) * sampleTypePageSize, sampleTypePage * sampleTypePageSize)

  if (configuration.isLoading) return <p role="status">Loading sample-shipping configuration…</p>
  if (configuration.error) {
    return <Alert variant="destructive"><AlertTitle>Sample-shipping configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error, 'Refresh the configuration and try again.')} <Button variant="outline" onClick={() => void configuration.refetch()}>Retry</Button></AlertDescription></Alert>
  }
  if (!configuration.data) return null
  const currentDefaultDestination = activeDestinationChoices.find(item => item.definitionKey === configuration.data.defaultDestinationDefinitionKey)
  return (
    <div className="space-y-5">
      {section === 'procedures' ? <ShippingProceduresPanel procedures={configuration.data.procedures ?? []} procedureId={procedureId} configuration={configuration.data} /> : null}
      {section === 'containers' ? <ContainerSizesPanel apiEnabled={apiEnabled} configuration={configuration.data} /> : null}

      {section === 'destinations' && destinationId ? <>
        <Link className="text-sm text-primary underline" to="/sample-shipping-settings" search={{ ...destinationListSearch, shippingSection: 'destinations' }}>Back to ship-to destinations</Link>
        {defaultDestination.error ? <Alert variant="destructive"><AlertTitle>Default destination was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(defaultDestination.error, 'Refresh the destinations and try again.')}</AlertDescription></Alert> : null}
        {selectedDestination ? <DestinationDetails item={selectedDestination} revisions={destinationFamilies.get(selectedDestination.definitionKey) ?? [selectedDestination]} activeRevision={activeDestinationChoices.find(choice => choice.definitionKey === selectedDestination.definitionKey)} isDefault={selectedDestination.definitionKey === configuration.data.defaultDestinationDefinitionKey} defaultPending={defaultDestination.isPending} onSetDefault={definitionKey => defaultDestination.mutate(definitionKey)} onCreateRevision={setDestinationEditor} onStatusChange={(item, isActive) => setStatusChange({ kind: 'destination', item, isActive })} triggerRef={statusActionsRef} /> : <Alert><AlertTitle>Destination not found</AlertTitle><AlertDescription>Return to Phaeno ship-to destinations and choose an available record.</AlertDescription></Alert>}
      </> : null}

      {section === 'destinations' && !destinationId ? <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
          <CardTitle className="min-w-0">Phaeno ship-to destinations</CardTitle>
          <Button className="col-start-2 row-start-1 justify-self-end" type="button" onClick={() => setDestinationEditor(null)}><Plus data-icon="inline-start" />Add destination</Button>
          <CardDescription className="col-span-full">Receiving addresses, hours, closures, delivery directions, and carrier restrictions printed from a frozen revision. New revisions default to Active; choose Inactive to keep an earlier active revision available.</CardDescription>
          <p className="col-span-full text-xs text-muted-foreground">Use a destination's Actions menu to set the default for new Jobs. Phaeno can change a Job's destination when dispatching a requested kit, before sample packing starts.</p>
          <div className="col-span-full grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input id="destination-search" className="w-full" aria-label="Search ship-to destinations" value={destinationSearchText} maxLength={255} onChange={event => setDestinationSearchText(event.target.value)} placeholder="Search by name, code, or location" />
            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-self-end">
              <Checkbox id="destination-show-inactive" checked={Boolean(destinationListSearch.destinationShowInactive)} onCheckedChange={checked => changeDestinationListSearch({ destinationShowInactive: checked === true, destinationPage: 1 })} />
              <Label htmlFor="destination-show-inactive" className="cursor-pointer">Show inactive</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {defaultDestination.error ? <Alert variant="destructive"><AlertTitle>Default destination was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(defaultDestination.error, 'Refresh the destinations and try again.')}</AlertDescription></Alert> : null}
          {!configuration.data.defaultDestinationDefinitionKey ? <Alert variant="destructive">
            <AlertTitle>No default Phaeno ship-to destination</AlertTitle>
            <AlertDescription>{activeDestinationChoices.length ? 'Open the Actions menu on a current Active destination and choose Set as default before finalizing another sample list.' : 'Add or activate a destination, then choose Set as default from its Actions menu before finalizing another sample list.'}</AlertDescription>
          </Alert> : null}
          {configuration.data.defaultDestinationDefinitionKey && !currentDefaultDestination ? <Alert variant="destructive">
            <AlertTitle>Default destination is unavailable</AlertTitle>
            <AlertDescription>{activeDestinationChoices.length ? 'Open the Actions menu on a current Active destination and choose Set as default before finalizing another sample list.' : 'Add or activate a destination, then choose Set as default from its Actions menu before finalizing another sample list.'}</AlertDescription>
          </Alert> : null}
          <div className="divide-y">
            {visibleDestinations.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><DestinationLink item={item} /><Badge variant="outline">Rev {item.revision}</Badge><ShippingActivationBadge item={item} />{item.definitionKey === configuration.data.defaultDestinationDefinitionKey ? <Badge>Default</Badge> : null}</div>
                  <p className="mt-2 text-sm">{item.organizationName} · {item.city}, {item.stateOrProvince} {item.postalCode} · {item.countryCode}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Receiving: {item.receivingHours} · {item.timeZoneId}</p>
                  <DestinationActiveRevisionNote item={item} revisions={destinationFamilies.get(item.definitionKey) ?? [item]} />
                </div>
                <DestinationActions item={item} revisions={destinationFamilies.get(item.definitionKey) ?? [item]} activeRevision={activeDestinationChoices.find(choice => choice.definitionKey === item.definitionKey)} isDefault={item.definitionKey === configuration.data.defaultDestinationDefinitionKey} defaultPending={defaultDestination.isPending} onSetDefault={definitionKey => defaultDestination.mutate(definitionKey)} onCreateRevision={setDestinationEditor} onStatusChange={(target, isActive) => setStatusChange({ kind: 'destination', item: target, isActive })} triggerRef={statusActionsRef} />
              </div>
            ))}
          </div>
          {!destinations.length ? <EmptyConfiguration text="No ship-to destinations are configured." /> : !filteredDestinations.length ? <EmptyConfiguration text={destinationNeedle ? 'No ship-to destinations match this search.' : 'No active ship-to destinations. Select Show inactive to review inactive destinations.'} /> : null}
          {filteredDestinations.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground"><span>{filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'} · Page {destinationPage} of {destinationPageCount}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={destinationPage <= 1} onClick={() => changeDestinationListSearch({ destinationPage: destinationPage - 1 })}>Previous</Button><Button type="button" size="sm" variant="outline" disabled={destinationPage >= destinationPageCount} onClick={() => changeDestinationListSearch({ destinationPage: destinationPage + 1 })}>Next</Button></div></div> : null}
          <RevisionHistory items={configuration.data.destinations} currentItems={destinations} label={(item) => `${item.name} · revision ${item.revision} · ${effectiveState(item).toLowerCase()} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card> : null}

      {section === 'sample-types' && sampleTypeId ? <>
        <Link className="text-sm text-primary underline" to="/sample-shipping-settings" search={{ ...sampleTypeListSearch, shippingSection: 'sample-types' }}>Back to sample types</Link>
        {selectedSampleType ? <SampleTypeDetails item={selectedSampleType} revisions={configuration.data.sampleTypes.filter(item => item.definitionKey === selectedSampleType.definitionKey)} onCreateRevision={setSampleTypeEditor} configuration={configuration.data} apiEnabled={apiEnabled} /> : <Alert><AlertTitle>Sample type not found</AlertTitle><AlertDescription>Return to Sample types and choose an available record.</AlertDescription></Alert>}
      </> : null}

      {section === 'sample-types' && !sampleTypeId ? <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
          <CardTitle className="min-w-0">Sample types</CardTitle>
          <Button className="col-start-2 row-start-1 justify-self-end" type="button" onClick={() => setSampleTypeEditor(null)}><Plus data-icon="inline-start" />Add sample type</Button>
          <CardDescription className="col-span-full">Scientific material, quantity, preservation, labeling and safety requirements. Review the selected procedure and linked Transportation kits from each Sample type. New revisions default to Active; choose Inactive to keep an earlier active revision available.</CardDescription>
          <div className="col-span-full grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input id="sample-type-search" className="w-full" aria-label="Search sample types" value={sampleTypeSearchText} maxLength={255} onChange={event => setSampleTypeSearchText(event.target.value)} placeholder="Search by name, code, or material" />
            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-self-end">
              <Checkbox id="sample-type-show-inactive" checked={Boolean(sampleTypeListSearch.sampleTypeShowInactive)} onCheckedChange={checked => changeSampleTypeListSearch({ sampleTypeShowInactive: checked === true, sampleTypePage: 1 })} />
              <Label htmlFor="sample-type-show-inactive" className="cursor-pointer">Show inactive</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {kitDefinitions.error ? <Alert variant="destructive"><AlertTitle>Kit readiness could not be checked</AlertTitle><AlertDescription>{getOrderErrorMessage(kitDefinitions.error, 'Refresh the transportation kits and try again.')} <Button type="button" variant="outline" size="sm" onClick={() => void kitDefinitions.refetch()}>Retry</Button></AlertDescription></Alert> : null}
          <div className="divide-y">
            {visibleSampleTypes.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><SampleTypeLink item={item} /><Badge variant="outline">Rev {item.revision}</Badge><ShippingActivationBadge item={item} /></div>
                  <p className="mt-2 text-sm">{item.materialClass === 'extracted_rna' ? 'Total RNA' : item.materialClass === 'enriched_rna' ? 'Enriched RNA' : item.materialClass} · {quantityRange(item)}</p>
                  <p className="mt-1 text-xs">Procedure: {configuration.data.procedures?.find(procedure => procedure.id === item.shippingProcedureId)?.name ?? 'None'}</p>
                  {!currentShippingProcedure(configuration.data.procedures, item.shippingProcedureId) ? <p role="alert" className="mt-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">Needs attention: the selected Shipping procedure has no Active revision. New Orders of this Sample type are blocked.</p> : null}
                  {kitDefinitions.data && !kitDefinitions.data.some(kit => kit.sampleTypeAnchorId === (sampleTypeFamilies.get(item.definitionKey) ?? []).find(revision => revision.revision === 1)?.id
                    && kit.isActive && !kit.deactivatedAt && Date.parse(kit.effectiveFrom) <= Date.now()
                    && (!kit.effectiveTo || Date.parse(kit.effectiveTo) > Date.now())
                    && kit.newWorkReady !== false && !containerDependencyWarnings(kit, configuration.data).length)
                    ? <p role="alert" className="mt-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">Needs attention: no usable Active Transportation kit is linked to this Sample type. New Orders are blocked.</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{item.temperatureRequirements}</p>
                  <SampleTypeActiveRevisionNote item={item} revisions={sampleTypeFamilies.get(item.definitionKey) ?? [item]} />
                </div>
                <SampleTypeActions item={item} revisions={sampleTypeFamilies.get(item.definitionKey) ?? [item]} configuration={configuration.data} onCreateRevision={setSampleTypeEditor} onStatusChanged={(changed, isActive) => {
                  if (changed.id === item.id && !isActive && !sampleTypeListSearch.sampleTypeShowInactive) {
                    window.requestAnimationFrame(() => document.getElementById('sample-type-search')?.focus())
                  }
                }} />
              </div>
            ))}
          </div>
          {!sampleTypes.length ? <EmptyConfiguration text="No sample types are configured." /> : !filteredSampleTypes.length ? <EmptyConfiguration text={sampleTypeNeedle ? 'No sample types match this search.' : 'No active sample types. Select Show inactive to review inactive definitions.'} /> : null}
          {filteredSampleTypes.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground"><span>{filteredSampleTypes.length} sample {filteredSampleTypes.length === 1 ? 'type' : 'types'} · Page {sampleTypePage} of {sampleTypePageCount}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={sampleTypePage <= 1} onClick={() => changeSampleTypeListSearch({ sampleTypePage: sampleTypePage - 1 })}>Previous</Button><Button type="button" size="sm" variant="outline" disabled={sampleTypePage >= sampleTypePageCount} onClick={() => changeSampleTypeListSearch({ sampleTypePage: sampleTypePage + 1 })}>Next</Button></div></div> : null}
          <RevisionHistory items={configuration.data.sampleTypes} currentItems={sampleTypes} label={(item) => `${item.code} · revision ${item.revision} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card> : null}

      <DestinationDialog item={destinationEditor} onClose={() => setDestinationEditor(undefined)} onSaved={item => { setDestinationEditor(undefined); void navigate({ to: '/sample-shipping-settings', search: { ...destinationListSearch, shippingSection: 'destinations', destinationId: item.id } }) }} />
      {statusChange ? <ShippingAvailabilityDialog change={statusChange} configuration={configuration.data} onClose={() => setStatusChange(null)} restoreFocus={() => {
        if (statusActionsRef.current?.isConnected) statusActionsRef.current.focus()
        else if (section === 'destinations') document.getElementById('destination-search')?.focus()
      }} /> : null}
      {sampleTypeEditor !== undefined ? <SampleTypeDialog item={sampleTypeEditor} configuration={configuration.data} onClose={() => setSampleTypeEditor(undefined)} onSaved={item => { void navigate({ to: '/sample-shipping-settings', search: { ...sampleTypeListSearch, shippingSection: 'sample-types', sampleTypeId: item.id } }) }} /> : null}
    </div>
  )
}

function DestinationLink({ item, children }: { item: SampleShippingDestination; children?: React.ReactNode }) {
  const routeSearch = useSearch({ strict: false })
  const listSearch = parseDestinationListSearch(routeSearch)
  return <Link to="/sample-shipping-settings" search={{ ...listSearch, shippingSection: 'destinations', destinationId: item.id }} className={recordLinkClassName}>{children ?? item.name}</Link>
}

function DestinationActiveRevisionNote({ item, revisions }: { item: SampleShippingDestination; revisions: SampleShippingDestination[] }) {
  const now = Date.now()
  const current = revisions.filter(value => value.isActive && Date.parse(value.effectiveFrom) <= now && (!value.effectiveTo || Date.parse(value.effectiveTo) > now)).sort((a, b) => b.revision - a.revision)[0]
  if (current && current.id !== item.id) return <p className="mt-2 text-sm text-muted-foreground">Revision {current.revision} ({current.name}) is currently Active for new destination selections. {item.isActive ? `Revision ${item.revision} is scheduled for ${formatDateTime(item.effectiveFrom)}.` : `Activate revision ${item.revision} to replace it.`} Existing Orders and issued packets keep their selected destination revision.</p>
  const scheduled = revisions.filter(value => value.id !== item.id && value.isActive && Date.parse(value.effectiveFrom) > now && revisionHasNotEnded(value)).sort((a, b) => a.revision - b.revision)[0]
  return scheduled ? <p className="mt-2 text-sm text-muted-foreground">Revision {scheduled.revision} ({scheduled.name}) is Active and scheduled from {formatDateTime(scheduled.effectiveFrom)}. Existing Orders keep their selected destination revision.</p> : null
}

function DestinationActions({ item, revisions, activeRevision, isDefault, defaultPending, onSetDefault, onCreateRevision, onStatusChange, triggerRef }: {
  item: SampleShippingDestination
  revisions: SampleShippingDestination[]
  activeRevision?: SampleShippingDestination
  isDefault: boolean
  defaultPending: boolean
  onSetDefault: (definitionKey: string) => void
  onCreateRevision: (item: SampleShippingDestination) => void
  onStatusChange: (item: SampleShippingDestination, isActive: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  if (revisions.some(value => value.revision > item.revision)) return null
  const earlierActive = !item.isActive ? revisions.filter(value => value.id !== item.id && value.isActive && revisionHasNotEnded(value)) : []
  return <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" onPointerDown={event => { triggerRef.current = event.currentTarget }} onFocus={event => { triggerRef.current = event.currentTarget }}>Actions<ChevronDown aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
    {activeRevision && !isDefault ? <DropdownMenuItem disabled={defaultPending} onSelect={() => onSetDefault(item.definitionKey)}><MapPin aria-hidden="true" />{activeRevision.id === item.id ? 'Set as default' : `Set active revision ${activeRevision.revision} as default`}</DropdownMenuItem> : null}
    <DropdownMenuItem onSelect={() => onCreateRevision(item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem>
    {revisionHasNotEnded(item) ? <DropdownMenuItem variant={item.isActive ? 'destructive' : 'default'} onSelect={() => onStatusChange(item, !item.isActive)}>{item.isActive ? 'Deactivate' : 'Activate'}</DropdownMenuItem> : null}
    {earlierActive.map(value => <DropdownMenuItem key={value.id} variant="destructive" onSelect={() => onStatusChange(value, false)}>Deactivate revision {value.revision}</DropdownMenuItem>)}
  </DropdownMenuContent></ActionMenu>
}

function DestinationDetails({ item, revisions, activeRevision, isDefault, defaultPending, onSetDefault, onCreateRevision, onStatusChange, triggerRef }: {
  item: SampleShippingDestination
  revisions: SampleShippingDestination[]
  activeRevision?: SampleShippingDestination
  isDefault: boolean
  defaultPending: boolean
  onSetDefault: (definitionKey: string) => void
  onCreateRevision: (item: SampleShippingDestination) => void
  onStatusChange: (item: SampleShippingDestination, isActive: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  const history = [...revisions].sort((a, b) => b.revision - a.revision)
  const latest = history[0]
  return <div className="space-y-5">
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{item.name}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline">Revision {item.revision}</Badge><ShippingActivationBadge item={item} />{isDefault && (latest.id === item.id || activeRevision?.id === item.id) ? <Badge>Default</Badge> : null}</div></div><DestinationActions item={item} revisions={revisions} activeRevision={activeRevision} isDefault={isDefault} defaultPending={defaultPending} onSetDefault={onSetDefault} onCreateRevision={onCreateRevision} onStatusChange={onStatusChange} triggerRef={triggerRef} /></div>{latest.id === item.id ? <DestinationActiveRevisionNote item={item} revisions={revisions} /> : null}</CardHeader>
      <CardContent className="space-y-4 p-4">{latest.id !== item.id ? <p className="text-sm">You are viewing a historical revision. <DestinationLink item={latest}>View latest revision ({latest.revision})</DestinationLink>.</p> : null}<dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Reference</dt><dd className="break-all">{item.code}</dd></div><div><dt className="text-muted-foreground">Effective period</dt><dd>{formatEffectiveRange(item)}</dd></div><Detail label="Recipient or receiving team" value={item.recipientName} /><Detail label="Receiving organization" value={item.organizationName} /><Detail label="Address" value={[item.addressLine1, item.addressLine2, `${item.city}, ${item.stateOrProvince} ${item.postalCode}`, item.countryCode].filter(Boolean).join('\n')} /><Detail label="Receiving phone" value={item.receivingPhone} /><Detail label="Receiving email" value={item.receivingEmail} /><Detail label="Receiving hours" value={item.receivingHours} /><Detail label="Receiving time zone" value={item.timeZoneId} /><Detail label="Closure and holiday instructions" value={item.closureInstructions} /><Detail label="Detailed delivery instructions" value={item.deliveryInstructions} /><Detail label="Carrier restrictions" value={item.carrierRestrictions} /><div><dt className="text-muted-foreground">International shipments</dt><dd>{item.internationalShippingAllowed ? 'Allowed' : 'Not allowed'}</dd></div></dl></CardContent>
    </Card>
    <Card className="gap-0 py-0"><CardHeader className="border-b bg-muted/50 p-4"><CardTitle role="heading" aria-level={3}>Revision history</CardTitle><CardDescription>Each link opens that exact destination revision. Existing Orders and issued shipments retain their saved destination.</CardDescription></CardHeader><CardContent className="p-4"><ul className="divide-y">{history.map(revision => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><DestinationLink item={revision}>Revision {revision.revision} · {revision.name}</DestinationLink>{revision.id === item.id ? <span className="ml-2 text-xs text-muted-foreground">Viewing</span> : null}<p className="mt-1 text-xs text-muted-foreground">{formatEffectiveRange(revision)}</p></div><ShippingActivationBadge item={revision} /></li>)}</ul></CardContent></Card>
  </div>
}

function SampleTypeLink({ item, children }: { item: SampleTypeDefinition; children?: React.ReactNode }) {
  const routeSearch = useSearch({ strict: false })
  const listSearch = parseSampleTypeListSearch(routeSearch)
  return <Link
    to="/sample-shipping-settings"
    search={{ ...listSearch, shippingSection: 'sample-types', sampleTypeId: item.id }}
    className={recordLinkClassName}
  >{children ?? item.name}</Link>
}

function SampleTypeDetails({ item, revisions, onCreateRevision, configuration, apiEnabled }: {
  item: SampleTypeDefinition
  configuration: SampleShippingConfiguration
  revisions: SampleTypeDefinition[]
  onCreateRevision: (item: SampleTypeDefinition) => void
  apiEnabled: boolean
}) {
  const history = [...revisions].sort((a, b) => b.revision - a.revision)
  const latest = history[0]
  const requirements = [
    ['Primary container', item.primaryContainerRequirements],
    ['Preservation requirements', item.temperatureRequirements],
    ['Stabilizer', item.stabilizerRequirements],
    ['Customer labeling', item.labelingInstructions],
    ['Prohibited identifiers', item.prohibitedIdentifiers],
    ['Safety and hazards', item.safetyRequirements],
  ]
  return <div className="space-y-5">
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold">{item.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all">{item.code} · revision {item.revision}</Badge><EffectiveBadge item={item} /></div>
          </div>
          <SampleTypeActions item={item} revisions={revisions} configuration={configuration} onCreateRevision={onCreateRevision} />
        </div>
        <CardDescription className="mt-2 whitespace-pre-wrap">{item.description || 'No description provided.'}</CardDescription>
        {latest?.id === item.id ? <SampleTypeActiveRevisionNote item={item} revisions={revisions} /> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {latest && latest.id !== item.id ? <p className="text-sm">You are viewing a historical revision. <SampleTypeLink item={latest}>View latest revision ({latest.revision})</SampleTypeLink>.</p> : null}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Material type</dt><dd>{item.materialClass === 'extracted_rna' ? 'Total RNA' : item.materialClass === 'enriched_rna' ? 'Enriched RNA' : item.materialClass}</dd></div>
          <div><dt className="text-muted-foreground">Quantity</dt><dd>{quantityRange(item)}</dd></div>
          <div><dt className="text-muted-foreground">Maximum transit time</dt><dd>{item.maximumTransitHours == null ? 'Not specified' : `${item.maximumTransitHours} hours`}</dd></div>
          <div><dt className="text-muted-foreground">Shared shipping procedure</dt><dd>{(() => { const procedure = configuration.procedures?.find(value => value.id === item.shippingProcedureId); return procedure ? <Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'procedures', procedureId: procedure.id }}>{procedure.name}</Link> : <span role="alert" className="text-destructive">Unavailable — choose Change procedure from Actions</span> })()}{item.shippingProcedureId && !currentShippingProcedure(configuration.procedures, item.shippingProcedureId) ? <p role="alert" className="mt-1 text-destructive">This procedure has no Active revision. New Orders are blocked.</p> : null}</dd></div>
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
    <SampleTypePackingPanel sampleType={item} configuration={configuration} />
    {item.packagingInstructions || item.carrierRestrictions ? <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">Earlier sample shipping guidance</summary><p className="mt-2 text-sm text-muted-foreground">Retained from this sample revision. Review this guidance when approving shared procedures and container packing.</p><dl className="mt-3 space-y-3"><Detail label="Packaging" value={item.packagingInstructions} /><Detail label="Carrier restrictions" value={item.carrierRestrictions} /></dl></details> : null}
    <ContainerSizesPanel apiEnabled={apiEnabled} configuration={configuration} sampleType={item} />
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

function DestinationDialog({ item, onClose, onSaved }: { item: SampleShippingDestination | null | undefined; onClose: () => void; onSaved: (item: SampleShippingDestination) => void }) {
  const client = useQueryClient()
  const form = useForm<DestinationValues>({ resolver: zodResolver(destinationSchema), defaultValues: emptyDestination })
  const mutation = useMutation({
    mutationFn: (values: DestinationValues) => createSampleShippingDestination({
      ...values,
      isActive: values.isActive,
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
    onSuccess: async saved => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onSaved(saved) },
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
        <DialogHeader><DialogTitle>{item ? `Create ${item.name} revision ${item.revision + 1}` : 'Add ship-to destination'}</DialogTitle><DialogDescription>Status defaults to Active. Choose Inactive when this destination needs more review; an earlier Active revision remains available until its successor becomes effective. Existing Orders keep their selected destination revision.</DialogDescription></DialogHeader>
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
          <p className="text-sm text-muted-foreground sm:col-span-2">Existing Orders retain their selected destination revision. New Orders use the current Active destination revision.</p>
          <Field label="Status" id="destination-status" required error={form.formState.errors.isActive?.message} full><select id="destination-status" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring/50 focus-visible:outline-none" value={form.watch('isActive') ? 'active' : 'inactive'} onChange={event => form.setValue('isActive', event.target.value === 'active', { shouldDirty: true })}><option value="active">Active</option><option value="inactive">Inactive</option></select><p className="mt-2 text-sm text-muted-foreground">{item ? 'An Active revision replaces the earlier Active revision at its Effective from time. An Inactive revision leaves the earlier one available.' : 'Choose Inactive to save this destination for later review.'}</p></Field>
        </form>
        {mutation.error ? <SaveError title="Destination revision was not saved" error={mutation.error} /> : null}
        <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" form="sample-shipping-destination-form" disabled={mutation.isPending || Boolean(item && !form.formState.isDirty)}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add destination'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SampleTypeDialog({ item, configuration, onClose, onSaved }: { item: SampleTypeDefinition | null | undefined; configuration: SampleShippingConfiguration; onClose: () => void; onSaved: (item: SampleTypeDefinition) => void }) {
  const client = useQueryClient()
  const form = useForm<SampleTypeValues>({ resolver: zodResolver(sampleTypeSchema), defaultValues: emptySampleType })
  const mutation = useMutation({
    mutationFn: (values: SampleTypeValues) => createSampleTypeDefinition({
      ...values,
      isActive: values.isActive,
      code: values.code.toUpperCase(),
      minimumQuantity: optionalNumber(values.minimumQuantity),
      maximumQuantity: optionalNumber(values.maximumQuantity),
      maximumTransitHours: optionalNumber(values.maximumTransitHours),
      stabilizerRequirements: values.stabilizerRequirements || null,
      shippingProcedureId: item ? null : values.shippingProcedureId,
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
    form.reset(item ? { ...sampleTypeValues(item), isActive: true } : { ...emptySampleType, code: 'SAMPLE-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(), effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, configuration.procedures, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={!mutation.isPending} aria-busy={mutation.isPending} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{item ? `Create ${item.name} revision ${item.revision + 1}` : 'Add sample type'}</DialogTitle><DialogDescription>Describe the submitted material and its preservation needs. Set coolant methods, amounts and outer-container packing in Kit specifications.</DialogDescription></DialogHeader>
        <form id="sample-type-form" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <fieldset disabled={mutation.isPending} className="grid gap-5 px-1 sm:grid-cols-2">
          <Field label="Name" id="sample-type-name" required error={form.formState.errors.name?.message} full><Input id="sample-type-name" {...form.register('name')} /></Field>
          <Field label="Description" id="sample-type-description" error={form.formState.errors.description?.message} full><TextArea id="sample-type-description" rows={3} registration={form.register('description')} /></Field>
          {!item ? <Field label="Shared shipping procedure" id="sample-type-procedure" required error={form.formState.errors.shippingProcedureId?.message} full>
            <select id="sample-type-procedure" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm" aria-invalid={Boolean(form.formState.errors.shippingProcedureId)} {...form.register('shippingProcedureId')}>
              <option value="">Choose a procedure…</option>
              {latestRevisions((configuration.procedures ?? []).filter(procedure => procedure.isActive)).map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">The procedure applies to every order of this Sample type. Change it later from the record's Actions menu.</p>
          </Field> : null}
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
          <Field label="Sample tube or vessel requirements" id="sample-type-container" required error={form.formState.errors.primaryContainerRequirements?.message} full><ScientificTextField control={form.control} name="primaryContainerRequirements" id="sample-type-container" label="Sample tube or vessel requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.primaryContainerRequirements ? 'sample-type-container-error' : undefined} /></Field>
          <Field label="Preservation requirements" id="sample-type-temperature" required error={form.formState.errors.temperatureRequirements?.message} full><ScientificTextField control={form.control} name="temperatureRequirements" id="sample-type-temperature" label="Preservation requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.temperatureRequirements ? 'sample-type-temperature-error' : undefined} /></Field>
          <Field label="Stabilizer requirements" id="sample-type-stabilizer" error={form.formState.errors.stabilizerRequirements?.message} full><ScientificTextField control={form.control} name="stabilizerRequirements" id="sample-type-stabilizer" label="Stabilizer requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.stabilizerRequirements ? 'sample-type-stabilizer-error' : undefined} /></Field>
          {item?.packagingInstructions ? <Field label="Earlier sample packaging instructions" id="sample-type-packaging" error={form.formState.errors.packagingInstructions?.message} full><ScientificTextField control={form.control} name="packagingInstructions" id="sample-type-packaging" label="Sample-type packaging instructions" multiline rows={4} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.packagingInstructions ? 'sample-type-packaging-error' : undefined} /></Field> : null}
          <Field label="Customer label instructions" id="sample-type-labeling" required error={form.formState.errors.labelingInstructions?.message} full><ScientificTextField control={form.control} name="labelingInstructions" id="sample-type-labeling" label="Customer label instructions" multiline rows={4} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.labelingInstructions ? 'sample-type-labeling-error' : undefined} /></Field>
          <Field label="Prohibited identifiers" id="sample-type-prohibited" required error={form.formState.errors.prohibitedIdentifiers?.message} full><ScientificTextField control={form.control} name="prohibitedIdentifiers" id="sample-type-prohibited" label="Prohibited identifiers" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.prohibitedIdentifiers ? 'sample-type-prohibited-error' : undefined} /></Field>
          <Field label="Safety and hazard requirements" id="sample-type-safety" required error={form.formState.errors.safetyRequirements?.message} full><ScientificTextField control={form.control} name="safetyRequirements" id="sample-type-safety" label="Safety and hazard requirements" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.safetyRequirements ? 'sample-type-safety-error' : undefined} /></Field>
          {item?.carrierRestrictions ? <Field label="Earlier carrier restrictions" id="sample-type-carrier" error={form.formState.errors.carrierRestrictions?.message} full><ScientificTextField control={form.control} name="carrierRestrictions" id="sample-type-carrier" label="Carrier restrictions" multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.carrierRestrictions ? 'sample-type-carrier-error' : undefined} /></Field> : null}
          <div className="grid gap-x-5 gap-y-2 sm:col-span-2 sm:grid-cols-2">
            <Field label="Effective from" id="sample-type-effective" required error={form.formState.errors.effectiveFrom?.message}><Input id="sample-type-effective" type="datetime-local" aria-invalid={Boolean(form.formState.errors.effectiveFrom)} aria-describedby={form.formState.errors.effectiveFrom ? 'sample-type-effective-error' : undefined} {...form.register('effectiveFrom')} /></Field>
            <Field label="Status" id="sample-type-status" required><select id="sample-type-status" className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={form.watch('isActive') ? 'active' : 'inactive'} onChange={event => form.setValue('isActive', event.target.value === 'active', { shouldDirty: true })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
            {item
              ? <p className="text-sm text-muted-foreground sm:col-span-2">Active is the default. Saving Active replaces an earlier active revision at the Effective from time. Saving Inactive leaves an earlier active revision available until it is replaced or deactivated.</p>
              : <p className="text-sm text-muted-foreground sm:col-span-2">Active is the default for new sample types. Choose Inactive to save for later review. Ordering also requires an Active procedure, a usable linked transportation kit, and a Default destination.</p>}
          </div>
          </fieldset>
        </form>
        {mutation.error ? <SaveError title="Sample-type revision was not saved" error={mutation.error} /> : null}
        <RequiredDialogFooter><Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>Cancel</Button><Button type="submit" form="sample-type-form" disabled={mutation.isPending || Boolean(item && !form.formState.isDirty)}>{mutation.isPending ? 'Saving revision…' : item ? 'Create revision' : 'Add sample type'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function revisionHasNotEnded(item: { effectiveTo: string | null }) { return !item.effectiveTo || new Date(item.effectiveTo).getTime() > Date.now() }

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

function TextArea({ id, registration, rows, error }: { id: string; registration: UseFormRegisterReturn; rows: number; error?: string }) {
  return <textarea id={id} rows={rows} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" {...registration} />
}

function ErrorText({ message, id }: { message?: string; id?: string }) { return message ? <p id={id} className="mt-1 text-sm text-destructive" role="alert">{message}</p> : null }

function destinationValues(item: SampleShippingDestination): DestinationValues {
  return { code: item.code, name: item.name, recipientName: item.recipientName, organizationName: item.organizationName, addressLine1: item.addressLine1, addressLine2: item.addressLine2 ?? '', city: item.city, stateOrProvince: item.stateOrProvince, postalCode: item.postalCode, countryCode: item.countryCode, receivingPhone: item.receivingPhone ?? '', receivingEmail: item.receivingEmail ?? '', receivingHours: item.receivingHours, timeZoneId: item.timeZoneId, closureInstructions: item.closureInstructions ?? '', deliveryInstructions: item.deliveryInstructions, carrierRestrictions: item.carrierRestrictions ?? '', internationalShippingAllowed: item.internationalShippingAllowed, effectiveFrom: toLocalDateTime(new Date(Math.max(Date.now(), Date.parse(item.effectiveFrom) + 60_000))), isActive: true }
}

function sampleTypeValues(item: SampleTypeDefinition): SampleTypeValues {
  return { shippingProcedureId: item.shippingProcedureId ?? '', code: item.code, name: item.name, description: item.description, materialClass: item.materialClass, minimumQuantity: optionalNumberText(item.minimumQuantity), maximumQuantity: optionalNumberText(item.maximumQuantity), quantityUnit: item.quantityUnit, primaryContainerRequirements: item.primaryContainerRequirements, temperatureRequirements: item.temperatureRequirements, stabilizerRequirements: item.stabilizerRequirements ?? '', packagingInstructions: item.packagingInstructions, labelingInstructions: item.labelingInstructions, prohibitedIdentifiers: item.prohibitedIdentifiers, safetyRequirements: item.safetyRequirements, carrierRestrictions: item.carrierRestrictions ?? '', maximumTransitHours: optionalNumberText(item.maximumTransitHours), effectiveFrom: toLocalDateTime(new Date()), isActive: item.isActive }
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return <div className="text-sm"><dt className="font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap wrap-anywhere">{value}</dd></div>
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
