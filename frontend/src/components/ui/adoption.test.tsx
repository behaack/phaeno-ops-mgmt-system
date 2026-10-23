import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card'
import { RecordTable, RecordTableHeader } from './record-list'
import { DomainStatusBadge } from './domain-status-badge'
import { DisplayDate, DisplayTimestamp } from './display-value'
import { CustomerLocaleContext } from '#/features/customer-i18n/customer-text'
import { leadTones, taskTones, relationshipTones } from '#/features/crm/crm-status'
import { assemblyTones, evidenceTones, deadlineTones } from '#/features/lab-operations/lab-status'
import { SectionPanel } from './section-panel'
import { EmptyState, ErrorState, LoadingState } from './content-state'
import { createRef } from 'react'
import { fireEvent } from '@testing-library/react'

describe('application-wide presentation ownership',()=>{
  it('preserves native heading, region identity, ref and contextual controls in a shaded panel',()=>{
    const region=createRef<HTMLElement>(), heading=createRef<HTMLHeadingElement>()
    const {container}=render(<SectionPanel ref={region} aria-labelledby="panel-heading" heading={<h3 id="panel-heading" ref={heading}>Sample scope</h3>} description="Two samples" actions={<button type="button">Edit scope</button>} highlighted><p>Retained content</p></SectionPanel>)
    expect(screen.getByRole('region',{name:'Sample scope'})).toBe(region.current)
    expect(screen.getByRole('heading',{level:3})).toBe(heading.current)
    expect(screen.getByText('Two samples').closest('[data-slot=card-header]')).not.toBeNull()
    expect(screen.getByRole('button').closest('[data-slot=card-action]')).not.toBeNull()
    expect(screen.getByText('Retained content').closest('[data-slot=section-panel-body]')).not.toBeNull()
    expect(container.querySelector('[data-slot=card-header]')?.className).toContain('bg-muted')
    expect(region.current?.getAttribute('data-highlighted')).toBe('true')
  })
  it('announces loading and preserves permission guidance and the exact retry handler',()=>{
    let retries=0
    render(<><LoadingState label="Loading samples" /><EmptyState kind="permission" title="Access required" action={<button>Request access</button>}>Ask your administrator.</EmptyState><ErrorState title="Samples unavailable" onRetry={()=>retries++} busy={false}>Your saved work remains available.</ErrorState></>)
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite')
    expect(screen.getByText('Access required').closest('[data-kind=permission]')).not.toBeNull()
    fireEvent.click(screen.getByRole('button',{name:'Try again'}))
    expect(retries).toBe(1)
    expect(screen.getByRole('alert').textContent).toContain('Your saved work remains available.')
  })
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
