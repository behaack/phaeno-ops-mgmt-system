import type { ComponentProps } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Field, FieldError } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'

type Row = { id: string; source: ComponentProps<typeof Input>; quantity: ComponentProps<typeof Input>; sourceError?: string; quantityError?: string }

export function TrialSourcesFields({ rows, prefix, total, error, onAdd, onRemove }: {
  rows: Row[]; prefix: string; total: number; error?: string; onAdd: () => void; onRemove: (index: number) => void
}) {
  return <fieldset className="space-y-1">
    <legend className="flex w-full items-center justify-between gap-3 text-sm"><span>Source / quantity</span><Button type="button" variant="outline" onClick={onAdd}>Add source</Button></legend>
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">List each organism/species and tissue or cell type with its sample quantity. Use research descriptions without personal identifiers.</p>
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_6rem_2rem]">
        <Label id={`${prefix}-source-heading`} htmlFor={`${prefix}-source-0`}><RequiredFieldName>Biological source</RequiredFieldName></Label>
        <Label id={`${prefix}-quantity-heading`} htmlFor={`${prefix}-quantity-0`}><RequiredFieldName>Samples</RequiredFieldName></Label>
        <span aria-hidden="true" />
        {rows.map((row, index) => <div key={row.id} className="col-span-full grid grid-cols-subgrid items-start gap-x-3">
          <Field><Input id={`${prefix}-source-${index}`} aria-labelledby={`${prefix}-source-heading`} aria-required="true" placeholder="Human PBMCs, mouse liver…" maxLength={500} {...row.source} aria-invalid={Boolean(row.sourceError)} aria-describedby={`${prefix}-source-${index}-error`} /><FieldError id={`${prefix}-source-${index}-error`}>{row.sourceError}</FieldError></Field>
          <Field><Input id={`${prefix}-quantity-${index}`} aria-labelledby={`${prefix}-quantity-heading`} aria-required="true" type="number" min={1} step={1} {...row.quantity} aria-invalid={Boolean(row.quantityError)} aria-describedby={`${prefix}-quantity-${index}-error`} /><FieldError id={`${prefix}-quantity-${index}-error`}>{row.quantityError}</FieldError></Field>
          <Button type="button" variant="outline" size="icon" disabled={rows.length === 1} aria-label={`Remove source ${index + 1}`} title={`Remove source ${index + 1}`} onClick={() => onRemove(index)}><Trash2 aria-hidden="true" /></Button>
        </div>)}
      </div>
      <FieldError>{error}</FieldError><p className="text-sm" aria-live="polite">Total samples: {total}</p>
    </div>
  </fieldset>
}
