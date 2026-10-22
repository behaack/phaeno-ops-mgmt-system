import { NativeCheckbox } from '#/components/ui/native-checkbox'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { addLabSampleTubePair, finalizeLabSampleRoster, finishLabSampleTubeKit, getLabSampleTubePairs, getOrderErrorMessage, removeLabSampleTubePair, saveLabSampleTubeKit, type LabServiceOrder } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { hasMultipleLabPhases, labSampleCount } from './lab-job-presentation'

export function LabJobPairedPreparation({ order, phaseId }: { order: LabServiceOrder; phaseId?: string }) {
  const __customerText = useCustomerText()

  const multiplePhases = hasMultipleLabPhases(order)
  const client = useQueryClient()
  const workspace = useQuery({ queryKey: ['lab-sample-tube-pairs', order.id], queryFn: () => getLabSampleTubePairs(order.id) })
  const phases = (order.phaseScopes ?? []).filter(p => workspace.data?.preparationPhaseIds.includes(p.id))
  const phase = phases.find(p => p.id === phaseId) ?? (phases.length === 1 ? phases[0] : undefined)
  const expectedCount = phase?.scope.sources.reduce((sum, source) => sum + source.specimenCount, 0) ?? 0
  const expectedRuns = phase?.scope.sequencingRunCount ?? 0
  const allocatesAdditionalRuns = expectedRuns > expectedCount
  const sourceChoices = phase?.scope.sources ?? []
  const prepared = phase ? workspace.data?.preparedPhaseIds?.includes(phase.id) === true : false
  const kits = workspace.data?.kits.filter(kit => kit.phaseId === phase?.id) ?? []
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
  const refresh = async () => { await Promise.all([
    client.invalidateQueries({ queryKey: ['lab-sample-tube-pairs', order.id] }),
    client.invalidateQueries({ queryKey: ['lab-service-order', order.id] }),
    client.invalidateQueries({ queryKey: ['lab-service-orders'] }),
    client.invalidateQueries({ queryKey: ['sample-shipments'] }),
  ]) }
  const saveKit = useMutation({ mutationFn: () => saveLabSampleTubeKit(order.id, order.version, kitNumber.trim(), phase?.id),
    onSuccess: async () => { setKitNumber(''); await refresh(); nextSampleRef.current?.focus() } })
  const add = useMutation({ mutationFn: () => addLabSampleTubePair(order.id, {
    orderVersion: order.version, stockKitId: activeKit?.id ?? '', customerSampleId: sampleId.trim(),
    phaseId: phase?.id, biologicalSource: sourceChoices.length === 1 ? sourceChoices[0].biologicalSource : source,
    supplierTubeBarcode: barcode.trim(), declaredQuantity: Number(amount), declaredQuantityUnit: workspace.data?.sampleAmountUnit ?? '', sequencingRunCount: phase?.scope.runsPerSample ?? (allocatesAdditionalRuns ? Number(runs) : 1),
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
  const finalize = useMutation({ mutationFn: () => finalizeLabSampleRoster(order.id, order.version, true, phase?.id),
    onSuccess: async () => { setConfirmFinalization(false); setPolicyConfirmed(false); await refresh() } })
  const pairs = workspace.data?.pairs.filter(pair => pair.phaseId === phase?.id) ?? []
  const activePairs = pairs.filter(pair => workspace.data?.preparationPhaseIds.includes(pair.phaseId))
  const physicalKitCount = new Set(activePairs.map(pair => pair.stockKitId)).size
  const allocatedRuns = activePairs.reduce((total, pair) => total + pair.sequencingRunCount, 0)
  const activeKit = kits.find(item => !item.finishedAt && item.isUsable !== false)
  const minimumAmount = workspace.data?.minimumSampleAmount
  const maximumAmount = activeKit?.maximumSampleAmount
  const amountUnit = workspace.data?.sampleAmountUnit
  const amountConfigured = Boolean(minimumAmount && maximumAmount && amountUnit
    && amountUnit === activeKit?.sampleAmountUnit && minimumAmount <= maximumAmount)
  const needsMoreSamples = activePairs.length < expectedCount
  const canScanKit = needsMoreSamples && !activeKit
  const soleSource = sourceChoices.length === 1 ? sourceChoices[0].biologicalSource : null
  const eligible = Boolean(activeKit && activeKit.availableTubeCount > 0 && needsMoreSamples
    && (soleSource ?? source) && sampleId.trim() && barcode.trim()
    && amountConfigured && amount.trim() && Number(amount) >= minimumAmount! && Number(amount) <= maximumAmount!
    && (!allocatesAdditionalRuns || (Number.isInteger(Number(runs)) && Number(runs) > 0))
    && !add.isPending)
  const complete = expectedCount > 0 && activePairs.length === expectedCount && allocatedRuns === expectedRuns
    && sourceChoices.every(group => activePairs.filter(pair => pair.biologicalSource === group.biologicalSource).length === group.specimenCount)
  function submit(event: FormEvent) { event.preventDefault(); if (eligible && (phases.length <= 1 || phase)) add.mutate() }
  function submitKit(event: FormEvent) { event.preventDefault(); if (kitNumber.trim() && canScanKit && !saveKit.isPending) saveKit.mutate() }
  return <Card id="paired-sample-preparation" tabIndex={-1} className="scroll-mt-6 gap-0 py-0">
    <CardHeader ><CardTitle><h3><CustomerText message="m_4d54dcdfec58" /></h3></CardTitle></CardHeader>
    <CardContent className="space-y-5 py-4">
      <p className="text-sm">{prepared ? __customerText('m_50b016a5a6e0', { p0: String(multiplePhases ? 'this phase’s' : 'your') }) : __customerText('m_3d120777995d')}</p>
      {workspace.isLoading ? <p role="status"><CustomerText message="m_94f80c63c55f" /></p> : null}
      {workspace.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_473bff7d1460" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(workspace.error, 'Refresh and try again.')} />} <Button variant="outline" size="sm" onClick={() => void workspace.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
      {workspace.data ? <>
        <p role="status" className="text-sm font-medium">{activePairs.length} of {expectedCount} <CustomerText message="m_5e4903e7a2e6" />{allocatesAdditionalRuns ? __customerText('m_7667d3070370', { p0: String(allocatedRuns), p1: String(expectedRuns) }) : ''}</p>
        {multiplePhases ? <p className="text-xs text-muted-foreground"><CustomerText message="m_bbd9be87ae2d" />{phase?.name ?? 'the selected phase'}<CustomerText message="m_542cf2337810" /></p> : null}
        {kits.map((kit, kitIndex) => {
          const kitPairs = pairs.filter(pair => pair.stockKitId === kit.id)
          const enteringThisKit = activeKit?.id === kit.id && kit.availableTubeCount > 0
            && needsMoreSamples && !prepared && order.canEditSamples
          return <section key={kit.id} className="overflow-hidden rounded-md border" aria-label={__customerText('m_2df3993953e3', { p0: String(kit.kitNumber) })}>
            <div className="bg-muted/50 px-4 py-3"><h3 className="font-medium"><CustomerText message="m_cbfdb16cebd2" />{kitIndex + 1}: {kit.kitNumber}</h3><p className="text-xs text-muted-foreground">{kit.isUsable === false ? <CustomerSourceText source={"Kit needs review; correct its pairs and use a replacement"} /> : kit.finishedAt ? "Finished" : __customerText('m_adb995f1eb3f')} · {kitPairs.length} of {kit.tubeCapacity} <CustomerText message="m_54b79f6105d1" /></p></div>
            {kitPairs.length ? <ol className="divide-y border-t">{kitPairs.map(pair => <li key={pair.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"><div><p className="font-medium">{pair.customerSampleId} ↔ {pair.supplierTubeBarcode}</p><p className="text-muted-foreground">{phases.length > 1 ? `${phases.find(p => p.id === pair.phaseId)?.name ?? 'Phase'} · ` : ''}{!workspace.data?.preparationPhaseIds.includes(pair.phaseId) ? <CustomerSourceText source={"Cancelled phase · not required for shipment · "} /> : ''}{pair.biologicalSource} · {pair.declaredQuantity} {pair.declaredQuantityUnit}{allocatesAdditionalRuns ? __customerText('m_4236b7598f59', { p0: String(pair.sequencingRunCount) }) : ''}</p></div>{!prepared && order.canEditSamples ? <Button type="button" variant="outline" size="sm" onClick={() => { remove.reset(); setRemoveId(pair.id) }}><CustomerText message="m_8addc0d04101" /></Button> : null}</li>)}</ol> : null}
            {enteringThisKit ? <form onSubmit={submit} className="space-y-3 border-t p-4" noValidate>
              <div><p className="font-medium"><CustomerText message="m_04abce21388f" /></p><p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_6e6f4136e089" /></p></div>
              {amountConfigured ? <p className="text-sm text-muted-foreground"><CustomerText message="m_5c41efd1d8f8" />{minimumAmount} {amountUnit} <CustomerText message="m_11141c73e547" />{maximumAmount} {amountUnit}</p>
                : <Alert variant="destructive"><AlertTitle><CustomerText message="m_4133470ba17c" /></AlertTitle><AlertDescription><CustomerText message="m_cde47024a17e" /></AlertDescription></Alert>}
              {allocatesAdditionalRuns ? <p className="text-sm text-muted-foreground"><CustomerText message="m_707304b01c03" /></p> : null}
              <div className={allocatesAdditionalRuns
                ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_7rem_8rem_auto] xl:items-end"
                : "grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_7rem_auto] lg:items-end"}>
                <Field className="min-w-0">{soleSource ? <><p className="text-sm leading-none font-medium"><CustomerText message="m_62cda8311410" /></p><p className="flex min-h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm wrap-anywhere" aria-label={__customerText('m_e07a9f07c3dd', { p0: String(soleSource) })}>{soleSource}</p></> : <><Label htmlFor="pair-source"><RequiredFieldName><CustomerText message="m_62cda8311410" /></RequiredFieldName></Label><NativeSelect id="pair-source" value={source} onChange={event => setSource(event.target.value)} disabled={add.isPending}><option value=""><CustomerText message="m_76a093e985c3" /></option>{sourceChoices.map(group => <option key={group.biologicalSource} value={group.biologicalSource}>{group.biologicalSource}</option>)}</NativeSelect></>}</Field>
                <Field className="min-w-0"><Label htmlFor="pair-sample-id"><RequiredFieldName><CustomerText message="m_1860caa4e4b3" /></RequiredFieldName></Label><Input ref={nextSampleRef} id="pair-sample-id" value={sampleId} onChange={event => setSampleId(event.target.value)} disabled={add.isPending} autoComplete="off" /></Field>
                <Field className="min-w-0"><Label htmlFor="pair-tube-barcode"><RequiredFieldName><CustomerText message="m_9a3ba4e43c4e" /></RequiredFieldName></Label><Input id="pair-tube-barcode" value={barcode} onChange={event => setBarcode(event.target.value)} disabled={add.isPending} autoComplete="off" /></Field>
                <Field className="min-w-0 max-w-28"><Label htmlFor="pair-material-amount"><RequiredFieldName>{amountUnit ? __customerText('m_1e40ece75e1a', { p0: String(amountUnit) }) : __customerText('m_822bab8d41bc')}</RequiredFieldName></Label><Input id="pair-material-amount" type="number" min={minimumAmount ?? 0} max={maximumAmount ?? undefined} step="any" value={amount} onChange={event => setAmount(event.target.value)} disabled={add.isPending || !amountConfigured} /></Field>
                {allocatesAdditionalRuns ? <Field className="min-w-0"><Label htmlFor="pair-runs"><RequiredFieldName><CustomerText message="m_848f54e89660" /></RequiredFieldName></Label><Input id="pair-runs" type="number" min="1" step="1" value={phase?.scope.runsPerSample ?? runs} readOnly={phase?.scope.runsPerSample != null} onChange={event => setRuns(event.target.value)} disabled={add.isPending} /></Field> : null}
                <Button type="submit" className="self-end" disabled={!eligible || phases.length > 1 && !phase}>{add.isPending ? <CustomerSourceText source={"Saving…"} /> : __customerText('m_b6d55a22052f')}</Button>
              </div>
              {add.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_ccdc66c92dee" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(add.error, 'Check the kit, barcode and Sample ID. Your entries are preserved.')} />}</AlertDescription></Alert> : null}
              <p className="text-xs text-muted-foreground"><CustomerText message="m_b62a197611d0" /></p>
            </form> : null}
            {activeKit?.id === kit.id && kitPairs.length > 0 && needsMoreSamples && !prepared && order.canEditSamples
              ? <div className="flex justify-end border-t px-4 py-3"><Button type="button" variant="outline" onClick={() => { finishKit.reset(); setFinishKitId(kit.id) }}><CustomerText message="m_f5c4cf28f12c" /></Button></div>
              : null}
          </section>
        })}
        {canScanKit && !prepared && order.canEditSamples ? <form onSubmit={submitKit} className="space-y-3 rounded-md border p-4" noValidate>
          <div><h3 className="font-medium">{kits.length ? <CustomerSourceText source={"Scan the next kit"} /> : multiplePhases ? "Scan the first kit for this phase" : __customerText('m_f6bcc0ebef9c')}</h3><p className="mt-1 text-sm text-muted-foreground"><CustomerText message="m_aa92f5c27294" /></p></div>
          <div className="flex flex-wrap items-end gap-3"><Field className="min-w-0 flex-1"><Label htmlFor="pair-kit-number"><RequiredFieldName><CustomerText message="m_b9e04d3e26e8" /></RequiredFieldName></Label><Input ref={nextKitRef} id="pair-kit-number" value={kitNumber} onChange={event => setKitNumber(event.target.value)} disabled={saveKit.isPending} autoComplete="off" /></Field><Button type="submit" disabled={!kitNumber.trim() || saveKit.isPending}>{saveKit.isPending ? <CustomerSourceText source={"Saving kit…"} /> : __customerText('m_15f97e1e8fef')}</Button></div>
          {saveKit.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_1fb75dbaaaff" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(saveKit.error, 'Check the scanned kit number and try again. Your entry is preserved.')} />}</AlertDescription></Alert> : null}
          <p className="text-xs text-muted-foreground"><CustomerText message="m_b62a197611d0" /></p>
        </form> : null}
        {!prepared && order.canEditSamples ? <div className="flex justify-end"><Button type="button" disabled={!complete || finalize.isPending} onClick={() => { finalize.reset(); setConfirmFinalization(true) }}>{multiplePhases ? <CustomerSourceText source={"Confirm phase pairs"} /> : __customerText('m_6c3fc83e7671')}</Button></div> : null}
        {prepared ? <p role="status" className="text-sm font-medium"><CustomerText message="m_ae662177e772" /></p> : null}
      </> : null}
    </CardContent>
    <Dialog open={Boolean(removeId)} onOpenChange={open => { if (!open && !remove.isPending) setRemoveId(null) }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("keep-saved-pair")?.focus() }} showCloseButton={!remove.isPending} aria-busy={remove.isPending}><DialogHeader><DialogTitle><CustomerText message="m_cca6064395f7" /></DialogTitle></DialogHeader><div><DialogDescription><CustomerText message="m_464162951407" /></DialogDescription></div><Field><Label htmlFor="pair-correction-reason"><RequiredFieldName><CustomerText message="m_f81ab834de5f" /></RequiredFieldName></Label><Input id="pair-correction-reason" value={removeReason} onChange={event => setRemoveReason(event.target.value)} disabled={remove.isPending} /></Field>{remove.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(remove.error, 'Refresh and try again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter><Button id="keep-saved-pair" variant="outline" disabled={remove.isPending} onClick={() => setRemoveId(null)}><CustomerText message="m_7ccb8e239684" /></Button><Button disabled={remove.isPending || !removeReason.trim()} onClick={() => remove.mutate()}>{remove.isPending ? <CustomerSourceText source={"Removing…"} /> : __customerText('m_1f0a5f7c70cb')}</Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(finishKitId)} onOpenChange={open => { if (!open && !finishKit.isPending) setFinishKitId(null) }}>
      <DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("keep-entering-kit")?.focus() }} showCloseButton={!finishKit.isPending} aria-busy={finishKit.isPending}>
        <DialogHeader className="pr-[var(--dialog-inset)]"><div className="space-y-1.5 pr-8"><DialogTitle><CustomerText message="m_208101473f1d" /></DialogTitle></div></DialogHeader>
        <div><DialogDescription><CustomerText message="m_453b9c4ebc37" /></DialogDescription></div>
        {(() => { const kit = workspace.data?.kits.find(item => item.id === finishKitId); const paired = pairs.filter(pair => pair.stockKitId === finishKitId).length; return kit ? <p className="text-sm">{kit.kitNumber}: {paired} of {kit.tubeCapacity} <CustomerText message="m_c897ad107b6d" />{kit.tubeCapacity - paired} <CustomerText message="m_3308e9064142" /></p> : null })()}
        {finishKit.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(finishKit.error, 'Review the saved pairs and try again.')} />}</AlertDescription></Alert> : null}
        <RequiredDialogFooter showLegend={false}><Button id="keep-entering-kit" variant="outline" disabled={finishKit.isPending} onClick={() => setFinishKitId(null)}><CustomerText message="m_e23ccec422c8" /></Button><Button disabled={finishKit.isPending} onClick={() => finishKit.mutate()}>{finishKit.isPending ? <CustomerSourceText source={"Finishing…"} /> : __customerText('m_f5c4cf28f12c')}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmFinalization} onOpenChange={open => { if (!open && !finalize.isPending) setConfirmFinalization(false) }}>
      <DialogContent onOpenAutoFocus={event => { event.preventDefault(); document.getElementById("keep-phase-review")?.focus() }} onCloseAutoFocus={event => { if (prepared) { event.preventDefault(); document.getElementById("paired-sample-preparation")?.focus() } }} showCloseButton={!finalize.isPending} aria-busy={finalize.isPending}>
        <DialogHeader className="pr-[var(--dialog-inset)]">
          <div className="space-y-1.5 pr-8">
            <DialogTitle>{multiplePhases ? <CustomerSourceText source={"Confirm this phase’s sample and tube pairs?"} /> : __customerText('m_d0757d6480eb')}</DialogTitle>
          </div>
        </DialogHeader>
        <div><DialogDescription><CustomerText message="m_5205dcb2574e" />{multiplePhases ? <CustomerSourceText source={"this phase’s"} /> : __customerText('m_4d040d3f6466')} <CustomerText message="m_9304f8914dac" />{multiplePhases ? <CustomerSourceText source={"its"} /> : __customerText('m_b9776d7ddf45')} <CustomerText message="m_499b5db08ce1" />{multiplePhases ? <CustomerSourceText source={" Other phases can be prepared later."} /> : ''}</DialogDescription></div>
        <p className="text-sm">{labSampleCount(activePairs.length)}{allocatesAdditionalRuns ? __customerText('m_a4453aefe2b8', { p0: String(allocatedRuns) }) : ''} · {physicalKitCount} <CustomerText message="m_7fd3f68c29e7" />{physicalKitCount === 1 ? '' : 's'}</p>
        <label htmlFor="pair-finalization-policy" className="flex items-start gap-2 text-sm">
          <NativeCheckbox id="pair-finalization-policy"   checked={policyConfirmed} onChange={event => setPolicyConfirmed(event.target.checked)} disabled={finalize.isPending} />
          <RequiredFieldName><CustomerText message="m_8e17ef38c89a" /></RequiredFieldName>
        </label>
        {finalize.error ? <Alert variant="destructive"><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(finalize.error, 'Review the saved pairs and try again.')} />}</AlertDescription></Alert> : null}
        <RequiredDialogFooter>
          <Button id="keep-phase-review" variant="outline" disabled={finalize.isPending} onClick={() => setConfirmFinalization(false)}><CustomerText message="m_34411a1bde47" /></Button>
          <Button disabled={finalize.isPending || !policyConfirmed || !complete} onClick={() => finalize.mutate()}>{finalize.isPending ? <CustomerSourceText source={"Confirming…"} /> : __customerText('m_0dd0a5d4752c')}</Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </Card>
}
