import { labAmount, operationalInputProps } from './lab-presentation'
import { cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useBlocker } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { z } from 'zod'
import { applySequencingTubeCommand, getSequencingTubes, type SequencingTubeCommand, type SequencingTubeMember } from '#/api/lab-material-transfers'
import { getLabOperationsError, type LabContainer } from '#/api/lab-operations'
import type { LabSupplier } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { SequencingTubePairs } from './SequencingTubePairs'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { LabLabelDialog } from './LabLabelDialog'
import { normalizeMaterialTubeScan } from './material-transfer-barcode'
import { usePhaenoSession } from '#/features/auth/session-context'
import { LabCommandStorageError, useLabCommandRecovery } from './lab-command-recovery'
import { StepTimingFields } from './StepTimingFields'
import { emptyStepTiming, performanceInput, stepTimingSchema, timingIssues } from './step-performance'
import { exceedsDecimalQuantity, isPositiveDecimalQuantity, meetsMinimumSequencingVolume, remainingDecimalQuantity } from './decimal-quantity'

const baseSchema = z.object({ barcodeSource: z.enum(['PhaenoGenerated', 'Manufacturer']), barcode: z.string().trim().max(100, 'Use 100 characters or fewer.'), manufacturerSupplierId: z.string(), location: z.string().trim().max(255), sourceScan: z.string().trim().max(102), destinationScan: z.string().trim().max(102), quantity: z.string().trim(), unit: z.string().trim().max(50), exhausted: z.boolean(), confirmed: z.boolean(), timing: stepTimingSchema })
type Values = z.infer<typeof baseSchema>
type Target = { memberId: string; action: 'allocate' | 'transfer' }
type PendingCommand = { memberId: string; input: SequencingTubeCommand }
const emptyValues = (): Values => ({ barcodeSource: 'PhaenoGenerated', barcode: '', manufacturerSupplierId: '', location: '', sourceScan: '', destinationScan: '', quantity: '', unit: '', exhausted: false, confirmed: false, timing: { ...emptyStepTiming } })
const amount = (container: LabContainer) => container.status === 'Consumed' ? 'Exhausted' : container.quantity === null ? 'Unknown amount remaining' : `${labAmount(container.quantityText ?? container.quantity)} ${container.quantityUnit ?? ''} remaining`

function PairField({ label, id, required, children, error }: { label: string; id: string; required?: boolean; children: ReactNode; error?: string }) {
  const control = isValidElement<{ 'aria-required'?: boolean; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>(children) ? cloneElement(children, { 'aria-required': required || undefined, 'aria-invalid': Boolean(error), 'aria-describedby': [children.props['aria-describedby'], error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined }) : children
  return <Field><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{control}<FieldError id={`${id}-error`}>{error}</FieldError></Field>
}

export function SequencingTubesDialog({ batchId, batchName, suppliers, canManage, onClose, onChanged }: {
  batchId: string; batchName: string; suppliers: LabSupplier[]; canManage: boolean; onClose: () => void; onChanged: () => Promise<unknown>
}) {
  const client = useQueryClient()
  const { session } = usePhaenoSession()
  const recovery = useLabCommandRecovery<PendingCommand>(`sequencing:${batchId}`, session?.user?.id)
  const queryKey = ['lab-sequencing-tubes', batchId]
  const query = useQuery({ queryKey, queryFn: () => getSequencingTubes(batchId) })
  const [target, setTarget] = useState<Target | null>(null)
  const [printing, setPrinting] = useState<LabContainer | null>(null)
  const [uncertain, setUncertain] = useState<PendingCommand | null>(null)
  const [notice, setNotice] = useState('')
  const [discard, setDiscard] = useState<(() => void) | null>(null)
  const inFlight = useRef(false)
  const sourceScanInput = useRef<HTMLInputElement | null>(null)
  const advanceAfterScan = useRef(false)
  const discardCancel = useRef<HTMLButtonElement | null>(null)
  const member = query.data?.members.find(item => item.id === target?.memberId)
  const canEdit = canManage && Boolean(query.data && ['Draft', 'InProgress'].includes(query.data.batchStatus) && !query.data.hasSendout)
  const minimum = member?.minimumSequencingVolumeUlText
  const schema = baseSchema.superRefine((values, context) => {
    const issue = (key: keyof Values, message: string) => context.addIssue({ code: 'custom', path: [key], message })
    if (normalizeMaterialTubeScan(values.sourceScan) !== member?.source.barcode) issue('sourceScan', 'Scan the selected library tube barcode.')
    if (target?.action === 'allocate') {
      if (!values.location) issue('location', 'Enter the sequencing tube storage location.')
      if (values.barcodeSource === 'Manufacturer' && (!values.barcode || /\s/u.test(values.barcode) || [...values.barcode].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159))) issue('barcode', 'Scan the complete manufacturer barcode without whitespace or control characters.')
      if (values.barcodeSource === 'Manufacturer' && !values.manufacturerSupplierId) issue('manufacturerSupplierId', 'Select the manufacturer of this physical tube.')
      return
    }
    if (normalizeMaterialTubeScan(values.destinationScan) !== member?.sequencingTube?.barcode) issue('destinationScan', 'Scan the assigned sequencing tube barcode.')
    if (!isPositiveDecimalQuantity(values.quantity)) issue('quantity', 'Enter a positive decimal amount with at most 28 fractional places.')
    else if (!minimum || !meetsMinimumSequencingVolume(values.quantity, values.unit, minimum)) issue('quantity', `Enter at least ${minimum ? labAmount(minimum) : 'the configured minimum'} µL using a volume unit (µL, uL, mL, L or nL).`)
    else if (member?.source.quantity !== null && member?.source.quantity !== undefined && exceedsDecimalQuantity(values.quantity, member.source.quantityText ?? String(member.source.quantity))) issue('quantity', 'The amount exceeds the known library material remaining.')
    else if (member?.source.quantityText && remainingDecimalQuantity(member.source.quantityText, values.quantity) === null) issue('quantity', 'Use an amount whose source balance can be recorded exactly.')
    if (!values.unit) issue('unit', 'Enter the quantity unit.')
    else if (member?.source.quantityUnit && values.unit !== member.source.quantityUnit) issue('unit', `Use the library material unit (${member.source.quantityUnit}).`)
    if (!values.confirmed) issue('confirmed', 'Confirm that you personally performed the transfer.')
    if (values.timing.otherPerformer) context.addIssue({ code: 'custom', path: ['timing', 'performerId'], message: 'Record your personally performed transfer.' })
    timingIssues(values.timing).forEach(error => context.addIssue({ code: 'custom', path: ['timing', error.field], message: error.message }))
  })
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: emptyValues() })
  useEffect(() => {
    if (target || printing || recovery.data || !recovery.isFetched || !canEdit) return
    const next = query.data?.members.find(item => !item.transfer && item.source.status === 'Available')
    if (next) {
      form.reset({ ...emptyValues(), unit: next.source.quantityUnit ?? '', location: next.sequencingTube?.location ?? '' })
      setTarget({ memberId: next.id, action: next.sequencingTube ? 'transfer' : 'allocate' })
    }
  }, [query.data, target, printing, recovery.data, recovery.isFetched, canEdit, form])
  const sourceScanRegistration = form.register('sourceScan')
  useEffect(() => {
    if (target && !printing && !discard) {
      if (advanceAfterScan.current) {
        advanceAfterScan.current = false
        document.getElementById(target.action === 'transfer' ? 'sequencing-destination-scan' : 'sequencing-barcode-source')?.focus()
      } else sourceScanInput.current?.focus()
    }
  }, [target, printing, discard])
  useEffect(() => {
    if (!recovery.data) return
    const pending = recovery.data
    setUncertain(pending)
    setTarget({ memberId: pending.memberId, action: pending.input.action })
    form.reset({ ...emptyValues(), barcodeSource: pending.input.barcodeSource ?? 'PhaenoGenerated', barcode: pending.input.barcode ?? '', manufacturerSupplierId: pending.input.manufacturerSupplierId ?? '', location: pending.input.location ?? '', sourceScan: pending.input.confirmedSourceBarcode ?? '', destinationScan: pending.input.confirmedDestinationBarcode ?? '', quantity: pending.input.quantityText ?? pending.input.quantity?.toString() ?? '', unit: pending.input.quantityUnit ?? '', exhausted: pending.input.materialExhausted ?? false, confirmed: pending.input.performance?.personallyPerformed ?? false })
  }, [recovery.data, form])
  const save = useMutation({ mutationFn: async (command: PendingCommand) => {
    await recovery.retain(command, command.input.requestId)
    return applySequencingTubeCommand(batchId, command.memberId, command.input)
  },
    onSuccess: async (data, command) => {
      await Promise.allSettled([recovery.clear(command.input.requestId)])
      client.setQueryData(queryKey, data)
      setUncertain(null)
      const updated = data.members.find(item => item.id === command.memberId)
      if (command.input.action === 'allocate' && updated?.sequencingTube) {
        form.reset({ ...emptyValues(), unit: updated.source.quantityUnit ?? '', location: updated.sequencingTube.location ?? '' })
        setTarget({ memberId: updated.id, action: 'transfer' })
        if (updated.sequencingTube.status === 'LabelPending') setPrinting(updated.sequencingTube)
      } else { setTarget(null); form.reset(emptyValues()) }
      setNotice(command.input.action === 'allocate' ? 'Empty sequencing tube prepared. Scan both physical tubes and record the actual volume transferred.' : 'Transfer recorded: the sequencing tube was credited and the library tube was debited by the actual volume.')
      await Promise.allSettled([onChanged(), client.invalidateQueries({ queryKey: ['lab-operations'] })])
    },
    onError: async (error, command) => {
      if (error instanceof LabCommandStorageError) { await recovery.refetch(); return }
      if (!axios.isAxiosError(error) || !error.response || error.response.status >= 500 || error.response.status === 408) setUncertain(command)
      else { await Promise.allSettled([recovery.clear(command.input.requestId)]); setUncertain(null); await client.invalidateQueries({ queryKey }) }
    },
  })
  const locked = save.isPending || Boolean(uncertain)
  const dirty = Boolean(target && form.formState.isDirty)
  const blocker = useBlocker({ shouldBlockFn: () => locked || dirty, enableBeforeUnload: () => locked || dirty, withResolver: true })
  const leaveForm = () => {
    if (locked) return
    const leave = () => { form.reset(emptyValues()); save.reset(); onClose() }
    if (dirty) setDiscard(() => leave)
    else leave()
  }
  const close = () => { if (!locked) { if (dirty) setDiscard(() => onClose); else onClose() } }
  const open = (item: SequencingTubeMember, scan = '') => {
    const change = () => { save.reset(); setNotice(''); advanceAfterScan.current = Boolean(scan); form.reset({ ...emptyValues(), sourceScan: scan, unit: item.source.quantityUnit ?? '', location: item.sequencingTube?.location ?? '' }); setTarget({ memberId: item.id, action: item.sequencingTube ? 'transfer' : 'allocate' }) }
    const otherEntries = Object.keys(form.formState.dirtyFields).some(key => key !== 'sourceScan')
    if (dirty && (!scan || otherEntries)) setDiscard(() => change); else change()
  }
  const scanSource = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const scanned = normalizeMaterialTubeScan(form.getValues('sourceScan'))
    const matching = query.data?.members.find(item => item.source.barcode === scanned && !item.transfer)
    if (!matching) { form.setError('sourceScan', { message: 'Scan an untransferred library from this batch.' }); return }
    if (matching.id !== member?.id) { open(matching, form.getValues('sourceScan')); return }
    form.clearErrors('sourceScan')
    document.getElementById(target?.action === 'transfer' ? 'sequencing-destination-scan' : 'sequencing-barcode-source')?.focus()
  }
  const execute = (command: PendingCommand) => {
    if (inFlight.current) return
    inFlight.current = true
    save.mutate(command, { onSettled: () => { inFlight.current = false } })
  }
  const submit = (values: Values) => {
    if (locked || !canEdit || !minimum || !member || !target || !query.data || target.action === 'transfer' && member.sequencingTube?.status !== 'Available') return
    const input: SequencingTubeCommand = { requestId: crypto.randomUUID(), batchVersion: query.data.batchVersion, action: target.action, sourceVersion: member.source.version }
    if (target.action === 'allocate') Object.assign(input, { catalogVersion: member.catalogVersion, confirmedSourceBarcode: values.sourceScan, barcodeSource: values.barcodeSource, ...(values.barcodeSource === 'Manufacturer' ? { barcode: values.barcode, manufacturerSupplierId: values.manufacturerSupplierId } : {}), location: values.location })
    else Object.assign(input, { destinationVersion: member.sequencingTube?.version, confirmedSourceBarcode: values.sourceScan, confirmedDestinationBarcode: values.destinationScan, quantityText: values.quantity, quantityUnit: values.unit, materialExhausted: values.exhausted, performance: performanceInput(values.timing, values.confirmed) })
    execute({ memberId: member.id, input })
  }
  if (printing) return <LabLabelDialog container={printing} onClose={() => setPrinting(null)} onRecorded={async () => { await Promise.allSettled([client.invalidateQueries({ queryKey }), onChanged()]) }} />
  if (discard || blocker.status === 'blocked') return <Dialog key="discard-sequencing-entry" open onOpenChange={openState => { if (!openState) { setDiscard(null); blocker.reset?.() } }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); discardCancel.current?.focus() }}>
    <DialogHeader><DialogTitle>Discard sequencing tube entry?</DialogTitle></DialogHeader>
    <div><DialogDescription>Your unsaved scans and transfer entries will be discarded. Saved tube assignments and material transfers will be retained.</DialogDescription></div>
    <RequiredDialogFooter showLegend={false}><Button ref={discardCancel} type="button" variant="outline" onClick={() => { setDiscard(null); blocker.reset?.() }}>Keep editing</Button><Button type="button" variant="destructive" disabled={locked} onClick={() => { const action = discard; setDiscard(null); if (action) action(); else blocker.proceed?.() }}>Discard entry</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
  const error = save.error ? getLabOperationsError(save.error, 'The sequencing tube action could not be confirmed.') : undefined
  return <Dialog open onOpenChange={openState => { if (!openState) close() }}><DialogContent className="sm:max-w-3xl" showCloseButton={!locked}><form className="contents" noValidate onSubmit={form.handleSubmit(submit)}>
    <DialogHeader><DialogTitle>{query.isPending ? 'Libraries and sequencing tubes' : canEdit ? 'Prepare sequencing tubes' : 'View libraries'}</DialogTitle><DialogDescription>{batchName}. {canEdit ? 'Match one library tube with its separate sequencing tube at a time. Scan both tubes and record the volume physically transferred.' : 'Review library identities, source and sequencing tubes, transferred volumes and saved evidence.'}</DialogDescription>{error ? <p role="alert" className="text-sm text-destructive">{error}{!uncertain ? ' Your entries are retained; review the latest tube details before saving again.' : ''}</p> : null}{uncertain ? <p role="alert" className="text-sm">The response was interrupted and the action may have saved. Retry the same command to confirm its outcome; the exact command is retained in this browser after reload or restart.</p> : null}</DialogHeader>
    {query.isPending ? <p role="status">Loading sequencing tubes…</p> : query.isError ? <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Sequencing tubes could not be loaded.')}</p><Button type="button" variant="outline" onClick={() => void query.refetch()}>Reload</Button></div> : <div className="space-y-4">
      <p role="status" className="text-sm font-medium">{query.data.members.filter(item => item.transfer).length} of {query.data.members.length} library/sequencing tube pairs recorded</p>
      {notice ? <p role="status" className="text-sm">{notice}</p> : null}
      {target && member ? <fieldset disabled={locked || !canEdit} className="min-w-0 space-y-4">
      <div><h3 className="font-semibold">Next library and sequencing tube</h3><p className="mt-1 text-xs text-muted-foreground">{target.action === 'allocate' ? 'Scan the source library and prepare an empty destination tube. Then verify its label before transferring material.' : 'Scan both physical tubes, transfer material, and save the actual amount.'}</p></div>
      <PairField id="sequencing-library" label="Library to prepare"><NativeSelect id="sequencing-library" value={member.id} onChange={event => { const selected = query.data?.members.find(item => item.id === event.target.value); if (selected) open(selected) }}>{query.data.members.filter(item => !item.transfer).map(item => <option key={item.id} value={item.id}>{item.source.location ? `${item.source.location} · ` : ''}{item.source.barcode}</option>)}</NativeSelect></PairField>
      <dl className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Source library tube</dt><dd className="break-all font-medium">{member.source.barcode}</dd><dd>{amount(member.source)}</dd><dd>{member.source.location}</dd></div><div><dt className="text-muted-foreground">Sequencing tube</dt><dd className="break-all font-medium">{member.sequencingTube?.barcode ?? 'Not assigned'}</dd><dt className="mt-2 text-muted-foreground">Catalog minimum</dt><dd className="font-semibold">{minimum ? `${labAmount(minimum)} µL per tube` : 'Not configured'}</dd><dd className="text-xs text-muted-foreground">{member.catalogServiceName ?? 'Catalog service unavailable'}{member.catalogVersion ? ` · version ${member.catalogVersion}` : ''}{member.requirementCaptured ? ' · fixed for this pair' : ''}</dd></div></dl>
      {!minimum ? <p role="alert" className="text-sm text-destructive">A Catalog administrator must configure this service’s minimum sequencing volume before you can prepare this pair.</p> : null}
      <PairField id="sequencing-source-scan" label="Scan source library barcode" required error={form.formState.errors.sourceScan?.message}><Input {...operationalInputProps} id="sequencing-source-scan" autoComplete="off" spellCheck={false} maxLength={102} onKeyDown={scanSource} {...sourceScanRegistration} ref={node => { sourceScanRegistration.ref(node); sourceScanInput.current = node }} /></PairField>
      {target.action === 'allocate' ? <>
        <PairField id="sequencing-barcode-source" label="Sequencing tube barcode" required error={form.formState.errors.barcodeSource?.message}><NativeSelect id="sequencing-barcode-source" {...form.register('barcodeSource')}><option value="PhaenoGenerated">Generate POMS label</option><option value="Manufacturer">Use manufacturer barcode</option></NativeSelect></PairField>
        {form.watch('barcodeSource') === 'Manufacturer' ? <><PairField id="sequencing-manufacturer" label="Tube manufacturer" required error={form.formState.errors.manufacturerSupplierId?.message}><NativeSelect id="sequencing-manufacturer" {...form.register('manufacturerSupplierId')}><option value="">Select manufacturer</option>{suppliers.filter(supplier => supplier.isActive).map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</NativeSelect></PairField>{suppliers.length === 0 ? <p role="alert" className="text-sm text-destructive">No active manufacturer is available. Refresh the laboratory workspace or ask an administrator to add the supplier.</p> : null}<PairField id="sequencing-manufacturer-barcode" label="Scan manufacturer barcode" required error={form.formState.errors.barcode?.message}><Input {...operationalInputProps} id="sequencing-manufacturer-barcode" autoComplete="off" spellCheck={false} maxLength={100} {...form.register('barcode')} /></PairField></> : <p className="text-sm text-muted-foreground">Print the assigned POMS label before recording the physical transfer.</p>}
        <PairField id="sequencing-location" label="Sequencing tube storage location" required error={form.formState.errors.location?.message}><Input {...operationalInputProps} id="sequencing-location" maxLength={255} {...form.register('location')} /></PairField>
        <p className="text-sm text-muted-foreground">Next, verify the physical sequencing tube and enter the volume transferred. Preparing an empty tube retains the full library balance.</p>
      </> : <>
        {member.sequencingTube?.status === 'LabelPending' ? <div className="space-y-2"><p role="status" className="text-sm">Print and verify the sequencing tube label before transferring material.</p><Button type="button" variant="outline" onClick={() => setPrinting(member.sequencingTube)}>Print and verify label</Button></div> : null}
        <PairField id="sequencing-destination-scan" label="Scan sequencing tube barcode" required error={form.formState.errors.destinationScan?.message}><Input {...operationalInputProps} id="sequencing-destination-scan" autoComplete="off" spellCheck={false} maxLength={102} {...form.register('destinationScan')} /></PairField>
        <div className="grid gap-3 sm:grid-cols-2"><PairField id="sequencing-quantity" label="Actual amount transferred" required error={form.formState.errors.quantity?.message}><Input {...operationalInputProps} id="sequencing-quantity" type="text" inputMode="decimal" maxLength={40} {...form.register('quantity')} /></PairField><PairField id="sequencing-unit" label="Quantity unit" required error={form.formState.errors.unit?.message}><Input {...operationalInputProps} id="sequencing-unit" readOnly={Boolean(member.source.quantityUnit)} maxLength={50} {...form.register('unit')} /></PairField></div>
        {isPositiveDecimalQuantity(form.watch('quantity')) ? <dl aria-label="Transfer balance preview" className="grid gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Sequencing tube after transfer</dt><dd className="font-medium">{form.watch('quantity')} {form.watch('unit')}</dd><dd>{minimum && meetsMinimumSequencingVolume(form.watch('quantity'), form.watch('unit'), minimum) ? 'Meets minimum volume' : 'Below minimum or unsupported volume unit'}</dd></div><div><dt className="text-muted-foreground">Library tube after transfer</dt><dd className="font-medium">{form.watch('exhausted') ? 'Exhausted by operator override' : member.source.quantityText ? `${labAmount(remainingDecimalQuantity(member.source.quantityText, form.watch('quantity')) ?? 'Cannot subtract this amount')} ${form.watch('unit')}` : 'Unknown amount remaining'}</dd></div></dl> : null}
        <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" aria-describedby="sequencing-exhausted-help" {...form.register('exhausted')} />Material exhausted (optional override)</label><p id="sequencing-exhausted-help" className="text-xs text-muted-foreground">Mark this when no usable material remains in the source library, even if its recorded balance would be positive. The actual amount transferred is retained.</p>
        {member.source.quantity === null ? <p className="text-sm text-muted-foreground">The source amount is unknown. Its numeric remainder will stay unknown.</p> : null}
        <Controller name="timing" control={form.control} render={({ field }) => <StepTimingFields value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} errors={form.formState.errors.timing} allowOnBehalf={false} />} />
        <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" aria-required aria-invalid={Boolean(form.formState.errors.confirmed)} aria-describedby={form.formState.errors.confirmed ? 'sequencing-confirmed-error' : undefined} {...form.register('confirmed')} /><RequiredFieldName>I personally performed this transfer.</RequiredFieldName></label>{form.formState.errors.confirmed ? <p id="sequencing-confirmed-error" role="alert" className="text-sm text-destructive">{form.formState.errors.confirmed.message}</p> : null}
      </>}
    </fieldset> : <p className="text-sm text-muted-foreground">{query.data.members.length ? canEdit ? !recovery.isFetched ? 'Loading the next library pair…' : query.data.members.every(item => item.transfer) ? 'All library pairs are recorded. Review their transfer evidence below.' : 'No untransferred library has available material. Review its source tube status before continuing.' : 'Review the saved tube pairs. This batch is read-only.' : 'No libraries are assigned to this batch.'}</p>}
      <SequencingTubePairs members={query.data.members} canPrint={canEdit && !locked} onPrint={setPrinting} />
    </div>}
    <RequiredDialogFooter showLegend={Boolean(target && member)}>{target ? <><Button type="button" variant="outline" disabled={locked} onClick={leaveForm}>Close workspace</Button>{uncertain ? <Button type="button" disabled={save.isPending} onClick={() => execute(uncertain)}>{save.isPending ? 'Confirming…' : 'Retry same command'}</Button> : <Button type="submit" disabled={save.isPending || !member || !canEdit || !minimum || target.action === 'transfer' && member.sequencingTube?.status !== 'Available'}>{save.isPending ? 'Saving…' : target.action === 'allocate' ? 'Prepare sequencing tube' : 'Save pair and transfer'}</Button>}</> : <Button type="button" variant="outline" onClick={close}>Close</Button>}</RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
