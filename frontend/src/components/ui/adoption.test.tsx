import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card'
import { RecordTable, RecordTableHeader } from './record-list'
import { DomainStatusBadge } from './domain-status-badge'
import { DisplayDate, DisplayTimestamp } from './display-value'
import { CustomerLocaleContext } from '#/features/customer-i18n/customer-text'
import { leadTones, taskTones, relationshipTones } from '#/features/crm/crm-status'
import { assemblyTones, evidenceTones, deadlineTones } from '#/features/lab-operations/lab-status'

describe('application-wide presentation ownership',()=>{
  it('keeps panel descriptions with their shared heading and table column semantics intact',()=>{
    const {container}=render(<Card><CardHeader><CardTitle>Sequencing inputs</CardTitle><CardDescription>Verified input files</CardDescription></CardHeader><CardContent><RecordTable label="Inputs"><table><RecordTableHeader><tr><th scope="col">Sample</th></tr></RecordTableHeader><tbody><tr><td>DEMO</td></tr></tbody></table></RecordTable></CardContent></Card>)
    expect(screen.getByText('Verified input files').closest('[data-slot=card-header]')).not.toBeNull()
    expect(screen.getByRole('columnheader').getAttribute('scope')).toBe('col')
    expect(container.querySelector('[data-slot=record-table-header]')?.classList.contains('bg-muted')).toBe(true)
  })
  it('distinguishes process completion, scientific evidence, cancellation, failure and unknown states',()=>{
    render(<><DomainStatusBadge status="Succeeded" tones={assemblyTones}>Assembly done</DomainStatusBadge><DomainStatusBadge status="Completed" tones={evidenceTones}>Evidence complete</DomainStatusBadge><DomainStatusBadge status="Failed" tones={assemblyTones}>Failed</DomainStatusBadge><DomainStatusBadge status="Cancelled" tones={taskTones}>Cancelled</DomainStatusBadge><DomainStatusBadge status="FutureState" tones={leadTones}>Future</DomainStatusBadge></>)
    for(const [label,tone] of [['Assembly done','success'],['Evidence complete','info'],['Failed','error'],['Cancelled','neutral'],['Future','neutral']])expect(screen.getByText(label).getAttribute('data-tone')).toBe(tone)
    expect(deadlineTones.AtRisk).toBe('error');expect(relationshipTones.Approved).toBe('info');expect(relationshipTones.Applied).toBe('success')
  })
  it('uses the Customer locale for direct displays while keeping a calendar day and seconds intact',()=>{
    render(<CustomerLocaleContext.Provider value={{customer:true,pseudo:false,locale:'fr-FR'}}><p data-testid="day"><DisplayDate value="2026-10-22" /></p><p data-testid="time"><DisplayTimestamp value="2026-10-22T12:34:56Z" seconds /></p></CustomerLocaleContext.Provider>)
    expect(screen.getByTestId('day').textContent).toBe('22 oct. 2026')
    expect(screen.getByTestId('time').textContent).toContain('oct.');expect(screen.getByTestId('time').textContent).toContain(':56')
  })
})
