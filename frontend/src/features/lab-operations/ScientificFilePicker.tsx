import { useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getScientificFiles, scientificFilesKey, uploadScientificFile, type ScientificFile } from '#/api/lab-scientific-evidence'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { RequiredFieldName } from '#/components/ui/required-field'
import { FieldError } from '#/components/ui/field'
import { EvidenceError } from './InvestigationEvidence'

export function ScientificFilePicker({ work, specimen, label, reference, required, error, onUploaded, onBusyChange }: {
  work: string; specimen: string; label: string; reference: string; required?: boolean; error?: string
  onUploaded: (file: ScientificFile) => void; onBusyChange: (busy: boolean) => void
}) {
  const id = useId()
  const client = useQueryClient()
  const key = scientificFilesKey(work, specimen)
  const query = useQuery({ queryKey: key, queryFn: () => getScientificFiles(work, specimen) })
  const [progress, setProgress] = useState(0)
  const [selectionError, setSelectionError] = useState('')
  const current = query.data?.files.find(f => f.externalFileReference === reference)
  const mutation = useMutation({
    mutationFn: (file: File) => uploadScientificFile(work, specimen, file, setProgress),
    onSuccess: file => {
      client.setQueryData<Awaited<ReturnType<typeof getScientificFiles>>>(key, old =>
        old ? { ...old, files: [file, ...old.files.filter(f => f.id !== file.id)] } : old)
      onUploaded(file)
    },
    onSettled: () => onBusyChange(false),
    retry: false,
  })
  function choose(file?: File) {
    if (!file || mutation.isPending) return
    setSelectionError('')
    if (!query.data || file.size <= 0 || file.size > query.data.maximumBytes) {
      setSelectionError('Choose a nonempty file within the displayed size limit.'); return
    }
    setProgress(0); onBusyChange(true); mutation.mutate(file)
  }
  return <div className="min-w-0 space-y-1">
    <Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>
    {reference ? <p className="break-all text-sm">{current?.fileName ?? (reference.startsWith('poms-file:') ? 'Previously uploaded file' : 'Previously recorded external file (not stored in POMS)')}</p> : null}
    <Input id={id} type="file" disabled={mutation.isPending || !query.data || query.isError}
      aria-required={required} aria-invalid={Boolean(error || selectionError)} aria-describedby={id + '-help ' + id + '-error'}
      onChange={event => { choose(event.target.files?.[0]); event.target.value = '' }} />
    <p id={id + '-help'} className="text-xs text-muted-foreground">{query.data ? `Up to ${Math.round(query.data.maximumBytes / 1024 / 1024)} MiB. Uploads can resume for 24 hours. POMS verifies the complete file before retaining it as evidence.` : 'Loading upload limits…'}</p>
    {mutation.isPending ? <p role="status" className="text-sm">{progress < 100 ? `Uploading… ${progress}%` : 'Verifying and scanning…'}</p> : null}
    <FieldError id={id + '-error'}>{selectionError || error}</FieldError>
    {mutation.isError ? <><EvidenceError error={mutation.error} />
      <p className="text-xs text-muted-foreground">Completed portions are retained for 24 hours. Resume here, or select the same file after reopening this page.</p>
      <Button type="button" variant="outline" onClick={() => choose(mutation.variables)}>Resume upload</Button></> : null}
    {query.isError ? <><EvidenceError error={query.error} /><Button type="button" variant="outline" onClick={() => void query.refetch()}>Reload file options</Button></> : null}
  </div>
}
