import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, configureApiAuth } from './client'

afterEach(() => configureApiAuth({}))

describe('request scope', () => {
  it('keeps the scope captured before a delayed authentication token', async () => {
    let organization = 'organization-a'
    let department = 'department-a'
    let finishToken!: (token: string) => void
    const token = new Promise<string>((resolve) => { finishToken = resolve })
    const getToken = vi.fn(() => token)
    configureApiAuth({ getToken, getSelectedOrganizationId: () => organization, getSelectedDepartmentId: () => department })
    const request = api.get('/scope-test', { adapter: async (config) => ({ data: config.headers, status: 200, statusText: 'OK', headers: {}, config }) })
    await vi.waitFor(() => expect(getToken).toHaveBeenCalledOnce())
    organization = 'organization-b'
    department = 'department-b'
    finishToken('token')
    const response = await request
    expect(response.data.get('X-Organization-Id')).toBe('organization-a')
    expect(response.data.get('X-Department-Id')).toBe('department-a')
  })

  it('preserves an explicitly supplied scope', async () => {
    configureApiAuth({ getSelectedOrganizationId: () => 'current-org', getSelectedDepartmentId: () => 'current-department' })
    const response = await api.get('/scope-test', {
      headers: { 'X-Organization-Id': 'explicit-org', 'X-Department-Id': 'explicit-department' },
      adapter: async (config) => ({ data: config.headers, status: 200, statusText: 'OK', headers: {}, config }),
    })
    expect(response.data.get('X-Organization-Id')).toBe('explicit-org')
    expect(response.data.get('X-Department-Id')).toBe('explicit-department')
  })
})
