import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MasterMixEquipmentEvidence } from './MasterMixEquipmentEvidence'

describe('master-mix equipment evidence', () => {
  it('shows frozen captured conditions', () => {
    render(<MasterMixEquipmentEvidence fields={['mixer']} uses={[{ fieldKey: 'mixer', equipmentId: 'asset-1', resourceSnapshotJson: JSON.stringify({ assetCode: 'TEST-MIXER', calibrationDueOn: '2026-11-01', location: 'Original bench' }) }]} />)
    expect(screen.getByText('Frozen equipment conditions')).toBeDefined()
    expect(screen.getByText('Original bench')).toBeDefined()
    expect(screen.queryByText(/Unknown:/)).toBeNull()
  })
  it('keeps missing historical conditions explicit', () => {
    render(<MasterMixEquipmentEvidence fields={['mixer']} uses={null} />)
    expect(screen.getByText(/Unknown: original equipment conditions/)).toBeDefined()
    expect(screen.queryByText('Frozen equipment conditions')).toBeNull()
  })
  it('does not invent equipment requirements', () => {
    const { container } = render(<MasterMixEquipmentEvidence fields={[]} uses={null} />)
    expect(container.innerHTML).toBe('')
  })
})
