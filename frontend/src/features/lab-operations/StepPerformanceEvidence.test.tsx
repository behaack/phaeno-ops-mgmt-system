import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { LabExecutionStepRecord } from '#/api/lab-operations'
import { StepPerformanceEvidence } from './StepPerformanceEvidence'

const record: LabExecutionStepRecord = { id: 'record', stepKey: 'step', action: 'correct', outcome: 'recorded', captures: {}, operatorConfirmed: true, resourcesConfirmed: false, qcOutcome: null, reason: 'Transcription correction', recordedByUserId: 'reviewer', recordedAtUtc: '2026-11-02T16:00:00Z', correctsRecordId: 'original' }
const people = new Map([['performer', 'Original operator'], ['reviewer', 'Reviewing supervisor']])
describe('performed and recorded evidence', () => {
  it('separates original performance from the supervisor recording a correction', () => {
    render(<StepPerformanceEvidence record={{ ...record, performance: { performedByUserId: 'performer', performedAtUtc: '2026-11-01T09:30:00Z', utcOffsetMinutes: -480, precision: 'minute', entryMode: 'earlier', lateEntryReason: 'Worksheet entry' } }} people={people} />)
    expect(screen.getByText(/Performed by Original operator/).textContent).toContain('UTC-08:00')
    expect(screen.getByText(/Recorded by Reviewing supervisor/)).toBeTruthy()
    expect(screen.getByText(/Late-entry reason: Worksheet entry/)).toBeTruthy()
    expect(screen.queryByText(/Performed by Reviewing supervisor/)).toBeNull()
  })
  it('labels absent evidence as unknown and skipped steps as not performed', () => {
    const view = render(<StepPerformanceEvidence record={record} people={people} />)
    expect(screen.getByText('Performed time and performer were not captured separately.')).toBeTruthy()
    view.rerender(<StepPerformanceEvidence record={{ ...record, outcome: 'skipped' }} people={people} />)
    expect(screen.getByText('Skipped — no performed work claimed.')).toBeTruthy()
    expect(screen.queryByText(/Performed by/)).toBeNull()
  })
})
