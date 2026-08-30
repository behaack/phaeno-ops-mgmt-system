import axios from 'axios'

type ApiErrorEnvelope = {
  error?: null | { message?: string }
}

export function apiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const envelope = error.response?.data as ApiErrorEnvelope | undefined
    return envelope?.error?.message ?? error.message
  }

  return error instanceof Error ? error.message : 'The request could not be completed.'
}
