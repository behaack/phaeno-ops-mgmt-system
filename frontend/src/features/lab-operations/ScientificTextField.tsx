import { useRef } from 'react'
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '#/components/ui/dropdown-menu'

const commonUnits = ['µL', 'mL', 'L', 'ng', 'µg', 'mg', 'g', 'ng/µL', 'µg/mL', 'mM', 'µM', '°C', 'min', 's', '%']
const symbols = [
  ['µ', 'Micro'], ['Δ', 'Delta'], ['°', 'Degree'], ['±', 'Plus or minus'], ['×', 'Multiplication'],
  ['≤', 'Less than or equal to'], ['≥', 'Greater than or equal to'],
] as const

export function ScientificTextField<T extends FieldValues>({ control, name, id, label, multiline = false, rows, unit = false, insertUnits = false, placeholder, additionalUnits = [], unitOptions = commonUnits, showSymbols = true, symbolOptions = symbols, disabled = false, describedBy }: {
  control: Control<T>
  name: FieldPathByValue<T, string | undefined>
  id: string
  label: string
  multiline?: boolean
  rows?: number
  insertUnits?: boolean
  symbolOptions?: readonly (readonly [string, string])[]
  unit?: boolean
  placeholder?: string
  additionalUnits?: readonly string[]
  unitOptions?: readonly string[]
  showSymbols?: boolean
  disabled?: boolean
  describedBy?: string
}) {
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const selection = useRef<{ start: number; end: number } | null>(null)
  const insertedAt = useRef<number | null>(null)
  function rememberSelection() {
    const element = input.current
    if (element) selection.current = { start: element.selectionStart ?? element.value.length, end: element.selectionEnd ?? element.value.length }
  }
  return <Controller control={control} name={name} render={({ field, fieldState }) => {
    const value = typeof field.value === 'string' ? field.value : ''
    function insert(text: string, replace = false) {
      const { start, end } = selection.current ?? { start: value.length, end: value.length }
      field.onChange(replace ? text : value.slice(0, start) + text + value.slice(end))
      insertedAt.current = replace ? text.length : start + text.length
    }
    const props = {
      id, name: field.name, value, placeholder, disabled,
      ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => { input.current = element; field.ref(element) },
      onChange: field.onChange, onBlur: () => { rememberSelection(); field.onBlur() }, onSelect: rememberSelection,
      'aria-invalid': fieldState.invalid || undefined,
      'aria-describedby': describedBy,
    }
    return <div className={showSymbols && !insertUnits ? "min-w-0 space-y-1.5" : "min-w-0 space-y-0"}>
      {multiline ? <textarea {...props} rows={rows} className="block min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" /> : <Input {...props} />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {unit && showSymbols && !insertUnits ? <span className="text-xs text-muted-foreground">Choose a common unit or type your own.</span> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" disabled={disabled} variant="ghost" size="sm" className={showSymbols && !insertUnits ? "ml-auto" : "ml-auto h-6 px-1 text-xs underline underline-offset-2"} aria-label={`${unit ? (showSymbols ? 'Units and symbols for' : 'Units for') : 'Insert symbol in'} ${label}`}>{unit ? (showSymbols ? 'Units and symbols' : 'Units') : 'Insert symbol'}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={showSymbols ? "w-64" : "w-40"} onCloseAutoFocus={event => {
            if (insertedAt.current === null) return
            event.preventDefault()
            input.current?.focus()
            input.current?.setSelectionRange(insertedAt.current, insertedAt.current)
            selection.current = { start: insertedAt.current, end: insertedAt.current }
            insertedAt.current = null
          }}>
            {unit ? <><DropdownMenuLabel>Common units</DropdownMenuLabel>{Array.from(new Set([...additionalUnits, ...unitOptions])).map(value => <DropdownMenuItem key={value} onSelect={() => insert(value, !insertUnits)}>{value}</DropdownMenuItem>)}{showSymbols ? <DropdownMenuSeparator /> : null}</> : null}
            {showSymbols ? <><DropdownMenuLabel>Insert at cursor</DropdownMenuLabel>
            {symbolOptions.map(([symbol, description]) => <DropdownMenuItem key={symbol} aria-label={`${symbol} ${description}`} onSelect={() => insert(symbol)}><span className="w-5 text-center">{symbol}</span>{description}</DropdownMenuItem>)}</> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  }} />
}
