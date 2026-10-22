import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { MultiSelect } from '#/components/ui/multi-select'
import { PillToggle } from '#/components/ui/pill-toggle'
import { SearchableSelect } from '#/components/ui/searchable-select'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Separator } from '#/components/ui/separator'
import { WorkBellButton } from '#/features/work-attention/WorkBellButton'

const options=[{value:'research',label:'Example research'},{value:'laboratory',label:'Example laboratory'}]
export function ControlExamples() {
  const [checked,setChecked]=useState(false),[multiple,setMultiple]=useState<string[]>([]),[selection,setSelection]=useState(''),[view,setView]=useState('active'),[notice,setNotice]=useState('Choose a control to inspect its state.')
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3">{(['xs','sm','default','lg'] as const).map(size=><Button key={size} size={size} onClick={()=>setNotice(`${size} example activated`)}>{size} example</Button>)}<Button variant="secondary">Secondary filled example</Button><Button variant="link">Link button example</Button></div>
    <div className="flex flex-wrap items-center gap-3">{(['icon-xs','icon-sm','icon','icon-lg'] as const).map(size=><Button key={size} size={size} variant="outline" aria-label={`Copy ${size} example reference`} title="Copy example reference" onClick={()=>setNotice('Copy icon example activated.')}><Copy aria-hidden="true" /></Button>)}</div>
    <div role="group" aria-label="Notification badge examples" className="space-y-2">
      <p className="text-sm font-medium">Notification badge</p>
      <div className="flex flex-wrap gap-5">{[0, 1, 12, 125, undefined].map(count => {
        const description = count === undefined ? 'Count unavailable' : `${count} ${count === 1 ? 'action' : 'actions'}`
        return <div key={description} className="flex flex-col items-center gap-1">
          <WorkBellButton count={count} label={`Example notifications, ${description}`} onClick={() => setNotice(`${description} notification example activated.`)} />
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      })}</div>
    </div>
    <Label><Checkbox checked={checked} onCheckedChange={v=>setChecked(v===true)} />A long example checkbox label wraps with the control aligned to the first line and a comfortable reading gap.</Label>
    <Label><Checkbox disabled checked />Unavailable example choice</Label>
    <Field><Label htmlFor="example-multiple">Example departments</Label><MultiSelect id="example-multiple" aria-label="Example departments" options={options} values={multiple} onValuesChange={setMultiple} placeholder="Choose example departments" emptyMessage="No matching example departments." /></Field>
    <Field><Label htmlFor="example-clearable">Clearable example selection</Label><SearchableSelect id="example-clearable" options={options} value={selection} onValueChange={setSelection} placeholder="Find an example department" emptyMessage="No example departments." noMatchMessage="No matching example departments." resultsLabel="Clearable example departments" selectionMessage="Choose an example department." clearable clearLabel="Clear example selection" /></Field>
    <Field><Label htmlFor="example-disabled-select">Unavailable searchable selection</Label><SearchableSelect id="example-disabled-select" options={[]} value="" onValueChange={()=>undefined} placeholder="Example choices unavailable" emptyMessage="No example choices." disabled /></Field>
    <PillToggle label="Example record view" value={view} onValueChange={setView} options={[{value:'active',label:'Active examples'},{value:'closed',label:'Closed examples'},{value:'unavailable',label:'Unavailable view',disabled:true}]} />
    <div className="grid gap-4 @min-[40rem]:grid-cols-2"><Field><Label htmlFor="example-date">Example date</Label><Input id="example-date" type="date" /></Field><Field><Label htmlFor="example-time">Example time</Label><Input id="example-time" type="time" /></Field></div>
    <Separator /><div className="flex items-center gap-3"><Avatar aria-label="Example user"><AvatarFallback>EX</AvatarFallback></Avatar><p className="text-sm">Fictional user fallback</p></div>
    <p role="status" className="text-sm text-muted-foreground">{notice}</p>
  </div>
}
