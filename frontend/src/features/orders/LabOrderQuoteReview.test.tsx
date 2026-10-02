import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { phasedLabOrder, phasedLabQuote, phaseQuoteLines, phaseQuoteSnapshot } from '#/test-helpers/phased-lab-quote'
import { LabOrderQuoteReview } from './LabOrderQuoteReview'
import { readPhaseRunBreakdown, readQuotePhaseReview, readQuoteService } from './quote-phase-review'

describe('phase quote review', () => {
  it('shows one service and its sample quantity from the quote, keeping additional runs within phase pricing', () => {
    render(<LabOrderQuoteReview order={{ ...phasedLabOrder, requestedSpecimenCount: 100, requestedServiceName: 'Later service choice' }} quote={phasedLabQuote} />)
    const scope = screen.getByRole('region', { name: 'Order scope' })
    expect(within(scope).getByText(/PSeq RNA Sequencing/).textContent).toBe('Service: PSeq RNA Sequencing')
    expect(within(scope).getByText('Service quantity:').parentElement?.textContent).toBe('Service quantity: 10 samples')
    expect(within(scope).queryByText(/Additional sequencing runs/)).toBeNull()
    expect(within(scope).queryByText('Later service choice')).toBeNull()
    const extra = { catalogItemId: 'service-2', description: 'Second service', quantity: 3, unitPrice: 10 }
    expect(readQuoteService({ ...phasedLabQuote, linesJson: JSON.stringify([...phaseQuoteLines, extra]) })).toBeNull()
  })
  it('keeps frozen scope, TAT, run calculation and prices together in each phase', () => {
    render(<LabOrderQuoteReview order={{ ...phasedLabOrder, requestedSpecimenCount: 100 }} quote={phasedLabQuote} billing={<p>Invoice records stay here</p>} />)
    const first = screen.getByRole('region', { name: '1. Phase 1' })
    const second = screen.getByRole('region', { name: '2. Phase 2' })
    expect(within(first).getByRole('row', { name: 'Heart tissue 2' })).toBeTruthy()
    expect(within(first).getByText('14 business days')).toBeTruthy()
    expect(within(second).getByText('21 business days')).toBeTruthy()
    expect(within(first).queryByText(/Additional sequencing runs/)).toBeNull()
    expect(within(second).getByText('2 total (1 included + 1 additional)')).toBeTruthy()
    expect(within(second).getByText('5 samples × 1 additional run per sample = 5 additional runs.')).toBeTruthy()
    expect(within(second).getByText('$5,250.00')).toBeTruthy()
    expect(within(first).getByText(/PSeq RNA Sequencing/).textContent).toBe('PSeq RNA Sequencing 5 × $950.00')
    expect(within(second).getByText(/Additional sequencing runs/).textContent).toBe('Additional sequencing runs 5 × $100.00')
    expect(within(first).getByText('Phase price:')).toBeTruthy()
    expect(within(first).queryByText(/Standard sample service/)).toBeNull()
    expect(screen.getByText('10 samples · 2 phases in this quote')).toBeTruthy()
    expect(screen.queryByText('Current source after a later amendment')).toBeNull()
    expect(screen.queryByText('Turnaround by phase')).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Order totals and billing' })).getByText('Invoice records stay here')).toBeTruthy()
  })

  it('derives 30 additional runs from 15 samples with 3 total runs each', () => {
    const first = readQuotePhaseReview(phasedLabQuote)[0]
    const phase = { ...first, sampleCount: 15, scope: { ...first.scope!, runsPerSample: 3, sequencingRunCount: 45 },
      lines: [{ ...first.lines[0], quantity: 15 }, { ...phaseQuoteLines[0], phaseId: first.id, quantity: 30 }] }
    expect(readPhaseRunBreakdown(phase)).toEqual({ includedRuns: 15, additionalRuns: 30, additionalRunsPerSample: 2 })
    expect(readPhaseRunBreakdown({ ...phase, lines: phase.lines.map(line => ({ ...line, quantity: 15 })) })).toBeNull()
    expect(readPhaseRunBreakdown({ ...phase, scope: { ...phase.scope, runsPerSample: 4 } })).toBeNull()
    expect(readPhaseRunBreakdown({ ...phase, scope: { ...phase.scope, runsPerSample: null } }))
      .toEqual({ includedRuns: 15, additionalRuns: 30, additionalRunsPerSample: null })
  })

  it('matches lines by frozen phase identity even with repeated names and a different line order', () => {
    const snapshot = phaseQuoteSnapshot.map(phase => ({ ...phase, name: 'Repeated name' })).reverse()
    const phases = readQuotePhaseReview({ ...phasedLabQuote, phasePlanSnapshotJson: JSON.stringify(snapshot) })
    expect(phases.map(phase => phase.id)).toEqual(['phase-1', 'phase-2'])
    expect(phases[0].lines.map(line => line.phaseId)).toEqual(['phase-1'])
    expect(phases[1].lines.map(line => line.phaseId)).toEqual(['phase-2', 'phase-2'])
    expect(snapshot[0].id).toBe('phase-2')
  })

  it('keeps all quoted lines visible without inventing a phase match when a line has an unknown identity', () => {
    const quote = { ...phasedLabQuote, linesJson: JSON.stringify([...phaseQuoteLines, { phaseId: 'unknown', description: 'Unmatched quoted service', quantity: 1, unitPrice: 50 }]) }
    expect(readQuotePhaseReview(quote)).toEqual([])
    render(<LabOrderQuoteReview order={phasedLabOrder} quote={quote} />)
    expect(screen.getByText('Unmatched quoted service')).toBeTruthy()
    expect(screen.queryByRole('region', { name: '1. Phase 1' })).toBeNull()
    expect(screen.getAllByText(/5 × \$950.00 each/)).toHaveLength(2)
  })

  it('retains issued tax and totals and distinguishes pre-tax quotes from tax-inclusive quotes', () => {
    const quote = { ...phasedLabQuote, taxDecisionSnapshotJson: null, total: 10000 }
    render(<LabOrderQuoteReview order={phasedLabOrder} quote={quote} />)
    const totals = screen.getByRole('region', { name: 'Order totals and billing' })
    expect(within(totals).getByText('Pre-tax total')).toBeTruthy()
    expect(within(totals).getByText('Applicable tax will be calculated at invoicing.')).toBeTruthy()
    expect(within(totals).queryByText('Tax')).toBeNull()
    expect(within(totals).getAllByText('$10,000.00')).toHaveLength(2)
  })
})
