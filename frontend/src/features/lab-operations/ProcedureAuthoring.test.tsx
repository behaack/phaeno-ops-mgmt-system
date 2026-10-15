import { useState } from 'react'
import { fireEvent, render, screen, within, waitFor } from '#/test-helpers/render-portal'
import { describe, expect, it } from 'vitest'
import { SimpleProcedureEditor } from './SimpleProcedureEditor'
import { ProcedurePresentation } from './ProcedurePresentation'
import type { ProcedureInstruction } from './procedure-types'
const initial: ProcedureInstruction[] = [{ key: 'first', name: 'Pack', instructions: 'Pack contents.' }, { key: 'second', name: 'Inspect', instructions: 'Inspect seal.' }]
function Editor() {
  const [steps, setSteps] = useState(initial)
  return <><SimpleProcedureEditor context="kit" instructions={steps} onChange={setSteps} /><output aria-label="Saved identities">{steps.map(s => s.key).join(',')}</output></>
}
describe('procedure authoring and presentation', () => {
  it('offers non-drag movement and duplicates an instruction with a separate identity', async () => {
    render(<Editor />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move down' }))
    expect(screen.getByLabelText('Saved identities').textContent).toBe('second,first')
    expect((screen.getByRole('textbox', { name: 'Instruction name' }) as HTMLInputElement).value).toBe('Pack')
    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Move down' })).toBeNull())
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Duplicate instruction' }))
    await waitFor(() => expect(screen.getByLabelText('Saved identities').textContent!.split(',')).toHaveLength(3))
    const ids = screen.getByLabelText('Saved identities').textContent!.split(',')
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })
  it('marks drafts and presents the same required fields in bench view', () => {
    render(<ProcedurePresentation document={{ name: 'Draft method', revision: 2, status: 'Draft', instructions: [{ key: 'record', name: 'Measure', instructions: 'Measure concentration.', captures: [{ key: 'concentration', label: 'Concentration', type: 'number', scope: 'tube', unit: 'ng/µL' }] }] }} />)
    expect(screen.getAllByText('DRAFT — NOT APPROVED FOR LABORATORY USE')).toHaveLength(2)
    fireEvent.change(screen.getByRole('combobox', { name: 'Presentation' }), { target: { value: 'bench' } })
    const table = screen.getByRole('table', { name: 'Entries required by this instruction' })
    expect(within(table).getByText('Each sample')).toBeTruthy()
    expect(within(table).getByText('ng/µL')).toBeTruthy()
  })
})
