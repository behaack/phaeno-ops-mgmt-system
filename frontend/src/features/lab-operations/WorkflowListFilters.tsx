import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export function WorkflowListFilters({ id, search, onSearchChange, showInactive, onShowInactiveChange }: {
  id: string
  search: string
  onSearchChange: (value: string) => void
  showInactive: boolean
  onShowInactiveChange: (value: boolean) => void
}) {
  return <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
    <div className="min-w-0 flex-1">
      <Label htmlFor={`${id}-search`} className="sr-only">Search workflows</Label>
      <Input id={`${id}-search`} type="search" placeholder="Search workflows" value={search} onChange={event => onSearchChange(event.target.value)} />
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id={`${id}-show-inactive`} checked={showInactive} onCheckedChange={checked => onShowInactiveChange(checked === true)} />
      <Label htmlFor={`${id}-show-inactive`} className="cursor-pointer">Show inactive</Label>
    </div>
  </div>
}
