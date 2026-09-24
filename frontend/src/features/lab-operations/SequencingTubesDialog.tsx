import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker } from '@tanstack/react-router'
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
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { LabLabelDialog } from './LabLabelDialog'
import { normalizeMaterialTubeScan } from './material-transfer-barcode'
import { usePhaenoSession } from '#/features/auth/session-context'
import { LabCommandStorageError, useLabCommandRecovery } from './lab-command-recovery'
import { PreparationActions, PreparationField, prepSelectClass } from './preparation-ui'
import { StepTimingFields } from './StepTimingFields'
import { emptyStepTiming, performanceInput, stepTimingSchema, timingIssues } from './step-performance'
import { exceedsDecimalQuantity, isPositiveDecimalQuantity, remainingDecimalQuantity } from './decimal-quantity'

const baseSchema = z.object({ barcodeSource: z.enum(['PhaenoGenerated', 'Manufacturer']), barcode: z.string().trim().max(100, 'Use 100 characters or fewer.'), manufacturerSupplierId: z.string(), location: z.string().trim().max(255), sourceScan: z.string().trim().max(102), destinationScan: z.string().trim().max(102), quantity: z.string().trim(), unit: z.string().trim().max(50), exhausted: z.boolean(), confirmed: z.boolean(), timing: stepTimingSchema })
type Values = z.infer<typeof baseSchema>
type Target = { memberId: string; action: 'allocate' | 'transfer' }
type PendingCommand = { memberId: string; input: SequencingTubeCommand }
const emptyValues = (): Values => ({ barcodeSource: 'PhaenoGenerated', barcode: '', manufacturerSupplierId: '', location: '', sourceScan: '', destinationScan: '', quantity: '', unit: '', exhausted: false, confirmed: false, timing: { ...emptyStepTiming } })
const amount = (container: LabContainer) => container.status === 'Consumed' ? 'Exhausted' : container.quantity === null ? 'Unknown amount remaining' : `${container.quantityText ?? container.quantity} ${container.quantityUnit ?? ''} remaining`

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
  const inFlight = useRef(false)
  const member = query.data?.members.find(item => item.id === target?.memberId)
  const canEdit = canManage && Boolean(query.data && ['Draft', 'InProgress'].includes(query.data.batchStatus) && !query.data.hasSendout)
  const schema = baseSchema.superRefine((values, context) => {
    const issue = (key: keyof Values, message: string) => context.addIssue({ code: 'custom', path: [key], message })
    if (target?.action === 'allocate') {
      if (!values.location) issue('location', 'Enter the sequencing tube storage location.')
      if (values.barcodeSource === 'Manufacturer' && (!values.barcode || /\s/u.test(values.barcode) || [...values.barcode].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159))) issue('barcode', 'Scan the complete manufacturer barcode without whitespace or control characters.')
      if (values.barcodeSource === 'Manufacturer' && !values.manufacturerSupplierId) issue('manufacturerSupplierId', 'Select the manufacturer of this physical tube.')
      return
    }
    if (normalizeMaterialTubeScan(values.sourceScan) !== member?.source.barcode) issue('sourceScan', 'Scan the selected library tube barcode.')
    if (normalizeMaterialTubeScan(values.destinationScan) !== member?.sequencingTube?.barcode) issue('destinationScan', 'Scan the assigned sequencing tube barcode.')
    if (!isPositiveDecimalQuantity(values.quantity)) issue('quantity', 'Enter a positive decimal amount with at most 28 fractional places.')
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
      setTarget(null)
      form.reset(emptyValues())
      setNotice(command.input.action === 'allocate' ? 'Sequencing tube assigned. Print its POMS label when needed, then record the physical transfer.' : 'Physical transfer recorded. The remaining library stays in its original tube.')
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
  useBlocker({ shouldBlockFn: () => locked || dirty && !window.confirm('Discard the unsaved sequencing tube entry?'), enableBeforeUnload: () => locked || dirty })
  const leaveForm = () => {
    if (locked || dirty && !window.confirm('Discard the unsaved sequencing tube entry?')) return
    form.reset(emptyValues()); setTarget(null); save.reset()
  }
  const close = () => { if (!locked && (!dirty || window.confirm('Discard the unsaved sequencing tube entry?'))) onClose() }
  const open = (item: SequencingTubeMember, action: Target['action']) => {
    save.reset(); setNotice(''); form.reset({ ...emptyValues(), unit: item.source.quantityUnit ?? '', location: item.sequencingTube?.location ?? '' }); setTarget({ memberId: item.id, action })
  }
  const execute = (command: PendingCommand) => {
    if (inFlight.current) return
    inFlight.current = true
    save.mutate(command, { onSettled: () => { inFlight.current = false } })
  }
  const submit = (values: Values) => {
    if (locked || !canEdit || !member || !target || !query.data) return
    const input: SequencingTubeCommand = { requestId: crypto.randomUUID(), batchVersion: query.data.batchVersion, action: target.action, sourceVersion: member.source.version }
    if (target.action === 'allocate') Object.assign(input, { barcodeSource: values.barcodeSource, ...(values.barcodeSource === 'Manufacturer' ? { barcode: values.barcode, manufacturerSupplierId: values.manufacturerSupplierId } : {}), location: values.location })
    else Object.assign(input, { destinationVersion: member.sequencingTube?.version, confirmedSourceBarcode: values.sourceScan, confirmedDestinationBarcode: values.destinationScan, quantityText: values.quantity, quantityUnit: values.unit, materialExhausted: values.exhausted, performance: performanceInput(values.timing, values.confirmed) })
    execute({ memberId: member.id, input })
  }
  if (printing) return <LabLabelDialog container={printing} onClose={() => setPrinting(null)} onRecorded={async () => { await Promise.allSettled([client.invalidateQueries({ queryKey }), onChanged()]) }} />
  const error = save.error ? getLabOperationsError(save.error, 'The sequencing tube action could not be confirmed.') : undefined
  return <Dialog open onOpenChange={openState => { if (!openState) close() }}><DialogContent className="sm:max-w-3xl" showCloseButton={!locked}><form className="contents" noValidate onSubmit={form.handleSubmit(submit)}>
    <DialogHeader><DialogTitle>{target?.action === 'allocate' ? 'Assign sequencing tube' : target?.action === 'transfer' ? 'Record sequencing transfer' : 'Sequencing tubes'}</DialogTitle><DialogDescription>{batchName}. Transfer a portion of each prepared library into its separate barcoded sequencing tube.</DialogDescription>{error ? <p role="alert" className="text-sm text-destructive">{error}{!uncertain ? ' Your entries are retained; review the latest tube details before saving again.' : ''}</p> : null}{uncertain ? <p role="alert" className="text-sm">The response was interrupted and the action may have saved. Retry the same command to confirm its outcome; the exact command is retained in this browser after reload or restart.</p> : null}</DialogHeader>
    {query.isPending ? <p role="status">Loading sequencing tubes…</p> : query.isError ? <div className="space-y-3"><p role="alert">{getLabOperationsError(query.error, 'Sequencing tubes could not be loaded.')}</p><Button type="button" variant="outline" onClick={() => void query.refetch()}>Reload</Button></div> : target && member ? <fieldset disabled={locked || !canEdit} className="min-w-0 space-y-4">
      <dl className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Source library tube</dt><dd className="break-all">{member.source.barcode}</dd><dd>{amount(member.source)}</dd></div><div><dt className="text-muted-foreground">Sequencing tube</dt><dd className="break-all">{member.sequencingTube?.barcode ?? 'Not assigned'}</dd></div></dl>
      {!canEdit ? <p role="status">The batch is now locked. Review the saved sequencing tubes.</p> : null}
      {target.action === 'allocate' ? <>
        <PreparationField id="sequencing-barcode-source" label="Sequencing tube barcode" required error={form.formState.errors.barcodeSource?.message}><select id="sequencing-barcode-source" className={`${prepSelectClass} cursor-pointer`} {...form.register('barcodeSource')}><option value="PhaenoGenerated">Generate POMS label</option><option value="Manufacturer">Use manufacturer barcode</option></select></PreparationField>
        {form.watch('barcodeSource') === 'Manufacturer' ? <><PreparationField id="sequencing-manufacturer" label="Tube manufacturer" required error={form.formState.errors.manufacturerSupplierId?.message}><select id="sequencing-manufacturer" className={`${prepSelectClass} cursor-pointer`} {...form.register('manufacturerSupplierId')}><option value="">Select manufacturer</option>{suppliers.filter(supplier => supplier.isActive).map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></PreparationField>{suppliers.length === 0 ? <p role="alert" className="text-sm text-destructive">No active manufacturer is available. Refresh the laboratory workspace or ask an administrator to add the supplier.</p> : null}<PreparationField id="sequencing-manufacturer-barcode" label="Scan manufacturer barcode" required error={form.formState.errors.barcode?.message}><Input id="sequencing-manufacturer-barcode" autoComplete="off" spellCheck={false} maxLength={100} {...form.register('barcode')} /></PreparationField></> : <p className="text-sm text-muted-foreground">Print the assigned POMS label before recording the physical transfer.</p>}
        <PreparationField id="sequencing-location" label="Sequencing tube storage location" required error={form.formState.errors.location?.message}><Input id="sequencing-location" maxLength={255} {...form.register('location')} /></PreparationField>
        <p className="text-sm text-muted-foreground">Assigning the tube does not record a transfer or reduce the library material.</p>
      </> : <>
        <PreparationField id="sequencing-source-scan" label="Scan source library barcode" required error={form.formState.errors.sourceScan?.message}><Input id="sequencing-source-scan" autoComplete="off" spellCheck={false} maxLength={102} {...form.register('sourceScan')} /></PreparationField>
        <PreparationField id="sequencing-destination-scan" label="Scan sequencing tube barcode" required error={form.formState.errors.destinationScan?.message}><Input id="sequencing-destination-scan" autoComplete="off" spellCheck={false} maxLength={102} {...form.register('destinationScan')} /></PreparationField>
        <div className="grid gap-3 sm:grid-cols-2"><PreparationField id="sequencing-quantity" label="Actual amount transferred" required error={form.formState.errors.quantity?.message}><Input id="sequencing-quantity" type="text" inputMode="decimal" maxLength={40} {...form.register('quantity')} /></PreparationField><PreparationField id="sequencing-unit" label="Quantity unit" required error={form.formState.errors.unit?.message}><Input id="sequencing-unit" readOnly={Boolean(member.source.quantityUnit)} maxLength={50} {...form.register('unit')} /></PreparationField></div>
        <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" aria-describedby="sequencing-exhausted-help" {...form.register('exhausted')} />Material exhausted (optional override)</label><p id="sequencing-exhausted-help" className="text-xs text-muted-foreground">Mark this when no usable material remains in the source library, even if its recorded balance would be positive. The actual amount transferred is retained.</p>
        {member.source.quantity === null ? <p className="text-sm text-muted-foreground">The source amount is unknown. Its numeric remainder will stay unknown.</p> : null}
        <Controller name="timing" control={form.control} render={({ field }) => <StepTimingFields value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} errors={form.formState.errors.timing} allowOnBehalf={false} />} />
        <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" aria-required aria-invalid={Boolean(form.formState.errors.confirmed)} aria-describedby={form.formState.errors.confirmed ? 'sequencing-confirmed-error' : undefined} {...form.register('confirmed')} /><RequiredFieldName>I personally performed this transfer.</RequiredFieldName></label>{form.formState.errors.confirmed ? <p id="sequencing-confirmed-error" role="alert" className="text-sm text-destructive">{form.formState.errors.confirmed.message}</p> : null}
      </>}
    </fieldset> : <div className="space-y-3">
      {notice ? <p role="status" className="text-sm">{notice}</p> : null}{!canEdit ? <p className="text-sm text-muted-foreground">These saved identities and transfers are available for review. {query.data?.hasSendout ? 'The sendout manifest is frozen.' : query.data?.batchStatus === 'Complete' ? 'The batch is complete.' : ''}</p> : null}
      {!query.data?.members.length ? <p>No libraries are assigned to this batch.</p> : query.data.members.map(item => <section key={item.id} className="space-y-3 rounded-lg border p-4" aria-label={`Sequencing tube for ${item.libraryKey}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-all font-medium">{item.libraryKey}</h3><p className="break-all text-sm">Library source: <Link className="underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId: item.labWorkOrderId, containerId: item.source.id }} search={{ section: 'work' }}>{item.source.barcode}</Link></p><p className="text-sm text-muted-foreground">{amount(item.source)}{item.source.location ? ` · ${item.source.location}` : ''}</p></div><PreparationActions items={[
          ...(canEdit && !item.sequencingTube ? [{ label: 'Assign sequencing tube', disabled: save.isPending || item.source.status !== 'Available', onClick: () => open(item, 'allocate') }] : []),
          ...(canEdit && item.sequencingTube && !item.transfer ? [{ label: 'Record transfer', disabled: save.isPending || item.source.status !== 'Available' || item.sequencingTube.status !== 'Available', onClick: () => open(item, 'transfer') }] : []),
          ...(canEdit && item.sequencingTube?.barcodeSource === 'PhaenoGenerated' && item.sequencingTube.status !== 'Rejected' ? [{ label: item.sequencingTube.labelPrintCount ? 'Reprint label' : 'Print label', onClick: () => setPrinting(item.sequencingTube) }] : []),
        ]} /></div>
        <p className="break-all text-sm">Sequencing tube: {item.sequencingTube ? <Link className="underline" to="/lab-operations/$workOrderId/containers/$containerId" params={{ workOrderId: item.labWorkOrderId, containerId: item.sequencingTube.id }} search={{ section: 'work' }}>{item.sequencingTube.barcode}</Link> : 'Not assigned'}</p>
        {item.transfer ? <div className="space-y-1 text-sm"><p>Transferred {item.transfer.quantityText ?? item.transfer.quantity} {item.transfer.quantityUnit} · Performed {new Date(item.transfer.performedAtUtc).toLocaleString()}</p><p className="text-muted-foreground">Source after transfer: {item.transfer.exhaustedOverride ? 'Exhausted by operator override' : item.transfer.sourceQuantityAfter === null ? 'Unknown amount remaining' : `${item.transfer.sourceQuantityAfterText ?? item.transfer.sourceQuantityAfter} ${item.transfer.quantityUnit}`}. Recorded {new Date(item.transfer.recordedAtUtc).toLocaleString()}.</p></div> : <p className="text-sm text-muted-foreground">{item.sequencingTube?.status === 'LabelPending' ? 'Tube assigned. Print its POMS label and scan the physical label back before recording the transfer.' : item.sequencingTube ? 'Tube assigned. Physical transfer has not been recorded.' : query.data.hasSendout ? 'Historical sendout: no separate sequencing tube was recorded.' : 'Assign and scan the sequencing tube before recording the amount transferred.'}</p>}
      </section>)}
    </div>}
    <RequiredDialogFooter showLegend={Boolean(target && member)}>{target ? <><Button type="button" variant="outline" disabled={locked} onClick={leaveForm}>Back to tubes</Button>{uncertain ? <Button type="button" disabled={save.isPending} onClick={() => execute(uncertain)}>{save.isPending ? 'Confirming…' : 'Retry same command'}</Button> : <Button type="submit" disabled={save.isPending || !member || !canEdit}>{save.isPending ? 'Saving…' : target.action === 'allocate' ? 'Assign sequencing tube' : 'Record transfer'}</Button>}</> : <Button type="button" variant="outline" onClick={close}>Close</Button>}</RequiredDialogFooter>
  </form></DialogContent></Dialog>
}
