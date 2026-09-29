import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KitAssemblyWorkflowSettings } from './KitAssemblyWorkflowSettings'

const mocks = vi.hoisted(() => ({ workflows: vi.fn(), steps: vi.fn(), save: vi.fn() }))
vi.mock('#/api/lab-kit-assembly', async original => ({ ...await original<typeof import('#/api/lab-kit-assembly')>(), getKitAssemblyWorkflows: mocks.workflows, saveKitAssemblyWorkflow: mocks.save }))
vi.mock('#/api/lab-steps', async original => ({ ...await original<typeof import('#/api/lab-steps')>(), getLabSteps: mocks.steps }))
const stepId = '71000000-0000-4000-8000-000000000001'
const secondStepId = '71000000-0000-4000-8000-000000000002'
const steps = [stepId, secondStepId].map((id, index) => ({ id, name: `Assembly method ${index + 1}`, retiredAtUtc: null,
  versions: [{ id, status: 'Approved', stepVersion: 1, definitionJson: JSON.stringify({ steps: [{ captures: [] }] }) }],
}))
const workflow = { id: 'workflow', name: 'RNA kit assembly', version: 2, revisions: [{ id: 'draft', revision: 1, status: 'Draft', steps: [{ labStepVersionId: stepId, name: 'First', instructions: 'Pack.' }, { labStepVersionId: secondStepId, name: 'Second', instructions: 'Seal.' }] }] }
function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><KitAssemblyWorkflowSettings canManage isPlatformAdmin actorId="actor" /></QueryClientProvider>)
}
beforeEach(() => { vi.clearAllMocks(); mocks.workflows.mockResolvedValue([]); mocks.steps.mockResolvedValue(steps); mocks.save.mockResolvedValue(workflow) })
describe('single-step transportation kit workflow editor', () => {
  it('requires one step and submits a one-element selection with no ordering controls', async () => {
    mount()
    const create = await screen.findByRole('button', { name: 'New workflow' })
    await waitFor(() => expect((create as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(create)
    const dialog = screen.getByRole('dialog', { name: 'New Transportation kit workflow' })
    const picker = within(dialog).getByRole('combobox', { name: 'Assembly step' })
    await waitFor(() => expect((picker as HTMLSelectElement).disabled).toBe(false))
    expect(within(dialog).queryByRole('button', { name: 'Add step' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Remove' })).toBeNull()
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Workflow name' }), { target: { value: 'RNA kit assembly' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText('Choose one approved Lab step.')).toBeTruthy()
    expect(mocks.save).not.toHaveBeenCalled()
    fireEvent.change(picker, { target: { value: stepId } })
    await waitFor(() => expect(screen.queryByText('Choose one approved Lab step.')).toBeNull())
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ name: 'RNA kit assembly', stepVersionIds: [stepId], workflowId: undefined, workflowVersion: undefined }))
  })
  it('requires an explicit replacement when editing a stored multi-step draft', async () => {
    mocks.workflows.mockResolvedValue([workflow])
    mount()
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Actions for RNA kit assembly' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit draft' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit kit workflow draft' })
    const picker = within(dialog).getByRole('combobox', { name: 'Assembly step' })
    await waitFor(() => expect((picker as HTMLSelectElement).disabled).toBe(false))
    expect((picker as HTMLSelectElement).value).toBe('')
    fireEvent.change(picker, { target: { value: secondStepId } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ name: 'RNA kit assembly', stepVersionIds: [secondStepId], workflowId: 'workflow', workflowVersion: 2 }))
  })
})
