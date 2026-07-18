import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ScanBarcode } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'

import {
  addLabBatchMember,
  getLabOperationsError,
  scanLabContainer,
  type LabBatch,
  type LabContainerScan,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export function LabBarcodeLookup() {
  const [barcode, setBarcode] = useState('')
  const [result, setResult] = useState<LabContainerScan | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const scan = useMutation({
    mutationFn: () => scanLabContainer(barcode),
    onSuccess: (next) => {
      setResult(next)
      setBarcode('')
      input.current?.focus()
    },
    onError: () => {
      setResult(null)
      input.current?.focus()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    scan.mutate()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan a container</CardTitle>
        <CardDescription>
          Locate Phaeno material by scanning into this field or entering its complete barcode.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="min-w-64 flex-1">
            <Label htmlFor="lab-container-scan">Phaeno barcode</Label>
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-2 font-mono"
              id="lab-container-scan"
              onChange={(event) => setBarcode(event.target.value)}
              ref={input}
              required
              spellCheck={false}
              value={barcode}
            />
          </div>
          <Button disabled={!barcode.trim() || scan.isPending} type="submit">
            <ScanBarcode data-icon="inline-start" /> Scan
          </Button>
        </form>
        {scan.error ? (
          <Alert className="mt-4" variant="destructive">
            <AlertTitle>Container not found</AlertTitle>
            <AlertDescription>
              {getLabOperationsError(scan.error, 'Check the complete barcode and scan again.')}
            </AlertDescription>
          </Alert>
        ) : null}
        <div aria-live="polite">
          {result ? (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    className="font-medium text-primary hover:underline"
                    params={{ workOrderId: result.labWorkOrderId }}
                    search={{ section: undefined }}
                    to="/lab-operations/$workOrderId"
                  >
                    {result.commercialOrderNumber ?? result.labWorkOrderId}
                  </Link>
                  <p className="mt-1 font-mono text-sm">{result.container.barcode}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.container.kind} · {result.accessionNumber ?? 'No accession'} · {result.container.location}
                    {result.parentBarcode ? ` · parent ${result.parentBarcode}` : ''}
                  </p>
                </div>
                <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                  {result.container.status}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function LabBatchBarcodeScanner({
  batches,
  onAdded,
}: {
  batches: LabBatch[]
  onAdded: () => Promise<unknown>
}) {
  const drafts = batches.filter((item) => item.status === 'Draft')
  const [batchId, setBatchId] = useState('')
  const [barcode, setBarcode] = useState('')
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const add = useMutation({
    mutationFn: async () => {
      const scanned = await scanLabContainer(barcode)
      if (!scanned.labLibraryId) {
        throw new Error('The scanned container is not a prepared library.')
      }
      if (scanned.libraryStatus !== 'QcPassed') {
        throw new Error('Only a QC-passed library can be added to a draft batch.')
      }
      await addLabBatchMember(batchId, {
        labWorkOrderId: scanned.labWorkOrderId,
        labLibraryId: scanned.labLibraryId,
      })
      return scanned
    },
    onSuccess: async (scanned) => {
      setMessage(`${scanned.container.barcode} was added to the selected batch.`)
      setBarcode('')
      await onAdded()
      input.current?.focus()
    },
    onError: () => input.current?.focus(),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    add.mutate()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan libraries into a batch</CardTitle>
        <CardDescription>
          Select one draft batch, then scan QC-passed library containers. Duplicate and
          wrong-context scans are rejected without changing membership.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_minmax(14rem,2fr)_auto]" onSubmit={submit}>
          <div>
            <Label htmlFor="lab-batch-scan-target">Draft batch</Label>
            <select
              className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm"
              id="lab-batch-scan-target"
              onChange={(event) => setBatchId(event.target.value)}
              required
              value={batchId}
            >
              <option value="">Select…</option>
              {drafts.map((item) => <option key={item.id} value={item.id}>{item.batchNumber}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="lab-batch-container-scan">Library barcode</Label>
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-2 font-mono"
              id="lab-batch-container-scan"
              onChange={(event) => setBarcode(event.target.value)}
              ref={input}
              required
              spellCheck={false}
              value={barcode}
            />
          </div>
          <Button
            className="self-end"
            disabled={!batchId || !barcode.trim() || add.isPending}
            type="submit"
          >
            <ScanBarcode data-icon="inline-start" /> Add scan
          </Button>
        </form>
        {add.error ? (
          <Alert className="mt-4" variant="destructive">
            <AlertTitle>Library was not added</AlertTitle>
            <AlertDescription>
              {getLabOperationsError(add.error, 'Check the container and selected batch.')}
            </AlertDescription>
          </Alert>
        ) : null}
        <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{message}</p>
        {drafts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Create a draft batch before scanning libraries.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
