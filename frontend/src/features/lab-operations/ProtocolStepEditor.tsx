import { MasterMixConfigurationField, MaterialConfigurationField } from './MaterialConfigurationField'
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { ScientificTextField } from './ScientificTextField'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import { PreparationActions } from './preparation-ui'
import { createEmptyProtocolCapture, protocolCaptureFormTypes, protocolCaptureLabel, protocolRequirementTypes, protocolRoleTypes, type ProtocolDefinitionFormValues } from './protocol-definition'
export function ProtocolStepEditor({
  form,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  catalog = false,
  onPreview,
}: {
  form: UseFormReturn<ProtocolDefinitionFormValues>
  index: number
  total: number
  catalog?: boolean
  onPreview?: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const masterMix = form.watch(`steps.${index}.processType`) === 'masterMix'
  const captures = useFieldArray({
    control: form.control,
    name: `steps.${index}.captures`,
  })
  const requirement = form.watch(`steps.${index}.requirement`)
  const qcEnabled = form.watch(`steps.${index}.qcEnabled`)
  const stepName = form.watch(`steps.${index}.name`)
  const stepErrors = form.formState.errors.steps?.[index]
  const instructionError = stepErrors?.instructions?.message

  return (
    <Card size="sm" className="overflow-visible">
      <CardHeader className="border-b">
        <CardTitle>{catalog ? stepName || 'Lab step' : `Step ${index + 1}${stepName ? ` · ${stepName}` : ''}`}</CardTitle>
        <CardDescription>Instructions, required entries, resources, and quality controls.</CardDescription>
        <CardAction>
          <PreparationActions items={[
            ...(onPreview ? [{ label: 'Configuration preview', onClick: onPreview }] : []),
            ...(!catalog ? [
              { label: 'Move up', onClick: onMoveUp, disabled: index === 0 },
              { label: 'Move down', onClick: onMoveDown, disabled: index === total - 1 },
              { label: 'Duplicate step', onClick: onDuplicate },
              { label: 'Remove step', onClick: onRemove, disabled: total === 1 },
            ] : []),
          ]} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        {catalog ? <Field label="Process" id={`step-${index}-process`} error={stepErrors?.processType?.message} description="Master-mix steps define reagents and planned amounts for one preparation.">
          <NativeSelect id={`step-${index}-process`} {...form.register(`steps.${index}.processType`, { onChange: event => {
            if (event.target.value !== 'masterMix') return
            form.setValue('preparationBatchEnabled', true, { shouldDirty: true })
            form.setValue(`steps.${index}.attachmentKind`, 'none', { shouldDirty: true })
            form.setValue(`steps.${index}.attachmentRequired`, false, { shouldDirty: true })
            form.setValue(`steps.${index}.qcScope`, 'batch', { shouldDirty: true })
            form.getValues(`steps.${index}.captures`).forEach((field, fieldIndex) => {
              form.setValue(`steps.${index}.captures.${fieldIndex}.scope`, 'batch', { shouldDirty: true })
              if (field.type === 'material') {
                form.setValue(`steps.${index}.captures.${fieldIndex}.required`, true, { shouldDirty: true })
                form.setValue(`steps.${index}.captures.${fieldIndex}.includeTracking`, true, { shouldDirty: true })
                form.setValue(`steps.${index}.captures.${fieldIndex}.quantityBasis`, 'total', { shouldDirty: true })
              }
            })
          } })}><option value="">General laboratory work</option><option value="masterMix">Master-mix preparation</option></NativeSelect>
        </Field> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {!catalog ? <Field label="Step name" id={`step-${index}-name`} required error={stepErrors?.name?.message}>
            <ScientificTextField id={`step-${index}-name`} control={form.control} name={`steps.${index}.name`} label="Step name" />
          </Field> : null}
          {!catalog ? <Field label="Requirement" id={`step-${index}-requirement`} required error={stepErrors?.requirement?.message}>
            <NativeSelect id={`step-${index}-requirement`} {...form.register(`steps.${index}.requirement`)}>
              {protocolRequirementTypes.map((value) => <option key={value} value={value}>{sentenceCase(value)}</option>)}
            </NativeSelect>
          </Field> : null}
        </div>

        <Field label="Operator instructions" id={`step-${index}-instructions`} required>
          <ScientificTextField id={`step-${index}-instructions`} control={form.control} name={`steps.${index}.instructions`} label="Operator instructions" multiline describedBy={instructionError ? `step-${index}-instructions-error` : undefined} supportingText={instructionError ? <p id={`step-${index}-instructions-error`} role="alert" className="text-sm text-destructive">{instructionError}</p> : undefined} />
        </Field>

        {requirement === 'conditional' ? (
          <Field label="When this step applies" id={`step-${index}-condition`} required error={stepErrors?.condition?.message}>
            <ScientificTextField id={`step-${index}-condition`} control={form.control} name={`steps.${index}.condition`} label="When this step applies" placeholder="For example: when the incoming concentration is below the approved threshold" />
          </Field>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Required role" id={`step-${index}-role`} error={stepErrors?.requiredRole?.message}>
            <NativeSelect id={`step-${index}-role`} {...form.register(`steps.${index}.requiredRole`)}>
              {protocolRoleTypes.map((value) => <option key={value || 'any'} value={value}>{value ? sentenceCase(value) : 'Any authorized laboratory role'}</option>)}
            </NativeSelect>
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
            label="Confirmation required"
            description="Completion of this step must be confirmed."
            control={form}
            name={`steps.${index}.operatorConfirmation`}
          />
        </div>

        <section aria-labelledby={`step-${index}-captures-heading`} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 id={`step-${index}-captures-heading`} className="font-medium">Fields to record</h3>
              <p className="mt-1 text-sm text-muted-foreground">{masterMix ? 'Define required reagents and planned amounts, measurements, text, dates, choices and equipment for one mix.' : 'Add biological material from a specimen, master mix, reagent use, measurements, equipment or outputs.'}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => captures.append({ ...createEmptyProtocolCapture(), ...(masterMix ? { scope: 'batch' as const } : {}) })}>
              <Plus data-icon="inline-start" /> Add field
            </Button>
          </div>

          {captures.fields.length === 0 ? (
            <p className="m-0 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">This step has no fields to record.</p>
          ) : null}

          {(['inputMaterials', 'equipmentTypes', 'preparedOutputs'] as const).some(key => form.watch(`steps.${index}.${key}`).trim()) ? <div className="space-y-2 rounded-md border p-3 text-sm"><p>Existing resource requirements: {(['inputMaterials', 'equipmentTypes', 'preparedOutputs'] as const).map(key => form.watch(`steps.${index}.${key}`)).filter(Boolean).join(' · ')}</p><Button type="button" size="sm" variant="outline" onClick={() => {
            const additions = (['inputMaterials', 'equipmentTypes', 'preparedOutputs'] as const).flatMap(key => {
              const labels = form.getValues(`steps.${index}.${key}`).split(/[,\n]/).map(v => v.trim()).filter(Boolean)
              const type = key === 'inputMaterials' ? 'material' as const : key === 'equipmentTypes' ? 'equipment' as const : 'output' as const
              return (type === 'output' && labels.length ? [labels.join(', ')] : labels).map(label => ({ ...createEmptyProtocolCapture(), label, type, scope: type === 'output' ? 'tube' as const : 'batch' as const, includeTracking: type !== 'output', ...(type === 'material' ? { quantityBasis: 'total' as const, material: { name: label } } : {}) }))
            })
            captures.append(additions)
            for (const key of ['inputMaterials', 'equipmentTypes', 'preparedOutputs'] as const) form.setValue(`steps.${index}.${key}`, '', { shouldDirty: true })
            form.setValue('preparationBatchEnabled', true, { shouldDirty: true })
          }}>Convert existing requirements to fields</Button><p>Only this draft changes. Previously approved versions retain their requirements.</p></div> : null}
          {captures.fields.map((capture, captureIndex) => {
            const captureType = form.watch(`steps.${index}.captures.${captureIndex}.type`)
            const materialField = ['material', 'masterMix'].includes(captureType)
            const captureErrors = stepErrors?.captures?.[captureIndex]
            return (
              <div key={capture.id} className="space-y-3 rounded-lg bg-muted/40 p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <Field label="Field label" id={`step-${index}-capture-${captureIndex}-label`} required error={captureErrors?.label?.message}>
                    <ScientificTextField id={`step-${index}-capture-${captureIndex}-label`} control={form.control} name={`steps.${index}.captures.${captureIndex}.label`} label="Field label" />
                  </Field>
                  <Field label="Type" id={`step-${index}-capture-${captureIndex}-type`} required error={captureErrors?.type?.message}>
                    <NativeSelect id={`step-${index}-capture-${captureIndex}-type`} {...form.register(`steps.${index}.captures.${captureIndex}.type`, { onChange: event => {
                      if (event.target.value !== captureType) form.setValue(`steps.${index}.captures.${captureIndex}.material`, undefined, { shouldDirty: true })
                      if (['material', 'masterMix', 'biologicalMaterial', 'equipment', 'output'].includes(event.target.value)) { form.setValue('preparationBatchEnabled', true, { shouldDirty: true }); form.setValue(`steps.${index}.captures.${captureIndex}.scope`, ['output', 'biologicalMaterial'].includes(event.target.value) ? 'tube' : 'batch', { shouldDirty: true }) }
                      if (event.target.value === 'masterMix') { form.setValue(`steps.${index}.captures.${captureIndex}.includeTracking`, false, { shouldDirty: true }); form.setValue(`steps.${index}.captures.${captureIndex}.unit`, '', { shouldDirty: true }); form.setValue(`steps.${index}.captures.${captureIndex}.quantityBasis`, 'perSample', { shouldDirty: true }) }
                      if (masterMix && event.target.value === 'material') { form.setValue(`steps.${index}.captures.${captureIndex}.required`, true, { shouldDirty: true }); form.setValue(`steps.${index}.captures.${captureIndex}.includeTracking`, true, { shouldDirty: true }); form.setValue(`steps.${index}.captures.${captureIndex}.quantityBasis`, 'total', { shouldDirty: true }) }
                      if (event.target.value === 'barcode') form.setValue(`steps.${index}.captures.${captureIndex}.scope`, 'tube', { shouldDirty: true })
                    } })}>
                      {protocolCaptureFormTypes.filter(value => !masterMix || ['number', 'text', 'date', 'choice', 'material', 'equipment', captureType].includes(value)).map((value) => <option key={value} value={value}>{value === 'material' && masterMix ? 'Reagent used' : protocolCaptureLabel(value)}</option>)}
                    </NativeSelect>
                  </Field>
                </div>
                {captureType === 'barcode' ? <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register(`steps.${index}.captures.${captureIndex}.sourceTube`)} />Must match the selected source tube</label> : null}
                {masterMix ? <p className="text-sm text-muted-foreground">Recorded for this master-mix preparation.</p> : form.watch('preparationBatchEnabled') ? <Field label="Recorded for" id={`scope-${index}-${captureIndex}`} required error={captureErrors?.scope?.message}>
                  <NativeSelect id={`scope-${index}-${captureIndex}`} {...form.register(`steps.${index}.captures.${captureIndex}.scope`, { onChange: event => {
                    if (materialField && event.target.value === 'shared') form.setValue(`steps.${index}.captures.${captureIndex}.quantityBasis`, 'perSample', { shouldDirty: true })
                  } })}>
                    <option value="">Choose what this entry applies to…</option><option value="tube">Sample — record individually</option>
                    {!['barcode', 'output', 'biologicalMaterial'].includes(captureType) ? <><option value="batch">Batch only — same entry for all samples</option>{captureType !== 'equipment' ? <option value="shared">Same entry with sample exceptions</option> : null}</> : null}
                  </NativeSelect>
                </Field> : null}
                {captureType === 'material' && masterMix ? <p className="text-sm text-muted-foreground">Actual reagent lot number and amount are required during preparation.</p> : captureType === 'material' && !form.watch(`steps.${index}.captures.${captureIndex}.material.masterMixWorkflowId`) ? <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" {...form.register(`steps.${index}.captures.${captureIndex}.includeTracking`)} />Include lot number</label> : null}
                {captureType === 'equipment' ? <p className="text-sm text-muted-foreground">Select the equipment used from eligible registered equipment when recording this step.</p> : null}
                {materialField && !masterMix && ['batch', 'shared'].includes(form.watch(`steps.${index}.captures.${captureIndex}.scope`) ?? '') ? <Field label="Quantity recorded" id={`basis-${index}-${captureIndex}`}><NativeSelect id={`basis-${index}-${captureIndex}`} {...form.register(`steps.${index}.captures.${captureIndex}.quantityBasis`)}><option value="perSample">Amount per sample</option>{form.watch(`steps.${index}.captures.${captureIndex}.scope`) !== 'shared' ? <option value="total">Total amount for the batch</option> : null}</NativeSelect></Field> : null}
                {materialField ? <Field label="Quantity unit" id={`step-${index}-capture-${captureIndex}-unit`} required error={captureErrors?.unit?.message}>
                  {captureType === 'masterMix' ? <><Input id={`step-${index}-capture-${captureIndex}-unit`} readOnly placeholder="Set by the approved master mix" {...form.register(`steps.${index}.captures.${captureIndex}.unit`)} /><p className="text-xs text-muted-foreground">The selected master-mix revision defines this unit.</p></> : <ScientificTextField id={`step-${index}-capture-${captureIndex}-unit`} control={form.control} name={`steps.${index}.captures.${captureIndex}.unit`} label="Quantity unit" unit showSymbols={!masterMix} unitOptions={masterMix ? ['µL', 'mL', 'L', 'ng', 'µg', 'mg', 'g', 'kg'] : undefined} placeholder="µL" />}
                </Field> : null}
                {captureType === 'material' && masterMix ? <Field label="Planned amount for one mix" id={`planned-${index}-${captureIndex}`} required error={captureErrors?.plannedQuantityText?.message}>
                  <Input id={`planned-${index}-${captureIndex}`} inputMode="decimal" maxLength={40} {...form.register(`steps.${index}.captures.${captureIndex}.plannedQuantityText`)} />
                </Field> : null}
                {captureType === 'material' ? <MaterialConfigurationField form={form} index={index} captureIndex={captureIndex} /> : null}
                {captureType === 'masterMix' ? <MasterMixConfigurationField form={form} index={index} captureIndex={captureIndex} /> : null}
                {captureType === 'biologicalMaterial' ? <><p className="text-sm text-muted-foreground">Records the actual amount transferred from each specimen’s selected accessioned source into its barcoded library tube. Operators scan the source and destination and can mark source material exhausted. Saved transfers remain linked to the specimen, sample and attempt.</p><Field label="Quantity unit (optional)" id={`step-${index}-capture-${captureIndex}-unit`} error={captureErrors?.unit?.message}><ScientificTextField id={`step-${index}-capture-${captureIndex}-unit`} control={form.control} name={`steps.${index}.captures.${captureIndex}.unit`} label="Quantity unit" unit placeholder="Use the source material unit" /></Field></> : null}
                {captureType === 'output' ? <p className="text-sm text-muted-foreground">Records the prepared library yield in its existing library tube. Common quantity, unit and storage values can be entered once. This does not withdraw source material again.</p> : null}
                {captureType === 'number' ? (
                  <Field label="Unit" id={`step-${index}-capture-${captureIndex}-unit`} error={captureErrors?.unit?.message}>
                    <ScientificTextField id={`step-${index}-capture-${captureIndex}-unit`} control={form.control} name={`steps.${index}.captures.${captureIndex}.unit`} label="Unit" unit placeholder="ng/µL" />
                  </Field>
                ) : null}
                {captureType === 'choice' ? (
                  <Field label="Choices" id={`step-${index}-capture-${captureIndex}-choices`} required error={captureErrors?.choices?.message} description="Separate choices with commas or new lines.">
                    <ScientificTextField id={`step-${index}-capture-${captureIndex}-choices`} control={form.control} name={`steps.${index}.captures.${captureIndex}.choices`} label="Choices" placeholder="Pass, Fail, Hold" />
                  </Field>
                ) : null}
                <div className="flex items-center justify-between gap-4">
                  {captureType === 'equipment' || masterMix && captureType === 'material' ? <span className="text-sm text-muted-foreground">Resource selection is required.</span> : <BooleanField
                    id={`step-${index}-capture-${captureIndex}-required`}
                    label="Required"
                    control={form}
                    name={`steps.${index}.captures.${captureIndex}.required`}
                    compact
                  />}
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${form.watch(`steps.${index}.captures.${captureIndex}.label`) || `capture ${captureIndex + 1}`}`} title="Remove field" onClick={() => captures.remove(captureIndex)}><Trash2 /></Button>
                </div>
              </div>
            )
          })}
        </section>

        {!masterMix ? <Field label="Batch report" id={`step-${index}-attachment`} error={stepErrors?.attachmentKind?.message}>
          <NativeSelect id={`step-${index}-attachment`} {...form.register(`steps.${index}.attachmentKind`, { onChange: event => {
            if (!['qc', 'preparation'].includes(event.target.value)) form.setValue(`steps.${index}.attachmentRequired`, false, { shouldDirty: true })
          } })}>
            {!form.watch(`steps.${index}.attachmentKind`) ? <option value="">Existing protocol behavior</option> : null}
            <option value="none">Do not include a report</option><option value="qc">QC report (PDF)</option><option value="preparation">Preparation report or worksheet (PDF)</option>
          </NativeSelect>
        </Field> : null}
        {['qc', 'preparation'].includes(form.watch(`steps.${index}.attachmentKind`) ?? '') ? <BooleanField id={`step-${index}-attachment-required`} label="Report required" description="Require a PDF when recording this step. Allowed skips do not require a report." control={form} name={`steps.${index}.attachmentRequired`} /> : null}

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
            <>
            {masterMix ? <p className="text-sm text-muted-foreground">QC applies to this master mix.</p> : form.watch('preparationBatchEnabled') ? <Field label="QC scope" id={`qc-scope-${index}`} required error={stepErrors?.qcScope?.message}>
              <NativeSelect id={`qc-scope-${index}`} {...form.register(`steps.${index}.qcScope`)}>
                <option value="">Choose what this entry applies to…</option><option value="tube">Tube — assess individually</option><option value="batch">Batch — applies to all covered tubes</option><option value="shared">Shared outcome with tube exceptions</option>
              </NativeSelect>
            </Field> : null}
            <Field label="Acceptance criteria" id={`step-${index}-qc-criteria`} required error={stepErrors?.qcCriteria?.message}>
              <ScientificTextField id={`step-${index}-qc-criteria`} control={form.control} name={`steps.${index}.qcCriteria`} label="Acceptance criteria" multiline />
            </Field>
            </>
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
  name: `steps.${number}.${'repeatable' | 'operatorConfirmation' | 'qcEnabled' | 'attachmentRequired'}` | `steps.${number}.captures.${number}.required`
  compact?: boolean
}) {
  return (
    <Controller
      control={control.control}
      name={name}
      render={({ field }) => (
        <div className={compact ? 'py-1' : 'rounded-lg border p-3'}>
          <div className={compact ? 'flex items-center gap-3' : 'flex items-start gap-3'}>
            <Checkbox id={id} checked={field.value ?? false} onCheckedChange={(checked) => field.onChange(checked === true)} />
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
        {required ? <RequiredFieldName>{label}</RequiredFieldName> : label}
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


function sentenceCase(value: string) { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()) }
