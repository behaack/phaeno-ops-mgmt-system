import { fireEvent, render, screen, waitFor } from '#/test-helpers/render-portal'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KitProcedureEditor } from './KitAssemblyWorkflowSettings'
import type { KitAssemblyWorkflow } from '#/api/lab-kit-assembly'
const mocks = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('#/api/lab-kit-assembly', async original => ({ ...await original<typeof import('#/api/lab-kit-assembly')>(), saveKitAssemblyWorkflow: mocks.save }))
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({}) })
describe('owned transportation kit procedure', () => {
  it('keeps the loaded concurrency token when a background refresh changes the workflow', async () => {
    const workflow = { id: 'workflow', name: 'Kit method', version: 1, revisions: [{ revision: 1, status: 'Draft', steps: [{ stepKey: crypto.randomUUID(), name: 'Pack', instructions: 'Original instruction.' }] }] } as KitAssemblyWorkflow
    const view = render(<KitProcedureEditor workflow={workflow} onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Instructions' }), { target: { value: 'Local unsaved edit.' } })
    view.rerender(<KitProcedureEditor workflow={{ ...workflow, version: 2 }} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    expect(mocks.save.mock.calls[0][0]).toMatchObject({ workflowVersion: 1, steps: [{ instructions: 'Local unsaved edit.' }] })
  })
  it('saves instructions directly without a catalog approval dependency', async () => {
    const close = vi.fn()
    render(<KitProcedureEditor onClose={close} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Workflow name' }), { target: { value: 'RNA kit method' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Instruction name' }), { target: { value: 'Pack and inspect' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Instructions' }), { target: { value: 'Follow the required kit contents and inspect the seal.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    const input = mocks.save.mock.calls[0][0]
    expect(input.name).toBe('RNA kit method')
    expect(input.steps).toEqual([expect.objectContaining({ stepKey: expect.any(String), name: 'Pack and inspect', instructions: 'Follow the required kit contents and inspect the seal.' })])
    expect(input).not.toHaveProperty('stepVersionIds')
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
  })
})
