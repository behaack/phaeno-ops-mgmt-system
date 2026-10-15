import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { GripVertical } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '#/components/ui/button'
import { useIllustrationUploadPending } from './ProcedureIllustrations'

export type SequenceItem = { id: string; title: string; summary?: string; invalid?: boolean }

function SequenceCard({ item, index, selected, onSelect, disabled }: { item: SequenceItem; index: number; selected: boolean; onSelect: () => void; disabled: boolean }) {
  const { ref, handleRef, isDragging } = useSortable({ id: item.id, index, disabled })
  return <li ref={ref} className={`flex items-start gap-1 rounded-lg border p-2 ${selected ? 'border-primary bg-primary/5' : 'bg-card'} ${isDragging ? 'opacity-50' : ''}`}>
    <Button ref={handleRef} disabled={disabled} type="button" size="icon-sm" variant="ghost" className="shrink-0 cursor-grab touch-none active:cursor-grabbing" aria-label={`Reorder instruction ${index + 1}: ${item.title}`}><GripVertical aria-hidden="true" /></Button>
    <button type="button" disabled={disabled} aria-pressed={selected} onClick={onSelect} className="min-w-0 flex-1 cursor-pointer rounded-md p-1 text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
      <span className="block break-words text-sm font-medium">{index + 1}. {item.title || 'Untitled instruction'}</span>
      {item.summary ? <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{item.summary}</span> : null}
      {item.invalid ? <span className="block text-xs text-destructive">Needs attention</span> : null}
    </button>
  </li>
}

export function ProcedureSequence({ items, onMove, children, label = 'Procedure instructions' }: { items: SequenceItem[]; onMove: (from: number, to: number) => void; children: (index: number, move: (from: number, to: number) => void) => ReactNode; label?: string }) {
  const uploading = useIllustrationUploadPending()
  const [selectedId, setSelectedId] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const move = (from: number, to: number) => { setSelectedId(items[from].id); onMove(from, to); setAnnouncement(`${items[from].title || 'Instruction'} moved to position ${to + 1} of ${items.length}.`) }
  const selected = Math.max(0, items.findIndex(item => item.id === selectedId))
  return <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(0,2fr)]">
    <div className="min-w-0">
      <p className="mb-2 text-xs text-muted-foreground">Select an instruction to edit it. Drag its handle to reorder; Move up/down is also available in its Actions menu.</p>
      <DragDropProvider onDragEnd={event => {
        if (event.canceled || uploading) return
        const { source } = event.operation
        if (!isSortable(source)) return
        const from = source.initialIndex
        const to = source.index
        if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return
        move(from, to)
      }}>
        <ol aria-label={label} className="max-h-[65vh] space-y-2 overflow-y-auto p-1">{items.map((item, index) => <SequenceCard key={item.id} item={item} index={index} disabled={uploading} selected={index === selected} onSelect={() => setSelectedId(item.id)} />)}</ol>
      </DragDropProvider>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
    <fieldset disabled={uploading} className="min-w-0">{items.length ? children(selected, move) : <p>Add an instruction to begin.</p>}</fieldset>
  </div>
}
