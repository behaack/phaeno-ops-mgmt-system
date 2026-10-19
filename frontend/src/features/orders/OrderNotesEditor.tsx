import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Button } from '#/components/ui/button'
import { Field, FieldDescription, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import type { CommercialDraftForm } from './commercial-draft'
import { normalizeOrderRichText, orderRichTextClassName, richTextPlainText } from './order-rich-text'

const commands = [
  { command: 'bold', label: 'Bold', icon: Bold },
  { command: 'italic', label: 'Italic', icon: Italic },
  { command: 'underline', label: 'Underline', icon: Underline },
  { command: 'insertUnorderedList', label: 'Bulleted list', icon: List },
  { command: 'insertOrderedList', label: 'Numbered list', icon: ListOrdered },
] as const

export function OrderNotesEditor({ form, name }: { form: UseFormReturn<CommercialDraftForm>; name: 'privateNotes' | 'publicNotes' }) {
  const label = name === 'privateNotes' ? 'Private notes' : 'Public notes'
  const id = `draft-${name}`
  return <Controller control={form.control} name={name} render={({ field, fieldState }) => <Field>
    <Label htmlFor={id}>{label} (optional)</Label>
    <FieldDescription id={`${id}-help`}>{name === 'privateNotes' ? 'Visible only to Phaeno staff.' : 'Visible to the customer on Order review.'} Do not enter patient names or identifying information. Up to 2,000 text characters.</FieldDescription>
    <RichTextEditor id={id} label={label} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} invalid={Boolean(fieldState.error)} />
    <FieldError id={`${id}-error`}>{fieldState.error?.message}</FieldError>
  </Field>} />
}

function RichTextEditor({ id, label, value, onChange, onBlur, inputRef, invalid }: {
  id: string; label: string; value: string; onChange: (value: string) => void; onBlur: () => void;
  inputRef: (element: HTMLDivElement | null) => void; invalid: boolean;
}) {
  const editor = useRef<HTMLDivElement>(null)
  const selection = useRef<Range | null>(null)
  const emitted = useRef<string | null>(null)
  const [active, setActive] = useState<string[]>([])
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (editor.current && value !== emitted.current) {
      editor.current.innerHTML = normalizeOrderRichText(value)
      setCount(richTextPlainText(value).length)
      emitted.current = value
    }
  }, [value])
  useEffect(() => {
    function rememberSelection() {
      const current = document.getSelection()
      if (current?.rangeCount && editor.current?.contains(current.anchorNode) && editor.current.contains(current.focusNode)) {
        selection.current = current.getRangeAt(0).cloneRange()
        setActive(commands.filter(({ command }) => document.queryCommandState(command)).map(({ command }) => command))
      }
    }
    document.addEventListener('selectionchange', rememberSelection)
    return () => document.removeEventListener('selectionchange', rememberSelection)
  }, [])
  function change() {
    const normalized = normalizeOrderRichText(editor.current?.innerHTML ?? '')
    emitted.current = normalized
    setCount(richTextPlainText(normalized).length)
    onChange(normalized)
  }
  function restoreSelection() {
    editor.current?.focus()
    const current = document.getSelection()
    if (selection.current && editor.current?.contains(selection.current.commonAncestorContainer)) {
      current?.removeAllRanges()
      current?.addRange(selection.current)
    }
  }
  return <div className="min-w-0 rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50" data-invalid={invalid || undefined}>
    <div role="group" aria-label={`${label} formatting`} className="flex flex-wrap gap-1 border-b border-input p-1">
      {commands.map(({ command, label: commandLabel, icon: Icon }) => <Button key={command} type="button" size="icon" variant={active.includes(command) ? 'secondary' : 'ghost'} aria-label={commandLabel} title={commandLabel} aria-pressed={active.includes(command)} onMouseDown={event => event.preventDefault()} onClick={() => {
        restoreSelection()
        document.execCommand('styleWithCSS', false, 'false')
        document.execCommand(command)
        change()
        setActive(commands.filter(item => document.queryCommandState(item.command)).map(item => item.command))
      }}><Icon aria-hidden="true" /></Button>)}
    </div>
    <div id={id} ref={element => { editor.current = element; inputRef(element) }} role="textbox" tabIndex={0} aria-label={label} aria-multiline="true" aria-invalid={invalid} aria-describedby={`${id}-help ${id}-error ${id}-count`} contentEditable suppressContentEditableWarning className={`${orderRichTextClassName} min-h-28 max-h-80 overflow-y-auto px-3 py-2 text-sm outline-none`} onInput={change} onBlur={onBlur} onDrop={event => event.preventDefault()} onPaste={event => {
      event.preventDefault()
      const html = event.clipboardData.getData('text/html')
      if (html) document.execCommand('insertHTML', false, normalizeOrderRichText(html))
      else document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
      change()
    }} />
    <p id={`${id}-count`} className="px-3 pb-2 text-xs text-muted-foreground">{count.toLocaleString()} / 2,000</p>
  </div>
}
