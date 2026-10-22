import { Field as PortalField } from '#/components/ui/field'
import { NativeSelect } from '#/components/ui/native-select'
import { useQuery } from '@tanstack/react-query'
import { getPerformancePerformers } from '#/api/lab-performance-review'
import { FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'
import { EvidenceError } from './InvestigationEvidence'

export function PerformerPicker({ id, value, onChange, error }: { id: string; value: string; onChange: (value: string) => void; error?: string }) {
  const query = useQuery({ queryKey: ['performance-performers'], queryFn: getPerformancePerformers, staleTime: 60000 })
  return <PortalField >
    <Label htmlFor={id}><RequiredFieldName>Actual performer</RequiredFieldName></Label>
    <NativeSelect id={id} required className="w-full" value={value} onChange={event => onChange(event.target.value)} disabled={query.isPending || query.isError} aria-invalid={Boolean(error)} aria-describedby={`${id}-error`}>
      <option value="">{query.isPending ? 'Loading people…' : 'Select a staff member'}</option>
      {query.data?.map(person => <option key={person.id} value={person.id}>{person.name}{person.isActive ? '' : ' (inactive)'}</option>)}
    </NativeSelect>
    <FieldError id={`${id}-error`}>{error}</FieldError>
    {query.isError ? <EvidenceError error={query.error} /> : null}
  </PortalField>
}
