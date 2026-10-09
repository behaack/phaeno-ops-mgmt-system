import { useId, useState, type RefObject } from 'react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import type { S3ScientificObject, S3ScientificPage } from '#/api/lab-s3-scientific'
import { getLabOperationsError } from '#/api/lab-operations'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'
import { Button } from '#/components/ui/button'

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes.toLocaleString()} bytes`
  const unit = bytes < 1024 * 1024 ? 'KiB' : 'MiB'
  const divisor = unit === 'KiB' ? 1024 : 1024 * 1024
  return `${(bytes / divisor).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`
}

export function S3ScientificFileDialog({ open, onOpenChange, queryKey, load, select, maximumBytes, fastqOnly = false, returnFocus }: {
  open: boolean; onOpenChange: (open: boolean) => void; queryKey: readonly string[]
  load: (cursor?: string) => Promise<S3ScientificPage>; select: (file: S3ScientificObject) => Promise<unknown>
  maximumBytes: number; fastqOnly?: boolean; returnFocus?: RefObject<HTMLButtonElement | null>
}) {
  const id = useId()
  const [selected, setSelected] = useState<S3ScientificObject>()
  const query = useInfiniteQuery({ queryKey, queryFn: ({ pageParam }) => load(pageParam),
    initialPageParam: undefined as string | undefined, getNextPageParam: page => page.nextCursor ?? undefined, enabled: open })
  const mutation = useMutation({ mutationFn: (file: S3ScientificObject) => select(file), retry: false, onSuccess: () => { setSelected(undefined); onOpenChange(false) } })
  const files = query.data?.pages.flatMap(page => page.files).filter(file => !fastqOnly || /\.(?:fastq|fq)(?:\.gz)?$/i.test(file.fileName)) ?? []
  function changeOpen(value: boolean) {
    if (mutation.isPending) return
    setSelected(undefined); mutation.reset(); onOpenChange(value)
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogContent className="sm:max-w-2xl" onCloseAutoFocus={event => {
      if (returnFocus?.current) { event.preventDefault(); returnFocus.current.focus() }
    }}>
      <DialogHeader><DialogTitle>Choose an original S3 file</DialogTitle>
        <DialogDescription>Only files belonging to this scientific record are shown. POMS verifies and scans the original without creating another stored copy.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {query.data?.pages[0]?.sourceLocation ? <details className="text-sm"><summary className="cursor-pointer">Source folder for this intake</summary>
          <p className="mt-2 break-all font-mono text-xs">{query.data.pages[0].sourceLocation}</p>
          <p className="mt-1 text-xs text-muted-foreground">Share this folder with the authorized producer before their first upload. Folder knowledge does not grant S3 access.</p>
        </details> : null}
        {query.isPending ? <p role="status">Loading S3 files…</p> : null}
        {query.isError ? <div role="alert"><p>{getLabOperationsError(query.error, 'S3 files could not be loaded.')}</p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>Reload S3 files</Button></div> : null}
        {query.data?.pages[0]?.available === false ? <p>S3 access is not configured in this environment. Contact Operations.</p> : null}
        {query.data?.pages[0]?.available && files.length === 0 && !query.isPending ? <p>No eligible files are on this page.</p> : null}
        {files.length > 0 ? <fieldset className="min-w-0 space-y-2" disabled={mutation.isPending}>
          <legend className="mb-2 text-sm font-medium"><RequiredFieldName>Original file</RequiredFieldName></legend>
          {files.map(file => <label key={file.key} aria-label={file.fileName} htmlFor={`${id}-${encodeURIComponent(file.key)}`} className="flex min-w-0 cursor-pointer items-start gap-2 rounded-md border p-3 has-[:disabled]:cursor-default">
            <input id={`${id}-${encodeURIComponent(file.key)}`} type="radio" name={id} className="mt-1 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" value={file.key} checked={selected?.key === file.key && selected.eTag === file.eTag}
              disabled={file.sizeBytes > maximumBytes} onChange={() => { setSelected(file); mutation.reset() }} />
            <span className="min-w-0"><span className="block break-all text-sm">{file.fileName}</span>
              <span className="block text-xs text-muted-foreground">{fileSize(file.sizeBytes)}{file.sizeBytes > maximumBytes ? ' · Exceeds the current verification limit' : ''}</span>
              <span className="block break-all text-xs text-muted-foreground">{file.key}</span>
            </span>
          </label>)}
        </fieldset> : null}
        {query.hasNextPage ? <Button type="button" variant="outline" disabled={query.isFetchingNextPage || mutation.isPending} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? 'Loading…' : 'Load more files'}</Button> : null}
        {mutation.isPending ? <p role="status">Verifying the original file and scanning its complete contents…</p> : null}
        {mutation.isError ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(mutation.error, 'The original file could not be admitted. Reload the files or retry verification.')}</p> : null}
      </div>
      <RequiredDialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => changeOpen(false)}>Cancel</Button>
        <Button type="button" disabled={!selected || mutation.isPending || query.isError} onClick={() => { if (selected) mutation.mutate(selected) }}>
          {mutation.isPending ? 'Verifying…' : 'Use verified original'}</Button>
      </RequiredDialogFooter>
    </DialogContent>
  </Dialog>
}
