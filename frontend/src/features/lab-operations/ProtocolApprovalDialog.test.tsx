import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProtocolApprovalDialog } from './ProtocolApprovalDialog'
import { createLibraryPreparationExample, serializeProtocolDefinition } from './protocol-definition'
import type { LabProtocol } from '#/api/lab-operations'

const protocol: LabProtocol = { id: 'protocol', name: 'Library preparation', key: 'library', description: null, latestVersion: 1, versions: [], version: 1 }

describe('formal protocol review', () => {
  it('shows the procedure and permitted choices and requires attestation', () => {
    const values = createLibraryPreparationExample()
    values.steps[0].captures.push({ label: 'Preparation method', type: 'choice', required: true, unit: '', choices: 'Method A, Method B' })
    const approve = vi.fn()
    render(<ProtocolApprovalDialog protocol={protocol} version={{ id: 'version', protocolVersion: 1, status: 'Draft', definitionJson: serializeProtocolDefinition(values), authoredByUserId: 'author', authoredAtUtc: '', approvedByUserId: null, approvedAtUtc: null }} isPending={false} onApprove={approve} onOpenChange={vi.fn()} />)
    expect(screen.getByText(/choices: Method A, Method B/)).toBeTruthy()
    expect(screen.getByText('Not enabled for this version.')).toBeTruthy()
    const button = screen.getByRole('button', { name: 'Approve version 1' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(button)
    expect(approve).toHaveBeenCalledOnce()
  })

  it('does not allow an incomplete historical definition to be approved', () => {
    render(<ProtocolApprovalDialog protocol={protocol} version={{ id: 'version', protocolVersion: 1, status: 'Draft', definitionJson: '{"steps":[]}', authoredByUserId: 'author', authoredAtUtc: '', approvedByUserId: null, approvedAtUtc: null }} isPending={false} onApprove={vi.fn()} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Definition cannot be reviewed')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Approve version 1' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows preparation evidence scopes, QC scope and source identity before approval', () => {
    const values = createLibraryPreparationExample()
    values.preparationBatchEnabled = true
    values.steps.forEach(step => {
      step.captures.forEach(capture => { capture.scope = 'tube' })
      if (step.qcEnabled) step.qcScope = 'shared'
    })
    values.steps[1].captures.push({ label: 'Shared temperature', type: 'number', required: true, unit: 'C', choices: '', scope: 'batch' })
    values.steps[1].captures.push({ label: 'Duration exceptions', type: 'number', required: true, unit: 'min', choices: '', scope: 'shared' })
    render(<ProtocolApprovalDialog protocol={protocol} version={{ id: 'scoped-version', protocolVersion: 1, status: 'Draft', definitionJson: serializeProtocolDefinition(values), authoredByUserId: 'author', authoredAtUtc: '', approvedByUserId: null, approvedAtUtc: null }} isPending={false} onApprove={vi.fn()} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Enabled — review the evidence and QC scopes below.')).toBeTruthy()
    const definition = screen.getByRole('region', { name: 'Ordered protocol definition' }).textContent
    expect(definition).toContain('Tube — record individually')
    expect(definition).toContain('Batch — one shared observation')
    expect(definition).toContain('Shared value with tube exceptions')
    expect(definition).toContain('Shared outcome with tube exceptions')
    expect(definition).toContain('must match the selected source tube')
    expect((screen.getByRole('button', { name: 'Approve version 1' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
