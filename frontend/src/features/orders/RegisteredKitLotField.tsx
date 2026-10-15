import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { listPSeqKitLots } from '#/api/pseq-kit-lots'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'

export function RegisteredKitLotField({ productId, value, onChange, error, disabled }: {
  productId?: string; value: string; onChange: (value: string) => void; error?: string; disabled?: boolean
}) {
  const id = useId()
  const lots = useQuery({ queryKey: ['pseq-kit-lots', { productId, search: value }],
    queryFn: () => listPSeqKitLots({ catalogItemId: productId, search: value }), enabled: Boolean(productId) })
  const selected = lots.data?.items.find(lot => lot.lotNumber.trim().toUpperCase() === value.trim().toUpperCase())
  return <Field><Label htmlFor={id}><RequiredFieldName>Registered lot number</RequiredFieldName></Label>
    <Input id={id} list={`${id}-choices`} value={value} onChange={event => onChange(event.target.value)} disabled={disabled || !productId} required autoComplete="off" aria-invalid={Boolean(error)} aria-describedby={`${id}-help ${id}-error`} />
    <datalist id={`${id}-choices`}>{lots.data?.items.map(lot => <option key={lot.id} value={lot.lotNumber}>{lot.isRecalled ? 'Recalled' : lot.expirationDate ? `Expires ${lot.expirationDate}` : 'Expiration unknown'}</option>)}</datalist>
    <FieldDescription id={`${id}-help`}>{lots.isError ? 'Registered lots could not be loaded. Reopen the form to retry.' : selected ? `Labeled expiration: ${selected.expirationDate ?? 'Unknown'}.${selected.isRecalled ? ' This lot is recalled and cannot ship.' : ''}` : 'Type the lot number to find a registered lot for this product. Register missing lots in Order Settings → PSeq kit lots.'}</FieldDescription>
    <FieldError id={`${id}-error`}>{error}</FieldError>
  </Field>
}
