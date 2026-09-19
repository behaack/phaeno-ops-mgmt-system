import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfigurationPreview, createPreviewBatch } from './ConfigurationPreview'
import { PreparationOutputsDialog } from './PreparationOutputsDialog'
import { PreparationActions } from './preparation-ui'
import type { ProtocolDefinition } from './protocol-definition'

const operational = vi.hoisted(() => vi.fn(() => { throw new Error('Preview attempted an operational write') }))
vi.mock('#/api/lab-preparation', () => ({ applyPreparation: operational, applyPreparationWithQcReport: operational, createPreparation: operational }))
const definition: ProtocolDefinition = { schemaVersion: 1, preparationBatchEnabled: true, steps: [{
  key: 'observe', name: 'Observe specimen', instructions: 'Fictional capture instructions.', required: true,
  repeatable: true, operatorConfirmation: false, inputMaterials: [], equipmentTypes: [], preparedOutputs: [],
  captures: [{ key: 'note', label: 'Observation', type: 'text', required: true, scope: 'batch' }],
}, { key: 'conditional', name: 'Optional review', instructions: 'Example conditional review.', required: false,
  condition: 'Only when applicable', repeatable: false, operatorConfirmation: false, captures: [], inputMaterials: [], equipmentTypes: [], preparedOutputs: [] }] }

describe('configuration authoring preview isolation', () => {
  it('previews another performer without loading the real staff directory', () => {
    render(<ConfigurationPreview definition={definition} name="Example draft" onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Performed by'), { target: { value: 'other' } })
    expect(screen.getByRole('option', { name: 'Example operator (preview only)' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Actual performer/), { target: { value: 'preview-performer' } })
    expect(operational).not.toHaveBeenCalled()
  })

  it('validates the production capture form without saving and resets disposable entries', async () => {
    const snapshot = JSON.stringify(definition)
    render(<ConfigurationPreview definition={definition} name="Example draft" onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Validate entry' }))
    await screen.findByText('Observation is required.')
    fireEvent.change(screen.getByLabelText(/Observation/), { target: { value: 'Example only' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I performed this step/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Validate entry' }))
    await screen.findByText('Example entry is valid. Nothing was saved.')
    expect(operational).not.toHaveBeenCalled()
    expect(JSON.stringify(definition)).toBe(snapshot)
    fireEvent.click(screen.getByRole('button', { name: 'Reset example values' }))
    expect((screen.getByLabelText(/Observation/) as HTMLInputElement).value).toBe('')
  })

  it('inspects a conditional later step without prior evidence and exposes allowed presentation states', () => {
    render(<ConfigurationPreview definition={definition} name="Example draft" onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Example conditional review.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Decision/), { target: { value: 'skipped' } })
    expect(screen.getByLabelText(/Reason or condition assessment/).getAttribute('aria-required')).toBe('true')
    expect(operational).not.toHaveBeenCalled()
  })

  it('does not invoke output allocation even when valid example quantities are submitted', async () => {
    const stage = { id: 'stage', name: 'Example', sequence: 1, requirement: 'Required', definition }
    const batch = createPreviewBatch(stage)
    const allocate = vi.fn()
    render(<PreparationOutputsDialog preview members={batch.members} supported pending={false} onClose={vi.fn()} onSubmit={allocate} />)
    fireEvent.change(screen.getByLabelText(/Quantity unit/), { target: { value: 'µL' } })
    fireEvent.change(screen.getByLabelText(/^Storage location/), { target: { value: 'Example freezer' } })
    screen.getAllByLabelText(/Actual output quantity/).forEach(input => fireEvent.change(input, { target: { value: '20' } }))
    fireEvent.click(screen.getByRole('button', { name: 'Validate entry' }))
    await screen.findByText('Example output values are valid. Nothing was saved.')
    expect(allocate).not.toHaveBeenCalled()
    expect(operational).not.toHaveBeenCalled()
  })

  it('does not submit an enclosing configuration form when opening an action', async () => {
    const save = vi.fn(e => e.preventDefault())
    const preview = vi.fn()
    render(<form onSubmit={save}><PreparationActions items={[{ label: 'Configuration preview', onClick: preview }]} /></form>)
    fireEvent.click(screen.getByRole('button', { name: 'Configuration preview' }))
    await waitFor(() => expect(preview).toHaveBeenCalledOnce())
    expect(save).not.toHaveBeenCalled()
  })
})
