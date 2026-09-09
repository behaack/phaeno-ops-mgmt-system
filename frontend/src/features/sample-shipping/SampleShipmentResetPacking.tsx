import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Undo2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { apiErrorMessage } from '#/api/organization-management'
import { getSampleShipmentPackingReset, resetSampleShipmentPacking, type SampleShipmentPackingReset, type SampleShipmentWorkflow } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'

const scanBlockedReason = 'Finish or discard the current tube scan before changing containers.'

export function SampleShipmentResetPacking({ shipment, canManage, scanActive = false }: { shipment: SampleShipmentWorkflow; canManage: boolean; scanActive?: boolean }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const reasonId = useId()
  const submitting = useRef(false)
  const [review, setReview] = useState<SampleShipmentPackingReset | null>(null)
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
        ...['sample-shipment', 'sample-shipments', 'platform-sample-shipments', 'sample-shipment-packing', 'sample-shipment-recommendation', 'sample-packing-preview', 'sample-shipment-packing-reset', 'sample-shipping-packet', 'transportation-kit-supply'].map(key => client.invalidateQueries({ queryKey: [key] })),
        client.invalidateQueries({ queryKey: ['lab-service-order', shipment.authorizationSourceId] }),
        client.invalidateQueries({ queryKey: ['trial-project', shipment.authorizationSourceId] }),
      ])
      await navigate({ to: '/sample-shipping/$shipmentId', params: { shipmentId: pool.id } })
    },
    onError: async () => { await eligibility.refetch() },
    onSettled: () => { submitting.current = false },
  })
  if (!canManage) return null

  const canReset = Boolean(eligibility.data?.canReset && !eligibility.isFetching && !eligibility.error && !scanActive)
  const matchesReview = Boolean(review && eligibility.data && reviewSnapshot(review) === reviewSnapshot(eligibility.data))
  const reason = scanActive ? scanBlockedReason : eligibility.error ? 'Container choices could not be checked.' : eligibility.data?.blockedReason
  const close = () => { if (!reset.isPending && !submitting.current) setReview(null) }
  const retryEligibility = () => eligibility.refetch()
  const confirm = () => {
    if (!review?.canReset || !canReset || !matchesReview || reset.isPending || submitting.current) return
    submitting.current = true
    reset.mutate({ shipments: review.shipments })
  }

  return <>
    <div className="w-full min-w-0 space-y-1.5 sm:w-auto sm:max-w-xs sm:shrink-0">
      <Button variant="outline" className="h-10 w-full" disabled={!canReset || reset.isPending} aria-describedby={reason ? reasonId : undefined} onClick={() => { if (eligibility.data) { reset.reset(); setReview(eligibility.data) } }}><Undo2 data-icon="inline-start" />Reset container configuration</Button>
      {reason ? <p id={reasonId} className="text-xs text-muted-foreground">{reason}</p> : null}
      {eligibility.error && !review ? <Button variant="outline" size="sm" disabled={eligibility.isFetching} onClick={() => void retryEligibility()}>Retry container check</Button> : null}
    </div>
    <Dialog open={Boolean(review)} onOpenChange={open => { if (!open) close() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset container configuration?</DialogTitle><DialogDescription>This resets the complete packing plan for {shipment.authorizationReference}.</DialogDescription></DialogHeader>
        {reset.error ? <Alert variant="destructive"><AlertTitle>Container configuration was not reset</AlertTitle><AlertDescription>{apiErrorMessage(reset.error)} Review the current container choices before trying again.</AlertDescription></Alert> : null}
        {eligibility.error ? <Alert variant="destructive"><AlertTitle>Container check unavailable</AlertTitle><AlertDescription>{apiErrorMessage(eligibility.error)} <Button variant="outline" disabled={eligibility.isFetching || reset.isPending} onClick={() => void retryEligibility()}>Retry container check</Button></AlertDescription></Alert> : null}
        {review ? <div className="space-y-3 text-sm">
          <p>All {review.containerCount} selected {review.containerCount === 1 ? 'container' : 'containers'} will be removed. All {review.tubeCount} {review.tubeCount === 1 ? 'tube will' : 'tubes will'} return to container selection.</p>
          <p>Your finalized sample list will stay unchanged.</p>
          <p className="text-muted-foreground">Container selection cannot be undone after tube scanning starts or a kit is assigned.</p>
          {scanActive ? <p role="alert" className="text-destructive">{scanBlockedReason}</p> : null}
          {eligibility.data && !eligibility.data.canReset ? <p role="alert" className="text-destructive">{eligibility.data.blockedReason ?? 'These containers can no longer be changed.'}</p> : null}
          {canReset && !matchesReview ? <div className="space-y-2"><p role="alert">The container choices changed. Review the updated selection before continuing.</p><Button variant="outline" onClick={() => { if (eligibility.data) setReview(eligibility.data) }}>Review updated containers</Button></div> : null}
          {eligibility.isFetching && !reset.isPending ? <p role="status">Checking current containers…</p> : null}
        </div> : null}
        <DialogFooter><Button variant="outline" disabled={reset.isPending} onClick={close}>Keep containers</Button><Button disabled={reset.isPending || !canReset || !matchesReview || !review?.canReset} onClick={confirm}>{reset.isPending ? 'Resetting…' : 'Reset container configuration'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}

function reviewSnapshot(value: SampleShipmentPackingReset) {
  return JSON.stringify({ containerCount: value.containerCount, tubeCount: value.tubeCount, shipments: value.shipments })
}
