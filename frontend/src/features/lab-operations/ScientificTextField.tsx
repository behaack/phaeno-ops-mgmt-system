import { useRef } from 'react'
import { Controller, type Control, type FieldPathByValue } from 'react-hook-form'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '#/components/ui/dropdown-menu'
import type { ProtocolDefinitionFormValues } from './protocol-definition'

const units = ['µL', 'mL', 'L', 'ng', 'µg', 'mg', 'g', 'ng/µL', 'µg/mL', 'mM', 'µM', '°C', 'min', 's', '%']
const symbols = [
  ['µ', 'Micro'], ['Δ', 'Delta'], ['°', 'Degree'], ['±', 'Plus or minus'], ['×', 'Multiplication'],
  ['≤', 'Less than or equal to'], ['≥', 'Greater than or equal to'],
] as const

export function ScientificTextField({ control, name, id, label, multiline = false, unit = false, placeholder }: {
  control: Control<ProtocolDefinitionFormValues>
  name: FieldPathByValue<ProtocolDefinitionFormValues, string | undefined>
  id: string
  label: string
  multiline?: boolean
  unit?: boolean
  placeholder?: string
}) {
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const selection = useRef<{ start: number; end: number } | null>(null)
  const insertedAt = useRef<number | null>(null)
  function rememberSelection() {
    const element = input.current
    if (element) selection.current = { start: element.selectionStart ?? element.value.length, end: element.selectionEnd ?? element.value.length }
  }
  return <Controller control={control} name={name} render={({ field, fieldState }) => {
    function insert(text: string, replace = false) {
      const value = field.value ?? ''
      const { start, end } = selection.current ?? { start: value.length, end: value.length }
      field.onChange(replace ? text : value.slice(0, start) + text + value.slice(end))
      insertedAt.current = replace ? text.length : start + text.length
    }
    const props = {
      id, name: field.name, value: field.value ?? '', placeholder,
      ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => { input.current = element; field.ref(element) },
      onChange: field.onChange, onBlur: () => { rememberSelection(); field.onBlur() }, onSelect: rememberSelection,
      'aria-invalid': fieldState.invalid || undefined,
    }
    return <div className="min-w-0 space-y-1.5">
      {multiline ? <textarea {...props} className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" /> : <Input {...props} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {unit ? <span className="text-xs text-muted-foreground">Choose a common unit or type your own.</span> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm" className="ml-auto" aria-label={`${unit ? 'Units and symbols for' : 'Insert symbol in'} ${label}`}>{unit ? 'Units and symbols' : 'Insert symbol'}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64" onCloseAutoFocus={event => {
            if (insertedAt.current === null) return
            event.preventDefault()
            input.current?.focus()
            input.current?.setSelectionRange(insertedAt.current, insertedAt.current)
            selection.current = { start: insertedAt.current, end: insertedAt.current }
            insertedAt.current = null
          }}>
            {unit ? <><DropdownMenuLabel>Common units</DropdownMenuLabel>{units.map(value => <DropdownMenuItem key={value} onSelect={() => insert(value, true)}>{value}</DropdownMenuItem>)}<DropdownMenuSeparator /></> : null}
            <DropdownMenuLabel>Insert at cursor</DropdownMenuLabel>
            {symbols.map(([symbol, description]) => <DropdownMenuItem key={symbol} onSelect={() => insert(symbol)}><span className="w-5 text-center">{symbol}</span>{description}</DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  }} />
}
