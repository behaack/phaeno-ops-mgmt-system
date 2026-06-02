import axios from 'axios'

type ApiAuthConfig = {
  getToken?: () => Promise<string | null>
  getSelectedOrganizationId?: () => string | null
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
  const token = await authConfig.getToken?.()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const selectedOrganizationId = authConfig.getSelectedOrganizationId?.()
  if (selectedOrganizationId) {
    config.headers['X-Organization-Id'] = selectedOrganizationId
  }

  return config
})

export function configureApiAuth(config: ApiAuthConfig) {
  authConfig = config
}

export type ApiClient = typeof api
