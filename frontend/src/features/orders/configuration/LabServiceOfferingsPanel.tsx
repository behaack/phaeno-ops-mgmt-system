import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
    allowedMaterialTypes: z
      .string()
      .trim()
      .min(1, 'Enter the allowed material types.'),
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
}: {
  configuration: OrderConfiguration
  apiEnabled: boolean
}) {
  const client = useQueryClient()
  const offerings = useQuery({
    queryKey: ['lab-service-offerings', 'platform'],
    queryFn: () => listLabServiceOfferings(true),
    enabled: apiEnabled,
  })
  const [editing, setEditing] = useState<{
    item: LabServiceOffering | null
    availability: boolean
  } | null>(null)
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
            allowedMaterialTypes: lines(values.allowedMaterialTypes),
            allowedBiologicalSources: lines(values.allowedBiologicalSources),
          }),
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
    form.reset(item ? toValues(item) : empty())
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
      className="rounded-lg border p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="lab-offerings-heading" className="text-lg font-semibold">
            Lab Service offerings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One specimen-priced product includes processing and data assembly.
            Scope changes create a new version; accepted orders keep their
            original terms.
          </p>
        </div>
        <Button disabled={!apiEnabled} onClick={() => open(null)}>
          Add offering
        </Button>
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
      <div className="mt-4 divide-y">
        {(offerings.data ?? []).map((item) => (
          <article key={item.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-medium">
                {item.name} · version {item.offeringVersion}
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
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => open(item, true)}
              >
                Edit availability
              </Button>
              <Button variant="outline" size="sm" onClick={() => open(item)}>
                Create new version
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!offerings.isLoading && !offerings.error && !offerings.data?.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No Lab Service offerings are configured. Manual pricing remains
          available.
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
        >
          <DialogHeader>
            <DialogTitle>
              {editing?.availability
                ? 'Edit offering availability'
                : editing?.item
                  ? 'Create offering version'
                  : 'Add Lab Service offering'}
            </DialogTitle>
            <DialogDescription>
              {editing?.availability
                ? 'Update when this version can be selected. Existing orders keep their accepted terms.'
                : 'The Service catalog supplies the price. Define the scientific scope and turnaround included for each specimen.'}
            </DialogDescription>
          </DialogHeader>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Offering was not saved</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  mutation.error,
                  'Review the values and try again.',
                )}{' '}
                Existing edits remain here. If another user changed the
                offering, close and reopen it after refreshing.
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
                  {field('name', 'Offering name')}
                  {field('description', 'Description', undefined, true)}
                  <div>
                    <Label htmlFor="offering-catalog">
                      <RequiredFieldName>
                        Service catalog item
                      </RequiredFieldName>
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose the designated active PSeq Lab Service product priced per specimen. Maintain its
                      price in Service catalog.
                    </p>
                    <select
                      id="offering-catalog"
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      {...form.register('catalogItemId')}
                    >
                      <option value="">Select catalog item</option>
                      {configuration.catalogItems
                        .filter(
                          (item) =>
                            item.isActive &&
                            item.isPSeqLabService &&
                            item.salesUnit.toLowerCase() === 'specimen',
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
                        .filter((item) => item.isActive && !item.isSynthetic)
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
                            {item.name}
                          </label>
                        ))}
                    </div>
                    {error('analysisIds')}
                  </fieldset>
                  {field(
                    'allowedMaterialTypes',
                    'Allowed material types',
                    'Enter one supported material type per line.',
                    true,
                  )}
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
              disabled={mutation.isPending || !apiEnabled}
            >
              {mutation.isPending
                ? 'Saving…'
                : editing?.availability
                  ? 'Save availability'
                  : editing?.item
                    ? 'Create version'
                    : 'Create offering'}
            </Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
