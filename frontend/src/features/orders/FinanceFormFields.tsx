import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'

export const financeSelectClass = 'h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm'
export const financeTextareaClass = 'min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'

export function FinanceField({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>, { id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined })
    : children
  return <div className="space-y-2"><Label htmlFor={id}>{required ? <RequiredFieldName>{label}</RequiredFieldName> : label}</Label>{control}{error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}</div>
}

export function FinanceValidationSummary({ errors, focus }: { errors: Array<{ name: string; message: string }>; focus: (name: string) => void }) {
  if (!errors.length) return null
  return <Alert variant="destructive" role="alert"><AlertTitle>Please correct {errors.length} {errors.length === 1 ? 'field' : 'fields'}</AlertTitle><AlertDescription><ul>{errors.map(error => <li key={error.name}><button type="button" className="cursor-pointer text-left underline" onClick={() => focus(error.name)}>{error.message}</button></li>)}</ul></AlertDescription></Alert>
}

export function validFinanceDate(value: string) {
  const parsed = Date.parse(`${value}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
}
