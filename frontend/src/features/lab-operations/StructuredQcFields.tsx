import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredFieldName } from '#/components/ui/required-field'

type Measurement = { name: string; value: string; unit: string }
function measurements(values: Record<string, string>): Measurement[] {
  try { const rows: unknown = JSON.parse(values.qcMeasurements || '[]'); return Array.isArray(rows) ? rows as Measurement[] : [] } catch { return [] }
}
export function qcEvidence(values: Record<string, string>) {
  const summary = values.qcSummary?.trim()
  if (!summary) throw new Error('Enter the QC observations and decision basis.')
  return { summary, measurements: measurements(values).map(row => {
    if (!row.name.trim() || !row.value.trim()) throw new Error('Every measurement needs a name and value.')
    return { name: row.name.trim(), value: row.value.trim(), unit: row.unit.trim() || null }
  }) }
}
export function StructuredQcFields({ values, onChange }: { values: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const rows = measurements(values)
  const change = (next: Measurement[]) => onChange('qcMeasurements', JSON.stringify(next))
  return <div className="space-y-4 sm:col-span-2"><div className="space-y-2"><Label htmlFor="qc-observations"><RequiredFieldName>QC observations and decision basis</RequiredFieldName></Label><textarea id="qc-observations" required className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" value={values.qcSummary || ''} onChange={event => onChange('qcSummary', event.target.value)} /></div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-medium">Measurements (optional)</legend>{rows.map((row, index) => <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3"><div className="space-y-1"><Label htmlFor={`qc-name-${index}`}><RequiredFieldName>Measurement</RequiredFieldName></Label><Input id={`qc-name-${index}`} required value={row.name} onChange={event => change(rows.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></div><div className="space-y-1"><Label htmlFor={`qc-value-${index}`}><RequiredFieldName>Value</RequiredFieldName></Label><Input id={`qc-value-${index}`} required value={row.value} onChange={event => change(rows.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} /></div><div className="space-y-1"><Label htmlFor={`qc-unit-${index}`}>Unit</Label><Input id={`qc-unit-${index}`} value={row.unit} onChange={event => change(rows.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} /></div><Button type="button" variant="outline" size="sm" onClick={() => change(rows.filter((_item, i) => i !== index))}>Remove measurement {index + 1}</Button></div>)}<Button type="button" variant="outline" className="w-full" onClick={() => change([...rows, { name: '', value: '', unit: '' }])}>Add measurement</Button></fieldset>
  </div>
}
