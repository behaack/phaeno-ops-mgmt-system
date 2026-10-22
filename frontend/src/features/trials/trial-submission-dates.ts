import { formatDisplayDate } from '#/lib/display-format'
const dayMilliseconds = 86_400_000

export function isSubmissionDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
}

export function submissionBoundary(value: string, closing = false) {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + (closing ? dayMilliseconds : 0)).toISOString()
}

export function submissionDateInput(value: string | null | undefined, closing = false) {
  return value ? new Date(Date.parse(value) - (closing ? 1 : 0)).toISOString().slice(0, 10) : ''
}

export function submissionDateLabel(value: string | null | undefined, closing = false) {
  return value ? formatDisplayDate(`${submissionDateInput(value, closing)}T00:00:00.000Z`, { timeZone: 'UTC' }) : 'Not set'
}
