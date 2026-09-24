import { useLotProducts } from '#/api/lab-materials'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  createLabMaterialLot,
  getLabOperationsError,
  type LabMaterialDefinition,
  type LabMaterialLot,
  type LabStorageLocation,
  type LabSupplier,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  RequiredDialogFooter,
  RequiredFieldName,
  RequiredMark,
} from '#/components/ui/required-field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const newReferenceValue = '__new__'
const createReferenceValue = '__create__'
const requiredText = (message: string) => z.string().trim().min(1, message)
const nonnegativeQuantity = z.string().refine(
  (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0,
  'Enter a quantity of zero or greater.',
)
const positiveQuantity = z.string().refine(
  (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0,
  'Enter a quantity greater than zero.',
)

export const materialLotFormSchema = z.object({
  kind: z.enum(['SupplierLot', 'PreparedReagent']),
  materialSelection: z.string(),
  newMaterialName: z.string(),
  lotNumber: requiredText('Enter a lot number.'),
  supplierSelection: z.string(),
  supplierProductId: z.string(),
  newSupplierName: z.string(),
  storageSelection: requiredText('Select a storage location.'),
  newStorageLocationName: z.string(),
  availableQuantity: nonnegativeQuantity,
  quantityUnit: z.string(),
  expirationOrRetestDate: z.string(),
  components: z.array(z.object({
    componentMaterialLotId: requiredText('Select a component lot.'),
    quantity: positiveQuantity,
    quantityUnit: requiredText('Enter the component unit.'),
    materialExhausted: z.boolean().optional(),
  })),
}).superRefine((values, context) => {
  if (values.kind === 'PreparedReagent') {
    if (!values.materialSelection) context.addIssue({ code: 'custom', path: ['materialSelection'], message: 'Select a prepared reagent.' })
    if (values.materialSelection === newReferenceValue && !values.newMaterialName.trim()) {
      context.addIssue({ code: 'custom', path: ['newMaterialName'], message: 'Enter the new prepared reagent name.' })
    }
  }
  if (values.storageSelection === newReferenceValue && !values.newStorageLocationName.trim()) {
    context.addIssue({ code: 'custom', path: ['newStorageLocationName'], message: 'Enter the new storage location.' })
  }
  if (values.kind === 'SupplierLot') {
    if (!values.supplierProductId) context.addIssue({ code: 'custom', path: ['supplierProductId'], message: 'Select the purchased product.' })
    if (!values.quantityUnit.trim()) context.addIssue({ code: 'custom', path: ['quantityUnit'], message: 'This product needs an inventory unit in Suppliers & products before receiving a lot.' })
    if (!values.supplierSelection) {
      context.addIssue({ code: 'custom', path: ['supplierSelection'], message: 'Select a supplier.' })
    }
    if (values.supplierSelection === newReferenceValue && !values.newSupplierName.trim()) {
      context.addIssue({ code: 'custom', path: ['newSupplierName'], message: 'Enter the new supplier name.' })
    }
  }
  if (values.kind === 'PreparedReagent' && values.components.length === 0) {
    context.addIssue({ code: 'custom', path: ['components'], message: 'Add at least one component lot.' })
  }
  if (values.kind === 'PreparedReagent' && !values.quantityUnit.trim()) {
    context.addIssue({ code: 'custom', path: ['quantityUnit'], message: 'Enter a unit.' })
  }
  const componentIds = values.components.map((component) => component.componentMaterialLotId)
    .filter(Boolean)
  if (new Set(componentIds).size !== componentIds.length) {
    context.addIssue({ code: 'custom', path: ['components'], message: 'Each component lot may be selected only once.' })
  }
})

type MaterialLotFormValues = z.infer<typeof materialLotFormSchema>

type ReferenceKind = 'material' | 'supplier' | 'storage'

type ReferenceDialogState = {
  kind: ReferenceKind
  value: string
  restoreSelection: string
  attempted: boolean
}

const defaultValues: MaterialLotFormValues = {
  kind: 'SupplierLot',
  materialSelection: '',
  newMaterialName: '',
  lotNumber: '',
  supplierSelection: '',
  supplierProductId: '',
  newSupplierName: '',
  storageSelection: '',
  newStorageLocationName: '',
  availableQuantity: '',
  quantityUnit: '',
  expirationOrRetestDate: '',
  components: [],
}

type Props = {
  open: boolean
  definitions: LabMaterialDefinition[]
  suppliers: LabSupplier[]
  storageLocations: LabStorageLocation[]
  materialLots: LabMaterialLot[]
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<unknown>
}

export function MaterialLotCreateDialog({
  open,
  definitions,
  suppliers,
  storageLocations,
  materialLots,
  onOpenChange,
  onSaved,
}: Props) {
  const [referenceDialog, setReferenceDialog] = useState<ReferenceDialogState | null>(null)
  const form = useForm<MaterialLotFormValues>({
    resolver: zodResolver(materialLotFormSchema),
    defaultValues,
    mode: 'onBlur',
  })
  const components = useFieldArray({ control: form.control, name: 'components' })
  const kind = form.watch('kind')
  const productCatalog = useLotProducts(open && kind === 'SupplierLot')
  const materialSelection = form.watch('materialSelection')
  const supplierSelection = form.watch('supplierSelection')
  const selectedProductId = form.watch('supplierProductId')
  const selectedProduct = productCatalog.data?.find(supplier => supplier.id === supplierSelection)?.products.find(product => product.id === selectedProductId)
  const expirationRequired = kind === 'SupplierLot' && selectedProduct?.canExpire === true
  const storageSelection = form.watch('storageSelection')
  const newMaterialName = form.watch('newMaterialName')
  const newStorageLocationName = form.watch('newStorageLocationName')
  const availableComponents = materialLots.filter((lot) =>
    (lot.qcDisposition === 'Passed' || lot.qcDisposition === 'ApprovedException')
    && !lot.quantityHoldReason && lot.availableQuantity > 0
    && (!lot.expirationOrRetestDate || lot.expirationOrRetestDate >= today()),
  )

  const close = () => {
    setReferenceDialog(null)
    form.reset(defaultValues)
    onOpenChange(false)
  }
  const openReferenceDialog = (referenceKind: ReferenceKind, restoreSelection: string) => {
    const value = referenceKind === 'material'
      ? form.getValues('newMaterialName')
      : referenceKind === 'supplier'
        ? form.getValues('newSupplierName')
        : form.getValues('newStorageLocationName')

    setReferenceDialog({ kind: referenceKind, value, restoreSelection, attempted: false })
  }
  const cancelReferenceDialog = () => {
    if (!referenceDialog) return

    if (referenceDialog.kind === 'material') {
      form.setValue('materialSelection', referenceDialog.restoreSelection)
      form.clearErrors(['materialSelection', 'newMaterialName'])
    } else if (referenceDialog.kind === 'supplier') {
      form.setValue('supplierSelection', referenceDialog.restoreSelection)
      form.clearErrors(['supplierSelection', 'newSupplierName'])
    } else {
      form.setValue('storageSelection', referenceDialog.restoreSelection)
      form.clearErrors(['storageSelection', 'newStorageLocationName'])
    }

    setReferenceDialog(null)
    focusReferenceSelect(referenceDialog.kind)
  }
  const saveReferenceName = () => {
    if (!referenceDialog) return

    const value = referenceDialog.value.trim()
    if (!value) {
      setReferenceDialog({ ...referenceDialog, value: '', attempted: true })
      return
    }

    if (referenceDialog.kind === 'material') {
      form.setValue('materialSelection', newReferenceValue, { shouldDirty: true })
      form.setValue('newMaterialName', value, { shouldDirty: true, shouldValidate: true })
      form.clearErrors(['materialSelection', 'newMaterialName'])
    } else if (referenceDialog.kind === 'supplier') {
      form.setValue('supplierSelection', newReferenceValue, { shouldDirty: true })
      form.setValue('newSupplierName', value, { shouldDirty: true, shouldValidate: true })
      form.clearErrors(['supplierSelection', 'newSupplierName'])
    } else {
      form.setValue('storageSelection', newReferenceValue, { shouldDirty: true })
      form.setValue('newStorageLocationName', value, { shouldDirty: true, shouldValidate: true })
      form.clearErrors(['storageSelection', 'newStorageLocationName'])
    }

    setReferenceDialog(null)
    focusReferenceSelect(referenceDialog.kind)
  }
  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root')
    if (expirationRequired && !values.expirationOrRetestDate) {
      form.setError('expirationOrRetestDate', { message: 'Enter the expiration date for this product.' }, { shouldFocus: true })
      return
    }
    try {
      await createLabMaterialLot({
        kind: values.kind,
        supplierProductId: values.kind === 'SupplierLot' ? values.supplierProductId : null,
        materialDefinitionId: values.kind === 'SupplierLot' || values.materialSelection === newReferenceValue
          ? null
          : values.materialSelection,
        newMaterialName: values.kind === 'PreparedReagent' && values.materialSelection === newReferenceValue
          ? values.newMaterialName.trim()
          : null,
        lotNumber: values.lotNumber.trim(),
        supplierId: values.kind === 'SupplierLot' && values.supplierSelection !== newReferenceValue
          ? values.supplierSelection
          : null,
        newSupplierName: values.kind === 'SupplierLot' && values.supplierSelection === newReferenceValue
          ? values.newSupplierName.trim()
          : null,
        storageLocationId: values.storageSelection === newReferenceValue
          ? null
          : values.storageSelection,
        newStorageLocationName: values.storageSelection === newReferenceValue
          ? values.newStorageLocationName.trim()
          : null,
        expirationOrRetestDate: values.expirationOrRetestDate || null,
        availableQuantity: Number(values.availableQuantity),
        quantityUnit: values.quantityUnit.trim(),
        components: values.kind === 'PreparedReagent'
          ? values.components.map((component) => ({
            componentMaterialLotId: component.componentMaterialLotId,
            quantity: Number(component.quantity),
            quantityUnit: component.quantityUnit.trim(),
            materialExhausted: component.materialExhausted ?? false,
            lotVersion: materialLots.find(lot => lot.id === component.componentMaterialLotId)?.version,
          }))
          : [],
      })
      form.reset(defaultValues)
      await onSaved()
    } catch (error) {
      form.setError('root', {
        message: getLabOperationsError(error, 'Check the material lot details and try again.'),
      })
    }
  })

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) close()
      }}>
        <DialogContent className="max-w-2xl">
          <form noValidate onSubmit={(event) => {
            // Native date edits can be visible before the form library receives a change event.
            // Reconcile that control before validation takes its submission snapshot.
            const expirationInput = event.currentTarget.elements.namedItem('expirationOrRetestDate')
            if (expirationInput instanceof HTMLInputElement) {
              if (!expirationInput.validity.valid) {
                event.preventDefault()
                form.setError('expirationOrRetestDate', { message: expirationInput.validity.valueMissing ? 'Enter the expiration date for this product.' : 'Enter a valid expiration or retest date that is not in the past.' })
                expirationInput.focus()
                return
              }
              form.setValue('expirationOrRetestDate', expirationInput.value)
            }
            void submit(event)
          }}>
            <DialogHeader>
              <DialogTitle>Create material lot</DialogTitle>
              <DialogDescription>
                Choose the supplier and catalog product for stock received from outside Phaeno. Start Phaeno-made reagent lots in Reagent manufacturing.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 grid gap-4 sm:grid-cols-2">
              <FormField id="material-lot-kind" label="Lot kind" required error={form.formState.errors.kind?.message}>
                <select
                  id="material-lot-kind"
                  className={selectClass}
                  {...form.register('kind', {
                    onChange: () => {
                      form.setValue('materialSelection', '')
                      form.setValue('newMaterialName', '')
                      form.setValue('supplierSelection', '')
                      form.setValue('supplierProductId', '')
                      form.setValue('newSupplierName', '')
                      components.replace([])
                    },
                  })}
                >
                  <option value="SupplierLot">Supplier lot</option>
                </select>
              </FormField>

              <FormField id="material-lot-number" label="Lot number" required error={form.formState.errors.lotNumber?.message}>
                <Input id="material-lot-number" aria-invalid={Boolean(form.formState.errors.lotNumber)} {...form.register('lotNumber')} />
              </FormField>

              {kind === 'PreparedReagent' ? <div className="sm:col-span-2">
                <FormField id="material-definition" label="Prepared reagent" required error={form.formState.errors.materialSelection?.message}>
                  <select
                    id="material-definition"
                    className={selectClass}
                    aria-invalid={Boolean(form.formState.errors.materialSelection)}
                    {...form.register('materialSelection', {
                      onChange: (event) => {
                        if (event.target.value === createReferenceValue) {
                          openReferenceDialog('material', materialSelection)
                        } else if (event.target.value !== newReferenceValue) {
                          form.setValue('newMaterialName', '')
                        }
                      },
                    })}
                  >
                    <option value="">Select prepared reagent…</option>
                    {definitions.filter((definition) => definition.kind === kind).map((definition) => (
                      <option key={definition.id} value={definition.id}>{definition.name} · {definition.key}</option>
                    ))}
                    <option value={newReferenceValue} hidden={!newMaterialName}>{newMaterialName || 'New prepared reagent'}</option>
                    <option value={createReferenceValue}>Create a new prepared reagent…</option>
                  </select>
                </FormField>
                {materialSelection === newReferenceValue ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">The immutable material key is generated when the lot is created.</p>
                ) : null}
              </div> : null}

              {kind === 'SupplierLot' ? (
                <>
                  <div className="sm:col-span-2">
                    <FormField id="material-supplier" label="Supplier" required error={form.formState.errors.supplierSelection?.message}>
                      <select
                        id="material-supplier"
                        className={selectClass}
                        aria-invalid={Boolean(form.formState.errors.supplierSelection)}
                        {...form.register('supplierSelection', {
                          onChange: (event) => {
                            form.setValue('supplierProductId', '')
                            form.setValue('quantityUnit', '')
                            if (event.target.value === createReferenceValue) {
                              openReferenceDialog('supplier', supplierSelection)
                            } else if (event.target.value !== newReferenceValue) {
                              form.setValue('newSupplierName', '')
                            }
                          },
                        })}
                      >
                        <option value="">Select supplier…</option>
                        {suppliers.filter((supplier) => !supplier.isInternalProducer).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                      </select>
                    </FormField>
                  </div>
                  <div className="sm:col-span-2">
                    <FormField id="material-product" label="Product name" required error={form.formState.errors.supplierProductId?.message}>
                      <select id="material-product" className={selectClass} disabled={!supplierSelection || productCatalog.isPending || productCatalog.isError} aria-invalid={Boolean(form.formState.errors.supplierProductId)} {...form.register('supplierProductId', { onChange: event => form.setValue('quantityUnit', productCatalog.data?.find(supplier => supplier.id === supplierSelection)?.products.find(product => product.id === event.target.value)?.defaultQuantityUnit ?? '') })}>
                        <option value="">Select product…</option>
                        {(productCatalog.data?.find(s => s.id === supplierSelection)?.products ?? []).map(p => <option key={p.id} value={p.id}>{p.productNumber} — {p.description}</option>)}
                      </select>
                    </FormField>
                    {productCatalog.isPending ? <p role="status" className="mt-2 text-sm">Loading products…</p> : productCatalog.isError ? <div role="alert" className="mt-2 text-sm">Products could not be loaded. <Button type="button" variant="outline" onClick={() => void productCatalog.refetch()}>Retry products</Button></div> : supplierSelection && !productCatalog.data?.find(s => s.id === supplierSelection)?.products.length ? <p className="mt-2 text-sm text-muted-foreground">Add or activate this supplier's product in Suppliers &amp; products before receiving its lot.</p> : null}
                  </div>
                </>
              ) : null}

              <div className="sm:col-span-2">
                <FormField id="material-storage" label="Storage location" required error={form.formState.errors.storageSelection?.message}>
                  <select
                    id="material-storage"
                    className={selectClass}
                    aria-invalid={Boolean(form.formState.errors.storageSelection)}
                    {...form.register('storageSelection', {
                      onChange: (event) => {
                        if (event.target.value === createReferenceValue) {
                          openReferenceDialog('storage', storageSelection)
                        } else if (event.target.value !== newReferenceValue) {
                          form.setValue('newStorageLocationName', '')
                        }
                      },
                    })}
                  >
                    <option value="">Select storage location…</option>
                    {storageLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                    <option value={newReferenceValue} hidden={!newStorageLocationName}>{newStorageLocationName || 'New storage location'}</option>
                    <option value={createReferenceValue}>Create a new storage location…</option>
                  </select>
                </FormField>
              </div>

              <FormField id="material-quantity" label="Available quantity" required error={form.formState.errors.availableQuantity?.message}>
                <Input id="material-quantity" type="number" min="0" step="any" aria-invalid={Boolean(form.formState.errors.availableQuantity)} {...form.register('availableQuantity')} />
                <p className="text-xs text-muted-foreground">Record the actual amount in this lot. Recorded use decreases its remaining quantity.</p>
              </FormField>
              <FormField id="material-unit" label="Unit" required error={form.formState.errors.quantityUnit?.message}>
                <Input id="material-unit" aria-invalid={Boolean(form.formState.errors.quantityUnit)} readOnly={kind === 'SupplierLot'} {...form.register('quantityUnit')} />
                {selectedProduct?.defaultQuantityUnit ? <p className="text-xs text-muted-foreground">This is the supplier product’s inventory unit. Enter the amount received in this unit.</p> : <p className="text-xs text-muted-foreground">A catalog administrator must set this product’s inventory unit before a lot can be received.</p>}
              </FormField>

              <div className="sm:col-span-2">
                <FormField id="material-expiration" label={expirationRequired ? "Expiration date" : "Expiration or retest date"} required={expirationRequired} error={form.formState.errors.expirationOrRetestDate?.message}>
                  <Input id="material-expiration" type="date" required={expirationRequired} aria-invalid={Boolean(form.formState.errors.expirationOrRetestDate)} min={today()} {...form.register('expirationOrRetestDate')} />
                </FormField>
                <p className="mt-1.5 text-xs text-muted-foreground">The lot remains valid through the end of this date.</p>
              </div>

              {kind === 'PreparedReagent' ? (
                <fieldset className="grid gap-3 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <legend className="text-sm font-medium"><RequiredFieldName>Component lots</RequiredFieldName></legend>
                    <Button type="button" size="sm" variant="outline" onClick={() => components.append({ componentMaterialLotId: '', quantity: '', quantityUnit: '' })}>
                      <Plus data-icon="inline-start" /> Add component
                    </Button>
                  </div>
                  {components.fields.map((component, index) => (
                    <div key={component.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]">
                      <FormField id={`component-${component.id}-lot`} label="Source lot" required error={form.formState.errors.components?.[index]?.componentMaterialLotId?.message}>
                        <select
                          id={`component-${component.id}-lot`}
                          className={selectClass}
                          aria-invalid={Boolean(form.formState.errors.components?.[index]?.componentMaterialLotId)}
                          {...form.register(`components.${index}.componentMaterialLotId`, {
                            onChange: (event) => {
                              const sourceLot = materialLots.find((lot) => lot.id === event.target.value)
                              if (sourceLot) {
                                form.setValue(`components.${index}.quantityUnit`, sourceLot.quantityUnit, { shouldValidate: true })
                              }
                            },
                          })}
                        >
                          <option value="">Select lot…</option>
                          {availableComponents.map((lot) => (
                            <option key={lot.id} value={lot.id}>
                              {lot.name} · {lot.lotNumber} · {lot.availableQuantity} {lot.quantityUnit}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField id={`component-${component.id}-quantity`} label="Quantity" required error={form.formState.errors.components?.[index]?.quantity?.message}>
                        <Input id={`component-${component.id}-quantity`} type="number" min="0" step="any" {...form.register(`components.${index}.quantity`)} />
                      </FormField>
                      <FormField id={`component-${component.id}-unit`} label="Unit" required error={form.formState.errors.components?.[index]?.quantityUnit?.message}>
                        <Input id={`component-${component.id}-unit`} readOnly {...form.register(`components.${index}.quantityUnit`)} />
                      </FormField>
                      <Button type="button" size="icon" variant="ghost" className="self-end" aria-label={`Remove component ${index + 1}`} onClick={() => components.remove(index)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                      <div className="space-y-1 sm:col-span-4"><label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" aria-describedby={`component-${component.id}-exhausted-help`} {...form.register(`components.${index}.materialExhausted`)} />Material exhausted (optional override)</label><p id={`component-${component.id}-exhausted-help`} className="text-xs text-muted-foreground">Confirm no usable component material remains. Its actual quantity used is retained, with a separate adjustment for any remaining balance.</p></div>
                    </div>
                  ))}
                  <FieldError message={form.formState.errors.components?.root?.message ?? form.formState.errors.components?.message} />
                  {availableComponents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No QC-approved, unexpired component lots with available quantity are ready for use.</p>
                  ) : null}
                </fieldset>
              ) : null}
            </div>

            {form.formState.errors.root?.message ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Material lot was not created</AlertTitle>
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}

            <RequiredDialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating…' : 'Create material lot'}
              </Button>
            </RequiredDialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {referenceDialog ? (
        <ReferenceCreateDialog
          state={referenceDialog}
          onValueChange={(value) => setReferenceDialog((current) => current ? { ...current, value } : current)}
          onCancel={cancelReferenceDialog}
          onSave={saveReferenceName}
        />
      ) : null}
    </>
  )
}

const referenceDialogCopy = {
  material: {
    title: 'Create material',
    label: 'Material name',
    action: 'Use material',
    description: 'Enter the controlled material name. It will be created with the material lot.',
  },
  supplier: {
    title: 'Create supplier',
    label: 'Supplier name',
    action: 'Use supplier',
    description: 'Enter the controlled supplier name. It will be created with the material lot.',
  },
  storage: {
    title: 'Create storage location',
    label: 'Storage location name',
    action: 'Use storage location',
    description: 'Enter the controlled storage location name. It will be created with the material lot.',
  },
} satisfies Record<ReferenceKind, {
  title: string
  label: string
  action: string
  description: string
}>

function ReferenceCreateDialog({
  state,
  onValueChange,
  onCancel,
  onSave,
}: {
  state: ReferenceDialogState
  onValueChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  const copy = referenceDialogCopy[state.kind]
  const inputId = `new-${state.kind}-name-dialog`
  const error = state.attempted && !state.value.trim()
    ? `Enter the ${copy.label.toLowerCase()}.`
    : undefined

  return (
    <Dialog open onOpenChange={(nextOpen) => {
      if (!nextOpen) onCancel()
    }}>
      <DialogContent className="max-w-md">
        <form noValidate onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}>
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <div className="my-5">
            <FormField id={inputId} label={copy.label} required error={error}>
              <Input
                id={inputId}
                value={state.value}
                aria-invalid={Boolean(error)}
                onChange={(event) => onValueChange(event.target.value)}
              />
            </FormField>
          </div>
          <RequiredDialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">{copy.action}</Button>
          </RequiredDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}{required ? <> <RequiredMark /></> : null}</Label>
      {children}
      <FieldError message={error} />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null
}

function focusReferenceSelect(kind: ReferenceKind) {
  const selectId = kind === 'material'
    ? 'material-definition'
    : kind === 'supplier'
      ? 'material-supplier'
      : 'material-storage'

  requestAnimationFrame(() => document.getElementById(selectId)?.focus())
}

function today() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

const selectClass = 'h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
