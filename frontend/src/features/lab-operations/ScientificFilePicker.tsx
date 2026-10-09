import { useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getScientificFiles, scientificFilesKey, uploadScientificFile, type ScientificFile } from '#/api/lab-scientific-evidence'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { RequiredFieldName } from '#/components/ui/required-field'
import { FieldError } from '#/components/ui/field'
import { EvidenceError } from './InvestigationEvidence'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { getScientificS3Files, registerScientificS3File, type S3ScientificObject } from '#/api/lab-s3-scientific'
import { S3ScientificFileDialog } from './S3ScientificFileDialog'
import { FileUploadProgress } from '#/components/ui/file-upload-progress'
import type { FileUploadProgress as UploadState } from '#/api/file-upload-progress'

export function ScientificFilePicker({ work, specimen, label, reference, required, error, onUploaded, onBusyChange }: {
  work: string; specimen: string; label: string; reference: string; required?: boolean; error?: string
  onUploaded: (file: ScientificFile) => void; onBusyChange: (busy: boolean) => void
}) {
  const id = useId()
  const client = useQueryClient()
  const key = scientificFilesKey(work, specimen)
  const query = useQuery({ queryKey: key, queryFn: () => getScientificFiles(work, specimen) })
  const [progress, setProgress] = useState(0)
  const [transfer, setTransfer] = useState<UploadState>()
  const [selectionError, setSelectionError] = useState('')
  const [s3Open, setS3Open] = useState(false)
  const [s3Busy, setS3Busy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const actionButton = useRef<HTMLButtonElement>(null)
  async function useOriginal(file: S3ScientificObject) {
    setS3Busy(true); onBusyChange(true)
    try {
      const receipt = await registerScientificS3File(work, specimen, file)
      await client.invalidateQueries({ queryKey: key }); onUploaded(receipt)
    } finally { setS3Busy(false); onBusyChange(false) }
  }
  const current = query.data?.files.find(f => f.externalFileReference === reference)
  const mutation = useMutation({
    mutationFn: (file: File) => uploadScientificFile(work, specimen, file, setProgress, setTransfer),
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
    {reference ? <p className="break-all text-sm">{current?.fileName ?? (reference.startsWith('poms-file:') ? 'Previously uploaded file' : 'Previously recorded external file (not stored in POMS)')}{current?.sourceKind === 'S3Original' ? ' · Original S3 file' : ''}</p> : null}
    <Input ref={fileInput} id={id + '-file'} type="file" className="hidden" disabled={mutation.isPending || s3Busy || !query.data || query.isError}
      aria-label={`${label} file selection`}
      aria-required={required} aria-invalid={Boolean(error || selectionError)} aria-describedby={id + '-help ' + id + '-error'}
      onChange={event => { choose(event.target.files?.[0]); event.target.value = '' }} />
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={actionButton} id={id} type="button" variant="outline"
      disabled={mutation.isPending || s3Busy || !query.data || query.isError} aria-label={`${label} actions`} aria-describedby={id + '-help ' + id + '-error'}>Actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent><DropdownMenuItem onSelect={() => fileInput.current?.click()}>Upload from computer</DropdownMenuItem>
        {query.data?.s3Available ? <DropdownMenuItem onSelect={() => setS3Open(true)}>Choose original S3 file</DropdownMenuItem> : null}
        {mutation.isError ? <DropdownMenuItem onSelect={() => choose(mutation.variables)}>Resume upload</DropdownMenuItem> : null}
      </DropdownMenuContent>
    </ActionMenu>
    <S3ScientificFileDialog open={s3Open} onOpenChange={setS3Open} queryKey={['scientific-s3-files', work, specimen]}
      load={cursor => getScientificS3Files(work, specimen, cursor)} select={useOriginal} maximumBytes={query.data?.maximumBytes ?? 0} returnFocus={actionButton} />
    <p id={id + '-help'} className="text-xs text-muted-foreground">{query.data ? `Up to ${Math.round(query.data.maximumBytes / 1024 / 1024)} MiB. Uploads can resume for 24 hours. POMS verifies the complete file before retaining it as evidence.` : 'Loading upload limits…'}</p>
    {transfer ? <FileUploadProgress progress={transfer} /> : mutation.isPending ? <p role="status" className="text-sm">{progress < 100 ? `Uploading… ${progress}%` : 'Verifying and scanning…'}</p> : null}
    <FieldError id={id + '-error'}>{selectionError || error}</FieldError>
    {mutation.isError ? <><EvidenceError error={mutation.error} />
      <p className="text-xs text-muted-foreground">Completed portions are retained for 24 hours. Resume here, or select the same file after reopening this page.</p>
      </> : null}
    {query.isError ? <><EvidenceError error={query.error} /><Button type="button" variant="outline" onClick={() => void query.refetch()}>Reload file options</Button></> : null}
  </div>
}
