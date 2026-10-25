import axios from 'axios'
import { api } from './client'

// Successful evidence bytes stay opaque. Failed binary downloads carry the API error envelope.
export async function downloadLabEvidence(url: string) {
  try {
    return (await api.get<Blob>(url, { responseType: 'blob' })).data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      let data: unknown
      try { data = JSON.parse(await error.response.data.text()) as unknown } catch { throw error }
      if (data && typeof data === 'object' && 'error' in data && data.error && typeof data.error === 'object'
        && 'message' in data.error && typeof data.error.message === 'string' && data.error.message.trim()) {
        throw new Error(data.error.message, { cause: error })
      }
    }
    throw error
  }
}
