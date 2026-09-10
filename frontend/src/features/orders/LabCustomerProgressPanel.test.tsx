import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { bundleLabDraft } from '#/test-helpers/bundled-orders'
import type { LabCustomerProgress } from '#/api/order-management'
import { LabCustomerProgressPanel } from './LabCustomerProgressPanel'
import { customerLabStatus } from './lab-customer-progress'

const progress: LabCustomerProgress = {
  currentStage: 'Received', jobStage: 'LibraryPrep', hasContainerReceipt: true,
  counts: [{ stage: 'Received', count: 2 }, { stage: 'LibraryPrep', count: 1 }, { stage: 'ResultsAvailable', count: 1 }],
  samples: [{ sampleId: 'sample-1', stage: 'Received' }],
}

describe('customer laboratory stages', () => {
  it('shows current counts without inferring completed steps or full release', () => {
    render(<LabCustomerProgressPanel order={{ ...bundleLabDraft, laboratoryProgress: progress }} />)
    const stages = within(screen.getByRole('list', { name: 'Laboratory stages' })).getAllByRole('listitem')
    expect(stages).toHaveLength(6)
    expect(stages[0].getAttribute('aria-current')).toBe('step')
    expect(stages[5].getAttribute('aria-current')).toBeNull()
    expect(within(stages[0]).getByText('2 samples')).toBeTruthy()
    expect(within(stages[5]).getByText('1 sample')).toBeTruthy()
    expect(screen.getByText(/Latest Job-wide activity: Library Prep/)).toBeTruthy()
    fireEvent.click(screen.getByText('View sample stages'))
    expect(screen.getByText('View sample stages').closest('details')?.open).toBe(true)
  })

  it('distinguishes unavailable data from zero samples', () => {
    render(<LabCustomerProgressPanel order={bundleLabDraft} />)
    expect(screen.getByText(/progress is not currently available/)).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Laboratory stages' })).toBeNull()
  })

  it('preserves order holds, cancellation and pre-order states in list and header', () => {
    expect(customerLabStatus('InProgress', progress)).toBe('Received')
    expect(customerLabStatus('ResultsAvailable', progress)).toBe('Received')
    for (const state of ['OnHold', 'CancellationRequested', 'Cancelled', 'Completed', 'QuoteIssued']) {
      expect(customerLabStatus(state, progress)).toBe(state)
    }
    expect(customerLabStatus('InProgress', null)).toBe('InProgress')
  })
})
