import { useState } from 'react'
import { Download } from 'lucide-react'
import { downloadPreparationQcReport, type PreparationDetail } from '#/api/lab-preparation'
import { Button } from '#/components/ui/button'

export function PreparationQcReportDownload({ batchId, record }: { batchId: string; record?: PreparationDetail['records'][number] }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const isPreparationReport = Boolean(record?.details.preparationReport)
  const report = record?.details.preparationReport ?? record?.details.qcReport
  if (!record || !report) return null
  const download = async () => {
    if (pending) return
    setPending(true)
    setError('')
    try {
      const blob = await downloadPreparationQcReport(batchId, record.id, isPreparationReport)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = report.fileName
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('The report could not be downloaded. Please try again.')
    } finally {
      setPending(false)
    }
  }
  return <div className="mt-2 space-y-1">
    <Button type="button" variant="outline" size="sm" className="h-auto max-w-full whitespace-normal text-left" disabled={pending} onClick={() => void download()}><Download aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 break-all">{pending ? 'Downloading…' : `${isPreparationReport ? 'Preparation report' : 'QC report'}: ${report.fileName}`}</span></Button>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </div>
}
