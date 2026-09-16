import { expect, test } from '@playwright/test'
import type { CrmTask } from '../src/api/crm'

test('reschedules a task through Actions and retains its status and recurrence', async ({ page }) => {
  let task: CrmTask = {
    id: '00000000-0000-0000-0000-000000000901', title: 'Email the project contact', description: 'Confirm the follow-up', ownerUserId: '00000000-0000-0000-0000-000000000902', ownerName: 'Test Owner', priority: 'Normal', status: 'Blocked', blockedReason: 'Waiting for availability', completedAt: null,
    dueAt: '2026-09-17T12:00:00Z', reminderAt: '2026-09-17T11:00:00Z', recurrenceRule: 'WEEKLY', companyId: '00000000-0000-0000-0000-000000000903', companyName: 'Test Company', contactId: null, contactName: null, leadId: null, leadName: null, opportunityId: null, opportunityName: null, isActive: true, version: 1,
  }
  let submitted: Record<string, unknown> | null = null
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let data: unknown = []
    if (path.endsWith('/crm/tasks')) data = { items: [task], page: 1, pageSize: 25, totalCount: 1 }
    else if (path.endsWith(`/crm/tasks/${task.id}`) && route.request().method() === 'PUT') {
      submitted = route.request().postDataJSON() as Record<string, unknown>
      task = { ...task, dueAt: submitted.dueAt as string, reminderAt: submitted.reminderAt as string, version: 2 }
      data = task
    } else if (path.endsWith('/crm/owners')) data = [{ id: task.ownerUserId, firstName: 'Test', lastName: 'Owner', email: 'owner@example.test' }]
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data, error: null }) })
  })
  await page.goto('/crm/tasks')
  await page.getByRole('button', { name: `Actions for ${task.title}` }).click()
  await page.getByRole('menuitem', { name: 'Edit task', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit task', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await dialog.getByLabel(/^Due/).fill('2026-09-20T15:30')
  await dialog.getByLabel('Reminder', { exact: true }).fill('2026-09-20T14:30')
  await expect(dialog).toContainText('Rescheduling shifts that next occurrence too')
  const bounds = await dialog.boundingBox()
  expect(bounds).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toHaveCount(0)
  expect(submitted).toMatchObject({ recurrenceRule: 'WEEKLY', version: 1, companyId: task.companyId })
  expect(submitted).not.toHaveProperty('status')
  const localDue = await page.evaluate(value => new Date(value!).getDate(), task.dueAt)
  expect(localDue).toBe(20)
  await expect(page.getByText('Blocked', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: `Actions for ${task.title}` })).toBeFocused()
})
