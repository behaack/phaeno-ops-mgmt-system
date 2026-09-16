import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '#/api/crm'
import { CrmTaskEditDialog } from './CrmTaskEditDialog'

vi.mock('#/api/crm', async original => ({ ...await original<typeof api>(), updateCrmTask: vi.fn(), getCrmTask: vi.fn(), listCrmOwners: vi.fn() }))
vi.mock('#/features/orders/use-order-draft-guard', () => ({ useOrderDraftGuard: vi.fn() }))

const task: api.CrmTask = {
  id: 'task-1', title: 'Follow up', description: 'Discuss the proposal', ownerUserId: 'owner-1', ownerName: 'Current Owner', priority: 'Normal', status: 'Open',
  dueAt: '2026-09-17T12:00:37Z', reminderAt: '2026-09-17T11:00:12Z', recurrenceRule: 'WEEKLY', blockedReason: null, completedAt: null,
  companyId: 'company-1', companyName: 'Research Company', contactId: null, contactName: null, leadId: null, leadName: null, opportunityId: null, opportunityName: null,
  isActive: true, version: 3,
}
function mount(value = task) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const close = vi.fn()
  const invalidations = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}><CrmTaskEditDialog task={value} onClose={close} /></QueryClientProvider>)
  return { close, invalidations }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.listCrmOwners).mockResolvedValue([])
  vi.mocked(api.updateCrmTask).mockResolvedValue({ ...task, version: 4 })
  vi.mocked(api.getCrmTask).mockResolvedValue(task)
})

describe('task editing', () => {
  it('requires an actual change and preserves unchanged timestamps, links and recurrence', async () => {
    const { close, invalidations } = mount()
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Revised follow-up' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateCrmTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ description: 'Revised follow-up', dueAt: task.dueAt, reminderAt: task.reminderAt, companyId: task.companyId, recurrenceRule: 'WEEKLY', version: 3 })))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    for (const key of ['crm-tasks', 'crm-record-tasks', 'crm-dashboard', 'crm-activities', 'crm-reports']) expect(invalidations).toHaveBeenCalledWith({ queryKey: [key] })
  })

  it('reschedules using local input time and leaves a separately reviewed reminder unchanged', async () => {
    mount()
    const newDate = '2026-09-20T15:30'
    fireEvent.change(screen.getByLabelText(/^Due/), { target: { value: newDate } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateCrmTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ dueAt: new Date(newDate).toISOString(), reminderAt: task.reminderAt })))
    expect(screen.getByText(/Rescheduling shifts that next occurrence too/)).toBeTruthy()
  })

  it('blocks a reminder after the due date and retains the entered dates', async () => {
    mount()
    fireEvent.change(screen.getByLabelText(/^Due/), { target: { value: '2026-09-18T10:00' } })
    fireEvent.change(screen.getByLabelText('Reminder'), { target: { value: '2026-09-18T11:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('The reminder cannot occur after the due date.')
    expect(api.updateCrmTask).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Reminder')).toHaveProperty('value', '2026-09-18T11:00')
  })

  it('preserves dirty fields on conflict and requires review before using the latest version', async () => {
    const conflict = { isAxiosError: true, response: { status: 409 } }
    vi.mocked(api.updateCrmTask).mockRejectedValueOnce(conflict)
    vi.mocked(api.getCrmTask).mockResolvedValue({ ...task, priority: 'High', version: 4 })
    mount()
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Keep my draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    const review = await screen.findByRole('button', { name: 'I have reviewed the changes' })
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Keep my draft')
    expect(screen.getByLabelText(/^Priority/)).toHaveProperty('value', 'High')
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true)
    await waitFor(() => expect(review).toHaveProperty('disabled', false))
    fireEvent.click(review)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(api.updateCrmTask).toHaveBeenLastCalledWith(task.id, expect.objectContaining({ description: 'Keep my draft', priority: 'High', version: 4 })))
  })

  it('retains the draft but prevents saving after another user completes the task', async () => {
    vi.mocked(api.updateCrmTask).mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
    vi.mocked(api.getCrmTask).mockResolvedValue({ ...task, status: 'Completed', version: 4 })
    mount()
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Retain this draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText(/This task is now completed and cannot be edited/)
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Retain this draft')
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveProperty('disabled', true)
    expect(api.updateCrmTask).toHaveBeenCalledTimes(1)
  })

  it('keeps the draft after failure and asks before discarding it', async () => {
    vi.mocked(api.updateCrmTask).mockRejectedValueOnce(new Error('Save unavailable'))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const { close } = mount()
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Unsent details' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Save unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Unsent details')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(close).toHaveBeenCalledOnce()
    confirm.mockRestore()
  })
})
