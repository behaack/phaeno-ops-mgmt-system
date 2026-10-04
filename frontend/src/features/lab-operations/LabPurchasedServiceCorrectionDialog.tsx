import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { correctLabPurchasedService, getLabOperationsError, type LabPurchasedService } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogReturnFocus, DialogTitle } from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

const schema = z.object({ reason: z.string().trim().min(1, 'Enter a correction reason.').max(2000, 'Use 2,000 characters or fewer.') })

export function LabPurchasedServiceCorrectionDialog({ workOrderId, jobLabel, service, onClose, onSaved }: {
  workOrderId: string; jobLabel: string; service: LabPurchasedService; onClose: () => void; onSaved: () => Promise<void>
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  const request = useRef<{ reason: string; id: string } | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })
  const mutation = useMutation({
    mutationFn: (reason: string) => {
      if (request.current?.reason !== reason) request.current = { reason, id: crypto.randomUUID() }
      return correctLabPurchasedService(workOrderId, { reason, version: service.workVersion, requestId: request.current.id })
    },
    onSuccess: async () => { await onSaved(); onClose() },
  })
  const close = () => { if (!mutation.isPending) onClose() }
  return <DialogReturnFocus target={null} fallbackId="lab-work-actions"><Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent showCloseButton={!mutation.isPending} onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}>
      <DialogHeader><DialogTitle>Correct purchased service</DialogTitle><DialogDescription>{jobLabel}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <p className="text-sm">Associate this unstarted job with <strong>{service.purchasedServiceName}</strong>, as recorded in its accepted purchase. This adds an authorization amendment. Existing samples, tubes, receipt and accession history are preserved.</p>
        <details className="text-sm"><summary className="cursor-pointer">Service references</summary><dl className="mt-2 space-y-2"><div><dt className="font-semibold">Current reference</dt><dd className="wrap-anywhere text-muted-foreground">{service.currentServiceKey}</dd></div><div><dt className="font-semibold">Purchased reference</dt><dd className="wrap-anywhere text-muted-foreground">{service.purchasedServiceKey}</dd></div></dl></details>
        <form id="lab-purchased-service-correction" noValidate onSubmit={form.handleSubmit(({ reason }) => { if (!mutation.isPending) mutation.mutate(reason) })}>
          <Field><Label htmlFor="purchased-service-reason"><RequiredFieldName>Correction reason</RequiredFieldName></Label>
            <textarea id="purchased-service-reason" required maxLength={2000} rows={3} disabled={mutation.isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? 'purchased-service-reason-error' : undefined} {...form.register('reason')} />
            <FieldError id="purchased-service-reason-error">{form.formState.errors.reason?.message}</FieldError>
          </Field>
        </form>
      </div>
      {mutation.error ? <Alert variant="destructive"><AlertTitle>Purchased service was not corrected</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'Reload the job and review its current state before trying again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter><Button ref={cancel} type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Cancel</Button><Button type="submit" form="lab-purchased-service-correction" disabled={mutation.isPending}>{mutation.isPending ? 'Correcting…' : 'Correct purchased service'}</Button></RequiredDialogFooter>
    </DialogContent>
  </Dialog></DialogReturnFocus>
}
