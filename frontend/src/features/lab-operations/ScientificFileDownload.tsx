import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { downloadScientificFile, getScientificFiles, scientificFilesKey } from '#/api/lab-scientific-evidence'
import { Button } from '#/components/ui/button'
import { EvidenceError } from './InvestigationEvidence'

export function ScientificFileDownload({ work, specimen, reference }: { work: string; specimen: string; reference: string }) {
  const managed = reference.startsWith('poms-file:')
  const query = useQuery({ queryKey: scientificFilesKey(work, specimen), queryFn: () => getScientificFiles(work, specimen), enabled: managed })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>()
  if (!managed) return <p className="break-all text-sm">External file: {reference} · Not stored in POMS</p>
  const file = query.data?.files.find(f => f.externalFileReference === reference)
  async function download() {
    if (!file || pending) return
    setPending(true); setError(undefined)
    try {
      const blob = await downloadScientificFile(work, specimen, file.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = file.fileName; document.body.append(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (failure) { setError(failure) } finally { setPending(false) }
  }
  return <div className="space-y-1">
    {query.isPending ? <p role="status">Loading file…</p> : file ? <Button type="button" size="sm" variant="outline" className="h-auto max-w-full whitespace-normal break-all text-left" disabled={pending} onClick={() => void download()}>{pending ? 'Verifying and downloading…' : `Download ${file.fileName}`}</Button> : query.isError ? <><EvidenceError error={query.error} /><Button type="button" variant="outline" onClick={() => void query.refetch()}>Reload file</Button></> : <p role="alert">The recorded managed file is unavailable. Contact an administrator.</p>}
    {error ? <EvidenceError error={error} /> : null}
  </div>
}
