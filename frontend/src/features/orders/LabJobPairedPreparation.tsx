import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { addLabSampleTubePair, finalizeLabSampleRoster, finishLabSampleTubeKit, getLabSampleTubePairs, getOrderErrorMessage, removeLabSampleTubePair, saveLabSampleTubeKit, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

export function LabJobPairedPreparation({ order }: { order: LabServiceOrder }) {
  const client = useQueryClient()
  const expectedRuns = order.requestedSequencingRunCount ?? order.requestedSpecimenCount
  const allocatesAdditionalRuns = expectedRuns > order.requestedSpecimenCount
  const nextSampleRef = useRef<HTMLInputElement>(null)
  const nextKitRef = useRef<HTMLInputElement>(null)
  const [kitNumber, setKitNumber] = useState('')
  const [source, setSource] = useState(order.sourceGroups?.length === 1 ? order.sourceGroups[0].biologicalSource : '')
  const [sampleId, setSampleId] = useState('')
  const [barcode, setBarcode] = useState('')
  const [amount, setAmount] = useState('')
  const [runs, setRuns] = useState('1')
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [removeReason, setRemoveReason] = useState('')
  const [finishKitId, setFinishKitId] = useState<string | null>(null)
  const [confirmFinalization, setConfirmFinalization] = useState(false)
  const [policyConfirmed, setPolicyConfirmed] = useState(false)
  const workspace = useQuery({ queryKey: ['lab-sample-tube-pairs', order.id], queryFn: () => getLabSampleTubePairs(order.id) })
  const refresh = async () => { await Promise.all([
    client.invalidateQueries({ queryKey: ['lab-sample-tube-pairs', order.id] }),
    client.invalidateQueries({ queryKey: ['lab-service-order', order.id] }),
    client.invalidateQueries({ queryKey: ['lab-service-orders'] }),
    client.invalidateQueries({ queryKey: ['sample-shipments'] }),
  ]) }
  const saveKit = useMutation({ mutationFn: () => saveLabSampleTubeKit(order.id, order.version, kitNumber.trim()),
    onSuccess: async () => { setKitNumber(''); await refresh(); nextSampleRef.current?.focus() } })
  const add = useMutation({ mutationFn: () => addLabSampleTubePair(order.id, {
    orderVersion: order.version, stockKitId: activeKit?.id ?? '', customerSampleId: sampleId.trim(),
    biologicalSource: order.sourceGroups?.length === 1 ? order.sourceGroups[0].biologicalSource : source,
    supplierTubeBarcode: barcode.trim(), declaredQuantity: Number(amount), declaredQuantityUnit: workspace.data?.sampleAmountUnit ?? '', sequencingRunCount: allocatesAdditionalRuns ? Number(runs) : 1,
  }), onSuccess: async () => {
    setSampleId(''); setBarcode(''); setAmount(''); setRuns('1')
    await refresh()
    if (nextSampleRef.current) nextSampleRef.current.focus()
    else nextKitRef.current?.focus()
  } })
  const remove = useMutation({ mutationFn: async () => {
    const pair = workspace.data?.pairs.find(item => item.id === removeId)
    if (!pair) throw new Error('The saved pair changed. Refresh and select it again.')
    return removeLabSampleTubePair(order.id, pair.id, pair.version, removeReason.trim())
  }, onSuccess: async () => { setRemoveId(null); setRemoveReason(''); await refresh(); nextSampleRef.current?.focus() } })
  const finishKit = useMutation({ mutationFn: () => finishLabSampleTubeKit(order.id, finishKitId ?? '', order.version),
    onSuccess: async () => { setFinishKitId(null); await refresh(); nextKitRef.current?.focus() } })
  const finalize = useMutation({ mutationFn: () => finalizeLabSampleRoster(order.id, order.version, true),
    onSuccess: async () => { setConfirmFinalization(false); setPolicyConfirmed(false); await refresh() } })
  const pairs = workspace.data?.pairs ?? []
  const allocatedRuns = pairs.reduce((total, pair) => total + pair.sequencingRunCount, 0)
  const activeKit = workspace.data?.kits.find(item => !item.finishedAt)
  const minimumAmount = workspace.data?.minimumSampleAmount
  const maximumAmount = activeKit?.maximumSampleAmount
  const amountUnit = workspace.data?.sampleAmountUnit
  const amountConfigured = Boolean(minimumAmount && maximumAmount && amountUnit
    && amountUnit === activeKit?.sampleAmountUnit && minimumAmount <= maximumAmount)
  const needsMoreSamples = pairs.length < order.requestedSpecimenCount
  const canScanKit = needsMoreSamples && !activeKit
  const soleSource = order.sourceGroups?.length === 1 ? order.sourceGroups[0].biologicalSource : null
  const eligible = Boolean(activeKit && activeKit.availableTubeCount > 0 && needsMoreSamples
    && (soleSource ?? source) && sampleId.trim() && barcode.trim()
    && amountConfigured && amount.trim() && Number(amount) >= minimumAmount! && Number(amount) <= maximumAmount!
    && (!allocatesAdditionalRuns || (Number.isInteger(Number(runs)) && Number(runs) > 0))
    && !add.isPending)
  const complete = pairs.length === order.requestedSpecimenCount && allocatedRuns === expectedRuns
    && order.sourceGroups?.every(group => pairs.filter(pair => pair.biologicalSource === group.biologicalSource).length === group.specimenCount)
  function submit(event: FormEvent) { event.preventDefault(); if (eligible) add.mutate() }
  function submitKit(event: FormEvent) { event.preventDefault(); if (kitNumber.trim() && canScanKit && !saveKit.isPending) saveKit.mutate() }
  return <Card id="paired-sample-preparation" tabIndex={-1} className="scroll-mt-6">
    <CardHeader className="bg-muted/50"><CardTitle>Prepare sample shipment</CardTitle></CardHeader>
    <CardContent className="space-y-5 pt-4">
      <p className="text-sm">Scan and save the received kit number first. Then save one Sample ID and tube barcode at a time from that kit.</p>
      {workspace.isLoading ? <p role="status">Loading saved sample/tube pairs…</p> : null}
      {workspace.error ? <Alert variant="destructive"><AlertTitle>Preparation unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(workspace.error, 'Refresh and try again.')} <Button variant="outline" size="sm" onClick={() => void workspace.refetch()}>Retry</Button></AlertDescription></Alert> : null}
      {workspace.data ? <>
        <p role="status" className="text-sm font-medium">{pairs.length} of {workspace.data.expectedSampleCount} Sample ID/tube pairs saved{allocatesAdditionalRuns ? ` · ${allocatedRuns} of ${workspace.data.expectedSequencingRunCount} sequencing runs allocated` : ''}</p>
        {workspace.data.kits.map((kit, kitIndex) => {
          const kitPairs = pairs.filter(pair => pair.stockKitId === kit.id)
          const enteringThisKit = activeKit?.id === kit.id && kit.availableTubeCount > 0
            && needsMoreSamples && !order.sampleRosterFinalizedAt && order.canEditSamples
          return <section key={kit.id} className="overflow-hidden rounded-md border" aria-label={`Kit ${kit.kitNumber}`}>
            <div className="bg-muted/50 px-4 py-3"><h3 className="font-medium">Kit {kitIndex + 1}: {kit.kitNumber}</h3><p className="text-xs text-muted-foreground">{kit.finishedAt ? 'Finished' : 'Kit number saved and fixed'} · {kitPairs.length} of {kit.tubeCapacity} tubes paired</p></div>
            {kitPairs.length ? <ol className="divide-y border-t">{kitPairs.map(pair => <li key={pair.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"><div><p className="font-medium">{pair.customerSampleId} ↔ {pair.supplierTubeBarcode}</p><p className="text-muted-foreground">{pair.biologicalSource} · {pair.declaredQuantity} {pair.declaredQuantityUnit}{allocatesAdditionalRuns ? ` · ${pair.sequencingRunCount} runs` : ''}</p></div>{!order.sampleRosterFinalizedAt && order.canEditSamples ? <Button type="button" variant="outline" size="sm" onClick={() => { remove.reset(); setRemoveId(pair.id) }}>Correct pair</Button> : null}</li>)}</ol> : null}
            {enteringThisKit ? <form onSubmit={submit} className="space-y-3 border-t p-4" noValidate>
              <div><p className="font-medium">Next sample and tube</p><p className="mt-1 text-xs text-muted-foreground">Use your laboratory ID. Do not enter patient identifiers.</p></div>
              {amountConfigured ? <p className="text-sm text-muted-foreground">Minimum sample amount: {minimumAmount} {amountUnit} · Tube maximum: {maximumAmount} {amountUnit}</p>
                : <Alert variant="destructive"><AlertTitle>Sample amount setup needed</AlertTitle><AlertDescription>Phaeno must set the Sample type minimum and this tube product’s maximum in the same unit before you can save a pair.</AlertDescription></Alert>}
              {allocatesAdditionalRuns ? <p className="text-sm text-muted-foreground">This order includes additional sequencing runs. Allocate them across its samples.</p> : null}
              <div className={allocatesAdditionalRuns
                ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_7rem_8rem_auto] xl:items-end'
                : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_7rem_auto] lg:items-end'}>
                <div className="min-w-0 space-y-1.5">{soleSource ? <><p className="text-sm leading-none font-medium">Biological source</p><p className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm wrap-anywhere" aria-label={`Biological source: ${soleSource}`}>{soleSource}</p></> : <><Label htmlFor="pair-source"><RequiredFieldName>Biological source</RequiredFieldName></Label><select id="pair-source" className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm" value={source} onChange={event => setSource(event.target.value)} disabled={add.isPending}><option value="">Select a source</option>{order.sourceGroups?.map(group => <option key={group.id} value={group.biologicalSource}>{group.biologicalSource}</option>)}</select></>}</div>
                <div className="min-w-0 space-y-1.5"><Label htmlFor="pair-sample-id"><RequiredFieldName>Sample ID</RequiredFieldName></Label><Input ref={nextSampleRef} id="pair-sample-id" value={sampleId} onChange={event => setSampleId(event.target.value)} disabled={add.isPending} autoComplete="off" /></div>
                <div className="min-w-0 space-y-1.5"><Label htmlFor="pair-tube-barcode"><RequiredFieldName>Tube barcode</RequiredFieldName></Label><Input id="pair-tube-barcode" value={barcode} onChange={event => setBarcode(event.target.value)} disabled={add.isPending} autoComplete="off" /></div>
                <div className="min-w-0 max-w-28 space-y-1.5"><Label htmlFor="pair-material-amount"><RequiredFieldName>{amountUnit ? `Quantity (${amountUnit})` : 'Quantity'}</RequiredFieldName></Label><Input id="pair-material-amount" type="number" min={minimumAmount ?? 0} max={maximumAmount ?? undefined} step="any" value={amount} onChange={event => setAmount(event.target.value)} disabled={add.isPending || !amountConfigured} /></div>
                {allocatesAdditionalRuns ? <div className="min-w-0 space-y-1.5"><Label htmlFor="pair-runs"><RequiredFieldName>Runs</RequiredFieldName></Label><Input id="pair-runs" type="number" min="1" step="1" value={runs} onChange={event => setRuns(event.target.value)} disabled={add.isPending} /></div> : null}
                <Button type="submit" className="h-8 self-end" disabled={!eligible}>{add.isPending ? 'Saving…' : 'Save pair'}</Button>
              </div>
              {add.error ? <Alert variant="destructive"><AlertTitle>Pair not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(add.error, 'Check the kit, barcode and Sample ID. Your entries are preserved.')}</AlertDescription></Alert> : null}
              <p className="text-xs text-muted-foreground">* Required</p>
            </form> : null}
            {activeKit?.id === kit.id && kitPairs.length > 0 && needsMoreSamples && !order.sampleRosterFinalizedAt && order.canEditSamples
              ? <div className="flex justify-end border-t px-4 py-3"><Button type="button" variant="outline" onClick={() => { finishKit.reset(); setFinishKitId(kit.id) }}>Finish kit</Button></div>
              : null}
          </section>
        })}
        {canScanKit && !order.sampleRosterFinalizedAt && order.canEditSamples ? <form onSubmit={submitKit} className="space-y-3 rounded-md border p-4" noValidate>
          <div><h3 className="font-medium">{workspace.data.kits.length ? 'Scan the next kit' : 'Scan the first kit'}</h3><p className="mt-1 text-sm text-muted-foreground">Scan the number printed on a received physical kit and save it before entering its sample tubes. The saved kit number is fixed.</p></div>
          <div className="flex flex-wrap items-end gap-3"><div className="min-w-64 flex-1 space-y-1.5"><Label htmlFor="pair-kit-number"><RequiredFieldName>Kit number</RequiredFieldName></Label><Input ref={nextKitRef} id="pair-kit-number" value={kitNumber} onChange={event => setKitNumber(event.target.value)} disabled={saveKit.isPending} autoComplete="off" /></div><Button type="submit" disabled={!kitNumber.trim() || saveKit.isPending}>{saveKit.isPending ? 'Saving kit…' : 'Save kit'}</Button></div>
          {saveKit.error ? <Alert variant="destructive"><AlertTitle>Kit not saved</AlertTitle><AlertDescription>{getOrderErrorMessage(saveKit.error, 'Check the scanned kit number and try again. Your entry is preserved.')}</AlertDescription></Alert> : null}
          <p className="text-xs text-muted-foreground">* Required</p>
        </form> : null}
        {!order.sampleRosterFinalizedAt && order.canFinalizeSamples ? <div className="flex justify-end"><Button type="button" disabled={!complete || finalize.isPending} onClick={() => { finalize.reset(); setConfirmFinalization(true) }}>Confirm all pairs</Button></div> : null}
        {order.sampleRosterFinalizedAt ? <p role="status" className="text-sm font-medium">The exact Sample ID/tube crosswalk is confirmed. Review the shipping insert for each kit before sending.</p> : null}
      </> : null}
    </CardContent>
    <Dialog open={Boolean(removeId)} onOpenChange={open => { if (!open && !remove.isPending) setRemoveId(null) }}><DialogContent showCloseButton={!remove.isPending} aria-busy={remove.isPending}><DialogHeader><DialogTitle>Correct saved pair?</DialogTitle><DialogDescription>The saved pair will be removed so you can scan the correct physical tube. The correction is recorded in order history.</DialogDescription></DialogHeader><div className="space-y-1.5"><Label htmlFor="pair-correction-reason"><RequiredFieldName>Reason</RequiredFieldName></Label><Input id="pair-correction-reason" value={removeReason} onChange={event => setRemoveReason(event.target.value)} disabled={remove.isPending} /></div>{remove.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(remove.error, 'Refresh and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter><Button variant="outline" disabled={remove.isPending} onClick={() => setRemoveId(null)}>Keep pair</Button><Button disabled={remove.isPending || !removeReason.trim()} onClick={() => remove.mutate()}>{remove.isPending ? 'Removing…' : 'Remove pair'}</Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(finishKitId)} onOpenChange={open => { if (!open && !finishKit.isPending) setFinishKitId(null) }}>
      <DialogContent showCloseButton={!finishKit.isPending} aria-busy={finishKit.isPending}>
        <DialogHeader className="pr-[var(--dialog-inset)]"><div className="space-y-1.5 pr-8"><DialogTitle>Finish this kit?</DialogTitle><DialogDescription>The saved pairs stay with this physical kit. You can scan the next kit after finishing this one.</DialogDescription></div></DialogHeader>
        {(() => { const kit = workspace.data?.kits.find(item => item.id === finishKitId); const paired = pairs.filter(pair => pair.stockKitId === finishKitId).length; return kit ? <p className="text-sm">{kit.kitNumber}: {paired} of {kit.tubeCapacity} tubes paired · {kit.tubeCapacity - paired} unused</p> : null })()}
        {finishKit.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(finishKit.error, 'Review the saved pairs and try again.')}</AlertDescription></Alert> : null}
        <RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={finishKit.isPending} onClick={() => setFinishKitId(null)}>Keep entering</Button><Button disabled={finishKit.isPending} onClick={() => finishKit.mutate()}>{finishKit.isPending ? 'Finishing…' : 'Finish kit'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmFinalization} onOpenChange={open => { if (!open && !finalize.isPending) setConfirmFinalization(false) }}>
      <DialogContent showCloseButton={!finalize.isPending} aria-busy={finalize.isPending}>
        <DialogHeader className="pr-[var(--dialog-inset)]">
          <div className="space-y-1.5 pr-8">
            <DialogTitle>Confirm the exact sample and tube pairs?</DialogTitle>
            <DialogDescription>This locks all saved pairs, authorizes laboratory work, and creates one return shipment for each physical kit.</DialogDescription>
          </div>
        </DialogHeader>
        <p className="text-sm">{pairs.length} samples{allocatesAdditionalRuns ? ` · ${allocatedRuns} purchased sequencing runs` : ''} · {new Set(pairs.map(pair => pair.stockKitId)).size} physical kits</p>
        <label htmlFor="pair-finalization-policy" className="flex items-start gap-2 text-sm">
          <input id="pair-finalization-policy" type="checkbox" className="mt-1" checked={policyConfirmed} onChange={event => setPolicyConfirmed(event.target.checked)} disabled={finalize.isPending} />
          <span>I confirm these Sample IDs contain no patient identifiers or PHI, and Phaeno should run one tube per specimen with a reserve only if an attempt fails. <span aria-hidden="true" className="text-destructive">*</span></span>
        </label>
        {finalize.error ? <Alert variant="destructive"><AlertDescription>{getOrderErrorMessage(finalize.error, 'Review the saved pairs and try again.')}</AlertDescription></Alert> : null}
        <RequiredDialogFooter>
          <Button variant="outline" disabled={finalize.isPending} onClick={() => setConfirmFinalization(false)}>Keep reviewing</Button>
          <Button disabled={finalize.isPending || !policyConfirmed || !complete} onClick={() => finalize.mutate()}>{finalize.isPending ? 'Confirming…' : 'Confirm preparation'}</Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </Card>
}
