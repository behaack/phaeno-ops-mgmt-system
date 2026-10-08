import type { UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'

export const tubeMaterialAmountShape = {
  customerDeclaredQuantity: z.string().trim().min(1, 'Enter the material amount in this tube.')
    .regex(/^\d+(?:\.\d{1,6})?$/, 'Use a positive number with up to six decimal places.')
    .refine(value => Number(value) > 0 && Number(value) < 1_000_000_000_000, 'Enter a positive material amount below 1,000,000,000,000.'),
  customerDeclaredQuantityUnit: z.string().trim().min(1, 'Enter the material unit.').max(50),
}

export function TubeMaterialAmountFields({ idPrefix, quantityField, unitField, quantityError, unitError, disabled }: {
  idPrefix: string
  quantityField: UseFormRegisterReturn
  unitField: UseFormRegisterReturn
  quantityError?: string
  unitError?: string
  disabled?: boolean
}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-amount`}><RequiredFieldName>Material amount in this tube</RequiredFieldName></Label>
      <p id={`${idPrefix}-amount-help`} className="text-xs text-muted-foreground">Enter the amount being sent in this physical tube.</p>
      <Input id={`${idPrefix}-amount`} type="number" inputMode="decimal" min="0.000001" step="0.000001" disabled={disabled}
        aria-invalid={Boolean(quantityError)} aria-describedby={`${idPrefix}-amount-help${quantityError ? ` ${idPrefix}-amount-error` : ''}`} {...quantityField} />
      {quantityError ? <p id={`${idPrefix}-amount-error`} role="alert" className="text-sm text-destructive">{quantityError}</p> : null}
    </div>
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-unit`}><RequiredFieldName>Material unit</RequiredFieldName></Label>
      <p id={`${idPrefix}-unit-help`} className="text-xs text-muted-foreground">For example, µL, mL, ng or µg.</p>
      <Input id={`${idPrefix}-unit`} maxLength={50} autoComplete="off" disabled={disabled}
        aria-invalid={Boolean(unitError)} aria-describedby={`${idPrefix}-unit-help${unitError ? ` ${idPrefix}-unit-error` : ''}`} {...unitField} />
      {unitError ? <p id={`${idPrefix}-unit-error`} role="alert" className="text-sm text-destructive">{unitError}</p> : null}
    </div>
  </div>
}
