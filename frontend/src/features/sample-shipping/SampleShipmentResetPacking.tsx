import { LoadingState } from '#/components/ui/content-state'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Undo2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { apiErrorMessage } from '#/api/organization-management'
import { getSampleShipmentPackingReset, resetSampleShipmentPacking, type SampleShipmentPackingReset, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

const scanBlockedReason = 'Finish or discard the current tube scan before changing containers.'
const issuedInsertBlockedReason = 'Containers cannot be changed because a shipping insert has already been issued for this job.'

export function SampleShipmentResetPacking({ shipment, canManage, scanActive = false, writesBlocked = false, onSelectShipment, onActivityChange }: { shipment: SampleShipmentWorkflow; canManage: boolean; scanActive?: boolean; writesBlocked?: boolean; onSelectShipment?: (id: string) => Promise<void>; onActivityChange?: (active: boolean) => void }) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const navigate = useNavigate()
  const reasonId = useId()
  const submitting = useRef(false)
  const [review, setReview] = useState<SampleShipmentPackingReset | null>(null)
  const active = Boolean(review)
  useEffect(() => { onActivityChange?.(active) }, [active, onActivityChange])
  useEffect(() => () => { onActivityChange?.(false) }, [onActivityChange])
  const eligibility = useQuery({
    queryKey: ['sample-shipment-packing-reset', shipment.id, shipment.version, shipment.crosswalk.filter(item => item.supplierTubeBarcode).length],
    queryFn: () => getSampleShipmentPackingReset(shipment.id),
    enabled: canManage,
  })
  const reset = useMutation({
    mutationFn: (input: Pick<SampleShipmentPackingReset, 'shipments'>) => resetSampleShipmentPacking(shipment.id, input),
    onSuccess: async pool => {
      setReview(null)
      client.setQueryData(['sample-shipment', pool.id], pool)
      await Promise.all([
        ...['sample-shipment', 'sample-shipments', 'platform-sample-shipments', 'sample-shipment-packing', 'sample-shipment-recommendation', 'sample-packing-preview', 'sample-shipment-packing-reset', 'sample-shipping-packet', 'transportation-kit-supply', 'location-kit-inventory'].map(key => client.invalidateQueries({ queryKey: [key] })),
        client.invalidateQueries({ queryKey: ['lab-service-order', shipment.authorizationSourceId] }),
        client.invalidateQueries({ queryKey: ['trial-project', shipment.authorizationSourceId] }),
      ])
      if (onSelectShipment) await onSelectShipment(pool.id)
      else await navigate({ to: '/sample-shipping/$shipmentId', params: { shipmentId: pool.id } })
    },
    onError: async () => { await eligibility.refetch() },
    onSettled: () => { submitting.current = false },
  })
  if (!canManage) return null

  const canReset = Boolean(eligibility.data?.canReset && !eligibility.isFetching && !eligibility.error && !scanActive && !writesBlocked)
  const matchesReview = Boolean(review && eligibility.data && reviewSnapshot(review) === reviewSnapshot(eligibility.data))
  const issuedInsertLocksCurrentContainer = eligibility.data?.canReset === false && shipment.currentPacket
    && shipment.status !== 'Cancelled' && shipment.container && !shipment.isPackingPool && shipment.crosswalk.length > 0
  // Explain the issued insert from current shipment facts without changing the server's reset decision.
  const blockedReason = issuedInsertLocksCurrentContainer ? issuedInsertBlockedReason : eligibility.data?.blockedReason
  const reason = writesBlocked ? 'Current shipment information must be verified before resetting.' : scanActive ? scanBlockedReason : eligibility.error ? 'Container choices could not be checked.' : eligibility.isFetching ? 'Checking current containers…' : blockedReason
  const close = () => { if (!reset.isPending && !submitting.current) setReview(null) }
  const retryEligibility = () => eligibility.refetch()
  const confirm = () => {
    if (!review?.canReset || !canReset || !matchesReview || reset.isPending || submitting.current) return
    submitting.current = true
    reset.mutate({ shipments: review.shipments })
  }

  return <>
    <div className="w-full min-w-0 space-y-1.5 sm:w-auto sm:max-w-xs sm:shrink-0">
      <Button variant="outline" className="h-10 w-full" disabled={!canReset || reset.isPending} aria-describedby={reason ? reasonId : undefined} onClick={() => { if (eligibility.data) { reset.reset(); setReview(eligibility.data) } }}><Undo2 data-icon="inline-start" /><CustomerText message="m_9d96e659aa90" /></Button>
      {reason ? <p id={reasonId} className="text-xs text-muted-foreground">{reason}</p> : null}
      {eligibility.error && !review ? <Button variant="outline" size="sm" disabled={eligibility.isFetching} onClick={() => void retryEligibility()}><CustomerText message="m_f9c283978ecd" /></Button> : null}
    </div>
    <Dialog open={Boolean(review)} onOpenChange={open => { if (!open) close() }}>
      <DialogContent>
        <DialogHeader><DialogTitle><CustomerText message="m_55a629af5739" /></DialogTitle><DialogDescription><CustomerText message="m_5c45657959b5" />{shipment.authorizationReference}.</DialogDescription></DialogHeader>
        {reset.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_e57f8536c412" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(reset.error)} /> <CustomerText message="m_b3e7f669de01" /></AlertDescription></Alert> : null}
        {eligibility.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_21706e62943a" /></AlertTitle><AlertDescription><CustomerSourceText source={apiErrorMessage(eligibility.error)} /> <Button variant="outline" disabled={eligibility.isFetching || reset.isPending} onClick={() => void retryEligibility()}><CustomerText message="m_f9c283978ecd" /></Button></AlertDescription></Alert> : null}
        {review ? <div className="space-y-3 text-sm">
          <p>{__customerText(review.containerCount === 1 ? review.tubeCount === 1 ? 'packing_reset_one_one' : 'packing_reset_one_many' : review.tubeCount === 1 ? 'packing_reset_many_one' : 'packing_reset_many_many', { p0: review.containerCount, p1: review.tubeCount })}</p>
          <p><CustomerText message="m_7415a59c9ae6" /></p>
          <p className="text-muted-foreground"><CustomerText message="m_e9cc299467e9" /></p>
          {scanActive ? <p role="alert" className="text-destructive">{scanBlockedReason}</p> : null}
          {eligibility.data && !eligibility.data.canReset && !eligibility.isFetching ? <p role="alert" className="text-destructive">{reason ?? 'These containers can no longer be changed.'}</p> : null}
          {canReset && !matchesReview ? <div className="space-y-2"><p role="alert"><CustomerText message="m_10d97b3d2a0e" /></p><Button variant="outline" onClick={() => { if (eligibility.data) setReview(eligibility.data) }}><CustomerText message="m_12099252bb68" /></Button></div> : null}
          {eligibility.isFetching && !reset.isPending ? <LoadingState  label={<><CustomerText message="m_9475df56a353" /></>} /> : null}
        </div> : null}
        <DialogFooter><Button variant="outline" disabled={reset.isPending} onClick={close}><CustomerText message="m_1d1f9dbc6849" /></Button><Button disabled={reset.isPending || !canReset || !matchesReview || !review?.canReset} onClick={confirm}>{reset.isPending ? <CustomerSourceText source={"Resetting…"} /> : __customerText('m_9d96e659aa90')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}

function reviewSnapshot(value: SampleShipmentPackingReset) {
  return JSON.stringify({ containerCount: value.containerCount, tubeCount: value.tubeCount, shipments: value.shipments })
}
