import { getLabSteps } from '#/api/lab-steps'
import { ConfigurationPreview } from './ConfigurationPreview'
import { LabStepPicker, PinnedLabStep } from './PinnedLabStep'
import type { ProtocolDefinition } from './protocol-definition'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  FileJson,
  Plus,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  useFieldArray,
  useForm,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { RequiredLegend } from '#/components/ui/required-field'
import { ProtocolStepEditor } from './ProtocolStepEditor'
import { usePhaenoSession } from '#/features/auth/session-context'

import {
  createEmptyProtocolStep,
  createLibraryPreparationExample,
  deserializeProtocolDefinition,
  protocolDefinitionFormSchema,
  serializeProtocolDefinition,
  type ProtocolDefinitionFormValues,
} from './protocol-definition'

export function ProtocolVersionBuilderPage({
  protocolId,
  draftVersionId,
}: {
  protocolId: string
  draftVersionId?: string
}) {
  const { authProvider, session } = usePhaenoSession()
  const navigate = useNavigate()
  const leaveApproved = useRef(false)
  const queryClient = useQueryClient()
  const [capturePreview, setCapturePreview] = useState<{ definition: ProtocolDefinition; index: number }>()
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
  const catalog = useQuery({ queryKey: ['lab-steps'], queryFn: getLabSteps, enabled: apiEnabled })
  const protocol = dashboard.data?.protocols.find((item) => item.id === protocolId)
  const draft = draftVersionId
    ? protocol?.versions.find((item) => item.id === draftVersionId)
    : undefined
  const openCandidate = protocol?.versions.find((item) => item.status === 'Draft')
  const controlledSource = protocol?.versions
    .filter((item) => item.status === 'Approved' || item.status === 'Active')
    .at(-1)
    ?? protocol?.versions.filter((item) => item.status === 'Retired').at(-1)
  const isEditing = Boolean(draftVersionId)
  const form = useForm<ProtocolDefinitionFormValues>({
    resolver: zodResolver(protocolDefinitionFormSchema),
    defaultValues: { preparationBatchEnabled: true, steps: [createEmptyProtocolStep()] },
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
      leaveApproved.current = true;
      await queryClient.invalidateQueries({ queryKey: ['lab-operations'] })
      await navigate({ to: '/lab-configuration', search: { configurationTab: 'protocols' } })
    },
  })

  useBlocker({ shouldBlockFn: () => !leaveApproved.current && (mutation.isPending || form.formState.isDirty && !window.confirm('Discard unsaved protocol changes?')), enableBeforeUnload: false })

  useEffect(() => {
    if (!protocol || formReady || definitionLoadError) return
    if (isEditing && (!draft || draft.status !== 'Draft')) return
    if (!isEditing && openCandidate) return

    const definitionJson = draft?.definitionJson ?? controlledSource?.definitionJson
    const initialValues = definitionJson
      ? deserializeProtocolDefinition(definitionJson)
      : { preparationBatchEnabled: true, steps: [createEmptyProtocolStep()] }
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

  const showPreview = (index = 0) => setCapturePreview({ definition: JSON.parse(serializeProtocolDefinition(form.getValues())) as ProtocolDefinition, index })

  const leaveBuilder = () => navigate({
    to: '/lab-configuration',
    search: { configurationTab: 'protocols' },
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
          <Link to="/lab-configuration" search={{ configurationTab: 'protocols' }}>
            <ArrowLeft data-icon="inline-start" /> Back to protocols
          </Link>
        </Button>
      </main>
    )
  }

  if (protocol.retiredAtUtc || (isEditing && (!draft || draft.status !== 'Draft'))) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>{protocol.retiredAtUtc ? 'Protocol is retired' : 'Protocol draft is not editable'}</AlertTitle>
          <AlertDescription>
            The selected version may have changed status or no longer be available. Return to Protocols and review its current state.
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/lab-configuration" search={{ configurationTab: 'protocols' }}>
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
            Continue or discard the current draft before creating another version.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link
              to="/lab-operations/protocols/$protocolId/versions/$versionId/edit"
              params={{ protocolId, versionId: openCandidate.id }}
              search={{ section: undefined }}
            >
              Edit protocol
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/lab-configuration" search={{ configurationTab: 'protocols' }}>
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
          <Link to="/lab-configuration" search={{ configurationTab: 'protocols' }}>
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
  const isInitialDefinition = !isEditing && protocol.latestVersion === 0

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6">
        <p className="text-sm text-muted-foreground">
          <Link to="/lab-configuration" search={{ configurationTab: 'protocols' }} className="hover:underline">
            Lab operations
          </Link>
          {' / '}
          {protocol.name}
          {isEditing
              ? ` / Edit draft v${displayedVersion}`
              : isInitialDefinition
              ? ' / Edit protocol'
              : ' / New version'}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold">
              {isEditing
                ? `Edit ${protocol.name} draft v${displayedVersion}`
                : isInitialDefinition
                  ? `Edit ${protocol.name}`
                  : `Build ${protocol.name} version ${displayedVersion}`}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isEditing
                ? 'Continue the open draft. Saving updates this version; formal approval locks it and makes it the approved version for future use.'
                : isInitialDefinition
                  ? 'Define the initial controlled procedure. Saving creates a draft that must be formally reviewed and approved before use.'
                  : controlledSource
                  ? `This draft starts from approved version ${controlledSource.protocolVersion}. It does not replace that version until formally approved.`
                  : 'Define an ordered, controlled procedure. Saving creates a draft that is not in effect until formally approved.'}
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
        <div className="flex items-center justify-between gap-3"><RequiredLegend /><Button type="button" variant="outline" onClick={() => showPreview()}>Configuration preview</Button></div>
        <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0" disabled={watchedValues.steps.some(s => s.labStepVersionId)} {...form.register('preparationBatchEnabled')} />
          <span>Use this version for preparation batches. Specify whether each field and QC outcome applies to the batch or individual samples.</span>
        </label>

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
            {catalog.error ? <p role="alert">Lab step catalog could not be loaded. Existing pinned definitions remain unchanged.</p> : <LabStepPicker catalog={catalog.data ?? []} onAdd={step => { steps.append(step); form.setValue('preparationBatchEnabled', true, { shouldDirty: true }) }} />}
            {steps.fields.map((step, index) => (
              watchedValues.steps[index]?.labStepVersionId ? <PinnedLabStep key={step.id} form={form} index={index} total={steps.fields.length} catalog={catalog.data ?? []} onReplace={value => steps.update(index, value)} onMove={to => steps.move(index, to)} onPreview={() => showPreview(index)} onRemove={() => steps.remove(index)} onDuplicate={() => steps.insert(index + 1, { ...form.getValues(`steps.${index}`), key: `step-${crypto.randomUUID()}` })} /> : <ProtocolStepEditor
                key={step.id}
                form={form}
                index={index}
                onPreview={() => showPreview(index)}
                total={steps.fields.length}
                onMoveUp={() => steps.move(index, index - 1)}
                onMoveDown={() => steps.move(index, index + 1)}
                onDuplicate={() => {
                  const current = form.getValues(`steps.${index}`)
                  steps.insert(index + 1, {
                    ...current,
                    key: `step-${crypto.randomUUID()}`,
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
              ? isEditing
                ? 'Saving draft…'
                : isInitialDefinition
                  ? 'Saving initial draft…'
                  : 'Creating draft…'
              : isEditing
                ? 'Save draft'
                : isInitialDefinition
                  ? 'Save initial draft'
                  : 'Create protocol draft'}
          </Button>
        </div>
      </form>

      {capturePreview ? <ConfigurationPreview definition={capturePreview.definition} initialIndex={capturePreview.index} name={`${protocol.name} v${displayedVersion} · Unsaved draft`} onClose={() => setCapturePreview(undefined)} /> : null}

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
            <Button type="button" variant="destructive" onClick={() => { leaveApproved.current = true; void leaveBuilder() }}>Discard changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function countFormErrors(value: unknown): number {
  if (!value || typeof value !== 'object') return 0
  if ('message' in value && typeof value.message === 'string') return 1
  return Object.entries(value)
    .filter(([key]) => key !== 'ref')
    .reduce((total, [, child]) => total + countFormErrors(child), 0)
}

function FieldError({ message }: { message?: string }) { return message ? <p role="alert" className="text-sm text-destructive">{message}</p> : null }
