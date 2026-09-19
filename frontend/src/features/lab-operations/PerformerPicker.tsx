import { useQuery } from '@tanstack/react-query'
import { getPerformancePerformers } from '#/api/lab-performance-review'
import { FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import { EvidenceError } from './InvestigationEvidence'

export function PerformerPicker({ id, value, onChange, error }: { id: string; value: string; onChange: (value: string) => void; error?: string }) {
  const query = useQuery({ queryKey: ['performance-performers'], queryFn: getPerformancePerformers, staleTime: 60000 })
  return <div className="space-y-1.5">
    <Label htmlFor={id}><RequiredFieldName>Actual performer</RequiredFieldName></Label>
    <select id={id} required className="h-9 w-full cursor-pointer rounded-lg border bg-background px-3 text-sm" value={value} onChange={event => onChange(event.target.value)} disabled={query.isPending || query.isError} aria-invalid={Boolean(error)} aria-describedby={`${id}-error`}>
      <option value="">{query.isPending ? 'Loading people…' : 'Select a staff member'}</option>
      {query.data?.map(person => <option key={person.id} value={person.id}>{person.name}{person.isActive ? '' : ' (inactive)'}</option>)}
    </select>
    <FieldError id={`${id}-error`}>{error}</FieldError>
    {query.isError ? <EvidenceError error={query.error} /> : null}
  </div>
}
