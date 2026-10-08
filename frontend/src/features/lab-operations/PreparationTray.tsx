import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CheckCircle2, ChevronRight, Printer } from 'lucide-react'
import { trayPositions, type PreparationDetail } from '#/api/lab-preparation'
import { getLabOperationsError } from '#/api/lab-operations'
import { IdentifierQrCode } from '#/components/identifier-qr-code'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'
import { PreparationActions } from './preparation-ui'
import './preparation-label-print.css'

const barcodeSchema = z.string().trim().min(1, 'Scan or enter the barcode.').max(255, 'The barcode is too long.')
type ScanValues = { batchBarcode: string; tubes: Record<string, string> }

export function PreparationTray({ batch, pending, onScan, onTrayScan, onConfirmTray, children, eligibleTubes }: {
  batch: PreparationDetail
  pending: boolean
  onScan: (position: string, barcode: string) => Promise<PreparationDetail>
  onTrayScan: (barcode: string) => Promise<PreparationDetail>
  onConfirmTray?: () => void
  children?: (memberId: string) => ReactNode
  eligibleTubes?: ReactNode
}) {
  const tracksBiologicalMaterial = batch.stages.some(stage => stage.definition.steps.some(step => step.captures.some(capture => capture.type === 'biologicalMaterial')))
  const editable = batch.status === 'Draft' && batch.canOperate && !batch.trayConfirmed
  const positions = trayPositions(batch.layout)
  const hasStarted = Boolean(batch.startedAtUtc) || batch.status === 'InProgress' || batch.status === 'Complete'
  const [expansion, setExpansion] = useState({ started: hasStarted, open: !hasStarted })
  const expanded = expansion.started === hasStarted ? expansion.open : !hasStarted
  const contentId = useId()
  const [changingTray, setChangingTray] = useState(false)
  const trayReady = Boolean(batch.trayBarcode) && !changingTray
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [scanning, setScanning] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [failure, setFailure] = useState<{ position: string; message: string } | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [focusTick, setFocusTick] = useState(0)
  const focusTarget = useRef<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const batchInput = useRef<HTMLInputElement | null>(null)
  const statusRef = useRef<HTMLParagraphElement | null>(null)
  const submitting = useRef(false)
  const form = useForm<ScanValues>({ defaultValues: { batchBarcode: '', tubes: {} } })
  const values = form.watch()
  const busy = pending || scanning !== null
  const dirty = editable && (Object.values(values.tubes).some(value => Boolean(value?.trim())) || !trayReady && Boolean(values.batchBarcode?.trim()))
  useBlocker({ shouldBlockFn: () => busy || dirty && !window.confirm('Leave the unsaved barcode entries? Saved tray and tube assignments remain.'), enableBeforeUnload: () => busy || dirty })
  useEffect(() => {
    if (busy || !focusTarget.current) return
    const target = focusTarget.current
    focusTarget.current = null
    if (target === 'batch') batchInput.current?.focus()
    else if (target === 'status') statusRef.current?.focus()
    else (inputs.current[target] ?? statusRef.current)?.focus()
  }, [focusTick, busy])
  const focus = (target: string) => { focusTarget.current = target; setFocusTick(value => value + 1) }
  const empty = (data: PreparationDetail) => trayPositions(data.layout).filter(position => !data.layout.unavailable.includes(position) && !data.members.some(member => member.position === position))
  const saveTray = async () => {
    if (busy || !editable || submitting.current) return
    const parsed = barcodeSchema.safeParse(form.getValues('batchBarcode'))
    if (!parsed.success) {
      form.setError('batchBarcode', { message: parsed.error.issues[0].message })
      focus('batch')
      return
    }
    if (batch.trayBarcode && batch.members.length && parsed.data !== batch.trayBarcode) {
      form.setError('batchBarcode', { message: `Scan the assigned physical tray (${batch.trayBarcode}).` })
      focus('batch')
      return
    }
    form.clearErrors('batchBarcode')
    submitting.current = true
    setScanning('tray')
    try {
      const saved = await onTrayScan(parsed.data)
      if (saved.trayBarcode !== parsed.data) throw new Error('Tray identity was not saved.')
      form.setValue('batchBarcode', parsed.data)
      setChangingTray(false)
      setFailure(null)
      const next = empty(saved)[0]
      setStatus(next ? `Tray saved. Scan a tube into ${next}, or confirm the assembled tray when ready.` : 'Tray saved. All available positions are filled. Review and confirm the tray.')
      focus(next ?? 'status')
    } catch (error) {
      form.setError('batchBarcode', { message: getLabOperationsError(error, 'The physical tray could not be saved. Review the barcode and retry.') })
      focus('batch')
    } finally {
      submitting.current = false
      setScanning(null)
    }
  }
  const scan = async (position: string) => {
    if (!editable || !trayReady || busy || submitting.current || !empty(batch).includes(position)) return
    const field = `tubes.${position}` as const
    const parsed = barcodeSchema.safeParse(form.getValues(field) ?? '')
    if (!parsed.success) { form.setError(field, { message: parsed.error.issues[0].message }); focus(position); return }
    if (batch.members.some(member => member.barcode === parsed.data)) {
      form.setError(field, { message: 'This tube is already in the tray.' }); focus(position); return
    }
    form.clearErrors(field)
    setFailure(null)
    submitting.current = true
    setScanning(position)
    focusTarget.current = null
    setStatus(`Saving tube in ${position}…`)
    try {
      const saved = await onScan(position, parsed.data)
      form.resetField(field, { defaultValue: '' })
      const available = empty(saved)
      const index = positions.indexOf(position)
      const next = [...positions.slice(index + 1), ...positions.slice(0, index)].find(cell => available.includes(cell))
      setStatus(next ? `${position} saved. Scan the next tube into ${next}.` : `${position} saved. All available positions are filled. Review the tray before starting preparation.`)
      focus(next ?? 'status')
    } catch (error) {
      const message = getLabOperationsError(error, 'The scan could not be confirmed. Review this position before retrying.')
      form.setError(field, { message })
      setFailure({ position, message })
      setStatus('')
      focus(position)
    } finally {
      submitting.current = false
      setScanning(null)
    }
  }
  const batchField = form.register('batchBarcode')
  return <Card className="gap-0 overflow-hidden py-0">
    <CardHeader className={`${expanded ? 'border-b' : ''} bg-muted/50 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><CardTitle>{hasStarted ? <button type="button" data-tray-toggle aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpansion({ started: hasStarted, open: !expanded })} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronRight aria-hidden="true" className={`size-4 ${expanded ? 'rotate-90' : ''}`} />Tray{' '}<span className="text-sm font-normal text-muted-foreground">({batch.members.length} {batch.members.length === 1 ? 'tube' : 'tubes'})</span></button> : <>Tray{batch.trayConfirmed && batch.status === 'Draft' ? ' · Confirmed' : ''}</>}</CardTitle>{!editable && batch.trayBarcode ? <p className="wrap-anywhere text-sm text-muted-foreground">Physical tray: {batch.trayBarcode}</p> : null}</div><PreparationActions items={[...(batch.trayBarcode ? [{ label: 'Print tray label', onClick: () => setPrintOpen(true), disabled: busy }] : []), ...(editable && trayReady && batch.members.length > 0 && onConfirmTray ? [{ label: 'Confirm tray', onClick: onConfirmTray, disabled: busy || dirty }] : [])]} /></div>
      <CardDescription hidden={!expanded}>{tracksBiologicalMaterial ? editable ? 'Scan accessioned source tubes to assign samples to tray positions. Assign a separate library tube to each occupied position before recording the material transfer.' : 'Each position shows its assigned library tube and retains the original source link. Physical transfers are recorded in the Biological material step.' : editable ? trayReady ? 'Scan tubes into empty positions. Review the contents and choose Confirm tray when assembled. Partial trays are permitted.' : 'Scan and save the physical tray barcode once, then load the tubes. The saved tray is remembered when you return.' : batch.status === 'Draft' && batch.trayConfirmed ? 'The assembled tray is confirmed and locked. Start preparation when ready, or choose Edit tray to revise it.' : batch.status === 'Draft' ? 'Draft tray positions are shown for review.' : 'Positions remain fixed for the duration of this batch.'}</CardDescription>
      {editable && !trayReady ? <form className="mt-2 space-y-1.5" onSubmit={event => { event.preventDefault(); void saveTray() }} noValidate>
        <Label htmlFor="preparation-batch-barcode"><RequiredFieldName>Scan physical tray barcode</RequiredFieldName></Label>
        <div className="flex flex-wrap items-center gap-2"><Input id="preparation-batch-barcode" {...batchField} ref={element => { batchField.ref(element); batchInput.current = element }}
          className="min-w-48 flex-1" placeholder="Scan the label attached to this tray" autoComplete="off" spellCheck={false}
          readOnly={busy} aria-required="true" aria-invalid={Boolean(form.formState.errors.batchBarcode)} aria-describedby={form.formState.errors.batchBarcode ? 'preparation-batch-barcode-error' : undefined} />
          <Button type="submit" variant="outline" disabled={busy}>{scanning === 'tray' ? 'Saving…' : 'Save tray'}</Button>
          {changingTray ? <Button type="button" variant="outline" disabled={busy} onClick={() => { setChangingTray(false); form.resetField('batchBarcode'); form.clearErrors('batchBarcode'); setStatus(''); focus('status') }}>Cancel</Button> : null}
        </div>
        {form.formState.errors.batchBarcode ? <p id="preparation-batch-barcode-error" role="alert" className="text-sm text-destructive">{form.formState.errors.batchBarcode.message}</p> : null}
      </form> : editable && trayReady ? <div className="mt-2 space-y-1.5">
        <Label htmlFor="saved-preparation-tray">Physical tray barcode</Label>
        <div className="flex flex-wrap items-center gap-2"><Input id="saved-preparation-tray" value={batch.trayBarcode ?? ''} readOnly className="min-w-48 flex-1 bg-muted text-muted-foreground" /><span className="flex items-center gap-1 text-sm"><CheckCircle2 className="size-4" aria-hidden="true" />Saved</span>
          {!batch.members.length ? <Button type="button" size="sm" variant="outline" disabled={busy || dirty} onClick={() => { setChangingTray(true); form.resetField('batchBarcode'); setStatus(''); focus('batch') }}>Change tray</Button> : null}
        </div>
      </div> : !batch.trayBarcode ? <p className="text-sm text-muted-foreground">No physical tray assigned.</p> : null}
    </CardHeader>
    <CardContent id={contentId} hidden={!expanded} className="space-y-3 p-4">
      {editable ? <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className="text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">{dirty ? 'Save or clear the entered barcodes before confirming the tray.' : status || (trayReady ? 'Scan tubes into empty cells, then confirm the assembled tray.' : 'Scan and save the physical tray barcode above to begin loading tubes.')}</p> : null}
      <p className="text-sm">{batch.members.length} {batch.members.length === 1 ? 'tube' : 'tubes'} assigned. Select an occupied position to view its tube details.</p>
      {batch.members.some(tube => tube.state === 'Failed') ? <p className="text-sm">{batch.members.filter(tube => !['Failed', 'Succeeded', 'Cancelled'].includes(tube.state)).length} active · {batch.members.filter(tube => tube.state === 'Failed').length} failed. Failed tubes retain their tray positions and are excluded from further processing.</p> : null}
      {failure && !empty(batch).includes(failure.position) ? <div className="space-y-2 rounded-md border p-3"><p role="alert" className="text-sm text-destructive">{failure.position}: {failure.message} The position has changed; review the saved tube below. Unsaved scan: {form.getValues(`tubes.${failure.position}`)}.</p><Button size="sm" variant="outline" disabled={busy} onClick={() => { form.resetField(`tubes.${failure.position}`, { defaultValue: '' }); setFailure(null); focus(editable && trayReady ? empty(batch)[0] ?? 'status' : 'status') }}>Dismiss unsaved scan</Button></div> : null}
      {/* A wide physical layout retains its position order and can be scrolled with the keyboard. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="overflow-x-auto" role="region" tabIndex={0} aria-label="Tray positions"><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${batch.layout.columns}, minmax(12rem, 1fr))` }}>
        {positions.map(position => {
          const tube = batch.members.find(member => member.position === position)
          const unavailable = batch.layout.unavailable.includes(position)
          const field = `tubes.${position}` as const
          const registration = form.register(field)
          const error = form.formState.errors.tubes?.[position]?.message
          if (tube) return <button key={position} type="button" aria-pressed={selectedMemberId === tube.id} aria-controls="preparation-tube-details"
            onClick={() => setSelectedMemberId(tube.id)} aria-label={`View ${position}, ${tube.libraryTube ? 'library tube ' + tube.libraryTube.barcode + ', source ' : 'tube '}${tube.barcode}${tube.state === 'Failed' ? ', Failed' : ''}`}
            className={`relative grid min-h-32 cursor-pointer place-items-center rounded-lg border p-8 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedMemberId === tube.id ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted/50'}`}>
            <strong className="absolute left-3 top-3">{position}</strong>
              <span className="mb-1 text-xs text-muted-foreground">{tube.libraryTube ? 'Library tube' : 'Source assigned'}</span>
              <span className="wrap-anywhere text-center font-mono text-xs">{tube.libraryTube?.barcode ?? tube.barcode}</span>
              {tube.state !== 'Planned' ? <span className={`absolute inset-x-3 bottom-2 text-center text-xs ${tube.state === 'Failed' ? 'font-semibold text-destructive' : ''}`}>{tube.state.replace(/([a-z])([A-Z])/g, '$1 $2')}</span> : null}
            </button>
          if (unavailable) return <div key={position} className="relative flex min-h-20 items-center justify-center rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
            <strong className="absolute left-3 top-3">{position}</strong><p className="text-center text-xs">Unavailable</p>
          </div>
          return <div key={position} className="min-h-20 rounded-lg border bg-background p-3 text-sm">
            {editable ? <Label htmlFor={`tube-scan-${position}`}><RequiredFieldName><span className="sr-only">Tube barcode for </span>{position}</RequiredFieldName></Label> : <strong>{position}</strong>}
            {editable ? <form className="mt-2 space-y-1.5" onSubmit={event => { event.preventDefault(); void scan(position) }} noValidate>
              <div className="flex gap-1.5"><Input id={`tube-scan-${position}`} {...registration} ref={element => { registration.ref(element); inputs.current[position] = element }} placeholder="Scan tube barcode"
                autoComplete="off" spellCheck={false} disabled={!trayReady} readOnly={busy} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? `tube-scan-${position}-error` : undefined}
                className="min-w-0 text-sm" />
                <Button type="submit" size="sm" variant="outline" disabled={!trayReady || busy} aria-label={`Save tube in ${position}`}>{scanning === position ? 'Saving…' : 'Save'}</Button>
              </div>
              {error ? <p id={`tube-scan-${position}-error`} role="alert" className="text-xs text-destructive">{error}</p> : null}
            </form> : <p className="mt-2 text-xs text-muted-foreground">Empty</p>}
          </div>
        })}
      </div></div>
      <div id="preparation-tube-details">{selectedMemberId && batch.members.some(tube => tube.id === selectedMemberId) ? children?.(selectedMemberId) : null}</div>
      {editable ? <RequiredLegend className="text-right" /> : null}
      {eligibleTubes}
    </CardContent>
    {printOpen ? <Dialog open onOpenChange={open => { if (!open) setPrintOpen(false) }}><DialogContent className="preparation-label-dialog">
      <DialogHeader><DialogTitle>Print tray label</DialogTitle><DialogDescription>Reprint the assigned physical tray barcode. Keep this identity with the reusable tray.</DialogDescription></DialogHeader>
      <div className="preparation-label-surface space-y-2 rounded-md border bg-white p-4 text-black"><p className="text-sm font-semibold">Phaeno · Physical tray</p><p className="text-sm">{batch.layout.name}</p><IdentifierQrCode value={batch.trayBarcode ?? ''} label="Physical tray barcode" /></div>
      <p className="text-sm text-muted-foreground">This is the physical tray identity. The batch identifier remains separate. Scan the label on the actual tray before adding tubes.</p>
      <DialogFooter><Button variant="outline" onClick={() => setPrintOpen(false)}>Close</Button><Button onClick={() => window.print()}><Printer aria-hidden="true" />Print label</Button></DialogFooter>
    </DialogContent></Dialog> : null}
  </Card>
}
