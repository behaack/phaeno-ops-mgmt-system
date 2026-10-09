import { useId } from 'react'
import type { FileUploadProgress as UploadState } from '#/api/file-upload-progress'
import { ProgressBar } from './progress-bar'

const bytes = (value: number) => value < 1024 * 1024 ? `${(value / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KiB`
  : `${(value / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} MiB`

export function FileUploadProgress({ progress }: { progress: UploadState }) {
  const id = useId()
  const value = progress.percentage === undefined ? undefined : Math.max(0, Math.min(100, progress.percentage))
  return <div className="min-w-0 space-y-1" aria-live="polite">
    <label id={id + '-label'} htmlFor={id} className="block break-words text-sm">{progress.fileName} · {progress.message}{value === undefined ? '' : ` · ${Math.round(value)}%`}</label>
    <ProgressBar id={id} value={value} aria-labelledby={id + '-label'} />
    {progress.phase === 'extracting' && progress.totalItems !== undefined ? <p className="text-xs text-muted-foreground">{progress.completedItems ?? 0} of {progress.totalItems} files verified</p>
      : progress.phase === 'uploading' || progress.phase === 'complete' ? <p className="text-xs text-muted-foreground">{bytes(progress.transferredBytes)} of {bytes(progress.totalBytes)} transferred</p> : null}
  </div>
}
