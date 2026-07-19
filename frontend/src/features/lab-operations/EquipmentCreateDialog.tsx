import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  createLabEquipment,
  getLabOperationsError,
  type LabEquipment,
  type LabProtocol,
  type LabStorageLocation,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

const createReferenceValue = '__create_reference__'

const equipmentSchema = z.object({
  name: z.string().trim().min(1, 'Enter the equipment name.').max(255),
  equipmentType: z.string().trim().min(1, 'Select the equipment type.').max(100),
  location: z.string().trim().min(1, 'Select the location.').max(255),
  lastCalibrationOn: z.string(),
  calibrationDueOn: z.string(),
}).superRefine((values, context) => {
  if (values.lastCalibrationOn && values.lastCalibrationOn > todayDateOnly()) {
    context.addIssue({
      code: 'custom',
      path: ['lastCalibrationOn'],
      message: 'The last calibration date cannot be in the future.',
    })
  }
  if (values.lastCalibrationOn && values.calibrationDueOn
    && values.calibrationDueOn < values.lastCalibrationOn) {
    context.addIssue({
      code: 'custom',
      path: ['calibrationDueOn'],
      message: 'The calibration due date cannot be before the last calibration date.',
    })
  }
})

type EquipmentFormValues = z.infer<typeof equipmentSchema>
type ReferenceKind = 'equipmentType' | 'location'
type ReferenceDialogState = { kind: ReferenceKind; value: string; attempted: boolean }

const defaultValues: EquipmentFormValues = {
  name: '',
  equipmentType: '',
  location: '',
  lastCalibrationOn: '',
  calibrationDueOn: '',
}

export function EquipmentCreateDialog({
  open,
  equipment,
  protocols,
  storageLocations,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  equipment: LabEquipment[]
  protocols: LabProtocol[]
  storageLocations: LabStorageLocation[]
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<unknown>
}) {
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues,
  })
  const [referenceDialog, setReferenceDialog] = useState<ReferenceDialogState | null>(null)
  const equipmentType = form.watch('equipmentType')
  const location = form.watch('location')
  const equipmentTypeOptions = collectEquipmentTypes(equipment, protocols)
  const locationOptions = collectLocations(equipment, storageLocations)

  function close() {
    form.reset(defaultValues)
    setReferenceDialog(null)
    onOpenChange(false)
  }

  async function submit(values: EquipmentFormValues) {
    try {
      await createLabEquipment({
        name: values.name.trim(),
        equipmentType: values.equipmentType.trim(),
        location: values.location.trim(),
        lastCalibrationOn: values.lastCalibrationOn || null,
        calibrationDueOn: values.calibrationDueOn || null,
      })
      form.reset(defaultValues)
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      form.setError('root', {
        message: getLabOperationsError(error, 'Check the equipment details and try again.'),
      })
    }
  }

  function selectReference(kind: ReferenceKind, value: string) {
    if (value === createReferenceValue) {
      setReferenceDialog({ kind, value: '', attempted: false })
      return
    }
    form.setValue(kind, value, { shouldDirty: true, shouldValidate: true })
  }

  function saveReferenceName() {
    if (!referenceDialog) return
    const value = referenceDialog.value.trim()
    if (!value) {
      setReferenceDialog({ ...referenceDialog, attempted: true })
      return
    }
    form.setValue(referenceDialog.kind, value, { shouldDirty: true, shouldValidate: true })
    const kind = referenceDialog.kind
    setReferenceDialog(null)
    focusReferenceSelect(kind)
  }

  function cancelReferenceDialog() {
    if (!referenceDialog) return
    const kind = referenceDialog.kind
    setReferenceDialog(null)
    focusReferenceSelect(kind)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) close()
      }}>
        <DialogContent>
          <form noValidate onSubmit={form.handleSubmit(submit)}>
            <DialogHeader>
              <DialogTitle>Create equipment</DialogTitle>
              <DialogDescription>
                Enter the controlled equipment details. POMS assigns its immutable asset code.
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  id="equipment-name"
                  label="Name"
                  required
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    id="equipment-name"
                    required
                    aria-invalid={Boolean(form.formState.errors.name)}
                    {...form.register('name')}
                  />
                </FormField>
                <p className="mt-2 text-xs text-muted-foreground">
                  The immutable asset code is generated when the equipment is created.
                </p>
              </div>

              <FormField
                id="equipment-type"
                label="Equipment type"
                required
                error={form.formState.errors.equipmentType?.message}
              >
                <select
                  id="equipment-type"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  value={equipmentType}
                  required
                  aria-invalid={Boolean(form.formState.errors.equipmentType)}
                  onChange={(event) => selectReference('equipmentType', event.target.value)}
                >
                  <option value="">Select equipment type…</option>
                  {equipmentTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option
                    value={equipmentType}
                    hidden={!equipmentType || equipmentTypeOptions.includes(equipmentType)}
                  >
                    {equipmentType || 'New equipment type'}
                  </option>
                  <option value={createReferenceValue}>Create a new equipment type…</option>
                </select>
              </FormField>

              <FormField
                id="equipment-location"
                label="Location"
                required
                error={form.formState.errors.location?.message}
              >
                <select
                  id="equipment-location"
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
                  value={location}
                  required
                  aria-invalid={Boolean(form.formState.errors.location)}
                  onChange={(event) => selectReference('location', event.target.value)}
                >
                  <option value="">Select location…</option>
                  {locationOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option
                    value={location}
                    hidden={!location || locationOptions.includes(location)}
                  >
                    {location || 'New location'}
                  </option>
                  <option value={createReferenceValue}>Create a new location…</option>
                </select>
              </FormField>

              <FormField
                id="equipment-last-calibration"
                label="Last calibration date"
                error={form.formState.errors.lastCalibrationOn?.message}
              >
                <Input
                  id="equipment-last-calibration"
                  type="date"
                  max={todayDateOnly()}
                  aria-invalid={Boolean(form.formState.errors.lastCalibrationOn)}
                  {...form.register('lastCalibrationOn')}
                />
              </FormField>

              <FormField
                id="equipment-calibration-due"
                label="Calibration due date"
                error={form.formState.errors.calibrationDueOn?.message}
              >
                <Input
                  id="equipment-calibration-due"
                  type="date"
                  min={form.watch('lastCalibrationOn') || undefined}
                  aria-invalid={Boolean(form.formState.errors.calibrationDueOn)}
                  {...form.register('calibrationDueOn')}
                />
              </FormField>
            </div>

            {form.formState.errors.root?.message ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Equipment was not created</AlertTitle>
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating…' : 'Create equipment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {referenceDialog ? (
        <ReferenceCreateDialog
          state={referenceDialog}
          onValueChange={(value) => setReferenceDialog((current) => current
            ? { ...current, value }
            : current)}
          onCancel={cancelReferenceDialog}
          onSave={saveReferenceName}
        />
      ) : null}
    </>
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
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive" aria-hidden="true"> *</span> : null}
      </Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}

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
  const equipmentType = state.kind === 'equipmentType'
  const label = equipmentType ? 'Equipment type name' : 'Location name'
  const error = state.attempted && !state.value.trim()
    ? `Enter the ${label.toLowerCase()}.`
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
            <DialogTitle>{equipmentType ? 'Create equipment type' : 'Create location'}</DialogTitle>
            <DialogDescription>
              Enter the name to use for this equipment and future equipment records.
            </DialogDescription>
          </DialogHeader>
          <div className="my-5">
            <Label htmlFor="new-equipment-reference">
              {label} <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="new-equipment-reference"
              className="mt-2"
              required
              value={state.value}
              aria-invalid={Boolean(error)}
              onChange={(event) => onValueChange(event.target.value)}
            />
            {error ? <p className="mt-1 text-sm text-destructive" role="alert">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Use {equipmentType ? 'equipment type' : 'location'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function collectEquipmentTypes(equipment: LabEquipment[], protocols: LabProtocol[]) {
  const values = equipment.map((item) => item.equipmentType)
  for (const protocol of protocols) {
    for (const version of protocol.versions) {
      try {
        const definition = JSON.parse(version.definitionJson) as {
          steps?: Array<{ equipmentTypes?: unknown }>
        }
        for (const step of definition.steps ?? []) {
          if (Array.isArray(step.equipmentTypes)) {
            values.push(...step.equipmentTypes.filter((item): item is string => typeof item === 'string'))
          }
        }
      } catch {
        // Invalid historical JSON remains visible elsewhere but cannot supply select options.
      }
    }
  }
  return uniqueNames(values)
}

function collectLocations(equipment: LabEquipment[], storageLocations: LabStorageLocation[]) {
  return uniqueNames([
    ...equipment.map((item) => item.location),
    ...storageLocations.filter((item) => item.isActive).map((item) => item.name),
  ])
}

function uniqueNames(values: string[]) {
  const names = new Map<string, string>()
  for (const value of values) {
    const trimmed = value.trim()
    if (trimmed) names.set(trimmed.toLocaleLowerCase(), trimmed)
  }
  return [...names.values()].sort((left, right) => left.localeCompare(right))
}

function todayDateOnly() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function focusReferenceSelect(kind: ReferenceKind) {
  const selectId = kind === 'equipmentType' ? 'equipment-type' : 'equipment-location'
  requestAnimationFrame(() => document.getElementById(selectId)?.focus())
}
