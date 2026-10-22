import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { availabilityTones } from '#/features/orders/configuration/availability-status'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { BackLink } from '#/components/ui/back-link'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { useModalDraftGuard } from '#/features/orders/use-modal-draft-guard'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { FilePenLine, MapPin, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { getOrderErrorMessage } from '#/api/order-management'
import { getShippingContainerDefinitions } from '#/api/shipping-containers'
import {
  createSampleShippingDestination,
  createSampleTypeDefinition,
  discardSampleShippingDestinationDraft,
  getSampleShippingConfiguration,
  setDefaultShippingDestination,
  updateSampleShippingDestinationDraft,
  updateSampleTypeDraft,
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
import { type ShippingSettingsSection } from './shipping-settings-navigation'
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
  recipientName: z.string().trim().max(255),
  organizationName: z.string().trim().max(255),
  addressLine1: z.string().trim().max(255),
  addressLine2: z.string().trim().max(255),
  city: z.string().trim().max(150),
  stateOrProvince: z.string().trim().max(150),
  postalCode: z.string().trim().max(50),
  countryCode: z.string().trim().length(2, 'Use a two-letter country code.'),
  receivingPhone: z.string().trim().max(50),
  receivingEmail: z.union([z.literal(''), z.string().trim().email('Enter a valid receiving email.').max(255)]),
  receivingHours: z.string().trim().max(1000),
  timeZoneId: z.string().trim().max(100),
  closureInstructions: z.string().trim().max(2000),
  deliveryInstructions: z.string().trim().max(4000),
  carrierRestrictions: z.string().trim().max(2000),
  internationalShippingAllowed: z.boolean(),
  effectiveFrom: z.string().min(1, 'Choose when this revision becomes effective.'),
  isActive: z.boolean(),
})

type DestinationValues = z.infer<typeof destinationSchema>

const sampleTypeSchema = z.object({
  shippingProcedureId: z.union([z.literal(''), z.string().uuid('Choose one shared shipping procedure.')]),
  code: z.string().trim().min(1, 'Enter a sample-type code.').max(50).regex(codePattern, 'Use letters, numbers, hyphens, or underscores.'),
  name: z.string().trim().min(1, 'Enter a sample-type name.').max(255),
  description: z.string().trim().max(2000),
  materialClass: z.string().trim().max(255),
  minimumQuantity: optionalQuantity,
  maximumQuantity: optionalQuantity,
  quantityUnit: z.string().trim().max(100),
  minimumSampleAmount: positiveOptionalNumber,
  sampleAmountUnit: z.enum(['', 'µL', 'mL']),
  primaryContainerRequirements: z.string().trim().max(2000),
  temperatureRequirements: z.string().trim().max(2000),
  stabilizerRequirements: z.string().trim().max(2000),
  packagingInstructions: z.string().trim().max(4000),
  labelingInstructions: z.string().trim().max(4000),
  prohibitedIdentifiers: z.string().trim().max(2000),
  safetyRequirements: z.string().trim().max(2000),
  carrierRestrictions: z.string().trim().max(2000),
  maximumTransitHours: positiveOptionalNumber,
  effectiveFrom: z.string().min(1, 'Choose when this revision becomes effective.'),
  isActive: z.boolean(),
}).superRefine((values, context) => {
  if (Boolean(values.minimumSampleAmount) !== Boolean(values.sampleAmountUnit))
    context.addIssue({ code: 'custom', message: 'Enter both the minimum sample amount and its unit.', path: ['sampleAmountUnit'] })
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
  code: '', name: '', description: '', materialClass: '', minimumQuantity: '1', maximumQuantity: '', quantityUnit: '', minimumSampleAmount: '', sampleAmountUnit: '',
  primaryContainerRequirements: '', temperatureRequirements: '', stabilizerRequirements: '', packagingInstructions: '',
  labelingInstructions: '', prohibitedIdentifiers: '', safetyRequirements: '', carrierRestrictions: '', maximumTransitHours: '',
  effectiveFrom: toLocalDateTime(new Date()), isActive: true,
}

export function SampleShippingConfigurationPanel({ apiEnabled, section, sampleTypeId, destinationId, procedureId }: { apiEnabled: boolean; section: ShippingSettingsSection; sampleTypeId?: string; destinationId?: string; procedureId?: string }) {
  const __customerText = useCustomerText()

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

  const destinations = useMemo(() => primaryShippingRevisions(configuration.data?.destinations ?? []), [configuration.data?.destinations])
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
  const sampleTypes = useMemo(() => primaryShippingRevisions(configuration.data?.sampleTypes ?? []), [configuration.data?.sampleTypes])
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
    return (destinationListSearch.destinationShowInactive || revisions.some(value => (value.isActive || value.lifecycle === 'Draft') && revisionHasNotEnded(value)))
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
    return (sampleTypeListSearch.sampleTypeShowInactive || revisions.some(value => (value.isActive || value.lifecycle === 'Draft') && revisionHasNotEnded(value)))
      && (!sampleTypeNeedle || revisions.some(value => `${value.name} ${value.code} ${value.materialClass} ${value.description}`.toLocaleLowerCase().includes(sampleTypeNeedle)))
  })
  const sampleTypePageCount = Math.max(1, Math.ceil(filteredSampleTypes.length / sampleTypePageSize))
  const sampleTypePage = Math.min(sampleTypeListSearch.sampleTypePage ?? 1, sampleTypePageCount)
  const visibleSampleTypes = filteredSampleTypes.slice((sampleTypePage - 1) * sampleTypePageSize, sampleTypePage * sampleTypePageSize)

  if (configuration.isLoading) return <p role="status"><CustomerText message="m_32825631d9ce" /></p>
  if (configuration.error) {
    return <Alert variant="destructive"><AlertTitle><CustomerText message="m_ac52d17f83f8" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(configuration.error, 'Refresh the configuration and try again.')} />} <Button variant="outline" onClick={() => void configuration.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert>
  }
  if (!configuration.data) return null
  const currentDefaultDestination = activeDestinationChoices.find(item => item.definitionKey === configuration.data.defaultDestinationDefinitionKey)
  return (
    <div className="space-y-5">
      {section === 'procedures' ? <ShippingProceduresPanel procedures={configuration.data.procedures ?? []} procedureId={procedureId} configuration={configuration.data} /> : null}
      {section === 'containers' ? <ContainerSizesPanel apiEnabled={apiEnabled} configuration={configuration.data} /> : null}

      {section === 'destinations' && destinationId ? <>
        <BackLink asChild><Link to="/sample-shipping-settings" search={{ ...destinationListSearch, shippingSection: "destinations" }}><CustomerText message="m_5e981c67ca29" /></Link></BackLink>
        {defaultDestination.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_02d40c4c1d24" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(defaultDestination.error, 'Refresh the destinations and try again.')} />}</AlertDescription></Alert> : null}
        {selectedDestination ? <DestinationDetails item={selectedDestination} revisions={destinationFamilies.get(selectedDestination.definitionKey) ?? [selectedDestination]} activeRevision={activeDestinationChoices.find(choice => choice.definitionKey === selectedDestination.definitionKey)} isDefault={selectedDestination.definitionKey === configuration.data.defaultDestinationDefinitionKey} defaultPending={defaultDestination.isPending} onSetDefault={definitionKey => defaultDestination.mutate(definitionKey)} onCreateRevision={setDestinationEditor} onStatusChange={(item, isActive) => setStatusChange({ kind: 'destination', item, isActive })} triggerRef={statusActionsRef} /> : <Alert><AlertTitle><CustomerText message="m_c424684bc5c6" /></AlertTitle><AlertDescription><CustomerText message="m_669f01082ceb" /></AlertDescription></Alert>}
      </> : null}

      {section === 'destinations' && !destinationId ? <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3">
          <CardTitle className="min-w-0"><CustomerText message="m_ebb6ab028a88" /></CardTitle>
          <Button className="col-start-2 row-start-1 justify-self-end" type="button" onClick={() => setDestinationEditor(null)}><Plus data-icon="inline-start" /><CustomerText message="m_48b7df13ccd6" /></Button>
          <CardDescription className="col-span-full"><CustomerText message="m_7ff2a283c64e" /></CardDescription>
          <p className="col-span-full text-xs text-muted-foreground"><CustomerText message="m_d98860644dbc" /></p>
          <div className="col-span-full grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input id="destination-search" className="w-full" aria-label={__customerText('m_0d62a42b15f9')} value={destinationSearchText} maxLength={255} onChange={event => setDestinationSearchText(event.target.value)} placeholder={__customerText('m_766f3ef8515d')} />
            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-self-end">
              <Checkbox id="destination-show-inactive" checked={Boolean(destinationListSearch.destinationShowInactive)} onCheckedChange={checked => changeDestinationListSearch({ destinationShowInactive: checked === true, destinationPage: 1 })} />
              <Label htmlFor="destination-show-inactive" className="cursor-pointer"><CustomerText message="m_1f91c29f3f97" /></Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {defaultDestination.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_02d40c4c1d24" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(defaultDestination.error, 'Refresh the destinations and try again.')} />}</AlertDescription></Alert> : null}
          {!configuration.data.defaultDestinationDefinitionKey ? <Alert variant="warning">
            <AlertTitle><CustomerText message="m_2501cc613113" /></AlertTitle>
            <AlertDescription>{activeDestinationChoices.length ? <CustomerSourceText source={"Open the Actions menu on a current Active destination and choose Set as default before finalizing another sample list."} /> : __customerText('m_198c13e07677')}</AlertDescription>
          </Alert> : null}
          {configuration.data.defaultDestinationDefinitionKey && !currentDefaultDestination ? <Alert variant="warning">
            <AlertTitle><CustomerText message="m_19c3de840255" /></AlertTitle>
            <AlertDescription>{activeDestinationChoices.length ? <CustomerSourceText source={"Open the Actions menu on a current Active destination and choose Set as default before finalizing another sample list."} /> : __customerText('m_198c13e07677')}</AlertDescription>
          </Alert> : null}
          <div className="divide-y">
            {visibleDestinations.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><DestinationLink item={item} /><Badge variant="outline"><CustomerText message="m_65dae0c1e49d" />{item.revision}</Badge><ShippingActivationBadge item={item} />{item.definitionKey === configuration.data.defaultDestinationDefinitionKey ? <Badge><CustomerText message="m_21b111cbfe6e" /></Badge> : null}</div>
                  <p className="mt-2 text-sm">{item.organizationName} · {item.city}, {item.stateOrProvince} {item.postalCode} · {item.countryCode}</p>
                  <p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_1cfe1580d022" />{item.receivingHours} · {item.timeZoneId}</p>
                  {(destinationFamilies.get(item.definitionKey) ?? []).filter(value => value.lifecycle === 'Draft' && value.id !== item.id).map(draft => <p key={draft.id} className="mt-2 text-sm"><DestinationLink item={draft}><CustomerText message="m_d0adc1bb6f60" />{draft.revision}: {draft.name}</DestinationLink></p>)}
                  <DestinationActiveRevisionNote item={item} revisions={destinationFamilies.get(item.definitionKey) ?? [item]} />
                </div>
                <DestinationActions item={item} revisions={destinationFamilies.get(item.definitionKey) ?? [item]} activeRevision={activeDestinationChoices.find(choice => choice.definitionKey === item.definitionKey)} isDefault={item.definitionKey === configuration.data.defaultDestinationDefinitionKey} defaultPending={defaultDestination.isPending} onSetDefault={definitionKey => defaultDestination.mutate(definitionKey)} onCreateRevision={setDestinationEditor} onStatusChange={(target, isActive) => setStatusChange({ kind: 'destination', item: target, isActive })} triggerRef={statusActionsRef} />
              </div>
            ))}
          </div>
          {!destinations.length ? <EmptyConfiguration text="No ship-to destinations are configured." /> : !filteredDestinations.length ? <EmptyConfiguration text={destinationNeedle ? "No ship-to destinations match this search." : "No active ship-to destinations. Select Show inactive to review inactive destinations."} /> : null}
          {filteredDestinations.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground"><span>{filteredDestinations.length} {filteredDestinations.length === 1 ? <CustomerSourceText source={"destination"} /> : __customerText('m_1af0500e4d2b')} <CustomerText message="m_e85181afe2a3" />{destinationPage} of {destinationPageCount}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={destinationPage <= 1} onClick={() => changeDestinationListSearch({ destinationPage: destinationPage - 1 })}><CustomerText message="m_a57b08a480b8" /></Button><Button type="button" size="sm" variant="outline" disabled={destinationPage >= destinationPageCount} onClick={() => changeDestinationListSearch({ destinationPage: destinationPage + 1 })}><CustomerText message="m_1ff57a29d7c9" /></Button></div></div> : null}
          <RevisionHistory items={configuration.data.destinations} currentItems={destinations} label={(item) => `${item.name} · revision ${item.revision} · ${effectiveState(item).toLowerCase()} · ${formatEffectiveRange(item)}`} />
        </CardContent>
      </Card> : null}

      {section === 'sample-types' && sampleTypeId ? <>
        <BackLink asChild><Link to="/sample-shipping-settings" search={{ ...sampleTypeListSearch, shippingSection: "sample-types" }}><CustomerText message="m_b44e47c99596" /></Link></BackLink>
        {selectedSampleType ? <SampleTypeDetails item={selectedSampleType} revisions={configuration.data.sampleTypes.filter(item => item.definitionKey === selectedSampleType.definitionKey)} onCreateRevision={setSampleTypeEditor} configuration={configuration.data} apiEnabled={apiEnabled} /> : <Alert><AlertTitle><CustomerText message="m_1bdefc797952" /></AlertTitle><AlertDescription><CustomerText message="m_5889e03f90ba" /></AlertDescription></Alert>}
      </> : null}

      {section === 'sample-types' && !sampleTypeId ? <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3">
          <CardTitle className="min-w-0"><CustomerText message="m_bd4e8f4f92d0" /></CardTitle>
          <Button className="col-start-2 row-start-1 justify-self-end" type="button" onClick={() => setSampleTypeEditor(null)}><Plus data-icon="inline-start" /><CustomerText message="m_ed830a72d799" /></Button>
          <CardDescription className="col-span-full"><CustomerText message="m_05c1b6eb62a0" /></CardDescription>
          <div className="col-span-full grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <Input id="sample-type-search" className="w-full" aria-label={__customerText('m_d820e2f86231')} value={sampleTypeSearchText} maxLength={255} onChange={event => setSampleTypeSearchText(event.target.value)} placeholder={__customerText('m_3ee56840eaee')} />
            <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-self-end">
              <Checkbox id="sample-type-show-inactive" checked={Boolean(sampleTypeListSearch.sampleTypeShowInactive)} onCheckedChange={checked => changeSampleTypeListSearch({ sampleTypeShowInactive: checked === true, sampleTypePage: 1 })} />
              <Label htmlFor="sample-type-show-inactive" className="cursor-pointer"><CustomerText message="m_1f91c29f3f97" /></Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {kitDefinitions.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_042d6cd3abc6" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(kitDefinitions.error, 'Refresh the transportation kits and try again.')} />} <Button type="button" variant="outline" size="sm" onClick={() => void kitDefinitions.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
          <div className="divide-y">
            {visibleSampleTypes.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><SampleTypeLink item={item} /><Badge variant="outline"><CustomerText message="m_65dae0c1e49d" />{item.revision}</Badge><ShippingActivationBadge item={item} /></div>
                  <p className="mt-2 text-sm">{item.materialClass === 'extracted_rna' ? <CustomerSourceText source={"Total RNA"} /> : item.materialClass === 'enriched_rna' ? "Enriched RNA" : item.materialClass} · {quantityRange(item)}</p>
                  <p className="mt-1 text-xs"><CustomerText message="m_f4e06c19c35d" />{configuration.data.procedures?.find(procedure => procedure.id === item.shippingProcedureId)?.name ?? 'None'}</p>
                  {(sampleTypeFamilies.get(item.definitionKey) ?? []).filter(value => value.lifecycle === 'Draft' && value.id !== item.id).map(draft => <p key={draft.id} className="mt-2 text-sm"><SampleTypeLink item={draft}><CustomerText message="m_d0adc1bb6f60" />{draft.revision}: {draft.name}</SampleTypeLink></p>)}
                  {!currentShippingProcedure(configuration.data.procedures, item.shippingProcedureId) ? <p role="alert" className="mt-2 rounded-md border border-warning-border bg-warning-background px-3 py-2 text-sm text-warning"><CustomerText message="m_1795860f207d" /></p> : null}
                  {kitDefinitions.data && !kitDefinitions.data.some(kit => kit.sampleTypeAnchorId === (sampleTypeFamilies.get(item.definitionKey) ?? []).find(revision => revision.revision === 1)?.id
                    && kit.isActive && !kit.deactivatedAt && Date.parse(kit.effectiveFrom) <= Date.now()
                    && (!kit.effectiveTo || Date.parse(kit.effectiveTo) > Date.now())
                    && kit.newWorkReady !== false && !containerDependencyWarnings(kit, configuration.data).length)
                    ? item.lifecycle === 'Draft'
                      ? <p role="status" className="mt-2 rounded-md border border-warning-border bg-warning-background px-3 py-2 text-sm text-warning"><CustomerText message="m_10ab4d4b630e" /></p>
                      : <p role="alert" className="mt-2 rounded-md border border-warning-border bg-warning-background px-3 py-2 text-sm text-warning"><CustomerText message="m_2c5a1f0127a2" /></p>
                    : null}
                  <SampleTypeActiveRevisionNote item={item} revisions={sampleTypeFamilies.get(item.definitionKey) ?? [item]} />
                </div>
                <SampleTypeActions item={item} revisions={sampleTypeFamilies.get(item.definitionKey) ?? [item]} onCreateRevision={setSampleTypeEditor} onStatusChanged={(changed, isActive) => {
                  if (changed.id === item.id && !isActive && !sampleTypeListSearch.sampleTypeShowInactive) {
                    window.requestAnimationFrame(() => document.getElementById('sample-type-search')?.focus())
                  }
                }} />
              </div>
            ))}
          </div>
          {!sampleTypes.length ? <EmptyConfiguration text="No sample types are configured." /> : !filteredSampleTypes.length ? <EmptyConfiguration text={sampleTypeNeedle ? "No sample types match this search." : "No active sample types. Select Show inactive to review inactive definitions."} /> : null}
          {filteredSampleTypes.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground"><span>{filteredSampleTypes.length} <CustomerText message="m_ea860fb9328e" />{filteredSampleTypes.length === 1 ? <CustomerSourceText source={"type"} /> : __customerText('m_8d8460221bf4')} <CustomerText message="m_e85181afe2a3" />{sampleTypePage} of {sampleTypePageCount}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={sampleTypePage <= 1} onClick={() => changeSampleTypeListSearch({ sampleTypePage: sampleTypePage - 1 })}><CustomerText message="m_a57b08a480b8" /></Button><Button type="button" size="sm" variant="outline" disabled={sampleTypePage >= sampleTypePageCount} onClick={() => changeSampleTypeListSearch({ sampleTypePage: sampleTypePage + 1 })}><CustomerText message="m_1ff57a29d7c9" /></Button></div></div> : null}
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
  return <Link to="/sample-shipping-settings" search={{ ...listSearch, shippingSection: "destinations", destinationId: item.id }} className={recordLinkClassName}>{children ?? item.name}</Link>
}

function DestinationActiveRevisionNote({ item, revisions }: { item: SampleShippingDestination; revisions: SampleShippingDestination[] }) {
  const __customerText = useCustomerText()

  const now = Date.now()
  const current = revisions.filter(value => value.isActive && Date.parse(value.effectiveFrom) <= now && (!value.effectiveTo || Date.parse(value.effectiveTo) > now)).sort((a, b) => b.revision - a.revision)[0]
  if (current && current.id !== item.id) return <p className="mt-2 text-sm text-muted-foreground"><CustomerText message="m_e330d85ff901" />{current.revision} ({current.name}<CustomerText message="m_de76da0d426d" />{item.isActive ? __customerText('m_c9037cc23b35', { p0: String(item.revision), p1: String(formatDateTime(item.effectiveFrom)) }) : __customerText('m_b18508e4aba7', { p0: String(item.revision) })} <CustomerText message="m_37920bfe7296" /></p>
  const scheduled = revisions.filter(value => value.id !== item.id && value.isActive && Date.parse(value.effectiveFrom) > now && revisionHasNotEnded(value)).sort((a, b) => a.revision - b.revision)[0]
  return scheduled ? <p className="mt-2 text-sm text-muted-foreground"><CustomerText message="m_e330d85ff901" />{scheduled.revision} ({scheduled.name}<CustomerText message="m_ec1eb3f7448e" />{formatDateTime(scheduled.effectiveFrom)}<CustomerText message="m_d333ba981114" /></p> : null
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
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const [discarding, setDiscarding] = useState(false)
  const discard = useMutation({ mutationFn: () => discardSampleShippingDestinationDraft(item.id, item.version), onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setDiscarding(false) } })
  const draft = revisions.find(value => value.lifecycle === 'Draft')
  const latest = !revisions.some(value => value.revision > item.revision)
  const latestReleased = [...revisions].filter(value => value.lifecycle === 'Released' || value.lifecycle === 'Superseded' || value.lifecycle === 'Deactivated').sort((a, b) => b.revision - a.revision)[0]
  if (!latest && !item.isActive && latestReleased?.id !== item.id) return null
  const earlierActive = !item.isActive ? revisions.filter(value => value.id !== item.id && value.isActive && revisionHasNotEnded(value)) : []
  return <><ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" onPointerDown={event => { triggerRef.current = event.currentTarget }} onFocus={event => { triggerRef.current = event.currentTarget }}><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
    {activeRevision && !isDefault ? <DropdownMenuItem disabled={defaultPending} onSelect={() => onSetDefault(item.definitionKey)}><MapPin aria-hidden="true" />{activeRevision.id === item.id ? <CustomerSourceText source={"Set as default"} /> : __customerText('m_090f1e9d7f75', { p0: String(activeRevision.revision) })}</DropdownMenuItem> : null}
    {draft ? <DropdownMenuItem onSelect={() => onCreateRevision(draft)}><FilePenLine aria-hidden="true" /><CustomerText message="m_439cdd5d5ae6" />{draft.revision}</DropdownMenuItem> : latest || latestReleased?.id === item.id ? <DropdownMenuItem onSelect={() => onCreateRevision(latestReleased ?? item)}><FilePenLine aria-hidden="true" /><CustomerText message="m_68bf5426f2b3" /></DropdownMenuItem> : null}
    {item.lifecycle === 'Draft' && revisionHasNotEnded(item) ? <DropdownMenuItem onSelect={() => onStatusChange(item, true)}><CustomerText message="m_24433c70eba5" /></DropdownMenuItem> : null}
    {item.lifecycle === 'Draft' ? <DropdownMenuItem variant="destructive" onSelect={() => setDiscarding(true)}><CustomerText message="m_eb1a70e39274" /></DropdownMenuItem> : null}
    {item.isActive ? <DropdownMenuItem variant="destructive" onSelect={() => onStatusChange(item, false)}><CustomerText message="m_fb1e6fa55327" /></DropdownMenuItem> : null}
    {earlierActive.map(value => <DropdownMenuItem key={value.id} variant="destructive" onSelect={() => onStatusChange(value, false)}><CustomerText message="m_21258394677b" />{value.revision}</DropdownMenuItem>)}
  </DropdownMenuContent></ActionMenu><Dialog open={discarding} onOpenChange={open => { if (!open && !discard.isPending) setDiscarding(false) }}><DialogContent><DialogHeader><DialogTitle><CustomerText message="m_cf1f2d80cffd" />{item.revision}?</DialogTitle><DialogDescription><CustomerText message="m_e07d302fb13d" /></DialogDescription></DialogHeader>{discard.error ? <SaveError title={__customerText('m_f39e54ae4225')} error={discard.error} /> : null}<RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" onClick={() => setDiscarding(false)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="button" variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate()}>{discard.isPending ? <CustomerSourceText source={"Discarding…"} /> : __customerText('m_35cefb4d4564')}</Button></RequiredDialogFooter></DialogContent></Dialog></>
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
  const __customerText = useCustomerText()

  const history = [...revisions].sort((a, b) => b.revision - a.revision)
  const latest = history[0]
  return <div className="space-y-5">
    <Card className="gap-0 py-0">
      <CardHeader ><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{item.name}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline"><CustomerText message="m_e330d85ff901" />{item.revision}</Badge><ShippingActivationBadge item={item} />{isDefault && (latest.id === item.id || activeRevision?.id === item.id) ? <Badge><CustomerText message="m_21b111cbfe6e" /></Badge> : null}</div></div><DestinationActions item={item} revisions={revisions} activeRevision={activeRevision} isDefault={isDefault} defaultPending={defaultPending} onSetDefault={onSetDefault} onCreateRevision={onCreateRevision} onStatusChange={onStatusChange} triggerRef={triggerRef} /></div>{latest.id === item.id ? <DestinationActiveRevisionNote item={item} revisions={revisions} /> : null}</CardHeader>
      <CardContent className="space-y-4 p-4">{latest.id !== item.id ? <p className="text-sm"><CustomerText message="m_4ce10a1c71be" /><DestinationLink item={latest}><CustomerText message="m_70b71a22d565" />{latest.revision})</DestinationLink>.</p> : null}<dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground"><CustomerText message="m_71bf90935fc2" /></dt><dd className="break-all">{item.code}</dd></div><div><dt className="text-muted-foreground"><CustomerText message="m_bc53cda3bb3c" /></dt><dd>{formatEffectiveRange(item)}</dd></div><Detail label={__customerText('m_2e5b042d5d00')} value={item.recipientName} /><Detail label={__customerText('m_23d1886ab06e')} value={item.organizationName} /><Detail label={__customerText('m_56ef8f20955f')} value={[item.addressLine1, item.addressLine2, `${item.city}, ${item.stateOrProvince} ${item.postalCode}`, item.countryCode].filter(Boolean).join('\n')} /><Detail label={__customerText('m_b3fc5f3a4a1d')} value={item.receivingPhone} /><Detail label={__customerText('m_7a198ebd1a9f')} value={item.receivingEmail} /><Detail label={__customerText('m_cbc9319052d8')} value={item.receivingHours} /><Detail label={__customerText('m_1c6fb10cefd4')} value={item.timeZoneId} /><Detail label={__customerText('m_ed480d2dfb71')} value={item.closureInstructions} /><Detail label={__customerText('m_e9079d39da11')} value={item.deliveryInstructions} /><Detail label={__customerText('m_a13344e5100f')} value={item.carrierRestrictions} /><div><dt className="text-muted-foreground"><CustomerText message="m_030e445b8fed" /></dt><dd>{item.internationalShippingAllowed ? <CustomerSourceText source={"Allowed"} /> : __customerText('m_f0406a0e7eb1')}</dd></div></dl></CardContent>
    </Card>
    <Card className="gap-0 py-0"><CardHeader ><CardTitle role="heading" aria-level={3}><CustomerText message="m_5ae0d3d186c7" /></CardTitle><CardDescription><CustomerText message="m_42446a6b72d8" /></CardDescription></CardHeader><CardContent className="p-4"><ul className="divide-y">{history.map(revision => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><DestinationLink item={revision}><CustomerText message="m_e330d85ff901" />{revision.revision} · {revision.name}</DestinationLink>{revision.id === item.id ? <span className="ml-2 text-xs text-muted-foreground"><CustomerText message="m_9dc859e86f2e" /></span> : null}<p className="mt-1 text-xs text-muted-foreground">{formatEffectiveRange(revision)}</p></div><ShippingActivationBadge item={revision} /></li>)}</ul></CardContent></Card>
  </div>
}

function SampleTypeLink({ item, children }: { item: SampleTypeDefinition; children?: React.ReactNode }) {


  const routeSearch = useSearch({ strict: false })
  const listSearch = parseSampleTypeListSearch(routeSearch)
  return <Link
    to="/sample-shipping-settings"
    search={{ ...listSearch, shippingSection: "sample-types", sampleTypeId: item.id }}
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
  const __customerText = useCustomerText()

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
      <CardHeader >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold">{item.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all">{item.code} <CustomerText message="m_3b0e4579f573" />{item.revision}</Badge><EffectiveBadge item={item} /></div>
          </div>
          <SampleTypeActions item={item} revisions={revisions} onCreateRevision={onCreateRevision} />
        </div>
        <CardDescription className="mt-2 whitespace-pre-wrap">{item.description || 'No description provided.'}</CardDescription>
        {latest?.id === item.id ? <SampleTypeActiveRevisionNote item={item} revisions={revisions} /> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {latest && latest.id !== item.id ? <p className="text-sm"><CustomerText message="m_4ce10a1c71be" /><SampleTypeLink item={latest}><CustomerText message="m_70b71a22d565" />{latest.revision})</SampleTypeLink>.</p> : null}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground"><CustomerText message="m_19006d3b69de" /></dt><dd>{item.materialClass === 'extracted_rna' ? <CustomerSourceText source={"Total RNA"} /> : item.materialClass === 'enriched_rna' ? "Enriched RNA" : item.materialClass}</dd></div>
          <div><dt className="text-muted-foreground"><CustomerText message="m_822bab8d41bc" /></dt><dd>{quantityRange(item)}</dd></div>
          <div><dt className="text-muted-foreground"><CustomerText message="m_26f60e3f3fdd" /></dt><dd>{item.minimumSampleAmount != null && item.sampleAmountUnit ? `${item.minimumSampleAmount} ${item.sampleAmountUnit}` : __customerText('m_dd1841d29502')}</dd></div>
          <div><dt className="text-muted-foreground"><CustomerText message="m_0db092f918e9" /></dt><dd>{item.maximumTransitHours == null ? <CustomerSourceText source={"Not specified"} /> : __customerText('m_c3af8f8d8b7f', { p0: String(item.maximumTransitHours) })}</dd></div>
          <div><dt className="text-muted-foreground"><CustomerText message="m_8ca6e896cf9a" /></dt><dd>{(() => { const procedure = configuration.procedures?.find(value => value.id === item.shippingProcedureId); return procedure ? <Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: "procedures", procedureId: procedure.id }}>{procedure.name}</Link> : <span role="alert" className="text-warning"><CustomerText message="m_fcf52a981649" /></span> })()}{item.shippingProcedureId && !currentShippingProcedure(configuration.procedures, item.shippingProcedureId) ? <p role="alert" className="mt-1 text-warning"><CustomerText message="m_5ae52faf9ac3" /></p> : null}</dd></div>
          <div><dt className="text-muted-foreground"><CustomerText message="m_bc53cda3bb3c" /></dt><dd>{formatDateTime(item.effectiveFrom)} to {item.effectiveTo ? formatDateTime(item.effectiveTo) : __customerText('m_4cde242dbfc4')} <CustomerText message="m_1646da4eaeef" /></dd></div>
        </dl>
      </CardContent>
    </Card>
    <Card className="gap-0 py-0">
      <CardHeader ><CardTitle><CustomerText message="m_eb52fc8f0dd2" /></CardTitle></CardHeader>
      <CardContent className="p-4"><dl className="space-y-5 text-sm">
        {requirements.map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value || 'Not specified'}</dd></div>)}
      </dl></CardContent>
    </Card>
    <SampleTypePackingPanel sampleType={item} configuration={configuration} />
    {item.packagingInstructions || item.carrierRestrictions ? <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium"><CustomerText message="m_c7e76bc08469" /></summary><p className="mt-2 text-sm text-muted-foreground"><CustomerText message="m_bef96d0ca31b" /></p><dl className="mt-3 space-y-3"><Detail label={__customerText('m_0d62bb01df4e')} value={item.packagingInstructions} /><Detail label={__customerText('m_a13344e5100f')} value={item.carrierRestrictions} /></dl></details> : null}
    <ContainerSizesPanel apiEnabled={apiEnabled} configuration={configuration} sampleType={item} />
    <Card className="gap-0 py-0">
      <CardHeader ><CardTitle><CustomerText message="m_5ae0d3d186c7" /></CardTitle><CardDescription><CustomerText message="m_da3591fd88fc" /></CardDescription></CardHeader>
      <CardContent className="p-4"><ul className="divide-y">
        {history.map(revision => <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div><SampleTypeLink item={revision}><CustomerText message="m_e330d85ff901" />{revision.revision} · {revision.name}</SampleTypeLink>{revision.id === item.id ? <span className="ml-2 text-xs text-muted-foreground"><CustomerText message="m_9dc859e86f2e" /></span> : null}<p className="mt-1 text-xs text-muted-foreground">{formatEffectiveRange(revision)}</p></div>
          <EffectiveBadge item={revision} />
        </li>)}
      </ul></CardContent>
    </Card>
  </div>
}

function DestinationDialog({ item, onClose, onSaved }: { item: SampleShippingDestination | null | undefined; onClose: () => void; onSaved: (item: SampleShippingDestination) => void }) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const form = useForm<DestinationValues>({ resolver: zodResolver(destinationSchema), defaultValues: emptyDestination })
  const { isDirty: __formDraftDirty } = form.formState
  const __modalGuard = useModalDraftGuard(__formDraftDirty, form.formState.isSubmitting)


  const mutation = useMutation({
    mutationFn: (values: DestinationValues) => {
      const draft = {
      ...values,
      isActive: false,
      code: values.code.toUpperCase(),
      addressLine2: values.addressLine2 || null,
      receivingPhone: values.receivingPhone || null,
      receivingEmail: values.receivingEmail || null,
      closureInstructions: values.closureInstructions || null,
      carrierRestrictions: values.carrierRestrictions || null,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
      supersedesDestinationId: item?.lifecycle === 'Draft' ? item.supersedesDestinationId : item?.id ?? null,
      supersededVersion: item?.version ?? null,
      }
      return item?.lifecycle === 'Draft' ? updateSampleShippingDestinationDraft(item.id, item.version, draft) : createSampleShippingDestination(draft)
    },
    onSuccess: async saved => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onSaved(saved) },
  })
  const resetMutation = mutation.reset

  useEffect(() => {
    if (item === undefined) return
    form.reset(item ? { ...destinationValues(item), effectiveFrom: item.lifecycle === 'Draft' ? toLocalDateTime(new Date(item.effectiveFrom)) : toLocalDateTime(new Date(Math.max(Date.now(), Date.parse(item.effectiveFrom) + 60_000))) } : { ...emptyDestination, code: 'DEST-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(), effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={open => { if (open) ((open) => { if (!open) onClose() })(open); else void __modalGuard.close(() => ((open) => { if (!open) onClose() })(false)) }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{item?.lifecycle === 'Draft' ? __customerText('m_fed098d586d6', { p0: String(item.revision) }) : item ? __customerText('m_d69d66c3f4fa', { p0: String(item.name), p1: String(item.revision + 1) }) : __customerText('m_51c8dcd9fc7a')}</DialogTitle><DialogDescription><CustomerText message="m_a7ca4870a42f" /></DialogDescription></DialogHeader>
        <form id="sample-shipping-destination-form" noValidate className="grid gap-5 px-1 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <Field label={__customerText('m_2b7f6a84de91')} id="destination-name" required error={form.formState.errors.name?.message} full><Input id="destination-name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} /></Field>
          <Field label={__customerText('m_2e5b042d5d00')} id="destination-recipient" required error={form.formState.errors.recipientName?.message}><Input id="destination-recipient" {...form.register('recipientName')} /></Field>
          <Field label={__customerText('m_23d1886ab06e')} id="destination-organization" required error={form.formState.errors.organizationName?.message}><Input id="destination-organization" {...form.register('organizationName')} /></Field>
          <Field label={__customerText('m_ee760b6e81b9')} id="destination-line1" required error={form.formState.errors.addressLine1?.message}><Input id="destination-line1" {...form.register('addressLine1')} /></Field>
          <Field label={__customerText('m_350b2b85c4af')} id="destination-line2" error={form.formState.errors.addressLine2?.message}><Input id="destination-line2" {...form.register('addressLine2')} /></Field>
          <Field label={__customerText('m_fc33f73246f4')} id="destination-city" required error={form.formState.errors.city?.message}><Input id="destination-city" {...form.register('city')} /></Field>
          <Field label={__customerText('m_f718f6286fb8')} id="destination-region" required error={form.formState.errors.stateOrProvince?.message}><Input id="destination-region" {...form.register('stateOrProvince')} /></Field>
          <Field label={__customerText('m_ae53cea8228b')} id="destination-postal" required error={form.formState.errors.postalCode?.message}><Input id="destination-postal" {...form.register('postalCode')} /></Field>
          <Field label={__customerText('m_b5bf7a534146')} id="destination-country" required error={form.formState.errors.countryCode?.message}><Input id="destination-country" maxLength={2} className="max-w-28 uppercase" {...form.register('countryCode')} /></Field>
          <Field label={__customerText('m_b3fc5f3a4a1d')} id="destination-phone" error={form.formState.errors.receivingPhone?.message}><Input id="destination-phone" type="tel" {...form.register('receivingPhone')} /></Field>
          <Field label={__customerText('m_7a198ebd1a9f')} id="destination-email" error={form.formState.errors.receivingEmail?.message}><Input id="destination-email" type="email" {...form.register('receivingEmail')} /></Field>
          <Field label={__customerText('m_cbc9319052d8')} id="destination-hours" required error={form.formState.errors.receivingHours?.message} full><TextArea id="destination-hours" rows={3} registration={form.register('receivingHours')} /></Field>
          <Field label={__customerText('m_1c6fb10cefd4')} id="destination-time-zone" required error={form.formState.errors.timeZoneId?.message}><Input id="destination-time-zone" placeholder={__customerText('m_2d4bbedff807')} {...form.register('timeZoneId')} /></Field>
          <Field label={__customerText('m_4f86b19b388a')} id="destination-effective" required error={form.formState.errors.effectiveFrom?.message}><Input id="destination-effective" type="datetime-local" {...form.register('effectiveFrom')} /></Field>
          <Field label={__customerText('m_ed480d2dfb71')} id="destination-closures" error={form.formState.errors.closureInstructions?.message} full><TextArea id="destination-closures" rows={3} registration={form.register('closureInstructions')} /></Field>
          <Field label={__customerText('m_e9079d39da11')} id="destination-delivery" required error={form.formState.errors.deliveryInstructions?.message} full><TextArea id="destination-delivery" rows={5} registration={form.register('deliveryInstructions')} /></Field>
          <Field label={__customerText('m_a13344e5100f')} id="destination-carrier" error={form.formState.errors.carrierRestrictions?.message} full><TextArea id="destination-carrier" rows={3} registration={form.register('carrierRestrictions')} /></Field>
          <div className="flex items-center gap-2"><Checkbox id="destination-international" checked={form.watch('internationalShippingAllowed')} onCheckedChange={(value) => form.setValue('internationalShippingAllowed', value === true, { shouldDirty: true })} /><Label htmlFor="destination-international" className="cursor-pointer font-normal"><CustomerText message="m_be337f64d9de" /></Label></div>
          <p className="text-sm text-muted-foreground sm:col-span-2"><CustomerText message="m_d1288c4ef67e" /></p>
        </form>
        {mutation.error ? <SaveError title={__customerText('m_4b4c008aec72')} error={mutation.error} /> : null}
        <RequiredDialogFooter><DialogClose asChild><Button type="button" variant="outline"><CustomerText message="m_19766ed6ccb2" /></Button></DialogClose><Button type="submit" form="sample-shipping-destination-form" disabled={mutation.isPending || Boolean(item?.lifecycle === 'Draft' && !__formDraftDirty)}>{mutation.isPending ? <CustomerSourceText source={"Saving Draft…"} /> : item?.lifecycle === 'Draft' ? "Save Draft" : __customerText('m_0f3960b0d6d6')}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SampleTypeDialog({ item, configuration, onClose, onSaved }: { item: SampleTypeDefinition | null | undefined; configuration: SampleShippingConfiguration; onClose: () => void; onSaved: (item: SampleTypeDefinition) => void }) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const form = useForm<SampleTypeValues>({ resolver: zodResolver(sampleTypeSchema), defaultValues: emptySampleType })
  const { isDirty: __formDraftDirty } = form.formState

  const mutation = useMutation({
    mutationFn: (values: SampleTypeValues) => {
      const draft = {
      ...values,
      isActive: false,
      code: values.code.toUpperCase(),
      minimumQuantity: optionalNumber(values.minimumQuantity),
      maximumQuantity: optionalNumber(values.maximumQuantity),
      minimumSampleAmount: optionalNumber(values.minimumSampleAmount),
      sampleAmountUnit: values.sampleAmountUnit || null,
      maximumTransitHours: optionalNumber(values.maximumTransitHours),
      stabilizerRequirements: values.stabilizerRequirements || null,
      shippingProcedureId: values.shippingProcedureId || null,
      carrierRestrictions: values.carrierRestrictions || null,
      effectiveFrom: new Date(values.effectiveFrom).toISOString(),
      supersedesSampleTypeId: item?.lifecycle === 'Draft' ? item.supersedesSampleTypeId : item?.id ?? null,
      supersededVersion: item?.version ?? null,
      }
      return item?.lifecycle === 'Draft' ? updateSampleTypeDraft(item.id, item.version, draft) : createSampleTypeDefinition(draft)
    },
    onSuccess: async (saved) => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); allowNavigation(); form.reset(); onClose(); onSaved(saved) },
  })
  const resetMutation = mutation.reset
  const allowNavigation = useOrderDraftGuard(item !== undefined && __formDraftDirty, mutation.isPending)
  async function close() {
    if (!mutation.isPending && (!__formDraftDirty || (await confirmPortal('Discard unsaved sample-type changes?')))) onClose()
  }

  useEffect(() => {
    if (item === undefined) return
    form.reset(item ? { ...sampleTypeValues(item), effectiveFrom: item.lifecycle === 'Draft' ? toLocalDateTime(new Date(item.effectiveFrom)) : toLocalDateTime(new Date(Math.max(Date.now(), Date.parse(item.effectiveFrom) + 60_000))), isActive: false } : { ...emptySampleType, code: 'SAMPLE-' + crypto.randomUUID().replaceAll('-', '').toUpperCase(), effectiveFrom: toLocalDateTime(new Date()) })
    resetMutation()
  }, [form, item, configuration.procedures, resetMutation])

  return (
    <Dialog open={item !== undefined} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="sm:max-w-3xl" showCloseButton={!mutation.isPending} aria-busy={mutation.isPending} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{item?.lifecycle === 'Draft' ? __customerText('m_fed098d586d6', { p0: String(item.revision) }) : item ? __customerText('m_d69d66c3f4fa', { p0: String(item.name), p1: String(item.revision + 1) }) : __customerText('m_ed830a72d799')}</DialogTitle><DialogDescription><CustomerText message="m_082b05af3fba" /></DialogDescription></DialogHeader>
        <form id="sample-type-form" noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <fieldset disabled={mutation.isPending} className="grid gap-5 px-1 sm:grid-cols-2">
          <Field label={__customerText('m_dcd1d5223f73')} id="sample-type-name" required error={form.formState.errors.name?.message} full><Input id="sample-type-name" {...form.register('name')} /></Field>
          <Field label={__customerText('m_526e0087cc3f')} id="sample-type-description" error={form.formState.errors.description?.message} full><TextArea id="sample-type-description" rows={3} registration={form.register('description')} /></Field>
          <Field label={__customerText('m_8ca6e896cf9a')} id="sample-type-procedure" required error={form.formState.errors.shippingProcedureId?.message} full>
            <NativeSelect id="sample-type-procedure" className="w-full" aria-invalid={Boolean(form.formState.errors.shippingProcedureId)} {...form.register('shippingProcedureId')}>
              <option value=""><CustomerText message="m_328d2f8591fd" /></option>
              {latestRevisions((configuration.procedures ?? []).filter(procedure => procedure.isActive)).map(procedure => <option key={procedure.id} value={procedure.id}>{procedure.name}</option>)}
              {item?.shippingProcedureId && !(configuration.procedures ?? []).some(procedure => procedure.id === item.shippingProcedureId && procedure.isActive) ? <option value={item.shippingProcedureId}><CustomerText message="m_d94ddb75c484" /></option> : null}
            </NativeSelect>
            <p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_b885add5406e" /></p>
          </Field>
          <Field label={__customerText('m_19006d3b69de')} id="sample-type-material" required error={form.formState.errors.materialClass?.message} full>
            <NativeSelect id="sample-type-material" className="w-full" aria-invalid={Boolean(form.formState.errors.materialClass)} {...form.register('materialClass')}>
              <option value="" disabled><CustomerText message="m_41b0a955e1f7" /></option>
              <option value="extracted_rna"><CustomerText message="m_98b86c73d915" /></option>
              <option value="enriched_rna"><CustomerText message="m_491af00c30d0" /></option>
              {item && !['extracted_rna', 'enriched_rna'].includes(item.materialClass) ? <option value={item.materialClass}>{item.materialClass} <CustomerText message="m_37e21babcf37" /></option> : null}
            </NativeSelect>
          </Field>
          <Card role="group" aria-label={__customerText('m_822bab8d41bc')} className="min-w-0 gap-0 rounded-lg py-0 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-t-lg border-b bg-muted/50 px-3 py-1.5">
              <h3 className="text-sm font-medium"><CustomerText message="m_822bab8d41bc" /></h3>
            </div>
            <CardContent className="grid grid-cols-1 gap-x-3 gap-y-2 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-1">
                <Label htmlFor="sample-type-unit"><RequiredFieldName><CustomerText message="m_c4f54e30c330" /></RequiredFieldName></Label>
                <ScientificTextField control={form.control} name="quantityUnit" id="sample-type-unit" label={__customerText('m_c4f54e30c330')} unit insertUnits unitOptions={sampleSizeUnits} showSymbols={false} disabled={mutation.isPending} placeholder={__customerText('m_7b4a82dda5e4')} describedBy={form.formState.errors.quantityUnit ? "sample-type-unit-error" : undefined} />
                <ErrorText id="sample-type-unit-error" message={form.formState.errors.quantityUnit?.message} />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="sample-type-minimum"><CustomerText message="m_dea79332147f" /></Label>
                <Input id="sample-type-minimum" type="text" inputMode="numeric" placeholder="1" aria-invalid={Boolean(form.formState.errors.minimumQuantity)} aria-describedby={form.formState.errors.minimumQuantity ? "sample-type-minimum-error" : undefined} {...form.register('minimumQuantity', {
                  onBlur: () => { void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                  onChange: () => { if (form.formState.errors.minimumQuantity || form.formState.errors.maximumQuantity) void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                })} />
                <ErrorText id="sample-type-minimum-error" message={form.formState.errors.minimumQuantity?.message} />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="sample-type-maximum"><CustomerText message="m_00274bae90a4" /><span className="font-normal text-muted-foreground"><CustomerText message="m_0059798b7f70" /></span></Label>
                <Input id="sample-type-maximum" type="text" inputMode="numeric" placeholder={__customerText('m_f7fcff0d8fea')} aria-invalid={Boolean(form.formState.errors.maximumQuantity)} aria-describedby={form.formState.errors.maximumQuantity ? "sample-type-maximum-error" : undefined} {...form.register('maximumQuantity', {
                  onBlur: () => { void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                  onChange: () => { if (form.formState.errors.minimumQuantity || form.formState.errors.maximumQuantity) void form.trigger(['minimumQuantity', 'maximumQuantity']) },
                })} />
                <ErrorText id="sample-type-maximum-error" message={form.formState.errors.maximumQuantity?.message} />
              </div>
            </CardContent>
          </Card>
          <Card role="group" aria-label={__customerText('m_26f60e3f3fdd')} className="min-w-0 gap-0 rounded-lg py-0 sm:col-span-2">
            <div className="rounded-t-lg border-b bg-muted/50 px-3 py-1.5"><h3 className="text-sm font-medium"><CustomerText message="m_26f60e3f3fdd" /></h3></div>
            <CardContent className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field label={__customerText('m_87adef34993e')} id="sample-type-minimum-sample" error={form.formState.errors.minimumSampleAmount?.message}><Input id="sample-type-minimum-sample" type="number" min="0" step="any" aria-invalid={Boolean(form.formState.errors.minimumSampleAmount)} {...form.register('minimumSampleAmount')} /></Field>
              <Field label={__customerText('m_4e545960f1bf')} id="sample-type-sample-unit" error={form.formState.errors.sampleAmountUnit?.message}><NativeSelect id="sample-type-sample-unit" className="w-full" aria-invalid={Boolean(form.formState.errors.sampleAmountUnit)} {...form.register('sampleAmountUnit')}><option value=""><CustomerText message="m_9cde46ed21c4" /></option><option value="µL">µL</option><option value="mL">mL</option></NativeSelect></Field>
              <p className="text-xs text-muted-foreground sm:col-span-2"><CustomerText message="m_f3f0ea9a9e37" /></p>
            </CardContent>
          </Card>
          <Field label={__customerText('m_4fbd0deb54e3')} id="sample-type-transit" error={form.formState.errors.maximumTransitHours?.message}><Input id="sample-type-transit" inputMode="numeric" {...form.register('maximumTransitHours')} /></Field>
          <Field label={__customerText('m_d0951af01ddc')} id="sample-type-container" required error={form.formState.errors.primaryContainerRequirements?.message} full><ScientificTextField control={form.control} name="primaryContainerRequirements" id="sample-type-container" label={__customerText('m_d0951af01ddc')} multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.primaryContainerRequirements ? "sample-type-container-error" : undefined} /></Field>
          <Field label={__customerText('m_d8c56cf2a5ac')} id="sample-type-temperature" required error={form.formState.errors.temperatureRequirements?.message} full><ScientificTextField control={form.control} name="temperatureRequirements" id="sample-type-temperature" label={__customerText('m_d8c56cf2a5ac')} multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.temperatureRequirements ? "sample-type-temperature-error" : undefined} /></Field>
          <Field label={__customerText('m_fa70fe8983b4')} id="sample-type-stabilizer" error={form.formState.errors.stabilizerRequirements?.message} full><ScientificTextField control={form.control} name="stabilizerRequirements" id="sample-type-stabilizer" label={__customerText('m_fa70fe8983b4')} multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.stabilizerRequirements ? "sample-type-stabilizer-error" : undefined} /></Field>
          {item?.packagingInstructions ? <Field label={__customerText('m_6d6af2b88050')} id="sample-type-packaging" error={form.formState.errors.packagingInstructions?.message} full><ScientificTextField control={form.control} name="packagingInstructions" id="sample-type-packaging" label={__customerText('m_6b23354d4349')} multiline rows={4} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.packagingInstructions ? "sample-type-packaging-error" : undefined} /></Field> : null}
          <Field label={__customerText('m_26fa75484109')} id="sample-type-labeling" required error={form.formState.errors.labelingInstructions?.message} full><ScientificTextField control={form.control} name="labelingInstructions" id="sample-type-labeling" label={__customerText('m_26fa75484109')} multiline rows={4} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.labelingInstructions ? "sample-type-labeling-error" : undefined} /></Field>
          <Field label={__customerText('m_8269b760353a')} id="sample-type-prohibited" required error={form.formState.errors.prohibitedIdentifiers?.message} full><ScientificTextField control={form.control} name="prohibitedIdentifiers" id="sample-type-prohibited" label={__customerText('m_8269b760353a')} multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.prohibitedIdentifiers ? "sample-type-prohibited-error" : undefined} /></Field>
          <Field label={__customerText('m_6e70385bc36d')} id="sample-type-safety" required error={form.formState.errors.safetyRequirements?.message} full><ScientificTextField control={form.control} name="safetyRequirements" id="sample-type-safety" label={__customerText('m_6e70385bc36d')} multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.safetyRequirements ? "sample-type-safety-error" : undefined} /></Field>
          {item?.carrierRestrictions ? <Field label={__customerText('m_8ee7a1f7ad2d')} id="sample-type-carrier" error={form.formState.errors.carrierRestrictions?.message} full><ScientificTextField control={form.control} name="carrierRestrictions" id="sample-type-carrier" label={__customerText('m_a13344e5100f')} multiline rows={3} unit insertUnits unitOptions={instructionUnits} symbolOptions={instructionSymbols} disabled={mutation.isPending} describedBy={form.formState.errors.carrierRestrictions ? "sample-type-carrier-error" : undefined} /></Field> : null}
          <div className="grid gap-x-5 gap-y-2 sm:col-span-2 sm:grid-cols-2">
            <Field label={__customerText('m_4f86b19b388a')} id="sample-type-effective" required error={form.formState.errors.effectiveFrom?.message}><Input id="sample-type-effective" type="datetime-local" aria-invalid={Boolean(form.formState.errors.effectiveFrom)} aria-describedby={form.formState.errors.effectiveFrom ? "sample-type-effective-error" : undefined} {...form.register('effectiveFrom')} /></Field>
            <p className="text-sm text-muted-foreground sm:col-span-2"><CustomerText message="m_62a77fb99610" /></p>
          </div>
          </fieldset>
        </form>
        {mutation.error ? <SaveError title={__customerText('m_360c9be90a5b')} error={mutation.error} /> : null}
        <RequiredDialogFooter><Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" form="sample-type-form" disabled={mutation.isPending || Boolean(item?.lifecycle === 'Draft' && !__formDraftDirty)}>{mutation.isPending ? <CustomerSourceText source={"Saving Draft…"} /> : item?.lifecycle === 'Draft' ? "Save Draft" : __customerText('m_0f3960b0d6d6')}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function revisionHasNotEnded(item: { effectiveTo: string | null }) { return !item.effectiveTo || new Date(item.effectiveTo).getTime() > Date.now() }

function EffectiveBadge({ item }: { item: { effectiveFrom: string; effectiveTo: string | null; isActive: boolean; lifecycle?: string } }) {


  const state = effectiveState(item)
  return <DomainStatusBadge status={state} tones={availabilityTones}>{state}</DomainStatusBadge>
}

function RevisionHistory<T extends { id: string }>({ items, currentItems, label }: { items: T[]; currentItems: T[]; label: (item: T) => string }) {
  const __customerText = useCustomerText()

  const currentIds = new Set(currentItems.map((item) => item.id))
  const history = items.filter((item) => !currentIds.has(item.id))
  if (!history.length) return null
  return <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm font-medium"><CustomerText message="m_dd0fcd29c826" />{history.length} <CustomerText message="m_5839fcd9437c" />{history.length === 1 ? <CustomerSourceText source={"revision"} /> : __customerText('m_437f95fdeef1')}</summary><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{history.map((item) => <li key={item.id}>{label(item)}</li>)}</ul></details>
}

function EmptyConfiguration({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>
}

function SaveError({ title, error }: { title: string; error: unknown }) {
  return <Alert variant="destructive"><AlertTitle>{title}</AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(error, 'Review the configuration and try again.')} />}</AlertDescription></Alert>
}

function Field({ children, error, full, id, label, required }: { children: React.ReactNode; error?: string; full?: boolean; id: string; label: string; required?: boolean }) {


  return <div className={full ? "sm:col-span-2" : undefined}><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label><div className="mt-2">{children}</div><ErrorText id={`${id}-error`} message={error} /></div>
}

function TextArea({ id, registration, rows, error }: { id: string; registration: UseFormRegisterReturn; rows: number; error?: string }) {


  return <textarea id={id} rows={rows} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" {...registration} />
}

function ErrorText({ message, id }: { message?: string; id?: string }) { return message ? <p id={id} className="mt-1 text-sm text-destructive" role="alert">{message}</p> : null }

function destinationValues(item: SampleShippingDestination): DestinationValues {
  return { code: item.code, name: item.name, recipientName: item.recipientName, organizationName: item.organizationName, addressLine1: item.addressLine1, addressLine2: item.addressLine2 ?? '', city: item.city, stateOrProvince: item.stateOrProvince, postalCode: item.postalCode, countryCode: item.countryCode, receivingPhone: item.receivingPhone ?? '', receivingEmail: item.receivingEmail ?? '', receivingHours: item.receivingHours, timeZoneId: item.timeZoneId, closureInstructions: item.closureInstructions ?? '', deliveryInstructions: item.deliveryInstructions, carrierRestrictions: item.carrierRestrictions ?? '', internationalShippingAllowed: item.internationalShippingAllowed, effectiveFrom: toLocalDateTime(new Date(Math.max(Date.now(), Date.parse(item.effectiveFrom) + 60_000))), isActive: true }
}

function sampleTypeValues(item: SampleTypeDefinition): SampleTypeValues {
  return { shippingProcedureId: item.shippingProcedureId ?? '', code: item.code, name: item.name, description: item.description, materialClass: item.materialClass, minimumQuantity: optionalNumberText(item.minimumQuantity), maximumQuantity: optionalNumberText(item.maximumQuantity), quantityUnit: item.quantityUnit, minimumSampleAmount: optionalNumberText(item.minimumSampleAmount), sampleAmountUnit: item.sampleAmountUnit === 'µL' || item.sampleAmountUnit === 'mL' ? item.sampleAmountUnit : '', primaryContainerRequirements: item.primaryContainerRequirements, temperatureRequirements: item.temperatureRequirements, stabilizerRequirements: item.stabilizerRequirements ?? '', packagingInstructions: item.packagingInstructions, labelingInstructions: item.labelingInstructions, prohibitedIdentifiers: item.prohibitedIdentifiers, safetyRequirements: item.safetyRequirements, carrierRestrictions: item.carrierRestrictions ?? '', maximumTransitHours: optionalNumberText(item.maximumTransitHours), effectiveFrom: toLocalDateTime(new Date()), isActive: item.isActive }
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

function primaryShippingRevisions<T extends { definitionKey: string; revision: number; isActive: boolean; effectiveFrom: string; effectiveTo: string | null; lifecycle: string }>(items: T[]) {
  const families = new Map<string, T[]>()
  for (const item of items) families.set(item.definitionKey, [...(families.get(item.definitionKey) ?? []), item])
  const now = Date.now()
  return [...families.values()].flatMap(family => {
    const sorted = [...family].sort((a, b) => b.revision - a.revision)
    const current = sorted.find(value => value.isActive && Date.parse(value.effectiveFrom) <= now && (!value.effectiveTo || Date.parse(value.effectiveTo) > now))
      ?? sorted.find(value => value.isActive && (!value.effectiveTo || Date.parse(value.effectiveTo) > now))
      ?? sorted.find(value => value.lifecycle === 'Draft')
      ?? sorted.find(value => value.lifecycle === 'Released' || value.lifecycle === 'Superseded' || value.lifecycle === 'Deactivated')
      ?? sorted[0]
    return current ? [current] : []
  })
}

function effectiveState(item: { effectiveFrom: string; effectiveTo: string | null; isActive: boolean; lifecycle?: string }) {
  if (item.lifecycle === 'Draft') return 'Draft'
  if (item.lifecycle === 'Discarded') return 'Discarded'
  if (item.lifecycle === 'Deactivated') return 'Deactivated'
  if (!item.isActive) return 'Inactive'
  const now = Date.now()
  if (new Date(item.effectiveFrom).getTime() > now) return 'Future'
  if (item.effectiveTo && new Date(item.effectiveTo).getTime() <= now) return 'Ended'
  return 'Active now'
}

function formatEffectiveRange(item: { effectiveFrom: string; effectiveTo: string | null; isActive: boolean; lifecycle?: string }) {
  const start = formatDateTime(item.effectiveFrom)
  const end = item.effectiveTo ? formatDateTime(item.effectiveTo) : 'open-ended'
  return `${effectiveState(item).toLowerCase()} · ${start} to ${end}`
}

function quantityRange(item: SampleTypeDefinition) {
  if (item.minimumQuantity == null && item.maximumQuantity == null) return `quantity recorded in ${item.quantityUnit}`
  if (item.minimumQuantity != null && item.maximumQuantity != null) return `${item.minimumQuantity}–${item.maximumQuantity} ${item.quantityUnit}`
  return item.minimumQuantity != null ? `at least ${item.minimumQuantity} ${item.quantityUnit}` : `up to ${item.maximumQuantity} ${item.quantityUnit}`
}

function optionalNumber(value: string) { return value === '' ? null : Number(value) }
function optionalNumberText(value: number | null) { return value == null ? '' : String(value) }
function formatDateTime(value: string) { return formatDisplayTimestamp(value) }
function toLocalDateTime(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}
