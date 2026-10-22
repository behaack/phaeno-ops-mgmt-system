import { Field as PortalField } from '#/components/ui/field'
import { useEffect, useId, useRef, useState } from 'react'
import { useIsMutating, useMutation, useQuery } from '@tanstack/react-query'
import { readProcedureIllustration, uploadProcedureIllustration } from '#/api/lab-procedures'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import type { InstructionIllustration } from './procedure-types'
import { PreparationField } from './preparation-ui'

export function useIllustrationUploadPending() { return useIsMutating({ mutationKey: ['procedure-illustration-upload'] }) > 0 }

export function ProcedureIllustration({ image }: { image: InstructionIllustration }) {
  const ref = useRef<HTMLImageElement>(null)
  const [decodeError, setDecodeError] = useState(false)
  const query = useQuery({ queryKey: ['procedure-illustration', image.assetId], queryFn: () => readProcedureIllustration(image.assetId), staleTime: Infinity, gcTime: 0, retry: false })
  useEffect(() => {
    if (!query.data || !ref.current) return
    const url = URL.createObjectURL(query.data)
    ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [query.data])
  return <figure className="procedure-figure my-3" data-procedure-loading={query.isPending || undefined} data-procedure-error={query.isError || decodeError || undefined}>
    {query.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading illustration…</p> : null}
    {query.error || decodeError ? <p role="alert" className="text-sm text-destructive">Illustration unavailable: {image.altText}</p> : null}
    <img ref={ref} onError={() => setDecodeError(true)} alt={image.altText} className={`mx-auto max-h-[28rem] max-w-full rounded object-contain ${query.data ? '' : 'hidden'}`} />
    {image.caption ? <figcaption className="mt-2 text-sm text-muted-foreground">{image.caption}</figcaption> : null}
  </figure>
}

export function ProcedureIllustrationsEditor({ images, onChange, disabled = false }: { images: InstructionIllustration[]; onChange: (images: InstructionIllustration[]) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const upload = useMutation({ mutationKey: ['procedure-illustration-upload'], mutationFn: async (file: File) => {
    if (!file.size || file.size > 10 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image of at most 10 MiB.')
    return uploadProcedureIllustration(file)
  }, onSuccess: asset => { onChange([...images, { assetId: asset.id, altText: '', caption: '' }]); if (fileRef.current) fileRef.current.value = '' } })
  return <fieldset className="space-y-3 rounded-lg border p-3" disabled={disabled || upload.isPending}>
    <legend className="text-sm font-medium">Illustrations (optional)</legend>
    <p className="text-xs text-muted-foreground">PNG, JPEG or WebP · up to 10 MiB each. An approved revision retains its exact images. Removing an illustration here does not delete historical files.</p>
    {images.map((image, index) => <div key={image.assetId} className="space-y-2 rounded-md border p-3">
      <ProcedureIllustration image={image} />
      <PreparationField label="Alternative text" id={`image-alt-${image.assetId}`} required><Input id={`image-alt-${image.assetId}`} value={image.altText} maxLength={500} onChange={e => onChange(images.map((v, i) => i === index ? { ...v, altText: e.target.value } : v))} /></PreparationField>
      <PreparationField label="Caption" id={`image-caption-${image.assetId}`}><Input id={`image-caption-${image.assetId}`} value={image.caption ?? ''} maxLength={1000} onChange={e => onChange(images.map((v, i) => i === index ? { ...v, caption: e.target.value } : v))} /></PreparationField>
      <Button type="button" variant="outline" onClick={() => onChange(images.filter((_, i) => i !== index))}>Remove illustration {index + 1}</Button>
    </div>)}
    {images.length < 12 ? <PortalField><Label className="sr-only" htmlFor={inputId}>Add illustration</Label><Input ref={fileRef} id={inputId} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) upload.mutate(file) }} /></PortalField> : null}
    {upload.isPending ? <p role="status">Uploading and scanning illustration…</p> : null}
    {upload.error ? <p role="alert" className="text-sm text-destructive">{getLabOperationsError(upload.error, upload.error instanceof Error ? upload.error.message : 'The illustration could not be uploaded.')}</p> : null}
  </fieldset>
}
