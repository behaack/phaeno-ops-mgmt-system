import axios from 'axios'

type ApiAuthConfig = {
  getToken?: () => Promise<string | null>
  getSelectedOrganizationId?: () => string | null
  getSelectedDepartmentId?: () => string | null
}

let authConfig: ApiAuthConfig = {}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use(async (config) => {
  // Capture the scope before waiting for authentication. A department switch
  // must never send an already-started request to a different department.
  const selectedOrganizationId = authConfig.getSelectedOrganizationId?.()
  const selectedDepartmentId = authConfig.getSelectedDepartmentId?.()
  const token = await authConfig.getToken?.()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (selectedOrganizationId && !config.headers.has('X-Organization-Id')) {
    config.headers['X-Organization-Id'] = selectedOrganizationId
  }

  if (selectedDepartmentId && !config.headers.has('X-Department-Id')) {
    config.headers['X-Department-Id'] = selectedDepartmentId
  }

  return config
})

export function configureApiAuth(config: ApiAuthConfig) {
  authConfig = config
}

export type ApiClient = typeof api
