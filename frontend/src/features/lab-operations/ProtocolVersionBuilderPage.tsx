import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  FileJson,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Controller,
  useFieldArray,
  useForm,
  type UseFormReturn,
} from 'react-hook-form'

import {
  createLabProtocolVersion,
  getLabOperationsDashboard,
  getLabOperationsError,
  updateLabProtocolVersion,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { usePhaenoSession } from '#/features/auth/session-context'

import {
  createEmptyProtocolCapture,
  createEmptyProtocolStep,
  createLibraryPreparationExample,
  deserializeProtocolDefinition,
  protocolCaptureTypes,
  protocolDefinitionFormSchema,
  protocolRequirementTypes,
  protocolRoleTypes,
  serializeProtocolDefinition,
  type ProtocolDefinitionFormValues,
} from './protocol-definition'

const selectClass =
  'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
const textareaClass =
  'min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function ProtocolVersionBuilderPage({
  protocolId,
  draftVersionId,
}: {
  protocolId: string
  draftVersionId?: string
}) {
  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [discardOpen, setDiscardOpen] = useState(false)
  const [loadedDefinitionKey, setLoadedDefinitionKey] = useState<string | null>(null)
  const [definitionLoadErrorKey, setDefinitionLoadErrorKey] = useState<string | null>(null)
  const definitionKey = `${protocolId}:${draftVersionId ?? 'new'}`
  const canManage = Boolean(session?.capabilities.canManageLabProtocols)
  const apiEnabled = canManage && authProvider !== 'mock'
  const dashboard = useQuery({
    queryKey: ['lab-operations'],
    queryFn: getLabOperationsDashboard,
    enabled: apiEnabled,
  })
  const protocol = dashboard.data?.protocols.find((item) => item.id === protocolId)
  const draft = draftVersionId
    ? protocol?.versions.find((item) => item.id === draftVersionId)
    : undefined
  const openCandidate = protocol?.versions.find(
    (item) => item.status === 'Draft' || item.status === 'Approved',
  )
  const controlledSource = protocol?.versions.find((item) => item.status === 'Active')
    ?? protocol?.versions.filter((item) => item.status === 'Retired').slice(-1)[0]
  const isEditing = Boolean(draftVersionId)
  const form = useForm<ProtocolDefinitionFormValues>({
    resolver: zodResolver(protocolDefinitionFormSchema),
    defaultValues: { steps: [createEmptyProtocolStep()] },
  })
  const steps = useFieldArray({ control: form.control, name: 'steps' })
  const watchedValues = form.watch()
  const preview = protocolDefinitionFormSchema.safeParse(watchedValues)
  const errorCount = countFormErrors(form.formState.errors)
  const formReady = loadedDefinitionKey === definitionKey
  const definitionLoadError = definitionLoadErrorKey === definitionKey

  const mutation = useMutation({
    mutationFn: (values: ProtocolDefinitionFormValues) => {
      const input = {
        definitionJson: serializeProtocolDefinition(values),
        protocolVersion: protocol!.version,
      }
      return draft
        ? updateLabProtocolVersion(draft.id, input)
        : createLabProtocolVersion(protocolId, input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lab-operations'] })
      await navigate({ to: '/lab-operations', search: { section: 'protocols' } })
    },
  })

  useEffect(() => {
    if (!protocol || formReady || definitionLoadError) return
    if (isEditing && (!draft || draft.status !== 'Draft')) return
    if (!isEditing && openCandidate) return

    const definitionJson = draft?.definitionJson ?? controlledSource?.definitionJson
    const initialValues = definitionJson
      ? deserializeProtocolDefinition(definitionJson)
      : { steps: [createEmptyProtocolStep()] }
    if (!initialValues) {
      setDefinitionLoadErrorKey(definitionKey)
      return
    }
    form.reset(initialValues)
    setLoadedDefinitionKey(definitionKey)
  }, [
    controlledSource?.definitionJson,
    definitionKey,
    definitionLoadError,
    draft,
    form,
    formReady,
    isEditing,
    openCandidate,
    protocol,
  ])

  useEffect(() => {
    setDiscardOpen(false)
  }, [definitionKey])

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty || mutation.isSuccess) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [form.formState.isDirty, mutation.isSuccess])

  const leaveBuilder = () => navigate({
    to: '/lab-operations',
    search: { section: 'protocols' },
  })

  if (!canManage) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Protocol authoring unavailable</AlertTitle>
          <AlertDescription>An active Protocol Administrator role is required.</AlertDescription>
        </Alert>
      </main>
    )
  }

  if (authProvider === 'mock') {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert>
          <AlertTitle>Protocol authoring is paused</AlertTitle>
          <AlertDescription>Connect a real Phaeno session to create a controlled protocol version.</AlertDescription>
        </Alert>
      </main>
    )
  }

  if (dashboard.isLoading) {
    return <main className="page-wrap px-4 py-8"><p role="status">Loading protocol…</p></main>
  }

  if (dashboard.error) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Protocol could not be loaded</AlertTitle>
          <AlertDescription>{getLabOperationsError(dashboard.error, 'Return to Lab operations and try again.')}</AlertDescription>
        </Alert>
      </main>
    )
  }

  if (!protocol) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Protocol not found</AlertTitle>
          <AlertDescription>The protocol may have changed or no longer be available.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/lab-operations" search={{ section: 'protocols' }}>
            <ArrowLeft data-icon="inline-start" /> Back to protocols
          </Link>
        </Button>
      </main>
    )
  }

  if (isEditing && (!draft || draft.status !== 'Draft')) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Protocol draft is not editable</AlertTitle>
          <AlertDescription>
            The selected version may have changed status or no longer be available. Return to Protocols and review its current state.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/lab-operations" search={{ section: 'protocols' }}>
            <ArrowLeft data-icon="inline-start" /> Back to protocols
          </Link>
        </Button>
      </main>
    )
  }

  if (!isEditing && openCandidate) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert>
          <AlertTitle>An open protocol version already exists</AlertTitle>
          <AlertDescription>
            {openCandidate.status === 'Draft'
              ? 'Continue or discard the current draft before creating another version.'
              : 'Activate or withdraw approval from the approved version before creating another version.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex flex-wrap gap-2">
          {openCandidate.status === 'Draft' ? (
            <Button asChild>
              <Link
                to="/lab-operations/protocols/$protocolId/versions/$versionId/edit"
                params={{ protocolId, versionId: openCandidate.id }}
                search={{ section: undefined }}
              >
                Continue editing
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/lab-operations" search={{ section: 'protocols' }}>
              Back to protocols
            </Link>
          </Button>
        </div>
      </main>
    )
  }

  if (definitionLoadError) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Protocol definition could not be opened</AlertTitle>
          <AlertDescription>
            The stored definition is not compatible with the structured editor. Return to Protocols without changing it.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/lab-operations" search={{ section: 'protocols' }}>
            <ArrowLeft data-icon="inline-start" /> Back to protocols
          </Link>
        </Button>
      </main>
    )
  }

  if (!formReady) {
    return <main className="page-wrap px-4 py-8"><p role="status">Loading protocol definition…</p></main>
  }

  const displayedVersion = draft?.protocolVersion ?? protocol.latestVersion + 1

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6">
        <p className="text-sm text-muted-foreground">
          <Link to="/lab-operations" search={{ section: 'protocols' }} className="hover:underline">
            Lab operations
          </Link>
          {' / '}
          {protocol.name}
          {isEditing ? ` / Edit draft v${displayedVersion}` : ' / New version'}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold">
              {isEditing ? 'Edit' : 'Build'} {protocol.name} version {displayedVersion}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isEditing
                ? 'Continue the open draft. Saving updates this version; approval locks it for activation.'
                : controlledSource
                  ? `This draft starts from controlled version ${controlledSource.protocolVersion}. Approval and activation remain separate actions.`
                  : 'Define an ordered, controlled procedure. Saving creates a draft; approval and activation remain separate actions.'}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Protocol key</span>
            <span className="ml-2 font-mono font-medium">{protocol.key}</span>
          </div>
        </div>
      </section>

      {mutation.error ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>Protocol draft was not {isEditing ? 'saved' : 'created'}</AlertTitle>
          <AlertDescription>{getLabOperationsError(mutation.error, 'Review the definition and try again.')}</AlertDescription>
        </Alert>
      ) : null}

      {form.formState.isSubmitted && errorCount > 0 ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>{errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} attention</AlertTitle>
          <AlertDescription>Review the highlighted fields. Focus moves to the first problem when the form is submitted.</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="space-y-5"
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <p className="text-sm text-muted-foreground">
          <span className="text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> Required field
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Protocol steps</CardTitle>
            <CardDescription>
              Build the procedure in execution order. Use the example only as a starting point and replace it with the approved laboratory procedure.
            </CardDescription>
            {!isEditing && !controlledSource && !form.formState.isDirty ? (
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset(createLibraryPreparationExample(), { keepDefaultValues: true })}
                >
                  Load example
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.fields.map((step, index) => (
              <ProtocolStepEditor
                key={step.id}
                form={form}
                index={index}
                total={steps.fields.length}
                onMoveUp={() => steps.move(index, index - 1)}
                onMoveDown={() => steps.move(index, index + 1)}
                onDuplicate={() => {
                  const current = form.getValues(`steps.${index}`)
                  steps.insert(index + 1, {
                    ...current,
                    name: current.name ? `${current.name} copy` : '',
                    captures: current.captures.map((capture) => ({ ...capture })),
                  })
                }}
                onRemove={() => steps.remove(index)}
              />
            ))}
            <FieldError message={form.formState.errors.steps?.root?.message ?? form.formState.errors.steps?.message} />
            <Button type="button" variant="outline" onClick={() => steps.append(createEmptyProtocolStep())}>
              <Plus data-icon="inline-start" /> Add step
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review generated definition</CardTitle>
            <CardDescription>
              POMS stores this portable representation. The structured fields above remain the authoring surface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <details className="rounded-lg border">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium">
                <FileJson className="size-4" /> JSON preview
              </summary>
              <div className="border-t p-3">
                {preview.success ? (
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs">
                    {serializeProtocolDefinition(preview.data)}
                  </pre>
                ) : (
                  <p className="m-0 text-sm text-muted-foreground">Complete the required fields to preview the definition.</p>
                )}
              </div>
            </details>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.formState.isDirty ? setDiscardOpen(true) : void leaveBuilder()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? isEditing ? 'Saving draft…' : 'Creating draft…'
              : isEditing ? 'Save draft' : 'Create protocol draft'}
          </Button>
        </div>
      </form>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard protocol changes?</DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'The unsaved changes will be lost. The previously saved draft will remain unchanged.'
                : 'The unsaved step definition will be lost. No protocol version has been created yet.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Keep editing</Button></DialogClose>
            <Button type="button" variant="destructive" onClick={() => void leaveBuilder()}>Discard changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function ProtocolStepEditor({
  form,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  form: UseFormReturn<ProtocolDefinitionFormValues>
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const captures = useFieldArray({
    control: form.control,
    name: `steps.${index}.captures`,
  })
  const requirement = form.watch(`steps.${index}.requirement`)
  const qcEnabled = form.watch(`steps.${index}.qcEnabled`)
  const stepName = form.watch(`steps.${index}.name`)
  const stepErrors = form.formState.errors.steps?.[index]

  return (
    <Card size="sm" className="overflow-visible">
      <CardHeader className="border-b">
        <CardTitle>Step {index + 1}{stepName ? ` · ${stepName}` : ''}</CardTitle>
        <CardDescription>Instructions, required evidence, resources, and quality controls.</CardDescription>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move step ${index + 1} up`} title="Move up" disabled={index === 0} onClick={onMoveUp}><ArrowUp /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move step ${index + 1} down`} title="Move down" disabled={index === total - 1} onClick={onMoveDown}><ArrowDown /></Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Duplicate step ${index + 1}`} title="Duplicate step" onClick={onDuplicate}><Copy /></Button>
            <Button type="button" variant="destructive" size="icon-sm" aria-label={`Remove step ${index + 1}`} title="Remove step" disabled={total === 1} onClick={onRemove}><Trash2 /></Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Step name" id={`step-${index}-name`} required error={stepErrors?.name?.message}>
            <Input id={`step-${index}-name`} {...form.register(`steps.${index}.name`)} />
          </Field>
          <Field label="Requirement" id={`step-${index}-requirement`} required error={stepErrors?.requirement?.message}>
            <select id={`step-${index}-requirement`} className={selectClass} {...form.register(`steps.${index}.requirement`)}>
              {protocolRequirementTypes.map((value) => <option key={value} value={value}>{sentenceCase(value)}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Operator instructions" id={`step-${index}-instructions`} required error={stepErrors?.instructions?.message}>
          <textarea id={`step-${index}-instructions`} className={textareaClass} {...form.register(`steps.${index}.instructions`)} />
        </Field>

        {requirement === 'conditional' ? (
          <Field label="When this step applies" id={`step-${index}-condition`} required error={stepErrors?.condition?.message}>
            <Input id={`step-${index}-condition`} {...form.register(`steps.${index}.condition`)} placeholder="For example: when the incoming concentration is below the approved threshold" />
          </Field>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Required role" id={`step-${index}-role`} error={stepErrors?.requiredRole?.message}>
            <select id={`step-${index}-role`} className={selectClass} {...form.register(`steps.${index}.requiredRole`)}>
              {protocolRoleTypes.map((value) => <option key={value || 'any'} value={value}>{value ? sentenceCase(value) : 'Any authorized laboratory role'}</option>)}
            </select>
          </Field>
          <BooleanField
            id={`step-${index}-repeatable`}
            label="Step may be repeated"
            description="Record every repetition in execution history."
            control={form}
            name={`steps.${index}.repeatable`}
          />
          <BooleanField
            id={`step-${index}-confirmation`}
            label="Operator confirmation required"
            description="The operator must explicitly confirm completion."
            control={form}
            name={`steps.${index}.operatorConfirmation`}
          />
        </div>

        <section aria-labelledby={`step-${index}-captures-heading`} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id={`step-${index}-captures-heading`} className="font-medium">Captured values</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add measurements, text, dates, choices, file references, or barcodes.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => captures.append(createEmptyProtocolCapture())}>
              <Plus data-icon="inline-start" /> Add capture
            </Button>
          </div>

          {captures.fields.length === 0 ? (
            <p className="m-0 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">This step does not capture a value.</p>
          ) : null}

          {captures.fields.map((capture, captureIndex) => {
            const captureType = form.watch(`steps.${index}.captures.${captureIndex}.type`)
            const captureErrors = stepErrors?.captures?.[captureIndex]
            return (
              <div key={capture.id} className="grid gap-3 rounded-lg bg-muted/40 p-3 lg:grid-cols-[minmax(0,2fr)_minmax(10rem,1fr)_auto_auto] lg:items-start">
                <Field label="Capture label" id={`step-${index}-capture-${captureIndex}-label`} required error={captureErrors?.label?.message}>
                  <Input id={`step-${index}-capture-${captureIndex}-label`} {...form.register(`steps.${index}.captures.${captureIndex}.label`)} />
                </Field>
                <Field label="Type" id={`step-${index}-capture-${captureIndex}-type`} required error={captureErrors?.type?.message}>
                  <select id={`step-${index}-capture-${captureIndex}-type`} className={selectClass} {...form.register(`steps.${index}.captures.${captureIndex}.type`)}>
                    {protocolCaptureTypes.map((value) => <option key={value} value={value}>{sentenceCase(value)}</option>)}
                  </select>
                </Field>
                <BooleanField
                  id={`step-${index}-capture-${captureIndex}-required`}
                  label="Required"
                  control={form}
                  name={`steps.${index}.captures.${captureIndex}.required`}
                  compact
                />
                <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label={`Remove ${form.watch(`steps.${index}.captures.${captureIndex}.label`) || `capture ${captureIndex + 1}`}`} title="Remove capture" onClick={() => captures.remove(captureIndex)}><Trash2 /></Button>
                {captureType === 'number' ? (
                  <Field label="Unit" id={`step-${index}-capture-${captureIndex}-unit`} error={captureErrors?.unit?.message}>
                    <Input id={`step-${index}-capture-${captureIndex}-unit`} {...form.register(`steps.${index}.captures.${captureIndex}.unit`)} placeholder="ng/µL" />
                  </Field>
                ) : null}
                {captureType === 'choice' ? (
                  <div className="lg:col-span-2">
                    <Field label="Choices" id={`step-${index}-capture-${captureIndex}-choices`} required error={captureErrors?.choices?.message} description="Separate choices with commas or new lines.">
                      <Input id={`step-${index}-capture-${captureIndex}-choices`} {...form.register(`steps.${index}.captures.${captureIndex}.choices`)} placeholder="Pass, Fail, Hold" />
                    </Field>
                  </div>
                ) : null}
              </div>
            )
          })}
        </section>

        <section aria-labelledby={`step-${index}-resources-heading`} className="space-y-3 rounded-lg border p-4">
          <div>
            <h3 id={`step-${index}-resources-heading`} className="font-medium">Materials, outputs, and equipment</h3>
            <p className="mt-1 text-sm text-muted-foreground">Separate multiple requirements with commas or new lines.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Input materials" id={`step-${index}-inputs`} error={stepErrors?.inputMaterials?.message}>
              <textarea id={`step-${index}-inputs`} className={textareaClass} {...form.register(`steps.${index}.inputMaterials`)} />
            </Field>
            <Field label="Prepared outputs" id={`step-${index}-outputs`} error={stepErrors?.preparedOutputs?.message}>
              <textarea id={`step-${index}-outputs`} className={textareaClass} {...form.register(`steps.${index}.preparedOutputs`)} />
            </Field>
            <Field label="Equipment types" id={`step-${index}-equipment`} error={stepErrors?.equipmentTypes?.message}>
              <textarea id={`step-${index}-equipment`} className={textareaClass} {...form.register(`steps.${index}.equipmentTypes`)} />
            </Field>
          </div>
        </section>

        <section aria-labelledby={`step-${index}-qc-heading`} className="space-y-3 rounded-lg border p-4">
          <div>
            <h3 id={`step-${index}-qc-heading`} className="font-medium">Quality-control gate</h3>
            <p className="mt-1 text-sm text-muted-foreground">A gate records a Pass, Fail, or Hold outcome before work proceeds.</p>
          </div>
          <BooleanField
            id={`step-${index}-qc-enabled`}
            label="Require a QC outcome"
            control={form}
            name={`steps.${index}.qcEnabled`}
          />
          {qcEnabled ? (
            <Field label="Acceptance criteria" id={`step-${index}-qc-criteria`} required error={stepErrors?.qcCriteria?.message}>
              <textarea id={`step-${index}-qc-criteria`} className={textareaClass} {...form.register(`steps.${index}.qcCriteria`)} />
            </Field>
          ) : null}
        </section>
      </CardContent>
    </Card>
  )
}

function BooleanField({
  id,
  label,
  description,
  control,
  name,
  compact,
}: {
  id: string
  label: string
  description?: string
  control: UseFormReturn<ProtocolDefinitionFormValues>
  name: `steps.${number}.${'repeatable' | 'operatorConfirmation' | 'qcEnabled'}` | `steps.${number}.captures.${number}.required`
  compact?: boolean
}) {
  return (
    <Controller
      control={control.control}
      name={name}
      render={({ field }) => (
        <div className={compact ? 'pt-6' : 'rounded-lg border p-3'}>
          <div className="flex items-start gap-3">
            <Checkbox id={id} checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
            <div>
              <Label htmlFor={id} className="cursor-pointer text-sm font-medium">{label}</Label>
              {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
            </div>
          </div>
        </div>
      )}
    />
  )
}

function Field({
  label,
  id,
  required,
  error,
  description,
  children,
}: {
  label: string
  id: string
  required?: boolean
  error?: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-[var(--ruby-red,#b4233c)]" aria-hidden="true">*</span> : null}
      </Label>
      {description ? <p id={`${id}-description`} className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      <div className="mt-2">{children}</div>
      <FieldError message={error} />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-destructive" role="alert">{message}</p> : null
}

function countFormErrors(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  if ('message' in value && typeof value.message === 'string') return 1
  return Object.entries(value)
    .filter(([key]) => key !== 'ref')
    .reduce((total, [, child]) => total + countFormErrors(child), 0)
}

function sentenceCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase())
}
