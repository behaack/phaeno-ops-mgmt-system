import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { acceptRemainingLabTubes, getLabOperationsError, type AcceptRemainingTubesInput, type LabWorkOrderDetail } from '#/api/lab-operations'
import { scanRegisteredSampleTube, type SampleShippingCrosswalkItem, type SampleShippingPacketScan } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldDescription } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { useOrderDecisionDismissal } from '#/features/orders/use-order-decision-dismissal'
import { TubeIntakeExceptionDialog } from './TubeAccessionActions'

const boxSchema = z.object({ barcode: z.string().trim().min(1, 'Scan the freezer box barcode.').max(255, 'Use up to 255 characters.').refine(value => !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127), 'Use a barcode without control characters.') })
const tubeSchema = z.object({ barcode: z.string().trim().min(1, 'Scan the tube as you place it into this box.') })
const reviewSchema = z.object({ confirmed: z.boolean().refine(Boolean, 'Confirm inspection and physical placement before saving.') })

type PlacementScan = { barcode: string; box: string; epoch: number }
const tubeCount = (count: number) => `${count} ${count === 1 ? 'tube' : 'tubes'}`

export function StoreAcceptedTubesDialog({ rows, packet, work, available = true, refreshFailed = false, onRefresh, onClose, onSaved }: {
  rows: SampleShippingCrosswalkItem[]
  packet: SampleShippingPacketScan
  work: LabWorkOrderDetail
  available?: boolean
  refreshFailed?: boolean
  onRefresh?: () => void
  onClose: () => void
  onSaved: (work: LabWorkOrderDetail, barcodes: string[], complete: boolean) => Promise<void>
}) {
  const [selection] = useState(() => rows.filter(row => row.supplierTubeBarcode && !work.containers.some(tube => tube.barcode === row.supplierTubeBarcode && (tube.intakeDisposition || tube.status !== 'Available'))))
  const [originalPacket] = useState(packet)
  const [version, setVersion] = useState(work.workOrder.version)
  const [stored, setStored] = useState<string[]>([])
  const [exceptionsSaved, setExceptionsSaved] = useState<string[]>([])
  const [exception, setException] = useState<SampleShippingCrosswalkItem | null>(null)
  const [group, setGroup] = useState<string[]>([])
  const [groupBox, setGroupBox] = useState<string | null>(null)
  const [activeBox, setActiveBox] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [notice, setNotice] = useState('')
  const [online, setOnline] = useState(() => navigator.onLine)
  const [submitted, setSubmitted] = useState(false)
  const attempt = useRef<AcceptRemainingTubesInput | null>(null)
  const context = useRef<{ box: string | null; epoch: number }>({ box: null, epoch: 0 })
  const groupRef = useRef<string[]>([])
  const boxInput = useRef<HTMLInputElement>(null)
  const tubeInput = useRef<HTMLInputElement>(null)
  const reviewCancel = useRef<HTMLButtonElement>(null)
  const doneButton = useRef<HTMLButtonElement>(null)
  const exceptionFocusPending = useRef(false)
  const boxForm = useForm<z.infer<typeof boxSchema>>({ resolver: zodResolver(boxSchema), defaultValues: { barcode: '' } })
  const tubeForm = useForm<z.infer<typeof tubeSchema>>({ resolver: zodResolver(tubeSchema), defaultValues: { barcode: '' } })
  const reviewForm = useForm<z.infer<typeof reviewSchema>>({ resolver: zodResolver(reviewSchema), defaultValues: { confirmed: false } })
  const remaining = selection.filter(row => !stored.includes(row.supplierTubeBarcode!) && !exceptionsSaved.includes(row.supplierTubeBarcode!))
  const tubesByBarcode = new Map(work.containers.map(tube => [tube.barcode, tube]))
  const undecidedRows = packet.crosswalk.filter(row => !tubesByBarcode.get(row.supplierTubeBarcode!)?.intakeDisposition)
  const accessionedRows = packet.crosswalk.filter(row => tubesByBarcode.get(row.supplierTubeBarcode!)?.intakeDisposition === 'Accepted')
  const exceptionRows = packet.crosswalk.filter(row => {
    const disposition = tubesByBarcode.get(row.supplierTubeBarcode!)?.intakeDisposition
    return disposition === 'OnHold' || disposition === 'Rejected'
  })
  const recorded = packet.crosswalk.filter(row => work.containers.some(tube => tube.barcode === row.supplierTubeBarcode && tube.intakeDisposition)).length
  const exceptionCount = packet.crosswalk.filter(row => work.containers.some(tube => tube.barcode === row.supplierTubeBarcode && (tube.intakeDisposition === 'OnHold' || tube.intakeDisposition === 'Rejected'))).length
  const allDone = packet.crosswalk.length > 0 && recorded === packet.crosswalk.length && !group.length && !submitted
  const changed = work.workOrder.version !== version || packet.barcode !== originalPacket.barcode || packet.isVoided !== originalPacket.isVoided || packet.containerReceivedAt !== originalPacket.containerReceivedAt
  const canPlace = available && online && !changed && !submitted && !packet.isVoided && Boolean(packet.containerReceivedAt) && !exception
  const focusBox = () => window.requestAnimationFrame(() => (boxInput.current ?? doneButton.current)?.focus())
  const focusTube = () => window.requestAnimationFrame(() => tubeInput.current?.focus())

  const pause = useCallback((message = 'Box paused. Scan it again before placing more tubes.') => {
    if (!context.current.box) return
    context.current = { box: null, epoch: context.current.epoch + 1 }
    setActiveBox(null)
    setReviewing(false)
    boxForm.reset({ barcode: '' })
    tubeForm.reset({ barcode: '' })
    reviewForm.reset({ confirmed: false })
    setNotice(message)
  }, [boxForm, tubeForm, reviewForm])

  useEffect(() => {
    const onBlur = () => pause('Placement paused after leaving this window. Rescan the box to continue.')
    const onVisibility = () => { if (document.hidden) onBlur() }
    const onOffline = () => { setOnline(false); pause('Connection lost. Reconnect and rescan the box before continuing.') }
    const onOnline = () => setOnline(true)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [pause])

  const scan = useMutation({
    mutationFn: ({ barcode }: PlacementScan) => scanRegisteredSampleTube(originalPacket.barcode, barcode), retry: false,
    onSuccess: (result, input) => {
      if (context.current.epoch !== input.epoch || context.current.box !== input.box) {
        setNotice('The box context changed during the scan. Rescan the box, then scan this tube again.')
        return
      }
      const row = remaining.find(item => item.supplierTubeBarcode === result.supplierTubeBarcode)
      const existing = work.containers.find(item => item.barcode === result.supplierTubeBarcode)
      if (!canPlace || !result.isExpected || !row || existing?.intakeDisposition || existing && existing.status !== 'Available' || result.isAccessioned && !existing) {
        tubeForm.setError('barcode', { message: 'This tube is not an expected, undecided tube in this shipment. Review its intake record.' })
      } else if (existing?.location && existing.location !== input.box) {
        tubeForm.setError('barcode', { message: 'This tube already has a different storage location. Accession cannot move it.' })
      } else if (groupRef.current.includes(result.supplierTubeBarcode)) {
        tubeForm.setError('barcode', { message: 'This tube is already in the box group. It was not added twice.' })
      } else {
        const next = [...groupRef.current, result.supplierTubeBarcode]
        groupRef.current = next
        setGroup(next)
        tubeForm.reset({ barcode: '' })
        setNotice(`${row.customerSampleId} · ${result.supplierTubeBarcode} checked. Place this tube in ${input.box}, then scan the next tube. ${tubeCount(next.length)} ${next.length === 1 ? 'awaits' : 'await'} confirmation.`)
      }
      focusTube()
    }, onError: focusTube,
  })
  const save = useMutation({
    mutationFn: (input: AcceptRemainingTubesInput) => acceptRemainingLabTubes(originalPacket.labWorkOrderId, originalPacket.shipmentId, input), retry: false,
    onSuccess: async (detail, input) => {
      const barcodes = input.tubes.map(tube => tube.supplierTubeBarcode)
      const nextStored = [...stored, ...barcodes]
      const complete = nextStored.length + exceptionsSaved.length === selection.length
      context.current = { box: null, epoch: context.current.epoch + 1 }
      groupRef.current = []
      attempt.current = null
      setSubmitted(false)
      setStored(nextStored)
      setVersion(detail.workOrder.version)
      setGroup([]); setGroupBox(null); setActiveBox(null); setReviewing(false)
      boxForm.reset({ barcode: '' }); tubeForm.reset({ barcode: '' }); reviewForm.reset({ confirmed: false })
      setNotice(`${tubeCount(barcodes.length)} accepted and stored in ${input.tubes[0].freezerBoxBarcode}.${complete ? '' : ' Scan the next box for the remaining tubes.'}`)
      await onSaved(detail, barcodes, complete)
      focusBox()
    },
  })
  const busy = scan.isPending || save.isPending
  useEffect(() => {
    if ((!available || changed) && !save.isPending && !exception) pause('Placement paused because shipment access or decisions changed. Review the current records before continuing.')
  }, [available, changed, save.isPending, exception, pause])
  useEffect(() => {
    if (allDone && !busy) doneButton.current?.focus()
  }, [allDone, busy])
  useEffect(() => {
    if (!exceptionFocusPending.current || exception || busy || (!canPlace && !allDone)) return
    const frame = window.requestAnimationFrame(() => {
      const target = boxInput.current ?? doneButton.current
      if (target && !target.disabled) { target.focus(); exceptionFocusPending.current = false }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [exception, busy, canPlace, allDone])
  const dirty = Boolean(activeBox || group.length || boxForm.formState.isDirty || tubeForm.formState.isDirty || submitted)
  const dismissal = useOrderDecisionDismissal(!exception && dirty, busy, onClose, {
    scope: 'box placement',
    description: submitted ? 'A save was attempted and its outcome may be unknown. Saved decisions will remain. Check the recorded tube locations before handling or assigning these tubes again.' : `Unsaved box assignments will be discarded. Saved groups will remain. Any tubes physically placed${groupBox ? ` in ${groupBox}` : ''} must be reconciled before continuing; closing does not record their storage.`,
  })
  const close = () => { if (!exception) { pause(); dismissal.close() } }
  const expectedBox = group.length ? groupBox : null

  async function saveException(detail: LabWorkOrderDetail) {
    if (!exception) return
    const barcode = exception.supplierTubeBarcode!
    const nextGroup = groupRef.current.filter(value => value !== barcode)
    const nextExceptions = [...exceptionsSaved, barcode]
    await onSaved(detail, [barcode], stored.length + nextExceptions.length === selection.length)
    groupRef.current = nextGroup
    setGroup(nextGroup)
    if (!nextGroup.length) setGroupBox(null)
    setExceptionsSaved(nextExceptions)
    setVersion(detail.workOrder.version)
    exceptionFocusPending.current = true
    setException(null)
    scan.reset()
    setNotice(`Exception saved for ${barcode}. ${nextGroup.length ? 'Reconcile the remaining box contents and rescan its barcode before continuing.' : 'Scan the box before continuing with acceptable tubes.'}`)
  }

  function openBox(barcode: string) {
    if (!canPlace || busy) return
    if (expectedBox && barcode !== expectedBox) {
      boxForm.setError('barcode', { message: `This group belongs to ${expectedBox}. Rescan that box; finish it before opening another.` })
      return
    }
    context.current = { box: barcode, epoch: context.current.epoch + 1 }
    setActiveBox(barcode); setGroupBox(barcode); setReviewing(false)
    boxForm.reset({ barcode: '' }); reviewForm.reset({ confirmed: false }); scan.reset()
    setNotice('')
    focusTube()
  }

  function finishBox() {
    if (!canPlace || busy || !activeBox || !group.length) return
    setReviewing(true)
    reviewForm.reset({ confirmed: false })
    window.requestAnimationFrame(() => reviewCancel.current?.focus())
  }

  function submitGroup() {
    if (save.isPending) return
    if (attempt.current) { save.mutate(attempt.current); return }
    if (!canPlace || !activeBox || !group.length || !reviewing) return
    const input: AcceptRemainingTubesInput = { requestId: crypto.randomUUID(), packetBarcode: originalPacket.barcode, workOrderVersion: version, inspectionConfirmed: true, tubes: group.map(barcode => ({ supplierTubeBarcode: barcode, freezerBoxBarcode: activeBox })) }
    attempt.current = input
    setSubmitted(true)
    save.mutate(input)
  }

  return <>
    <Dialog open onOpenChange={open => { if (!open) close() }}>
      <DialogContent className="sm:max-w-4xl" onOpenAutoFocus={event => { event.preventDefault(); focusBox() }}>
        <DialogHeader><DialogTitle>{reviewing || submitted ? 'Review and finish box' : `Accession tubes in ${packet.shipmentNumber}`}</DialogTitle><DialogDescription>{reviewing || submitted ? `Check ${tubeCount(group.length)} against the contents of ${groupBox} before confirming.` : `${packet.organizationName} · ${packet.authorizationReference} · ${packet.packetNumber}. Inspect each tube, scan it once, then place it in the open box after its identity check succeeds. Record exceptions separately.`}</DialogDescription></DialogHeader>
        <div className="min-w-0 space-y-4">
          <p role="status" className="font-medium">{recorded} of {packet.crosswalk.length} expected tubes have an intake decision{allDone ? ' — intake complete' : ''}</p>
          {packet.isVoided ? <Alert variant="destructive"><AlertTitle>Shipping insert is voided</AlertTitle><AlertDescription>{packet.voidReason ?? 'Scan the current shipping insert.'}</AlertDescription></Alert> : !packet.containerReceivedAt ? <Alert><AlertTitle>Receive this shipment first</AlertTitle><AlertDescription>Record its arrival in Receive shipments before accessioning tubes.</AlertDescription></Alert> : null}
          {notice ? <p role="status" className="text-sm">{notice}</p> : null}
          {!available || !online ? <Alert><AlertTitle>Placement is paused</AlertTitle><AlertDescription>Continue in a connected, authorized laboratory session that allows intake, then rescan the box.</AlertDescription></Alert> : null}
          {refreshFailed ? <Alert variant="destructive"><AlertTitle>Could not refresh shipment details</AlertTitle><AlertDescription><Button variant="outline" onClick={onRefresh}>Try again</Button></AlertDescription></Alert> : null}
          {changed && !submitted && !save.isPending && !exception ? <Alert variant="destructive"><AlertTitle>Shipment decisions changed</AlertTitle><AlertDescription>Close this dialog and review the current intake records before placing or accepting more tubes. Your pending group has not been saved.</AlertDescription></Alert> : null}
          {activeBox || expectedBox || submitted ? <section className="space-y-2 rounded-lg border bg-muted/30 p-4" aria-label="Box destination">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{submitted ? 'Submitted box' : activeBox ? 'Open freezer box' : 'Paused freezer box'}</p><p className="font-mono text-lg font-semibold wrap-anywhere">{groupBox}</p></div>{activeBox && !reviewing && !submitted ? <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => { pause(); focusBox() }}>Pause box</Button> : null}</div>
            <p className="text-sm">{tubeCount(group.length)} in this group · {stored.length} saved in this session</p>
          </section> : null}
          {!allDone && remaining.length > 0 && !activeBox && !submitted ? <form id="open-accession-box" onSubmit={boxForm.handleSubmit(values => openBox(values.barcode))}>
            <Field>
              <Label htmlFor="placement-box"><RequiredFieldName>{expectedBox ? 'Rescan freezer box barcode' : 'Freezer box barcode'}</RequiredFieldName></Label>
              <FieldDescription id="placement-box-help">{expectedBox ? `Rescan ${expectedBox}. The pending tubes keep their original box assignment.` : 'Keep only this box open while placing tubes. A new box requires a new scan.'}</FieldDescription>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input id="placement-box" {...boxForm.register('barcode')} ref={node => { boxForm.register('barcode').ref(node); boxInput.current = node }} autoComplete="off" spellCheck={false} className="min-w-0 font-mono sm:flex-1" disabled={!canPlace || busy} aria-invalid={Boolean(boxForm.formState.errors.barcode)} aria-describedby={boxForm.formState.errors.barcode ? 'placement-box-help placement-box-error' : 'placement-box-help'} />
                <Button type="submit" className="shrink-0" disabled={!canPlace || busy}>{expectedBox ? 'Resume box' : 'Open box'}</Button>
              </div>
              {boxForm.formState.errors.barcode ? <p id="placement-box-error" role="alert" className="text-sm text-destructive">{boxForm.formState.errors.barcode.message}</p> : null}
            </Field>
          </form> : null}
          {activeBox && !reviewing && !submitted ? <form id="place-accession-tube" onSubmit={tubeForm.handleSubmit(values => { if (canPlace && !busy) scan.mutate({ barcode: values.barcode, box: activeBox, epoch: context.current.epoch }) })}>
            <Field>
              <Label htmlFor="placement-tube"><RequiredFieldName>Supplier tube barcode</RequiredFieldName></Label>
              <FieldDescription id="placement-tube-help">Inspect the tube first. After a successful scan, place it in {activeBox}, then scan the next tube.</FieldDescription>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input id="placement-tube" {...tubeForm.register('barcode')} ref={node => { tubeForm.register('barcode').ref(node); tubeInput.current = node }} className="min-w-0 font-mono sm:flex-1" autoComplete="off" spellCheck={false} disabled={!canPlace || busy} aria-invalid={Boolean(tubeForm.formState.errors.barcode)} aria-describedby={tubeForm.formState.errors.barcode ? 'placement-tube-help placement-tube-error' : 'placement-tube-help'} />
                <Button type="submit" className="shrink-0" disabled={!canPlace || busy}>{scan.isPending ? 'Checking tube…' : 'Scan and place tube'}</Button>
              </div>
              {tubeForm.formState.errors.barcode ? <p id="placement-tube-error" role="alert" className="text-sm text-destructive">{tubeForm.formState.errors.barcode.message}</p> : null}
            </Field>
          </form> : null}
          {scan.error && !submitted ? <Alert variant="destructive"><AlertTitle>Tube could not be checked</AlertTitle><AlertDescription>{getLabOperationsError(scan.error, 'Check the tube and scan again. It has not been added to this box.')}</AlertDescription></Alert> : null}
          {reviewing || submitted ? <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><caption className="sr-only">Tubes placed in {groupBox}</caption><thead className="border-b bg-muted/50"><tr><th scope="col" className="p-3 font-medium">Customer sample</th><th scope="col" className="p-3 font-medium">Tube barcode</th></tr></thead><tbody>{group.map(barcode => <tr key={barcode} className="border-b last:border-0"><td className="p-3 wrap-anywhere">{selection.find(row => row.supplierTubeBarcode === barcode)?.customerSampleId}</td><td className="p-3 font-mono wrap-anywhere">{barcode}</td></tr>)}</tbody></table></div> : <>
            {undecidedRows.length ? <>
              <p className="text-sm text-muted-foreground">For a broken tube that cannot be scanned, record the rejection from its expected row. Do not record missing tubes as received.</p>
              <AccessionTubeTable rows={undecidedRows} tubes={tubesByBarcode} caption="Tubes awaiting an intake decision" pending={group} pendingBox={groupBox} disabled={!canPlace || busy} onException={row => { pause('Placement paused to record an exception. Rescan the box before continuing.'); setException(row) }} />
            </> : null}
            {accessionedRows.length ? <details className="min-w-0 rounded-lg border">
              <summary className="min-h-9 cursor-pointer rounded-lg p-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Accessioned tubes ({accessionedRows.length})</summary>
              <div className="min-w-0 border-t"><AccessionTubeTable rows={accessionedRows} tubes={tubesByBarcode} caption="Accessioned tubes and saved storage locations" /></div>
            </details> : null}
            {exceptionRows.length ? <details className="min-w-0 rounded-lg border">
              <summary className="min-h-9 cursor-pointer rounded-lg p-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Recorded exceptions ({exceptionRows.length})</summary>
              <div className="min-w-0 border-t"><AccessionTubeTable rows={exceptionRows} tubes={tubesByBarcode} caption="Recorded tube exceptions and storage locations" /></div>
            </details> : null}
          </>}
          {reviewing || submitted ? <form id="confirm-accession-box" onSubmit={reviewForm.handleSubmit(submitGroup)}><Label className="flex cursor-pointer items-start gap-2 leading-snug"><input type="checkbox" className="mt-0.5 size-4 shrink-0 cursor-pointer" disabled={submitted || save.isPending} aria-invalid={Boolean(reviewForm.formState.errors.confirmed)} aria-describedby={reviewForm.formState.errors.confirmed ? 'placement-review-error' : undefined} {...reviewForm.register('confirmed')} /><RequiredFieldName>I inspected all {tubeCount(group.length)}, recorded all exceptions separately, and placed every listed tube into {groupBox}.</RequiredFieldName></Label>{reviewForm.formState.errors.confirmed ? <p id="placement-review-error" role="alert" className="text-sm text-destructive">{reviewForm.formState.errors.confirmed.message}</p> : null}</form> : null}
          {save.error ? <Alert variant="destructive"><AlertTitle>Box acceptance could not be confirmed</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'The outcome may be unknown. Retry this unchanged group; if a record changed, close and review the recorded decisions.')} The box and tube list are locked until this request is resolved.</AlertDescription></Alert> : null}
          {!allDone ? <p className="text-xs text-muted-foreground">Confirm the box has space and meets the required storage conditions. Opening a box does not assign any tubes.</p> : null}
        </div>
        {allDone ? <DialogFooter><Button ref={doneButton} onClick={close}>Done</Button></DialogFooter> : <RequiredDialogFooter>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p role="status" className="text-sm text-muted-foreground">{exceptionCount} with exceptions | {group.length} to be accepted</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {reviewing && !submitted ? <Button ref={reviewCancel} variant="outline" disabled={busy} onClick={() => { setReviewing(false); reviewForm.reset({ confirmed: false }); focusTube() }}>Back to placement</Button> : <Button variant="outline" disabled={busy} onClick={close}>Close — continue later</Button>}
              {submitted ? <Button key="retry" disabled={save.isPending || !online || !available} onClick={submitGroup}>{save.isPending ? 'Saving…' : 'Retry same group'}</Button> : reviewing ? <Button key="save" type="submit" form="confirm-accession-box" disabled={!canPlace || busy}>Accept and store {tubeCount(group.length)}</Button> : <Button key="review" type="button" disabled={!canPlace || busy || !activeBox || !group.length} onClick={finishBox}>Review and finish box</Button>}
            </div>
          </div>
        </RequiredDialogFooter>}
      </DialogContent>
    </Dialog>
    {exception ? <TubeIntakeExceptionDialog row={exception} packet={packet} existing={work.containers.find(tube => tube.barcode === exception.supplierTubeBarcode)} pendingBox={group.includes(exception.supplierTubeBarcode!) ? groupBox : null} available={available && online && !changed && !submitted && !packet.isVoided && Boolean(packet.containerReceivedAt)} onClose={() => { exceptionFocusPending.current = true; setException(null) }} onSaved={saveException} /> : null}
    {dismissal.confirmation}
  </>
}

function AccessionTubeTable({ rows, tubes, caption, pending = [], pendingBox = null, disabled = false, onException }: {
  rows: SampleShippingCrosswalkItem[]
  tubes: Map<string, LabWorkOrderDetail['containers'][number]>
  caption: string
  pending?: string[]
  pendingBox?: string | null
  disabled?: boolean
  onException?: (row: SampleShippingCrosswalkItem) => void
}) {
  return <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm">
    <caption className="sr-only">{caption}</caption>
    <thead className="border-b bg-muted/50"><tr>{['Customer sample', 'Tube barcode', 'Intake', 'Storage'].map(label => <th key={label} scope="col" className="p-3 font-medium">{label}</th>)}{onException ? <th scope="col" className="p-3"><span className="sr-only">Action</span></th> : null}</tr></thead>
    <tbody>{rows.map(row => {
      const tube = tubes.get(row.supplierTubeBarcode!)
      const placementPending = pending.includes(row.supplierTubeBarcode!)
      return <tr key={row.tubeSlotId ?? row.shipmentItemId} className="border-b last:border-0">
        <td className="p-3">{row.customerSampleId}<span className="block text-xs text-muted-foreground">{row.sampleName} · Tube {row.tubeOrdinal ?? 1} of {row.tubeCount ?? 1}</span></td>
        <td className="p-3 font-mono wrap-anywhere">{row.supplierTubeBarcode ?? 'Missing assignment'}</td>
        <td className="p-3">{tube?.intakeDisposition === 'OnHold' ? 'On hold' : tube?.intakeDisposition ?? (placementPending ? 'Placement pending confirmation' : 'Not recorded')}</td>
        <td className="p-3 wrap-anywhere">{tube?.location ?? (placementPending ? `${pendingBox} (pending)` : tube?.intakeDisposition === 'Rejected' ? 'Not stored' : '—')}</td>
        {onException ? <td className="p-3 text-right">{!tube?.intakeDisposition && (!tube || tube.status === 'Available') && row.supplierTubeBarcode ? <Button size="sm" variant="outline" disabled={disabled} aria-label={`Record exception for ${row.supplierTubeBarcode}`} onClick={() => onException(row)}>Record exception</Button> : null}</td> : null}
      </tr>
    })}</tbody>
  </table></div>
}
