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
})
