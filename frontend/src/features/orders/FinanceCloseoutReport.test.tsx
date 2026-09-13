import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReconciliationBatch } from '#/api/pseq-order-to-cash'
import { FinanceCloseoutReport } from './FinanceCloseoutReport'

const snapshot = { periodEnd: '2026-09-12', bankTotal: 70, ledgerReceiptTotal: 75, paymentReceiptIds: ['receipt-75'], paymentAllocationIds: [], invoiceAdjustmentIds: [] }
const saved = { batchNumber: 'REC-001', periodEnd: '2026-09-12', bankTotal: 75, ledgerReceiptTotal: 75, difference: 0, itemCount: 1, approvedByUserId: 'reviewer-1', approvedAtUtc: '2026-09-13T00:31:00Z', draftChanges: [{ action: 'Edited', actorUserId: 'cash-1', atUtc: '2026-09-13T00:30:00Z', reason: 'Correct bank total', before: snapshot, after: { ...snapshot, bankTotal: 75 } }] }
const batch: ReconciliationBatch = { id: 'batch-1', ...saved, status: 'Approved', createdByUserId: 'cash-1', submittedByUserId: 'cash-1', closeoutReportJson: JSON.stringify(saved), version: 4 }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('Approved reconciliation closeout', () => {
  it('shows readable saved evidence without exposing JSON', () => {
    render(<FinanceCloseoutReport batch={batch} />)
    const report = screen.getByRole('region', { name: 'Closeout report' })
    expect(within(report).getByText('Bank total')).toBeTruthy()
    expect(within(report).getAllByText('$75.00')).toHaveLength(2)
    expect(within(report).getByText('$0.00')).toBeTruthy()
    expect(within(report).getByText('2026-09-12')).toBeTruthy()
    expect(report.querySelector('pre')).toBeNull()
    expect(report.textContent).not.toContain('approvedByUserId')
    expect(screen.getByRole('button', { name: 'Download closeout report' })).toBeTruthy()
  })

  it('downloads the frozen totals, approval and complete recorded change references', async () => {
    let blob: Blob | undefined
    const revoke = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: vi.fn((value: Blob) => { blob = value; return 'blob:report' }), revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { expect(this.download).toBe('REC-001-closeout.txt'); expect(this.href).toBe('blob:report') })
    render(<FinanceCloseoutReport batch={batch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download closeout report' }))
    expect(click).toHaveBeenCalledOnce()
    const text = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob!) })
    expect(text).toContain('Bank total: $75.00')
    expect(text).toContain('Reviewer reference: reviewer-1')
    expect(text).toContain('Correct bank total')
    expect(text).toContain('Before: period 2026-09-12; bank $70.00; ledger $75.00')
    expect(text).toContain('After: period 2026-09-12; bank $75.00; ledger $75.00')
    expect(text).toContain('Receipt references: receipt-75')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it.each([null, '{bad json', JSON.stringify({ ...saved, approvedAtUtc: undefined }), JSON.stringify({ ...saved, bankTotal: 0 }), JSON.stringify({ ...saved, approvedByUserId: 'another-reviewer' })])('does not invent a report for missing, invalid or mismatched evidence: %s', closeoutReportJson => {
    render(<FinanceCloseoutReport batch={{ ...batch, closeoutReportJson }} />)
    expect(screen.getByRole('alert').textContent).toContain('saved closeout report is unavailable')
    expect(screen.queryByRole('button', { name: 'Download closeout report' })).toBeNull()
    expect(screen.queryByText('$0.00')).toBeNull()
  })

  it('accepts older valid saved reports without draft-change data', () => {
    render(<FinanceCloseoutReport batch={{ ...batch, closeoutReportJson: JSON.stringify({ ...saved, draftChanges: undefined }) }} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: 'Download closeout report' })).toBeTruthy()
  })

  it('does not present approval evidence on a submitted batch', () => {
    render(<FinanceCloseoutReport batch={{ ...batch, status: 'Submitted' }} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('reports download failure and permits retry', () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => { throw new Error('Download unavailable') }) })
    render(<FinanceCloseoutReport batch={batch} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download closeout report' }))
    expect(screen.getByRole('alert').textContent).toContain('could not be downloaded')
    expect(screen.getByRole('button', { name: 'Download closeout report' })).toHaveProperty('disabled', false)
  })
})
