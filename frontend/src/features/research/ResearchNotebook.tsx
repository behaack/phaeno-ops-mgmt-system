import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { downloadResearchAttachment, useResearchQuery, type Attachment, type ResearchBlock } from './research-api'
import { ResearchFeedback } from './ResearchCommon'

export function ResearchNotebook({ blocks, experimentId, entryId }: { blocks: ResearchBlock[]; experimentId?: string; entryId?: string }) {
  const files = useResearchQuery<Attachment[]>(`experiments/${experimentId}/entries/${entryId}/attachments`, undefined, Boolean(experimentId && entryId))
  return <div className="space-y-5"><ResearchFeedback error={files.error} />{blocks.length ? blocks.map(block => <section key={block.id} className="min-w-0 space-y-2"><h3 className="break-words font-semibold">{block.label}</h3>
    {block.kind === 'text' ? <p className="whitespace-pre-wrap break-words text-sm leading-6">{block.text || <span className="text-muted-foreground">No notes recorded.</span>}</p>
      : block.kind === 'table' ? <div className="overflow-x-auto rounded-md border"><table className="w-full text-left text-sm"><caption className="sr-only">{block.label}</caption><thead><tr>{block.columns?.map((column, i) => <th className="border-b bg-muted px-3 py-2" key={i} scope="col">{column || `Column ${i + 1}`}</th>)}</tr></thead><tbody>{block.rows?.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="whitespace-pre-wrap border-b px-3 py-2">{cell}</td>)}</tr>)}</tbody></table>{!block.rows?.length ? <p className="p-3 text-sm text-muted-foreground">No values recorded.</p> : null}</div>
      : files.data?.find(f => f.id === block.attachmentId) ? <ResearchAttachmentView file={files.data.find(f => f.id === block.attachmentId)!} />
        : <p className="text-sm text-muted-foreground">{files.isLoading ? 'Loading attachment…' : 'Attachment metadata unavailable.'}</p>}
  </section>) : <p className="text-sm text-muted-foreground">This entry has no sections yet.</p>}</div>
}
export function ResearchAttachmentView({ file }: { file: Attachment }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  useEffect(() => {
    if (!preview) return
    let active = true; let url: string | undefined
    void downloadResearchAttachment(file, true).then(blob => { if (!active) return; url = URL.createObjectURL(blob); setImageUrl(url) }).catch(error => { if (active) setError(error) })
    return () => { active = false; if (url) URL.revokeObjectURL(url); setImageUrl(null) }
  }, [file, preview])
  async function download() {
    setBusy(true); setError(null)
    try { const blob = await downloadResearchAttachment(file); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
    catch (error) { setError(error) } finally { setBusy(false) }
  }
  return <div className="space-y-3 rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="break-all text-sm">{file.fileName} <span className="text-muted-foreground">({(file.sizeBytes / 1024).toLocaleString('en-US', { maximumFractionDigits: 1 })} KiB)</span></p>
    <ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={busy}>Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void download()}>{busy ? 'Downloading…' : 'Download file'}</DropdownMenuItem>{file.contentType.startsWith('image/') ? <DropdownMenuItem onSelect={() => { setError(null); setPreview(!preview) }}>{preview ? 'Close image preview' : 'Preview image'}</DropdownMenuItem> : null}</DropdownMenuContent></ActionMenu></div>
    <ResearchFeedback error={error} />{preview && !imageUrl && !error ? <p role="status">Loading image…</p> : null}{imageUrl ? <img src={imageUrl} alt={file.fileName} className="max-h-96 max-w-full rounded-md object-contain" /> : null}
  </div>
}
