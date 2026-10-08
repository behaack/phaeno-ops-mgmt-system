import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { StructuredQcFields, qcEvidence } from './StructuredQcFields'

describe('Structured laboratory QC', () => {
  it('records named measurements and their units without raw JSON entry', () => {
    function Harness() { const [values, setValues] = useState<Record<string, string>>({}); return <><StructuredQcFields values={values} onChange={(key, value) => setValues(previous => ({ ...previous, [key]: value }))} /><output>{values.qcMeasurements}</output></> }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add measurement' }))
    fireEvent.change(screen.getByLabelText(/^Measurement/), { target: { value: 'Concentration' } })
    fireEvent.change(screen.getByLabelText(/^Value/), { target: { value: '12.5' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'ng/µL' } })
    expect(screen.getByRole('status').textContent).toContain('Concentration')
    fireEvent.click(screen.getByRole('button', { name: 'Remove measurement 1' }))
    expect(screen.queryByLabelText(/^Value/)).toBeNull()
  })
  it('requires the decision basis and keeps quantitative precision and units as entered', () => {
    expect(() => qcEvidence({})).toThrow(/QC observations/)
    expect(qcEvidence({ qcSummary: ' Meets method criteria ', qcMeasurements: JSON.stringify([{ name: 'Concentration', value: '12.50', unit: 'ng/µL' }]) })).toEqual({ summary: 'Meets method criteria', measurements: [{ name: 'Concentration', value: '12.50', unit: 'ng/µL' }] })
    expect(() => qcEvidence({ qcSummary: 'Reviewed', qcMeasurements: JSON.stringify([{ name: '', value: '12', unit: '' }]) })).toThrow(/name and value/)
  })
})
