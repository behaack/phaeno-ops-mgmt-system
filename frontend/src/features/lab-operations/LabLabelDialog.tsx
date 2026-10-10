import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Printer, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import {
  getLabContainerLabel,
  getLabOperationsError,
  recordLabContainerLabelPrint,
  type LabContainer,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogReturnFocus, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/ui/native-select'
import { RequiredFieldName, RequiredLegend } from '#/components/ui/required-field'

import { createDataMatrixSource, IdentifierDataMatrix } from '#/components/identifier-data-matrix'

export function LabLabelDialog({
  container,
  onClose,
  onRecorded,
  returnFocusId,
}: {
  container: LabContainer | null
  onClose: () => void
  onRecorded: () => Promise<unknown>
  returnFocusId?: string
}) {
  const client = useQueryClient()
  const [printDialogClosed, setPrintDialogClosed] = useState(false)
  const scanInput = useRef<HTMLInputElement>(null)
  const outcomeInput = useRef<HTMLSelectElement>(null)
  const label = useQuery({
    queryKey: ['lab-container-label', container?.id],
    queryFn: () => getLabContainerLabel(container!.id),
    enabled: Boolean(container),
  })
  const labelSymbol = useMemo(
    () => label.data ? createDataMatrixSource(label.data.container.barcode) : null,
    [label.data],
  )
  const schema = useMemo(() => z.object({
    reason: z.string().trim().min(1, 'Enter a print reason.').max(500),
    outcome: z.enum(['', 'Succeeded', 'Failed']).refine(value => value !== '', 'Choose a print outcome.'),
    failureDetails: z.string().trim().max(1000),
    scannedBarcode: z.string().max(100),
  }).superRefine((values, context) => {
    if (values.outcome === 'Failed' && !values.failureDetails) {
      context.addIssue({ code: 'custom', path: ['failureDetails'], message: 'Describe why the label did not print.' })
    }
    if (values.outcome === 'Succeeded' && normalizeScan(values.scannedBarcode) !== label.data?.container.barcode) {
      context.addIssue({ code: 'custom', path: ['scannedBarcode'], message: 'Scan the printed label and confirm it matches this container.' })
    }
  }), [label.data?.container.barcode])
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: container?.labelPrintCount === 0 ? 'Initial container label' : '', outcome: '', failureDetails: '', scannedBarcode: '' },
  })
  const reason = useWatch({ control: form.control, name: 'reason' })
  const outcome = useWatch({ control: form.control, name: 'outcome' })
  const scannedBarcode = useWatch({ control: form.control, name: 'scannedBarcode' })
  const scanRegistration = form.register('scannedBarcode')
  const outcomeRegistration = form.register('outcome')
  const record = useMutation({
    mutationFn: ({ outcome, reason, failureDetails, scannedBarcode }: z.infer<typeof schema>) =>
      recordLabContainerLabelPrint(container!.id, {
        reason,
        outcome,
        failureDetails: outcome === 'Failed' ? failureDetails : null,
        scannedBarcode: outcome === 'Succeeded' ? scannedBarcode : null,
      }),
    onSuccess: async (_, { outcome }) => {
      await client.invalidateQueries({ queryKey: ['lab-container-label', container?.id] })
      await onRecorded()
      if (outcome === 'Succeeded') {
        onClose()
        return
      }
      setPrintDialogClosed(false)
      form.setValue('outcome', '')
      form.setValue('failureDetails', '')
      form.setValue('scannedBarcode', '')
      form.clearErrors()
    },
  })

  const openPrintDialog = () => {
    setPrintDialogClosed(false)
    form.setValue('outcome', '')
    form.setValue('scannedBarcode', '')
    form.clearErrors()
    record.reset()
    window.print()
    setPrintDialogClosed(true)
  }

  const recordEarlierPrint = () => {
    form.setValue('outcome', '')
    form.setValue('failureDetails', '')
    form.setValue('scannedBarcode', '')
    form.clearErrors()
    record.reset()
    setPrintDialogClosed(true)
  }

  useEffect(() => {
    if (printDialogClosed) outcomeInput.current?.focus()
  }, [printDialogClosed])

  const normalizedScan = normalizeScan(scannedBarcode)
  const scanMatches = normalizedScan === label.data?.container.barcode

  return (
    <DialogReturnFocus target={null} fallbackId={returnFocusId}>
    <Dialog open={container !== null} onOpenChange={(open) => !open && !printDialogClosed && !record.isPending && onClose()}>
      <DialogContent className="lab-label-print-dialog max-w-2xl" showCloseButton={!printDialogClosed}>
        {/* Use one page type for the entire print document, including its portal ancestors. */}
        <style media="print">{'@media print { @page { size: 50mm 25mm; margin: 0; } }'}</style>
        <DialogHeader>
          <DialogTitle>{container?.labelPrintCount ? 'Reprint container label' : 'Print container label'}</DialogTitle>
          <DialogDescription>
            POMS renders a DataMatrix tube label through the browser and your installed
            printer driver on 50 × 25 mm stock. Record whether it printed; a successful
            print also requires a matching scan.
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
            <div className="lab-label-preview">
            <div aria-label="50 by 25 millimeter container label preview" className="lab-label-print-surface">
              <div className="lab-label-heading">
                <span>Phaeno</span>
                <span>{label.data.container.kind.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
              </div>
              <p className="lab-label-title">{label.data.container.label}</p>
              <IdentifierDataMatrix value={label.data.container.barcode} label="Container DataMatrix" source={labelSymbol} />
              <div className="lab-label-metadata">
                <span>Accession: {label.data.accessionNumber ?? 'Not assigned'}</span>
                <span>Order: {label.data.commercialOrderNumber ?? 'Internal'}</span>
                <span>Location: {label.data.container.location}</span>
                <span>
                  Quantity: {label.data.container.quantity ?? '—'} {label.data.container.quantityUnit ?? ''}
                </span>
                {label.data.parentBarcode ? (
                  <span>Parent: {label.data.parentBarcode}</span>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">Label size: 50 × 25 mm. Print at 100% scale, with margins and browser headers off.</p>
            {!printDialogClosed ? <p className="mt-2 text-sm">If this exact label was already printed but its outcome was not saved, use Actions → Record an earlier print. You must still confirm the outcome and verify a successful label with its matching barcode.</p> : null}
            </div>

            <form className="grid gap-4" id="lab-label-print-form" noValidate onSubmit={form.handleSubmit(values => {
              if (labelSymbol && !record.isPending) record.mutate(values)
            })}>
            <Field>
              <Label htmlFor="lab-label-print-reason">
                <RequiredFieldName>Print reason</RequiredFieldName>
              </Label>
              <Input
                id="lab-label-print-reason"
                maxLength={500}
                aria-invalid={Boolean(form.formState.errors.reason)}
                aria-describedby={form.formState.errors.reason ? 'lab-label-reason-error' : undefined}
                required
                {...form.register('reason')}
              />
              <FieldError id="lab-label-reason-error">{form.formState.errors.reason?.message}</FieldError>
              <FieldDescription>
                Initial labels and every reprint retain their own reason and outcome.
              </FieldDescription>
            </Field>

            {printDialogClosed ? (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="font-medium">Record the print outcome</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A failed or cancelled print does not need a scan. Record the outcome
                  before closing or trying again.
                </p>
                <Field className="mt-4">
                  <Label htmlFor="lab-label-outcome"><RequiredFieldName>Print outcome</RequiredFieldName></Label>
                  <NativeSelect id="lab-label-outcome" {...outcomeRegistration} onChange={(event) => {
                    void outcomeRegistration.onChange(event)
                    form.setValue('scannedBarcode', '')
                    form.clearErrors()
                    record.reset()
                  }} ref={element => { outcomeRegistration.ref(element); outcomeInput.current = element }} required disabled={record.isPending}
                    aria-invalid={Boolean(form.formState.errors.outcome)} aria-describedby={form.formState.errors.outcome ? 'lab-label-outcome-error' : undefined}>
                    <option value="">Choose an outcome…</option>
                    <option value="Succeeded">Printed correctly — verify by scanning</option>
                    <option value="Failed">Did not print or was cancelled</option>
                  </NativeSelect>
                  <FieldError id="lab-label-outcome-error">{form.formState.errors.outcome?.message}</FieldError>
                </Field>
                {outcome === 'Succeeded' ? <Field className="mt-4">
                <Label htmlFor="lab-label-scan-back">
                  <RequiredFieldName>Scan printed tube barcode</RequiredFieldName>
                </Label>
                <Input
                  autoComplete="off"
                  aria-describedby={(scannedBarcode && !scanMatches) || form.formState.errors.scannedBarcode ? 'lab-label-scan-back-error' : undefined}
                  aria-invalid={Boolean((scannedBarcode && !scanMatches) || form.formState.errors.scannedBarcode)}
                  id="lab-label-scan-back"
                  maxLength={100}
                  {...scanRegistration}
                  ref={element => { scanRegistration.ref(element); scanInput.current = element }}
                  required
                  spellCheck={false}
                />
                {scannedBarcode && !scanMatches ? (
                  <p className="mt-1 text-sm text-destructive" id="lab-label-scan-back-error" role="alert">
                    This scan does not match the container label. Check the tube and print again if needed.
                  </p>
                ) : <FieldError id="lab-label-scan-back-error">{form.formState.errors.scannedBarcode?.message}</FieldError>}
                <FieldDescription>Scan the physical tube label. The scan must match this container before success can be recorded.</FieldDescription>
                </Field> : null}
                {outcome === 'Failed' ? <Field className="mt-4">
                <Label htmlFor="lab-label-print-failure">
                  <RequiredFieldName>Failure details</RequiredFieldName>
                </Label>
                <textarea
                  className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  id="lab-label-print-failure"
                  maxLength={1000}
                  placeholder="For example: printing was cancelled, the printer was offline, or the label layout was incorrect."
                  required
                  aria-invalid={Boolean(form.formState.errors.failureDetails)}
                  aria-describedby={form.formState.errors.failureDetails ? 'lab-label-failure-error' : undefined}
                  {...form.register('failureDetails')}
                />
                <FieldError id="lab-label-failure-error">{form.formState.errors.failureDetails?.message}</FieldError>
                </Field> : null}
              </div>
            ) : null}
            </form>

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

        <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center sm:justify-between">
          {label.data ? <RequiredLegend /> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={printDialogClosed || record.isPending}>Close</Button>
            </DialogClose>
            {printDialogClosed ? (
              <Button
                disabled={!labelSymbol || record.isPending || (outcome === 'Succeeded' && !scanMatches)}
                form="lab-label-print-form"
                type="submit"
                variant={outcome === 'Failed' ? 'destructive' : 'default'}
              >
                {outcome === 'Failed' ? <XCircle data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                {outcome === 'Failed' ? 'Record failed attempt' : outcome === 'Succeeded' ? 'Label printed' : 'Record outcome'}
              </Button>
            ) : (
              <ActionMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={!labelSymbol || !reason.trim()} type="button"><Printer aria-hidden="true" />Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={openPrintDialog}>Open print dialog</DropdownMenuItem>
                  <DropdownMenuItem onSelect={recordEarlierPrint}>Record an earlier print</DropdownMenuItem>
                </DropdownMenuContent>
              </ActionMenu>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </DialogReturnFocus>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function normalizeScan(value: string) {
  return value.trim().toUpperCase().replace(/^\*(.*)\*$/, '$1')
}
