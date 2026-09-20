import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DepartmentSettingsDialog } from './DepartmentSettingsDialog'
import { type Department } from '#/api/organization-management'

afterEach(cleanup)

it('creates with a name and no user-supplied reference, while still requiring the name', async () => {
  const onSubmit = vi.fn()
  render(<DepartmentSettingsDialog target="new" pending={false} error={null} onClose={vi.fn()} onSubmit={onSubmit} />)
  expect(screen.queryByRole('textbox', { name: /code|reference/i })).toBeNull()
  expect(screen.getByText('A department reference is assigned automatically when saved.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Add department' }))
  expect(await screen.findByText('Enter a department name.')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), { target: { value: 'Department of Cardiology' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add department' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Department of Cardiology', description: null })
  expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('code')
})

it('shows the saved reference as read-only context when renaming', async () => {
  const department: Department = {
    id: 'department-1', organizationId: 'organization-1', code: 'DEPT-000123', name: 'Department of Cardiology',
    description: null, isDefault: false, isActive: true, activeMemberCount: 0,
    purchaseOrderRequired: null, billingContactEmail: null, notificationEmail: null,
    shippingInstructions: null, resultDeliveryInstructions: null,
    createdAt: '2026-09-19T12:00:00Z', updatedAt: '2026-09-19T12:00:00Z', version: 1,
  }
  const onSubmit = vi.fn()
  render(<DepartmentSettingsDialog target={department} pending={false} error={null} onClose={vi.fn()} onSubmit={onSubmit} />)
  expect(screen.getByText('DEPT-000123')).toBeTruthy()
  expect(screen.queryByRole('textbox', { name: /code|reference/i })).toBeNull()
  fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), { target: { value: 'Cardiology' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  expect(onSubmit.mock.calls[0][0].name).toBe('Cardiology')
  expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('code')
})
