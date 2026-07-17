import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Printer, XCircle } from 'lucide-react'
import { useState } from 'react'

import {
  getLabContainerLabel,
  getLabOperationsError,
  recordLabContainerLabelPrint,
  type LabContainer,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

import { Code39Barcode } from './Code39Barcode'

export function LabLabelDialog({
  container,
  onClose,
  onRecorded,
}: {
  container: LabContainer | null
  onClose: () => void
  onRecorded: () => Promise<unknown>
}) {
  const client = useQueryClient()
  const [reason, setReason] = useState(
    container?.labelPrintCount === 0 ? 'Initial container label' : '',
  )
  const [printDialogClosed, setPrintDialogClosed] = useState(false)
  const [failureDetails, setFailureDetails] = useState('')
  const label = useQuery({
    queryKey: ['lab-container-label', container?.id],
    queryFn: () => getLabContainerLabel(container!.id),
    enabled: Boolean(container),
  })
  const record = useMutation({
    mutationFn: (outcome: 'Succeeded' | 'Failed') =>
      recordLabContainerLabelPrint(container!.id, {
        reason,
        outcome,
        failureDetails: outcome === 'Failed' ? failureDetails : null,
      }),
    onSuccess: async (_, outcome) => {
      await client.invalidateQueries({ queryKey: ['lab-container-label', container?.id] })
      await onRecorded()
      if (outcome === 'Succeeded') {
        onClose()
        return
      }
      setPrintDialogClosed(false)
      setFailureDetails('')
    },
  })

  const openPrintDialog = () => {
    setPrintDialogClosed(false)
    window.print()
    setPrintDialogClosed(true)
  }

  return (
    <Dialog open={container !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{container?.labelPrintCount ? 'Reprint container label' : 'Print container label'}</DialogTitle>
          <DialogDescription>
            POMS renders a Code 39 label through the browser and your installed
            printer driver. Confirm the physical outcome after the system print
            dialog closes.
          </DialogDescription>
        </DialogHeader>

        {label.isLoading ? <p role="status">Preparing label…</p> : null}
        {label.error ? (
          <Alert variant="destructive">
            <AlertTitle>Label could not be prepared</AlertTitle>
            <AlertDescription>
              {getLabOperationsError(label.error, 'Close this window and try again.')}
            </AlertDescription>
          </Alert>
        ) : null}

        {label.data ? (
          <>
            <div className="lab-label-print-surface rounded-lg border bg-white p-4 text-black">
              <div className="flex items-start justify-between gap-4 text-xs font-semibold uppercase tracking-wide">
                <span>Phaeno</span>
                <span>{label.data.container.kind}</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold">{label.data.container.label}</p>
              <Code39Barcode value={label.data.container.barcode} />
              <p className="text-center font-mono text-sm font-semibold tracking-wider">
                {label.data.container.barcode}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] leading-4">
                <span>Accession: {label.data.accessionNumber ?? 'Not assigned'}</span>
                <span>Order: {label.data.commercialOrderNumber ?? 'Internal'}</span>
                <span>Location: {label.data.container.location}</span>
                <span>
                  Quantity: {label.data.container.quantity ?? '—'} {label.data.container.quantityUnit ?? ''}
                </span>
                {label.data.parentBarcode ? (
                  <span className="col-span-2">Parent: {label.data.parentBarcode}</span>
                ) : null}
              </div>
            </div>

            <div>
              <Label htmlFor="lab-label-print-reason">
                Print reason <span aria-hidden="true">*</span>
              </Label>
              <Input
                className="mt-2"
                id="lab-label-print-reason"
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                required
                value={reason}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Initial labels and every reprint retain their own reason and outcome.
              </p>
            </div>

            {printDialogClosed ? (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="font-medium">Did the physical label print correctly?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  POMS cannot infer the printer’s physical outcome from the browser dialog.
                  Confirm success only after inspecting the label.
                </p>
                <Label className="mt-4 block" htmlFor="lab-label-print-failure">
                  Failure details
                </Label>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  id="lab-label-print-failure"
                  maxLength={1000}
                  onChange={(event) => setFailureDetails(event.target.value)}
                  placeholder="Required only when the print did not complete."
                  value={failureDetails}
                />
              </div>
            ) : null}

            {record.error ? (
              <Alert variant="destructive">
                <AlertTitle>Print outcome was not recorded</AlertTitle>
                <AlertDescription>
                  {getLabOperationsError(record.error, 'Check the reason and try again.')}
                </AlertDescription>
              </Alert>
            ) : null}

            {label.data.printHistory.length > 0 ? (
              <section aria-labelledby="label-print-history-title">
                <h3 className="font-medium" id="label-print-history-title">Print history</h3>
                <div className="mt-2 max-h-32 divide-y overflow-y-auto rounded-lg border px-3">
                  {label.data.printHistory.map((item) => (
                    <div className="py-2 text-xs" key={item.id}>
                      <p className="font-medium">
                        {item.outcome}{item.printNumber ? ` · print ${item.printNumber}` : ''}
                      </p>
                      <p className="text-muted-foreground">
                        {item.reason} · {formatDate(item.occurredAtUtc)}
                      </p>
                      {item.failureDetails ? <p className="text-destructive">{item.failureDetails}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          {printDialogClosed ? (
            <>
              <Button
                disabled={!reason.trim() || record.isPending}
                onClick={openPrintDialog}
                type="button"
                variant="outline"
              >
                <Printer data-icon="inline-start" /> Print again
              </Button>
              <Button
                disabled={!reason.trim() || !failureDetails.trim() || record.isPending}
                onClick={() => record.mutate('Failed')}
                type="button"
                variant="destructive"
              >
                <XCircle data-icon="inline-start" /> Record failed attempt
              </Button>
              <Button
                disabled={!reason.trim() || record.isPending}
                onClick={() => record.mutate('Succeeded')}
                type="button"
              >
                <CheckCircle2 data-icon="inline-start" /> Label printed
              </Button>
            </>
          ) : (
            <Button
              disabled={!label.data || !reason.trim()}
              onClick={openPrintDialog}
              type="button"
            >
              <Printer data-icon="inline-start" /> Open print dialog
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
