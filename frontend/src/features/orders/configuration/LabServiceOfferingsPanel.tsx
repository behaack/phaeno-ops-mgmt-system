import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { getSampleShippingConfiguration } from '#/api/sample-shipping'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  listLabServiceOfferings,
  saveLabServiceOffering,
  updateLabServiceOfferingAvailability,
  type LabServiceOffering,
} from '#/api/order-bundles'
import {
  getOrderErrorMessage,
  type OrderConfiguration,
} from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from '#/components/ui/required-field'
import { Textarea } from '#/components/ui/textarea'
import { useOrderDraftGuard } from '../use-order-draft-guard'

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.')
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().startsWith(value),
    'Choose a valid date.',
  )
export const offeringSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter an offering name.').max(255),
    description: z
      .string()
      .trim()
      .min(1, 'Describe the included service.')
      .max(4000),
    catalogItemId: z.string().uuid('Select the specimen-priced catalog item.'),
    analysisIds: z
      .array(z.string().uuid())
      .min(1, 'Select an included analysis.'),
    allowedMaterialTypes: z.string(),
    supportedSampleTypeIds: z.array(z.string().uuid()),
    availabilityOnly: z.boolean(),
    allowedBiologicalSources: z
      .string()
      .trim()
      .min(1, 'Enter the allowed biological sources.'),
    includedOutputContract: z
      .string()
      .trim()
      .min(1, 'Describe the included outputs.')
      .max(8000),
    minimumTurnaroundDays: z.coerce.number().int().min(1).max(365),
    maximumTurnaroundDays: z.coerce.number().int().min(1).max(365),
    effectiveFrom: date,
    effectiveTo: z.union([z.literal(''), date]),
    isActive: z.boolean(),
    isSynthetic: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.availabilityOnly && value.supportedSampleTypeIds.length === 0)
      context.addIssue({ code: 'custom', path: ['supportedSampleTypeIds'], message: 'Select at least one supported sample type.' })
    if (value.maximumTurnaroundDays < value.minimumTurnaroundDays)
      context.addIssue({
        code: 'custom',
        path: ['maximumTurnaroundDays'],
        message: 'The maximum must be at least the minimum.',
      })
    if (value.effectiveTo && value.effectiveTo < value.effectiveFrom)
      context.addIssue({
        code: 'custom',
        path: ['effectiveTo'],
        message: 'The end date must follow the start date.',
      })
  })
type Values = z.output<typeof offeringSchema>
const empty = (): Values => ({
  name: '',
  description: '',
  catalogItemId: '',
  analysisIds: [],
  allowedMaterialTypes: '',
  supportedSampleTypeIds: [],
  availabilityOnly: false,
  allowedBiologicalSources: '',
  includedOutputContract: '',
  minimumTurnaroundDays: 1,
  maximumTurnaroundDays: 1,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  isActive: false,
  isSynthetic: false,
})
const toValues = (item: LabServiceOffering): Values => ({
  ...item,
  allowedMaterialTypes: item.allowedMaterialTypes.join('\n'),
  supportedSampleTypeIds: item.supportedSampleTypes?.map(type => type.id) ?? [],
  availabilityOnly: false,
  allowedBiologicalSources: item.allowedBiologicalSources.join('\n'),
  effectiveFrom: item.effectiveFrom.slice(0, 10),
  effectiveTo: item.effectiveTo?.slice(0, 10) ?? '',
})
const lines = (value: string) => [
  ...new Set(
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  ),
]

export function LabServiceOfferingsPanel({
  configuration,
  apiEnabled,
  catalogItemId,
}: {
  configuration: OrderConfiguration
  apiEnabled: boolean
  catalogItemId: string
}) {
  const client = useQueryClient()
  const actionRef = useRef<HTMLButtonElement | null>(null)
  const samples = useQuery({ queryKey: ['sample-shipping-configuration'], queryFn: getSampleShippingConfiguration, enabled: apiEnabled })
  const parentItem = configuration.catalogItems.find(item => item.id === catalogItemId)!
  const offerings = useQuery({
    queryKey: ['lab-service-offerings', 'platform'],
    queryFn: () => listLabServiceOfferings(true),
    enabled: apiEnabled,
  })
  const [editing, setEditing] = useState<{
    item: LabServiceOffering | null
    availability: boolean
  } | null>(null)
  const versions = (offerings.data ?? []).filter(item => item.catalogItemId === catalogItemId)
    .sort((a, b) => b.offeringVersion - a.offeringVersion || b.effectiveFrom.localeCompare(a.effectiveFrom))
  const form = useForm<z.input<typeof offeringSchema>, unknown, Values>({
    resolver: zodResolver(offeringSchema),
    defaultValues: empty(),
  })
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      editing?.availability && editing.item
        ? updateLabServiceOfferingAvailability(editing.item.id, {
            version: editing.item.version,
            effectiveFrom: `${values.effectiveFrom}T00:00:00Z`,
            effectiveTo: values.effectiveTo
              ? `${values.effectiveTo}T23:59:59Z`
              : null,
            isActive: values.isActive,
          })
        : saveLabServiceOffering(editing?.item?.id ?? null, {
            ...values,
            version: editing?.item?.version,
            effectiveFrom: `${values.effectiveFrom}T00:00:00Z`,
            effectiveTo: values.effectiveTo
              ? `${values.effectiveTo}T23:59:59Z`
              : null,
            catalogItemId,
            allowedMaterialTypes: [...new Set((samples.data?.sampleTypes ?? []).filter(type => values.supportedSampleTypeIds.includes(type.id)).map(type => type.materialClass))],
            allowedBiologicalSources: lines(values.allowedBiologicalSources),
          }),
    onError: async () => {
      const fresh = await offerings.refetch()
      const current = fresh.data?.find(item => item.id === editing?.item?.id)
      if (current && editing) {
        setEditing({ ...editing, item: current })
        form.reset({ ...toValues(current), availabilityOnly: editing.availability }, { keepDirtyValues: true })
      }
    },
    onSuccess: async () => {
      setEditing(null)
      form.reset(empty())
      await Promise.all([
        client.invalidateQueries({ queryKey: ['lab-service-offerings'] }),
        client.invalidateQueries({ queryKey: ['order-configuration'] }),
      ])
    },
  })
  useOrderDraftGuard(
    Boolean(editing) && form.formState.isDirty,
    mutation.isPending,
  )
  function open(item: LabServiceOffering | null, availability = false) {
    mutation.reset()
    form.reset({
      ...(item ? toValues(item) : { ...empty(), name: parentItem.name, catalogItemId }),
      ...(!availability ? { isActive: false, effectiveFrom: empty().effectiveFrom, effectiveTo: '' } : {}),
      availabilityOnly: availability,
    })
    setEditing({ item, availability })
  }
  function close() {
    if (
      !mutation.isPending &&
      (!form.formState.isDirty ||
        window.confirm('Discard the unsaved offering changes?'))
    )
      setEditing(null)
  }
  const errors = form.formState.errors
  const selectedCatalog = configuration.catalogItems.find(
    (item) => item.id === form.watch('catalogItemId'),
  )
  const selectedAnalyses = form.watch('analysisIds')
  const selectedSampleTypes = form.watch('supportedSampleTypeIds')
  function error(name: keyof Values) {
    const message = errors[name]?.message
    return message ? (
      <p
        id={`offering-${name}-error`}
        role="alert"
        className="mt-1 text-sm text-destructive"
      >
        {message}
      </p>
    ) : null
  }
  function field(
    name:
      | 'name'
      | 'description'
      | 'allowedMaterialTypes'
      | 'allowedBiologicalSources'
      | 'includedOutputContract',
    label: string,
    help?: string,
    multiline = false,
  ) {
    return (
      <div>
        <Label htmlFor={`offering-${name}`}>
          <RequiredFieldName>{label}</RequiredFieldName>
        </Label>
        {help ? (
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
        ) : null}
        {multiline ? (
          <Textarea
            id={`offering-${name}`}
            className="mt-2"
            aria-invalid={Boolean(errors[name])}
            aria-describedby={
              errors[name] ? `offering-${name}-error` : undefined
            }
            {...form.register(name)}
          />
        ) : (
          <Input
            id={`offering-${name}`}
            className="mt-2"
            aria-invalid={Boolean(errors[name])}
            {...form.register(name)}
          />
        )}
        {error(name)}
      </div>
    )
  }
  return (
    <section
      aria-labelledby="lab-offerings-heading"
      className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
    >
      <div className="flex items-start justify-between gap-3 border-b bg-muted/50 p-4">
        <div>
          <h2 id="lab-offerings-heading" className="font-heading text-base leading-snug font-medium">
            Scientific definition
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Included analyses, supported sample types, outputs and turnaround.
            Scope changes create a new version; accepted orders keep their
            original terms.
          </p>
        </div>
        {!offerings.isLoading && !offerings.error && versions.length === 0 ? <Button disabled={!apiEnabled} onClick={event => { actionRef.current = event.currentTarget; open(null) }}>Add definition</Button> : null}
      </div>
      {offerings.isLoading ? (
        <p role="status" className="mt-4">
          Loading offerings…
        </p>
      ) : null}
      {offerings.error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Offerings could not be loaded</AlertTitle>
          <AlertDescription>
            {getOrderErrorMessage(offerings.error, 'Try again.')}{' '}
            <Button variant="outline" onClick={() => void offerings.refetch()}>
              Retry offerings
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="divide-y px-5">
        {versions.map((item) => (
          <article key={item.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-medium">
                Version {item.offeringVersion} · {item.name}
              </h3>
              <Badge variant="outline">
                {item.isAvailable
                  ? 'Available'
                  : item.isActive
                    ? 'Not currently available'
                    : 'Inactive'}
              </Badge>
            </div>
            <p className="mt-1 text-sm">{item.description}</p>
            <p className="mt-2 text-sm"><span className="font-medium">Included analyses:</span> {item.analysisIds.map(id => configuration.analyses.find(analysis => analysis.id === id)?.name ?? 'Unavailable analysis').join(', ')}</p>
            <p className="mt-2 text-sm"><span className="font-medium">Supported sample types:</span> {item.supportedSampleTypes?.length ? item.supportedSampleTypes.map(type => `${type.name} · revision ${type.revision}${type.isAvailable ? '' : ' (not currently available)'}`).join('; ') : 'Review required — create a new version and explicitly select supported sample types. Existing accepted orders keep their scope.'}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: item.currency,
              }).format(item.unitPrice)}{' '}
              per specimen · {item.minimumTurnaroundDays}–
              {item.maximumTurnaroundDays} days after scientific acceptance ·{' '}
              {item.catalogName}
            </p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">
                Included scope and availability
              </summary>
              <p className="mt-2 whitespace-pre-wrap">
                {item.includedOutputContract}
              </p>
              <p className="mt-2">
                Materials: {item.allowedMaterialTypes.join(', ')}. Sources:{' '}
                {item.allowedBiologicalSources.join(', ')}.
              </p>
              <p className="mt-2">
                Effective {item.effectiveFrom.slice(0, 10)}
                {item.effectiveTo
                  ? ` through ${item.effectiveTo.slice(0, 10)}`
                  : ', no end date'}
                {item.isSynthetic
                  ? ' · Test offering; unavailable for standard orders'
                  : ''}
                .
              </p>
            </details>
            <div className="mt-3 flex justify-end"><ActionMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={!apiEnabled} onPointerDown={event => { actionRef.current = event.currentTarget }} onFocus={event => { actionRef.current = event.currentTarget }}>Actions <ChevronDown className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuItem onSelect={() => open(item, true)}>Edit availability</DropdownMenuItem><DropdownMenuItem disabled={versions.some(version => version.familyId === item.familyId && version.offeringVersion > item.offeringVersion)} onSelect={() => open(item)}>Create new version</DropdownMenuItem></DropdownMenuContent></ActionMenu></div>
          </article>
        ))}
      </div>
      {!offerings.isLoading && !offerings.error && !versions.length ? (
        <p className="p-5 text-sm text-muted-foreground">
          No scientific definition is configured for this service. Manual pricing remains available.
        </p>
      ) : null}
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(value) => {
          if (!value) close()
        }}
      >
        <DialogContent
          showCloseButton={!mutation.isPending}
          aria-busy={mutation.isPending}
          onCloseAutoFocus={event => { if (actionRef.current?.isConnected) { event.preventDefault(); actionRef.current.focus() } }}
        >
          <DialogHeader>
            <DialogTitle>
              {editing?.availability
                ? 'Edit definition availability'
                : editing?.item
                  ? 'Create scientific version'
                  : 'Add scientific definition'}
            </DialogTitle>
            <DialogDescription>
              {editing?.availability
                ? 'Update when this version can be selected. Existing orders keep their accepted terms.'
                : 'The Service catalog supplies the price. Define the scientific scope and turnaround included for each specimen.'}
            </DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Scientific definition was not saved</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  mutation.error,
                  'Review the values and try again.',
                )}{' '}
                Latest saved values have been refreshed where available; your edits remain. Review them before saving again.
              </AlertDescription>
            </Alert>
          ) : null}
          <form
            id="lab-offering-form"
            noValidate
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <fieldset disabled={mutation.isPending} className="space-y-5">
              {!editing?.availability ? (
                <>
                  <p className="text-sm font-medium">{parentItem.name}</p>
                  {field('description', 'Description', undefined, true)}
                  <div>
                    <Label htmlFor="offering-catalog">
                      <RequiredFieldName>
                        Service catalog item
                      </RequiredFieldName>
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This definition belongs to the service shown here. Maintain its price on the service item.
                    </p>
                    <select
                      id="offering-catalog"
                      disabled
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      {...form.register('catalogItemId')}
                    >
                      {configuration.catalogItems
                        .filter(
                          (item) =>
                            item.id === catalogItemId,
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.currency} {item.basePrice} /
                            specimen
                          </option>
                        ))}
                    </select>
                    {error('catalogItemId')}
                    {selectedCatalog ? (
                      <p className="mt-2 text-sm">
                        Current base price: {selectedCatalog.currency}{' '}
                        {selectedCatalog.basePrice} per specimen.
                      </p>
                    ) : null}
                  </div>
                  <fieldset>
                    <legend className="text-sm font-medium">
                      <RequiredFieldName>Included analyses</RequiredFieldName>
                    </legend>
                    <div className="mt-2 space-y-2">
                      {configuration.analyses
                        .filter((item) => item.isActive && !item.isSynthetic || selectedAnalyses.includes(item.id))
                        .map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-start gap-2 text-sm"
                          >
                            <Checkbox
                              checked={selectedAnalyses.includes(item.id)}
                              onCheckedChange={(checked) =>
                                form.setValue(
                                  'analysisIds',
                                  checked
                                    ? [...selectedAnalyses, item.id]
                                    : selectedAnalyses.filter(
                                        (id) => id !== item.id,
                                      ),
                                  { shouldDirty: true, shouldValidate: true },
                                )
                              }
                            />
                            {item.name}{!item.isActive || item.isSynthetic ? ' (not available for new orders)' : ''}
                          </label>
                        ))}
                    </div>
                    {!configuration.analyses.some(item => item.isActive && !item.isSynthetic) ? <p className="mt-2 text-sm">Create or activate an approved analysis in Order settings → Analyses before activating this service definition.</p> : null}
                    {error('analysisIds')}
                  </fieldset>
                  <fieldset><legend className="text-sm font-medium"><RequiredFieldName>Supported sample types</RequiredFieldName></legend><p className="mt-1 text-sm text-muted-foreground">Select the exact approved revisions. PSeq ordering currently requires one extracted-RNA tube type; other materials do not enable new intake workflows.</p>
                    {samples.isLoading ? <p role="status">Loading sample types…</p> : null}
                    {samples.error ? <p role="alert">Sample types could not be loaded. <Button variant="outline" onClick={() => void samples.refetch()} type="button">Retry</Button></p> : null}
                    <div className="mt-2 space-y-2">{(samples.data?.sampleTypes ?? []).filter(type => type.isActive || selectedSampleTypes.includes(type.id)).map(type => <label key={type.id} className="flex cursor-pointer items-start gap-2 text-sm"><Checkbox checked={selectedSampleTypes.includes(type.id)} onCheckedChange={checked => form.setValue('supportedSampleTypeIds', checked ? [...selectedSampleTypes, type.id] : selectedSampleTypes.filter(id => id !== type.id), { shouldDirty: true, shouldValidate: true })} />{type.name} · revision {type.revision} · {type.materialClass}{type.isActive ? '' : ' (inactive)'}</label>)}</div>
                    {samples.data && samples.data.sampleTypes.length === 0 ? <p className="mt-2 text-sm">Create a shared sample-type definition in Order settings → Sample types first.</p> : null}
                    {error('supportedSampleTypeIds')}
                  </fieldset>
                  {field(
                    'allowedBiologicalSources',
                    'Allowed biological sources',
                    'Enter one supported source per line. Other sources require custom work.',
                    true,
                  )}
                  {field(
                    'includedOutputContract',
                    'Included outputs',
                    'Describe the outputs included in the per-specimen price.',
                    true,
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        'minimumTurnaroundDays',
                        'maximumTurnaroundDays',
                      ] as const
                    ).map((name, index) => (
                      <div key={name}>
                        <Label htmlFor={`offering-${name}`}>
                          <RequiredFieldName>
                            {index
                              ? 'Maximum turnaround (days)'
                              : 'Minimum turnaround (days)'}
                          </RequiredFieldName>
                        </Label>
                        <Input
                          id={`offering-${name}`}
                          className="mt-2"
                          type="number"
                          min={1}
                          max={365}
                          step={1}
                          {...form.register(name)}
                        />
                        {error(name)}
                      </div>
                    ))}
                  </div>
                  <label
                    htmlFor="offering-synthetic"
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      id="offering-synthetic"
                      checked={form.watch('isSynthetic')}
                      onCheckedChange={(value) =>
                        form.setValue('isSynthetic', value === true, {
                          shouldDirty: true,
                        })
                      }
                    />
                    Test offering (not available for standard placement)
                  </label>
                </>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="offering-start">
                    <RequiredFieldName>Effective from</RequiredFieldName>
                  </Label>
                  <Input
                    id="offering-start"
                    type="date"
                    className="mt-2"
                    {...form.register('effectiveFrom')}
                  />
                  {error('effectiveFrom')}
                </div>
                <div>
                  <Label htmlFor="offering-end">
                    Effective through (optional)
                  </Label>
                  <Input
                    id="offering-end"
                    type="date"
                    className="mt-2"
                    {...form.register('effectiveTo')}
                  />
                  {error('effectiveTo')}
                </div>
              </div>
              <label
                htmlFor="offering-active"
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  id="offering-active"
                  checked={form.watch('isActive')}
                  onCheckedChange={(value) =>
                    form.setValue('isActive', value === true, {
                      shouldDirty: true,
                    })
                  }
                />
                Active
              </label>
            </fieldset>
          </form>
          <RequiredDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="lab-offering-form"
              disabled={mutation.isPending || !apiEnabled || Boolean(editing?.availability && !form.formState.isDirty) || (!editing?.availability && !samples.data)}
            >
              {mutation.isPending
                ? 'Saving…'
                : editing?.availability
                  ? 'Save availability'
                  : editing?.item
                    ? 'Create version'
                    : 'Create definition'}
            </Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
